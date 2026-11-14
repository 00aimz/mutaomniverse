// OMNI — the one unified assistant. Accessible from every environment; it
// always knows where you are and receives a bounded summary of that
// environment's real state (see context.ts). Powered by Gemini through the
// server action when a key is connected; honest DEMO MODE otherwise.
// Gemini may return a structured proposal — it is validated against live
// state here and applied ONLY when the user taps Apply. OMNI itself never
// writes simulation state.

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { SUGGESTIONS, contextFor } from "../context";
import {
Btn, ENVS, Md, envMeta, getGeminiKey, inputStyle, useDoc, useUniverse,
type OmniDoc, type OmniMsg, type SettingsDoc,
} from "../core";
import { BUILDINGS, type NexusDoc } from "./nexus";
import { ORBIT_TECHS, type OrbitDoc } from "./orbit";
import type { EmpireDoc } from "./empire";
import type { SonoraDoc } from "./sonora";

interface Proposal { action: string; label: string; params: Record<string, string | number | boolean> }

export function OmniPanel({ env, onClose, go }: { env: string; onClose: () => void; go: (env: string) => void }) {
  const u = useUniverse();
  const [omni, setOmni] = useDoc<OmniDoc>("omni", { threads: {} });
  const settings = (u.docs.settings as SettingsDoc | undefined) ?? { model: "gemini-3.1-flash-lite", temperatureNote: "", compact: false, omniSuggestions: true };
  const [activeEnv, setActiveEnv] = useState(env);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ env: string; proposal: Proposal } | null>(null);
  const [applyMsg, setApplyMsg] = useState("");
  const [clearArm, setClearArm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const key = getGeminiKey();
  const thread: OmniMsg[] = omni.threads[activeEnv] ?? [];
  const meta = envMeta(activeEnv);

  useEffect(() => { setActiveEnv(env); }, [env]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [thread.length]);

  const chat = useMutation({
    mutationFn: async (message: string) => {
      const history = thread.slice(-8).map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
      return api.omniChat({
        environment: (activeEnv as "hub" | "nexus" | "orbit" | "sonora" | "empire" | "casefile" | "aether" | "chronicles" | "sentinel"),
        mode: "default", message, context: contextFor(activeEnv, u.docs), history,
        apiKey: key || undefined, model: settings.model,
      });
    },
    onSuccess: (res, message) => {
      const userMsg: OmniMsg = { role: "user", text: message, ts: Date.now() };
      const modelMsg: OmniMsg = { role: "model", text: res.reply, ts: Date.now(), demo: res.demo };
      setOmni({ threads: { ...omni.threads, [activeEnv]: [...thread, userMsg, modelMsg].slice(-60) } });
      if (res.proposal) setPending({ env: activeEnv, proposal: res.proposal as Proposal });
      u.unlock("omni-user");
    },
    onError: (_e, message) => {
      const userMsg: OmniMsg = { role: "user", text: message, ts: Date.now() };
      const errMsg: OmniMsg = { role: "model", text: "OMNI could not reach the server just now. Your message is saved in this thread — try again in a moment.", ts: Date.now(), demo: true };
      setOmni({ threads: { ...omni.threads, [activeEnv]: [...thread, userMsg, errMsg].slice(-60) } });
    },
  });

  function send(text?: string) {
    const m = (text ?? input).trim();
    if (!m || chat.isPending) return;
    setInput("");
    setPending(null);
    setApplyMsg("");
    chat.mutate(m);
  }

  function validateAndApply() {
    if (!pending) return;
    const { env: penv, proposal } = pending;
    const fail = (why: string) => setApplyMsg(`Proposal not applied: ${why}`);
    if (penv === "nexus" && proposal.action === "build") {
      const want = String(proposal.params.building ?? "").toLowerCase();
      const b = BUILDINGS.find((x) => x.id === want || x.name.toLowerCase() === want);
      const d = u.docs.nexus as NexusDoc | undefined;
      if (!b || !d) return fail("unknown building or no world exists");
      if (d.treasury < b.cost || d.materials < b.mats) return fail(`not enough resources for ${b.name}`);
      u.save("nexus", { ...d, treasury: d.treasury - b.cost, materials: d.materials - b.mats, buildings: { ...d.buildings, [b.id]: (d.buildings[b.id] ?? 0) + 1 }, capacity: b.id === "housing" ? d.capacity + 500 : d.capacity, history: [...d.history, { year: d.year, text: `OMNI proposal approved: built ${b.name}.` }] });
      setApplyMsg(`Applied: built ${b.name} in ${d.worldName}.`);
    } else if (penv === "empire" && proposal.action === "setPrice") {
      const d = u.docs.empire as EmpireDoc | undefined;
      const name = String(proposal.params.product ?? "").toLowerCase();
      const price = Number(proposal.params.price);
      const p = d?.products.find((x) => x.name.toLowerCase() === name);
      if (!d || !p || !Number.isFinite(price) || price < 5 || price > 500) return fail("unknown product or price out of range ($5–$500)");
      u.save("empire", { ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, price } : x)) });
      setApplyMsg(`Applied: ${p.name} price set to $${price}.`);
    } else if (penv === "orbit" && proposal.action === "research") {
      const d = u.docs.orbit as OrbitDoc | undefined;
      const want = String(proposal.params.tech ?? "").toLowerCase();
      const t = ORBIT_TECHS.find((x) => x.id === want || x.name.toLowerCase() === want);
      if (!d || !t) return fail("unknown technology");
      if (d.researched.includes(t.id)) return fail("already researched");
      if (d.science < t.cost) return fail("not enough science");
      u.save("orbit", { ...d, science: d.science - t.cost, researched: [...d.researched, t.id] });
      setApplyMsg(`Applied: researched ${t.name}.`);
    } else if (penv === "sonora" && proposal.action === "setBpm") {
      const d = u.docs.sonora as SonoraDoc | undefined;
      const bpm = Number(proposal.params.bpm);
      if (!d || !Number.isFinite(bpm) || bpm < 60 || bpm > 180) return fail("BPM out of range (60–180)");
      u.save("sonora", { ...d, projects: d.projects.map((p) => (p.id === d.activeId ? { ...p, bpm } : p)) });
      setApplyMsg(`Applied: tempo set to ${bpm} BPM.`);
    } else {
      return fail(`"${proposal.action}" is not an applicable action in ${penv.toUpperCase()} — treat it as advice only`);
    }
    setPending(null);
    u.act(penv, `Approved an OMNI proposal: ${proposal.label}`);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="OMNI assistant" style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", justifyContent: "flex-end", background: "rgba(2,6,18,.6)" }} onClick={onClose}>
      <div className="rise" onClick={(e) => e.stopPropagation()}
        style={{ width: "min(480px, 100%)", height: "100%", background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: key ? "var(--good)" : "var(--warn)" }} className="livedot" aria-hidden />
          <div style={{ flex: 1 }}>
            <div className="font-display" style={{ fontSize: 19, letterSpacing: ".08em", lineHeight: 1 }}>OMNI</div>
            <div style={{ fontSize: 12, color: "var(--dim)" }}>{key ? `Live · Gemini ${settings.model}` : "Demo mode — add your Gemini key in Settings"} · acting in {meta?.name ?? "HUB"}</div>
          </div>
          <Btn small kind={clearArm ? "danger" : "ghost"} onClick={() => { if (clearArm) { setOmni({ threads: { ...omni.threads, [activeEnv]: [] } }); setClearArm(false); } else setClearArm(true); }} ariaLabel="Clear this conversation">{clearArm ? "Confirm clear" : "Clear"}</Btn>
          <Btn small kind="ghost" onClick={onClose} ariaLabel="Close OMNI">✕</Btn>
        </div>

        <div style={{ display: "flex", gap: 5, padding: "8px 12px", overflowX: "auto", borderBottom: "1px solid var(--border)" }} className="scrollthin">
          {[{ id: "hub", name: "HUB" }, ...ENVS].map((e) => (
            <button key={e.id} type="button" onClick={() => { setActiveEnv(e.id); if (e.id !== env) go(e.id); }}
              style={{ whiteSpace: "nowrap", borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 600, minHeight: 28, cursor: "pointer", border: "1px solid var(--border)", background: activeEnv === e.id ? "rgba(56,189,248,.16)" : "var(--surface2)", color: "var(--text)" }}>{e.name}</button>
          ))}
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }} className="scrollthin">
          {thread.length === 0 && (
            <div style={{ color: "var(--dim)", fontSize: 14 }}>
              <p>I'm OMNI — one assistant across your whole universe. Right now I'm reading <strong style={{ color: "var(--text)" }}>{meta?.name ?? "the Hub"}</strong> and I can see its live state. Ask me anything about what's on screen.</p>
              {settings.omniSuggestions && (
                <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                  {(SUGGESTIONS[activeEnv] ?? []).map((s) => <Btn key={s} small style={{ textAlign: "left" }} onClick={() => send(s)}>{s}</Btn>)}
                </div>
              )}
            </div>
          )}
          {thread.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%", background: m.role === "user" ? "rgba(56,189,248,.14)" : "#0a1122", border: "1px solid var(--border)", borderRadius: 12, padding: "9px 11px" }}>
              {m.demo && m.role === "model" && <div style={{ fontSize: 10.5, letterSpacing: ".1em", color: "var(--warn)", marginBottom: 3 }}>DEMO MODE</div>}
              <Md text={m.text} />
              <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4, textAlign: "right" }}>{new Date(m.ts).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          ))}
          {chat.isPending && <div style={{ color: "var(--dim)", fontSize: 13.5 }}><span className="livedot">●</span> OMNI is thinking…</div>}
          {pending && (
            <div style={{ border: "1px solid var(--violet)", background: "rgba(167,139,250,.1)", borderRadius: 12, padding: 11 }}>
              <div style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--violet)" }}>OMNI PROPOSAL — VALIDATED BEFORE APPLYING</div>
              <div style={{ fontSize: 14, margin: "4px 0" }}><strong>{pending.proposal.label}</strong> <span className="font-mono2" style={{ fontSize: 12, color: "var(--dim)" }}>({pending.proposal.action})</span></div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small kind="primary" onClick={validateAndApply}>Apply proposal</Btn>
                <Btn small kind="ghost" onClick={() => setPending(null)}>Dismiss</Btn>
              </div>
            </div>
          )}
          {applyMsg && <div style={{ fontSize: 13, color: "var(--good)" }}>{applyMsg}</div>}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--border)" }}>
          <input aria-label="Message OMNI" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask OMNI about ${meta?.name ?? "your universe"}…`} style={{ ...inputStyle, flex: 1 }} />
          <Btn kind="primary" disabled={!input.trim() || chat.isPending} onClick={() => send()}>Send</Btn>
        </form>
      </div>
    </div>
  );
}
