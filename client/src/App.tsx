// OMNIVERSE shell: one navigation, one global search, one notification
// center, one OMNI assistant, one settings system — eight environments
// mounted inside a single application.

import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaTopScrim } from "@hatch/space-sdk/client";
import {
Btn, ENVS, UniverseProvider, envMeta, timeAgo, useDoc, useUniverse,
type NotificationsDoc,
} from "./core";
import { searchIndex } from "./context";
import { Hub } from "./envs/hub";
import { defaultCasefile } from "./envs/casefile";
import { seedSentinel } from "./envs/sentinel";
import { defaultSonora } from "./envs/sonora";
import { defaultAether } from "./envs/aether";
import { Nexus } from "./envs/nexus";
import { Orbit } from "./envs/orbit";
import { Sonora } from "./envs/sonora";
import { Empire } from "./envs/empire";
import { Casefile } from "./envs/casefile";
import { Aether } from "./envs/aether";
import { Chronicles } from "./envs/chronicles";
import { Sentinel } from "./envs/sentinel";
import { OmniPanel } from "./envs/omni";
import { Settings } from "./envs/settings";

type View = string; // env id | "settings"

function Shell() {
  const u = useUniverse();
  const [view, setView] = useState<View>("hub");
  const [omniOpen, setOmniOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useDoc<NotificationsDoc>("notifications", { items: [], activity: [] });
  const unread = notifs.items.filter((i) => !i.read).length;

  // Materialize the authored first-run content (CASEFILE's fictional cases,
  // SENTINEL's labeled simulated data, SONORA's starter project, AETHER's
  // starter drive) into the store exactly once, so global search, Hub tiles
  // and OMNI context can see the whole universe from the first open.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!u.ready || seededRef.current) return;
    seededRef.current = true;
    if (u.docs.casefile === undefined) u.save("casefile", defaultCasefile());
    if (u.docs.sentinel === undefined) u.save("sentinel", seedSentinel());
    if (u.docs.sonora === undefined) u.save("sonora", defaultSonora());
    if (u.docs.aether === undefined) u.save("aether", defaultAether());
  }, [u]);

  const go = (env: string) => {
    setView(env);
    u.visit(env);
    setSearchOpen(false);
    setNotifOpen(false);
  };

  useEffect(() => {
    const openOmni = () => setOmniOpen(true);
    const goto = (e: Event) => { const d = (e as CustomEvent<string>).detail; if (d) go(d); };
    window.addEventListener("open-omni", openOmni);
    window.addEventListener("goto-env", goto);
    return () => { window.removeEventListener("open-omni", openOmni); window.removeEventListener("goto-env", goto); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u.docs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setNotifOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    if (!searchOpen) return [];
    const idx = searchIndex(u.docs);
    const q = query.trim().toLowerCase();
    if (!q) return idx.slice(0, 14);
    const terms = q.split(/\s+/);
    return idx.filter((h) => terms.every((t) => (h.label + " " + h.detail + " " + h.env).toLowerCase().includes(t))).slice(0, 30);
  }, [searchOpen, query, u.docs]);

  if (!u.ready) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="font-display" style={{ fontSize: 28, letterSpacing: ".2em" }}>OMNIVERSE</div>
          <div style={{ color: "var(--dim)", fontSize: 14, marginTop: 6 }}><span className="livedot">●</span> Initializing your universe…</div>
        </div>
      </div>
    );
  }

  const meta = envMeta(view);
  const navBtn = (id: string, glyph: string, label: string, color: string) => (
    <button key={id} type="button" onClick={() => go(id)} aria-current={view === id ? "page" : undefined} aria-label={label}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 9, border: "1px solid transparent", cursor: "pointer", minHeight: 40,
        background: view === id ? "rgba(56,189,248,.12)" : "transparent", color: view === id ? "var(--text)" : "var(--dim)", borderColor: view === id ? "var(--border)" : "transparent" }}>
      <span style={{ fontSize: 17, color, width: 22, textAlign: "center" }}>{glyph}</span>
      <span className="font-display" style={{ fontSize: 15.5, letterSpacing: ".07em", fontWeight: 600 }}>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <SafeAreaTopScrim backgroundColor="var(--bg)" />
      <div className="md:flex" style={{ maxWidth: 1440, margin: "0 auto" }}>
        {/* Desktop rail */}
        <nav aria-label="Environments" className="hidden md:flex" style={{ flexDirection: "column", gap: 2, width: 208, flexShrink: 0, padding: "14px 10px", position: "sticky", top: 0, height: "100vh", borderRight: "1px solid var(--border)" }}>
          {navBtn("hub", "⬡", "HUB", "var(--accent)")}
          <div style={{ height: 1, background: "var(--border)", margin: "8px 4px" }} />
          {ENVS.map((e) => navBtn(e.id, e.glyph, e.name, e.color))}
          <div style={{ flex: 1 }} />
          {navBtn("settings", "⚙", "SETTINGS", "var(--dim)")}
          <div style={{ fontSize: 11.5, color: "var(--dim)", padding: "8px 12px" }}>Ctrl/⌘ K — global search</div>
        </nav>

        <main style={{ flex: 1, minWidth: 0, padding: "12px 14px" }} className="pb-24 md:pb-8">
          {/* Command bar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, position: "sticky", top: 0, zIndex: 40, background: "var(--bg)", paddingTop: 6, paddingBottom: 8 }}>
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Open global search"
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, padding: "8px 14px", color: "var(--dim)", cursor: "pointer", fontSize: 14, minHeight: 38, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden" }}>
              <span aria-hidden style={{ flexShrink: 0 }}>⌕</span> <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>Search worlds, planets, companies, cases, alerts…</span>
            </button>
            <Btn kind="primary" onClick={() => setOmniOpen(true)} ariaLabel="Open OMNI assistant">✦ OMNI</Btn>
            <button type="button" onClick={() => setNotifOpen(!notifOpen)} aria-label={`Notifications, ${unread} unread`} aria-expanded={notifOpen}
              style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, width: 40, height: 38, cursor: "pointer", color: "var(--text)", fontSize: 16 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ verticalAlign: "middle" }}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              {unread > 0 && <span style={{ position: "absolute", top: -3, right: -3, background: "var(--bad)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "1px 6px" }}>{unread}</span>}
            </button>
            <button type="button" className="md:hidden" onClick={() => setView("settings")} aria-label="Settings"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, width: 40, height: 38, cursor: "pointer", color: "var(--text)", fontSize: 16 }}>⚙</button>
          </div>

          {notifOpen && (
            <div className="panel rise" style={{ padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong className="font-display" style={{ letterSpacing: ".06em" }}>NOTIFICATION CENTER</strong>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn small onClick={() => setNotifs({ ...notifs, items: notifs.items.map((i) => ({ ...i, read: true })) })}>Mark all read</Btn>
                  <Btn small kind="ghost" onClick={() => setNotifs({ ...notifs, items: [] })}>Clear all</Btn>
                </div>
              </div>
              {notifs.items.length === 0 && <p style={{ color: "var(--dim)", fontSize: 14, margin: 0 }}>No notifications. Discoveries, milestones and alerts from every environment will land here.</p>}
              <div style={{ display: "grid", gap: 6, maxHeight: 320, overflowY: "auto" }} className="scrollthin">
                {notifs.items.map((n) => (
                  <div key={n.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: n.read ? "transparent" : "rgba(56,189,248,.07)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
                    <button type="button" onClick={() => { setNotifs({ ...notifs, items: notifs.items.map((i) => (i.id === n.id ? { ...i, read: true } : i)) }); go(n.env); }}
                      style={{ flex: 1, textAlign: "left", background: "transparent", border: "none", color: "var(--text)", cursor: "pointer", padding: 0 }}>
                      <strong style={{ fontSize: 14 }}>{n.title}</strong>
                      <div style={{ fontSize: 13, color: "var(--dim)" }}>{n.body}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{n.env.toUpperCase()} · {timeAgo(n.ts)}</div>
                    </button>
                    <Btn small kind="ghost" ariaLabel={`Delete notification ${n.title}`} onClick={() => setNotifs({ ...notifs, items: notifs.items.filter((i) => i.id !== n.id) })}>✕</Btn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view !== "hub" && view !== "settings" && meta && (
            <div style={{ marginBottom: 12, borderLeft: `3px solid ${meta.color}`, paddingLeft: 12 }}>
              <h1 className="font-display" style={{ margin: 0, fontSize: 27, letterSpacing: ".07em" }}>{meta.name} <span style={{ fontSize: 15, color: meta.color, letterSpacing: ".02em" }}>{meta.tag}</span></h1>
            </div>
          )}
          {view === "settings" && <h1 className="font-display" style={{ fontSize: 27, letterSpacing: ".07em", margin: "0 0 12px" }}>SETTINGS</h1>}

          <div key={view} className="rise">
            {view === "hub" && <Hub go={go} />}
            {view === "nexus" && <Nexus />}
            {view === "orbit" && <Orbit />}
            {view === "sonora" && <Sonora />}
            {view === "empire" && <Empire />}
            {view === "casefile" && <Casefile />}
            {view === "aether" && <Aether />}
            {view === "chronicles" && <Chronicles />}
            {view === "sentinel" && <Sentinel />}
            {view === "settings" && <Settings />}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — a fitted grid so all eight environments + Hub are visible at once */}
      <div className="md:hidden" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50 }}>
        <nav aria-label="Environments" style={{ background: "rgba(8,13,28,.96)", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(9, 1fr)", padding: "6px 2px calc(6px + env(safe-area-inset-bottom))" }}>
          {[{ id: "hub", name: "HUB", glyph: "⬡", color: "var(--accent)" }, ...ENVS].map((e) => (
            <button key={e.id} type="button" onClick={() => go(e.id)} aria-label={e.name} aria-current={view === e.id ? "page" : undefined}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: view === e.id ? "var(--text)" : "var(--dim)", padding: "4px 0", minHeight: 46, textAlign: "center", minWidth: 0 }}>
              <div style={{ fontSize: 16, color: e.color }}>{e.glyph}</div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0, whiteSpace: "nowrap" }}>{e.id === "chronicles" ? "CHRON" : e.id === "casefile" ? "CASES" : e.name}</div>
            </button>
          ))}
        </nav>
      </div>

      {/* Global search overlay */}
      {searchOpen && (
        <div role="dialog" aria-modal="true" aria-label="Global search" style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(2,6,18,.78)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "8vh 12px 12px" }} onClick={() => setSearchOpen(false)}>
          <div className="panel rise" style={{ width: "100%", maxWidth: 640, padding: 14, maxHeight: "78vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <input aria-label="Search across OMNIVERSE" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search research, planets, citizens, cases, alerts…" style={{ width: "100%", background: "#0a1122", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", padding: "11px 13px", fontSize: 16 }} />
            <div style={{ display: "grid", gap: 4, marginTop: 10 }}>
              {results.map((r, i) => {
                const m = envMeta(r.env);
                return (
                  <button key={i} type="button" onClick={() => go(r.env)} style={{ textAlign: "left", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 11px", color: "var(--text)", cursor: "pointer" }}>
                    <span style={{ color: m?.color ?? "var(--dim)", fontWeight: 700, fontSize: 11.5, letterSpacing: ".06em" }}>{(m?.name ?? r.env).toUpperCase()}</span>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{r.detail}</div>
                  </button>
                );
              })}
              {results.length === 0 && <p style={{ color: "var(--dim)", fontSize: 14 }}>No matches in your universe yet. Content appears here as you create it.</p>}
            </div>
          </div>
        </div>
      )}

      {omniOpen && <OmniPanel env={view === "settings" ? "hub" : view} onClose={() => setOmniOpen(false)} go={go} />}
    </div>
  );
}

export function App() {
  return (
    <UniverseProvider>
      <Shell />
    </UniverseProvider>
  );
}
