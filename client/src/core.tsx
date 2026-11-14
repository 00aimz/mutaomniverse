// OMNIVERSE shared core: the universe store (one profile, one notification
// center, one achievement system, one settings doc across all environments),
// procedural-generation helpers, and the shared UI kit.

import { useMutation, useQuery } from "@tanstack/react-query";
import {
createContext,
useCallback,
useContext,
useEffect,
useMemo,
useRef,
useState,
type ReactNode,
} from "react";
import { api } from "./api";

// ---------------------------------------------------------------- env meta
export type EnvId =
  | "hub" | "nexus" | "orbit" | "sonora" | "empire"
  | "casefile" | "aether" | "chronicles" | "sentinel";

export const ENVS: Array<{
  id: Exclude<EnvId, "hub">;
  name: string;
  tag: string;
  desc: string;
  color: string;
  glyph: string;
}> = [
  { id: "nexus", name: "NEXUS", tag: "Civilization Simulator", desc: "Procedural worlds, cities, citizens, economy, diplomacy and research.", color: "#38bdf8", glyph: "◉" },
  { id: "orbit", name: "ORBIT", tag: "Space Exploration", desc: "Chart star systems, command spacecraft, meet alien civilizations.", color: "#22d3ee", glyph: "✦" },
  { id: "sonora", name: "SONORA", tag: "Music Studio", desc: "Step sequencer, piano roll, artists and albums — a working studio.", color: "#a78bfa", glyph: "♪" },
  { id: "empire", name: "EMPIRE", tag: "Business Simulator", desc: "Found companies, ship products, outplay AI competitors.", color: "#fbbf24", glyph: "⬢" },
  { id: "casefile", name: "CASEFILE", tag: "Detective Universe", desc: "Fictional cases with fixed truths: evidence, interviews, conclusions.", color: "#f472b6", glyph: "⌕" },
  { id: "aether", name: "AETHER", tag: "Browser OS", desc: "A desktop with real windows: files, editor, terminal, calendar.", color: "#34d399", glyph: "▦" },
  { id: "chronicles", name: "CHRONICLES", tag: "Fantasy Adventure", desc: "Procedural kingdoms, branching quests, persistent consequences.", color: "#fb923c", glyph: "⚔" },
  { id: "sentinel", name: "SENTINEL", tag: "Cyber Intelligence", desc: "SOC, threat intel, defensive labs and local security tools. Simulated data.", color: "#f87171", glyph: "⛨" },
];

export function envMeta(id: string) {
  return ENVS.find((e) => e.id === id);
}

// ---------------------------------------------------------------- rng / ids
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(r: () => number, arr: readonly T[]): T {
  const v = arr[Math.floor(r() * arr.length)];
  return (v ?? arr[0]) as T;
}
export function ri(r: () => number, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}
export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}
export function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(n) >= 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return Math.round(n).toLocaleString("en-US");
}
export function money(n: number): string {
  return (n < 0 ? "-$" : "$") + fmt(Math.abs(n));
}
export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
export function download(name: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Name pools for procedural generation.
export const FIRST = ["Ava","Liam","Noor","Ezra","Mira","Kofi","Sana","Dario","Ines","Tomas","Yuki","Rhea","Omar","Lena","Cato","Iris","Felix","Nadia","Silas","Amara","Juno","Ravi","Elif","Marco","Tessa","Orin","Vera","Kian","Lila","Dmitri","Anya","Hugo","Selin","Petr","Mina","Caspian","Ruth","Idris","Noa","Felix"];
export const LAST = ["Okafor","Reyes","Haddad","Novak","Iversen","Marsh","Kowalski","Tanaka","Rossi","Lindqvist","Barros","Hale","Demir","Varga","Osei","Nakamura","Petrov","Silva","Moreau","Ivers","Kade","Sorrel","Voss","Amari","Lund","Rhee","Corso","Nadir","Fenn","Ortiz"];
export function personName(r: () => number): string {
  return `${pick(r, FIRST)} ${pick(r, LAST)}`;
}

// ---------------------------------------------------------------- doc types
export interface ProfileDoc { name: string; title: string; favorites: string[]; recent: string[]; visited: string[]; createdAt: number }
export interface SettingsDoc { model: string; temperatureNote: string; compact: boolean; omniSuggestions: boolean }
export interface NotifItem { id: string; env: string; title: string; body: string; ts: number; read: boolean }
export interface NotificationsDoc { items: NotifItem[]; activity: Array<{ id: string; env: string; text: string; ts: number }> }
export interface AchievementsDoc { unlocked: Record<string, number> }
export interface ProjectItem { id: string; name: string; desc: string; links: Array<{ env: string; label: string }>; createdAt: number }
export interface ProjectsDoc { projects: ProjectItem[] }
export interface OmniMsg { role: "user" | "model"; text: string; ts: number; demo?: boolean }
export interface OmniDoc { threads: Record<string, OmniMsg[]> }

export const ACHIEVEMENTS: Array<{ id: string; name: string; desc: string; xp: number; env: string }> = [
  { id: "first-world", name: "First World Created", desc: "Generate a civilization in NEXUS", xp: 50, env: "nexus" },
  { id: "city-builder", name: "City Builder", desc: "Construct 10 buildings in NEXUS", xp: 75, env: "nexus" },
  { id: "first-planet", name: "First Planet Charted", desc: "Scan a planet in ORBIT", xp: 50, env: "orbit" },
  { id: "first-contact", name: "First Contact", desc: "Meet an alien civilization in ORBIT", xp: 100, env: "orbit" },
  { id: "first-track", name: "First Track", desc: "Save a music project in SONORA", xp: 50, env: "sonora" },
  { id: "producer", name: "Producer", desc: "Release an album in SONORA", xp: 100, env: "sonora" },
  { id: "founder", name: "Founder", desc: "Found a company in EMPIRE", xp: 50, env: "empire" },
  { id: "profitable", name: "In the Black", desc: "Finish a profitable month in EMPIRE", xp: 75, env: "empire" },
  { id: "case-opened", name: "Case Opened", desc: "Begin an investigation in CASEFILE", xp: 40, env: "casefile" },
  { id: "case-closed", name: "Case Closed", desc: "Reach a correct conclusion in CASEFILE", xp: 150, env: "casefile" },
  { id: "os-user", name: "Power User", desc: "Create a file in AETHER", xp: 40, env: "aether" },
  { id: "hero-born", name: "A Hero Rises", desc: "Create a character in CHRONICLES", xp: 50, env: "chronicles" },
  { id: "quest-done", name: "Quest Complete", desc: "Finish a quest in CHRONICLES", xp: 100, env: "chronicles" },
  { id: "lab-done", name: "Lab Certified", desc: "Complete a SENTINEL defensive lab", xp: 75, env: "sentinel" },
  { id: "alert-triaged", name: "First Responder", desc: "Resolve a simulated alert in SENTINEL", xp: 50, env: "sentinel" },
  { id: "project-linked", name: "Worldbinder", desc: "Create a cross-environment project", xp: 60, env: "hub" },
  { id: "omni-user", name: "Ask OMNI", desc: "Hold a conversation with OMNI", xp: 25, env: "hub" },
  { id: "explorer", name: "OMNIVERSE Explorer", desc: "Visit all eight environments", xp: 200, env: "hub" },
];

export function defaultDocs(): Record<string, unknown> {
  return {
    profile: { name: "Muta", title: "Universe Architect", favorites: [], recent: [], visited: [], createdAt: Date.now() } satisfies ProfileDoc,
    settings: { model: "gemini-3.1-flash-lite", temperatureNote: "", compact: false, omniSuggestions: true } satisfies SettingsDoc,
    notifications: { items: [], activity: [] } satisfies NotificationsDoc,
    achievements: { unlocked: {} } satisfies AchievementsDoc,
    projects: { projects: [] } satisfies ProjectsDoc,
    omni: { threads: {} } satisfies OmniDoc,
  };
}

export function getGeminiKey(): string {
  try { return localStorage.getItem("omniverse-gemini-key") ?? ""; } catch { return ""; }
}
export function setGeminiKey(k: string) {
  try {
    if (k) localStorage.setItem("omniverse-gemini-key", k);
    else localStorage.removeItem("omniverse-gemini-key");
  } catch { /* storage unavailable */ }
}

// ---------------------------------------------------------------- the store
interface Universe {
  ready: boolean;
  docs: Record<string, unknown>;
  save: (key: string, value: unknown) => void;
  remove: (key: string) => void;
  notify: (env: string, title: string, body: string) => void;
  act: (env: string, text: string) => void;
  unlock: (id: string) => void;
  visit: (env: string) => void;
}

const Ctx = createContext<Universe | null>(null);

export function useUniverse(): Universe {
  const v = useContext(Ctx);
  if (!v) throw new Error("UniverseProvider missing");
  return v;
}

export function useDoc<T>(key: string, fallback: T): [T, (v: T) => void] {
  const u = useUniverse();
  const value = (u.docs[key] as T | undefined) ?? fallback;
  const set = useCallback((v: T) => u.save(key, v), [u, key]);
  return [value, set];
}

export function UniverseProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const docsRef = useRef(docs);
  docsRef.current = docs;

  const q = useQuery({ queryKey: ["omniverse-docs"], queryFn: () => api.exportAll({}) });
  useEffect(() => {
    if (!q.data || ready) return;
    const parsed: Record<string, unknown> = { ...defaultDocs() };
    for (const d of q.data.docs) {
      try { parsed[d.key] = JSON.parse(d.data); } catch { /* skip corrupt doc */ }
    }
    setDocs(parsed);
    setReady(true);
  }, [q.data, ready]);

  const put = useMutation({
    mutationFn: async (v: { key: string; value: unknown }) =>
      api.putDoc({ key: v.key, data: JSON.stringify(v.value) }),
  });
  const del = useMutation({ mutationFn: async (key: string) => api.deleteDoc({ key }) });
  const putRef = useRef(put.mutate);
  putRef.current = put.mutate;
  const delRef = useRef(del.mutate);
  delRef.current = del.mutate;

  const save = useCallback((key: string, value: unknown) => {
    // Keep the ref in sync synchronously: helpers like notify()+act() often run
    // back-to-back in one event handler, and each reads docsRef before saving.
    // Without this, the second save would be built from a stale snapshot and
    // silently clobber the first one's changes to the same document.
    docsRef.current = { ...docsRef.current, [key]: value };
    setDocs((d) => ({ ...d, [key]: value }));
    putRef.current({ key, value });
  }, []);

  const remove = useCallback((key: string) => {
    const nextRef = { ...docsRef.current };
    delete nextRef[key];
    docsRef.current = nextRef;
    setDocs((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
    delRef.current(key);
  }, []);

  const notify = useCallback((env: string, title: string, body: string) => {
    const cur = (docsRef.current.notifications as NotificationsDoc | undefined) ?? { items: [], activity: [] };
    const item: NotifItem = { id: uid(), env, title, body, ts: Date.now(), read: false };
    save("notifications", { ...cur, items: [item, ...cur.items].slice(0, 120) });
  }, [save]);

  const act = useCallback((env: string, text: string) => {
    const cur = (docsRef.current.notifications as NotificationsDoc | undefined) ?? { items: [], activity: [] };
    save("notifications", { ...cur, activity: [{ id: uid(), env, text, ts: Date.now() }, ...cur.activity].slice(0, 150) });
  }, [save]);

  const unlock = useCallback((id: string) => {
    const cur = (docsRef.current.achievements as AchievementsDoc | undefined) ?? { unlocked: {} };
    if (cur.unlocked[id]) return;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    save("achievements", { unlocked: { ...cur.unlocked, [id]: Date.now() } });
    if (def) notify(def.env, `Achievement unlocked: ${def.name}`, `${def.desc} · +${def.xp} XP`);
  }, [save, notify]);

  const visit = useCallback((env: string) => {
    if (env === "hub") return;
    const cur = (docsRef.current.profile as ProfileDoc | undefined) ?? (defaultDocs().profile as ProfileDoc);
    const recent = [env, ...cur.recent.filter((e) => e !== env)].slice(0, 4);
    const visited = [...new Set([...(cur.visited ?? []), env])];
    save("profile", { ...cur, recent, visited });
    if (ENVS.every((e) => visited.includes(e.id))) unlock("explorer");
  }, [save, unlock]);

  const value = useMemo<Universe>(
    () => ({ ready, docs, save, remove, notify, act, unlock, visit }),
    [ready, docs, save, remove, notify, act, unlock, visit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function totalXp(docs: Record<string, unknown>): number {
  const a = (docs.achievements as AchievementsDoc | undefined) ?? { unlocked: {} };
  return ACHIEVEMENTS.filter((x) => a.unlocked[x.id]).reduce((s, x) => s + x.xp, 0);
}

// ---------------------------------------------------------------- UI kit
export function Btn(props: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "danger" | "soft";
  disabled?: boolean;
  small?: boolean;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  const kind = props.kind ?? "soft";
  const base: React.CSSProperties = {
    borderRadius: 8,
    fontWeight: 600,
    fontSize: props.small ? 12.5 : 14,
    padding: props.small ? "4px 10px" : "7px 14px",
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.45 : 1,
    border: "1px solid var(--border)",
    minHeight: props.small ? 30 : 36,
    ...props.style,
  };
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "linear-gradient(135deg,#0ea5e9,#2563eb)", color: "#fff", border: "1px solid #1d4ed8" },
    ghost: { background: "transparent", color: "var(--dim)" },
    danger: { background: "rgba(248,113,113,.12)", color: "var(--bad)", border: "1px solid rgba(248,113,113,.4)" },
    soft: { background: "var(--surface2)", color: "var(--text)" },
  };
  return (
    <button type="button" aria-label={props.ariaLabel} disabled={props.disabled} onClick={props.onClick} style={{ ...base, ...styles[kind] }}>
      {props.children}
    </button>
  );
}

export function Panel(props: { children: ReactNode; title?: string; right?: ReactNode; style?: React.CSSProperties; pad?: number }) {
  return (
    <section className="panel glow" style={{ padding: props.pad ?? 14, ...props.style }}>
      {props.title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <h3 className="font-display" style={{ fontSize: 17, letterSpacing: ".06em", color: "var(--text)", margin: 0 }}>{props.title}</h3>
          {props.right}
        </div>
      )}
      {props.children}
    </section>
  );
}

export function Stat(props: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="panel" style={{ padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: 11, letterSpacing: ".08em", color: "var(--dim)", textTransform: "uppercase" }}>{props.label}</div>
      <div className="font-display" style={{ fontSize: 24, fontWeight: 700, color: props.color ?? "var(--text)", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis" }}>{props.value}</div>
      {props.sub && <div style={{ fontSize: 12, color: "var(--dim)" }}>{props.sub}</div>}
    </div>
  );
}

export function Bar(props: { value: number; max?: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, (props.value / (props.max ?? 100)) * 100));
  return (
    <div style={{ background: "#0a1122", borderRadius: 99, height: props.height ?? 8, overflow: "hidden", border: "1px solid var(--border)" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: props.color ?? "var(--accent)", borderRadius: 99, transition: "width .3s" }} />
    </div>
  );
}

export function Chip(props: { children: ReactNode; color?: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      style={{
        borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 600, minHeight: 28,
        border: `1px solid ${props.active ? (props.color ?? "var(--accent)") : "var(--border)"}`,
        background: props.active ? "rgba(56,189,248,.14)" : "var(--surface2)",
        color: props.color ?? "var(--text)", cursor: props.onClick ? "pointer" : "default",
      }}
    >
      {props.children}
    </button>
  );
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ display: "block", fontSize: 12, color: "var(--dim)", marginBottom: 4, letterSpacing: ".04em" }}>{props.label}</span>
      {props.children}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%", background: "#0a1122", border: "1px solid var(--border)", borderRadius: 8,
  color: "var(--text)", padding: "8px 10px", fontSize: 14,
};

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label={props.title}
      style={{ position: "fixed", inset: 0, background: "rgba(2,6,18,.72)", zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}
      onClick={props.onClose}
    >
      <div
        className="panel rise"
        style={{ width: "100%", maxWidth: props.wide ? 860 : 560, maxHeight: "88vh", overflowY: "auto", borderRadius: "14px 14px 0 0", padding: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 className="font-display" style={{ margin: 0, fontSize: 19, letterSpacing: ".05em" }}>{props.title}</h3>
          <Btn small kind="ghost" onClick={props.onClose} ariaLabel="Close dialog">✕</Btn>
        </div>
        {props.children}
      </div>
    </div>
  );
}

export function EmptyState(props: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="panel" style={{ padding: 22, textAlign: "center" }}>
      <div className="font-display" style={{ fontSize: 20, letterSpacing: ".05em", marginBottom: 6 }}>{props.title}</div>
      <p style={{ color: "var(--dim)", fontSize: 14, maxWidth: 460, margin: "0 auto 12px" }}>{props.body}</p>
      {props.children}
    </div>
  );
}

// Tiny safe Markdown renderer (no raw HTML): headings, bold, italics, code
// fences, inline code, bullets and numbered lists.
export function Md({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div style={{ fontSize: 14, lineHeight: 1.55 }}>
      {blocks.map((b, i) => {
        if (b.startsWith("```")) {
          const code = b.replace(/^```[a-z-]*\n?/, "").replace(/```$/, "");
          return <pre key={i} className="font-mono2" style={{ background: "#070d1d", border: "1px solid var(--border)", borderRadius: 8, padding: 10, overflowX: "auto", fontSize: 12.5 }}>{code}</pre>;
        }
        const lines = b.split("\n");
        const isList = lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l));
        if (isList) {
          return (
            <ul key={i} style={{ margin: "4px 0", paddingLeft: 18 }}>
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*]|\d+\.)\s/, ""))}</li>)}
            </ul>
          );
        }
        if (b.startsWith("## ")) return <h4 key={i} style={{ margin: "8px 0 4px", fontSize: 15 }}>{inline(b.slice(3))}</h4>;
        if (b.startsWith("# ")) return <h3 key={i} style={{ margin: "8px 0 4px", fontSize: 16 }}>{inline(b.slice(2))}</h3>;
        return <p key={i} style={{ margin: "4px 0" }}>{inline(b)}</p>;
      })}
    </div>
  );
}
function inline(s: string): ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="font-mono2" style={{ background: "#0a1122", padding: "0 4px", borderRadius: 4, fontSize: 12.5 }}>{p.slice(1, -1)}</code>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
}
