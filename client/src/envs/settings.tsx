// Settings — one settings system for the whole universe: profile, the Gemini
// connection (key held ONLY in this browser's localStorage, sent per-request
// to the server action, never stored server-side), OMNI preferences, and
// full data management (export / import / per-environment reset).

import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api } from "../api";
import {
Btn, ENVS, Field, Panel, download, getGeminiKey, inputStyle, setGeminiKey,
useUniverse, type ProfileDoc, type SettingsDoc,
} from "../core";

const ENV_KEYS = ["nexus", "orbit", "sonora", "empire", "casefile", "aether", "chronicles", "sentinel"] as const;

export function Settings() {
  const u = useUniverse();
  const profile = (u.docs.profile as ProfileDoc | undefined) ?? { name: "Muta", title: "Universe Architect", favorites: [], recent: [], visited: [], createdAt: Date.now() };
  const settings = (u.docs.settings as SettingsDoc | undefined) ?? { model: "gemini-3.1-flash-lite", temperatureNote: "", compact: false, omniSuggestions: true };
  const [keyInput, setKeyInput] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [resetArm, setResetArm] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const hasKey = !!getGeminiKey();

  const test = useMutation({
    mutationFn: async (key: string) => api.omniChat({ environment: "hub", mode: "default", message: "Reply with one short sentence confirming you are connected.", context: "Connection test from Settings.", history: [], apiKey: key, model: settings.model }),
    onSuccess: (res) => setTestMsg(res.demo ? "The key was rejected or Gemini was unreachable — check the key and model, then try again." : `Connected — Gemini (${res.model}) replied: "${res.reply.slice(0, 140)}"`),
    onError: () => setTestMsg("Connection test failed — network or server error."),
  });

  async function doExport() {
    const res = await api.exportAll({});
    download("omniverse-backup.json", JSON.stringify({ exportedAt: new Date().toISOString(), docs: res.docs }, null, 2));
    u.act("hub", "Exported a full OMNIVERSE backup");
  }
  async function doImport(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { docs?: Array<{ key: string; data: string }> };
      if (!Array.isArray(parsed.docs)) throw new Error("shape");
      const res = await api.importAll({ docs: parsed.docs });
      setImportMsg(`Imported ${res.count} documents. Reloading…`);
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setImportMsg("That file is not a valid OMNIVERSE backup.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 860 }}>
      <Panel title="Profile — one identity across OMNIVERSE">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          <Field label="Display name">
            <input aria-label="Display name" value={profile.name} onChange={(e) => u.save("profile", { ...profile, name: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Title">
            <input aria-label="Profile title" value={profile.title} onChange={(e) => u.save("profile", { ...profile, title: e.target.value })} style={inputStyle} />
          </Field>
        </div>
        <div style={{ fontSize: 13, color: "var(--dim)" }}>Environments visited: {(profile.visited ?? []).length}/8 · Member since {new Date(profile.createdAt).toLocaleDateString("en-CA")}</div>
      </Panel>

      <Panel title="OMNI · Gemini connection">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: hasKey ? "var(--good)" : "var(--warn)" }} className="livedot" aria-hidden />
          <strong style={{ fontSize: 14.5 }}>{hasKey ? "Live AI mode — Gemini connected" : "Demo mode — no key connected"}</strong>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 0 }}>
          Your key stays in this browser tab's storage only. Each OMNI request sends it once to OMNIVERSE's server, which calls Google with it and discards it — it is never saved on the server or in your universe data. In demo mode OMNI answers locally from your real environment state, clearly labeled.
        </p>
        <Field label={hasKey ? "Replace Gemini API key" : "Gemini API key (free from Google AI Studio)"}>
          <input aria-label="Gemini API key" type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={hasKey ? "•••••••••••• (saved in this browser)" : "Paste your key…"} style={inputStyle} autoComplete="off" />
        </Field>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn kind="primary" disabled={!keyInput.trim()} onClick={() => { setGeminiKey(keyInput.trim()); setKeyInput(""); setTestMsg("Key saved in this browser. Run a test to confirm it works."); }}>Save key in this browser</Btn>
          <Btn disabled={!hasKey && !keyInput.trim()} onClick={() => test.mutate(keyInput.trim() || getGeminiKey())}>{test.isPending ? "Testing…" : "Test connection"}</Btn>
          {hasKey && <Btn kind="danger" onClick={() => { setGeminiKey(""); setTestMsg("Key removed from this browser. OMNI is back in demo mode."); }}>Remove key</Btn>}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ alignSelf: "center", color: "var(--accent)", fontSize: 14 }}>Get a free key ↗</a>
        </div>
        {testMsg && <div style={{ fontSize: 13.5, marginTop: 8 }}>{testMsg}</div>}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          <Field label="Gemini model">
            <input aria-label="Gemini model" value={settings.model} onChange={(e) => u.save("settings", { ...settings, model: e.target.value })} style={inputStyle} />
          </Field>
          <div>
            <span style={{ display: "block", fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>Known-good on free keys</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["gemini-3.1-flash-lite", "gemini-3.1-flash", "gemini-3.1-pro"].map((m) => (
                <Btn key={m} small kind={settings.model === m ? "primary" : "soft"} onClick={() => u.save("settings", { ...settings, model: m })}>{m}</Btn>
              ))}
            </div>
          </div>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginTop: 10 }}>
          <input type="checkbox" checked={settings.omniSuggestions} onChange={(e) => u.save("settings", { ...settings, omniSuggestions: e.target.checked })} style={{ width: 18, height: 18 }} />
          Show suggested prompts in OMNI
        </label>
      </Panel>

      <Panel title="Data — export, import, reset">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <Btn onClick={() => void doExport()}>Export full backup (.json)</Btn>
          <Btn onClick={() => fileRef.current?.click()}>Import backup…</Btn>
          <input ref={fileRef} aria-label="Import backup file" type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => void doImport(e.target.files?.[0])} />
        </div>
        {importMsg && <div style={{ fontSize: 13.5, marginBottom: 8 }}>{importMsg}</div>}
        <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 8 }}>Reset one environment (its document is deleted; the environment regenerates fresh):</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ENV_KEYS.map((k) => {
            const meta = ENVS.find((e) => e.id === k);
            const exists = u.docs[k] !== undefined;
            return resetArm === k ? (
              <span key={k} style={{ display: "inline-flex", gap: 4 }}>
                <Btn small kind="danger" onClick={() => { u.remove(k); setResetArm(null); u.act("hub", `Reset ${meta?.name}`); }}>Confirm reset {meta?.name}</Btn>
                <Btn small kind="ghost" onClick={() => setResetArm(null)}>Cancel</Btn>
              </span>
            ) : (
              <Btn key={k} small disabled={!exists} onClick={() => setResetArm(k)}>Reset {meta?.name}</Btn>
            );
          })}
        </div>
        <div style={{ marginTop: 12 }}>
          {resetArm === "ALL" ? (
            <span style={{ display: "inline-flex", gap: 4 }}>
              <Btn small kind="danger" onClick={() => { for (const k of [...ENV_KEYS, "projects", "notifications", "achievements", "omni"]) u.remove(k); setResetArm(null); }}>Confirm: erase everything except profile & settings</Btn>
              <Btn small kind="ghost" onClick={() => setResetArm(null)}>Cancel</Btn>
            </span>
          ) : <Btn small kind="danger" onClick={() => setResetArm("ALL")}>Erase all universe data…</Btn>}
        </div>
      </Panel>

      <Panel title="Privacy — what goes where">
        <ul style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0, paddingLeft: 18, color: "var(--dim)" }}>
          <li>All simulation state is stored in OMNIVERSE's own database under your artifact — nothing is sold or shared.</li>
          <li>OMNI receives only a short summary of the environment you're in (never your whole universe, never files from AETHER unless you ask about them there).</li>
          <li>SENTINEL passwords are analyzed locally and never stored or transmitted. File hashing runs locally; only file names + hashes are kept.</li>
          <li>AETHER files are virtual documents inside OMNIVERSE — they are not files on your real computer.</li>
          <li>All SENTINEL security data is simulated and labeled. CASEFILE cases are fictional with fixed authored truths.</li>
        </ul>
      </Panel>
    </div>
  );
}
