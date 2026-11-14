// OMNIVERSE HUB — the central home: one profile, live tiles for all eight
// environments (each tile reads that environment's real state), recent
// activity, shared projects that link environments, and achievements.

import { useState } from "react";
import {
ACHIEVEMENTS, Btn, Chip, ENVS, Panel, Stat,
fmt, inputStyle, money, totalXp, uid, useDoc, useUniverse,
type NotificationsDoc, type ProjectsDoc,
} from "../core";

type AnyDoc = Record<string, unknown>;
const obj = (v: unknown): AnyDoc => (typeof v === "object" && v !== null ? (v as AnyDoc) : {});
const arr = (v: unknown): AnyDoc[] => (Array.isArray(v) ? (v as AnyDoc[]) : []);
const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);

export function tileStat(env: string, docs: Record<string, unknown>): string {
  switch (env) {
    case "nexus": { const d = obj(docs.nexus); return d.worldName ? `${str(d.worldName)} · Year ${num(d.year, 1)} · pop ${fmt(num(d.population))}` : "No world yet — generate one"; }
    case "orbit": { const d = obj(docs.orbit); const planets = arr(d.systems).flatMap((s) => arr(s.planets)); return d.systems ? `${planets.filter((p) => p.scanned).length}/${planets.length} planets scanned · ${arr(d.ships).length} ships` : "Universe uncharted"; }
    case "sonora": { const d = obj(docs.sonora); const np = arr(d.projects).length; const na = arr(d.albums).length; return `${np} project${np === 1 ? "" : "s"} · ${na} album${na === 1 ? "" : "s"}`; }
    case "empire": { const d = obj(docs.empire); const c = obj(d.company); return c.name ? `${str(c.name)} · ${money(num(c.cash))} · month ${num(c.month, 1)}` : "No company founded"; }
    case "casefile": { const d = obj(docs.casefile); return `${arr(d.cases).filter((c) => str(obj(c.progress).status) === "closed").length}/${arr(d.cases).length} cases closed`; }
    case "aether": { const d = obj(docs.aether); return `${arr(d.files).length} virtual files · ${arr(d.events).length} events`; }
    case "chronicles": { const d = obj(docs.chronicles); const h = obj(d.hero); return h.name ? `${str(h.name)} · level ${num(h.level, 1)} · ${str(d.kingdom)}` : "No hero yet"; }
    case "sentinel": { const d = obj(docs.sentinel); const a = arr(d.alerts); return `${a.filter((x) => str(x.status) !== "resolved").length} open simulated alerts`; }
    default: return "";
  }
}

export function Hub({ go }: { go: (env: string) => void }) {
  const u = useUniverse();
  const profile = obj(u.docs.profile);
  const notifs = (u.docs.notifications as NotificationsDoc | undefined) ?? { items: [], activity: [] };
  const ach = obj(u.docs.achievements);
  const unlocked = obj(ach.unlocked);
  const xp = totalXp(u.docs);
  const level = Math.floor(xp / 150) + 1;
  const favorites = Array.isArray(profile.favorites) ? (profile.favorites as string[]) : [];
  const recent = Array.isArray(profile.recent) ? (profile.recent as string[]) : [];

  const [projects, setProjects] = useDoc<ProjectsDoc>("projects", { projects: [] });
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pLinks, setPLinks] = useState<string[]>([]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="panel glow" style={{ padding: 18, background: "radial-gradient(ellipse at 85% 0%, rgba(124,58,237,.28), transparent 55%), linear-gradient(180deg, var(--surface2), var(--surface))" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12.5, color: "var(--accent2)", letterSpacing: ".14em" }}>WELCOME BACK</div>
            <h2 className="font-display" style={{ margin: "2px 0", fontSize: 30, letterSpacing: ".04em" }}>{str(profile.name, "Explorer")} · {str(profile.title, "Universe Architect")}</h2>
            <div style={{ color: "var(--dim)", fontSize: 14 }}>One identity, one assistant, eight living environments — everything exactly where you left it.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Stat label="Universe level" value={String(level)} sub={`${xp} XP`} />
            <Stat label="Achievements" value={`${Object.keys(unlocked).length}/${ACHIEVEMENTS.length}`} />
            <Stat label="Unread" value={String(notifs.items.filter((i) => !i.read).length)} sub="notifications" />
          </div>
        </div>
        {recent.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "var(--dim)" }}>Jump back in:</span>
            {recent.map((e) => { const m = ENVS.find((x) => x.id === e); return m ? <Chip key={e} onClick={() => go(e)} color={m.color}>{m.glyph} {m.name}</Chip> : null; })}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display" style={{ letterSpacing: ".06em", margin: "0 0 8px", fontSize: 18 }}>ENVIRONMENTS</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
          {ENVS.map((e) => (
            <button key={e.id} type="button" onClick={() => go(e.id)} className="panel"
              style={{ textAlign: "left", padding: 14, cursor: "pointer", color: "var(--text)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: e.color }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 26, color: e.color }}>{e.glyph}</span>
                <span role="button" aria-label={`${favorites.includes(e.id) ? "Unfavorite" : "Favorite"} ${e.name}`}
                  onClick={(ev) => { ev.stopPropagation(); const p = obj(u.docs.profile); const fav = Array.isArray(p.favorites) ? (p.favorites as string[]) : []; u.save("profile", { ...p, favorites: fav.includes(e.id) ? fav.filter((f) => f !== e.id) : [...fav, e.id] }); }}
                  style={{ color: favorites.includes(e.id) ? "var(--warn)" : "var(--dim)", fontSize: 18, padding: 2 }}>{favorites.includes(e.id) ? "★" : "☆"}</span>
              </div>
              <div className="font-display" style={{ fontSize: 21, letterSpacing: ".07em", marginTop: 4 }}>{e.name}</div>
              <div style={{ fontSize: 12.5, color: e.color, fontWeight: 600 }}>{e.tag}</div>
              <div style={{ fontSize: 13, color: "var(--dim)", margin: "5px 0 8px", minHeight: 34 }}>{e.desc}</div>
              <div className="font-mono2" style={{ fontSize: 12, color: "var(--text)", background: "#0a1122", borderRadius: 6, padding: "5px 8px" }}>{tileStat(e.id, u.docs)}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
        <Panel title="Recent activity">
          {notifs.activity.length === 0 && <p style={{ color: "var(--dim)", fontSize: 14, margin: 0 }}>Nothing yet — found a civilization, chart a universe, or open a case and your story will appear here.</p>}
          <div style={{ display: "grid", gap: 6, maxHeight: 260, overflowY: "auto" }} className="scrollthin">
            {notifs.activity.slice(0, 14).map((a) => (
              <button key={a.id} type="button" onClick={() => go(a.env)} style={{ textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text)", padding: "5px 2px", cursor: "pointer", fontSize: 13.5 }}>
                <span style={{ color: ENVS.find((e) => e.id === a.env)?.color ?? "var(--dim)", fontWeight: 700 }}>{a.env.toUpperCase()}</span> · {a.text}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Shared projects — link the universe together">
          <div style={{ display: "grid", gap: 8 }}>
            {projects.projects.map((p) => (
              <div key={p.id} className="panel" style={{ padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 14.5 }}>{p.name}</strong>
                  <Btn small kind="ghost" onClick={() => setProjects({ projects: projects.projects.filter((x) => x.id !== p.id) })}>Delete</Btn>
                </div>
                {p.desc && <div style={{ fontSize: 13, color: "var(--dim)" }}>{p.desc}</div>}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                  {p.links.map((l, i) => <Chip key={i} onClick={() => go(l.env)} color={ENVS.find((e) => e.id === l.env)?.color}>{l.label}</Chip>)}
                </div>
              </div>
            ))}
            <input aria-label="Project name" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Project name — e.g. Meridian Technologies" style={inputStyle} />
            <input aria-label="Project description" value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="What connects these worlds?" style={inputStyle} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {ENVS.map((e) => (
                <Chip key={e.id} active={pLinks.includes(e.id)} onClick={() => setPLinks(pLinks.includes(e.id) ? pLinks.filter((x) => x !== e.id) : [...pLinks, e.id])} color={e.color}>{e.name}</Chip>
              ))}
            </div>
            <Btn small kind="primary" disabled={!pName.trim()} onClick={() => {
              const proj = { id: uid(), name: pName.trim(), desc: pDesc.trim(), links: pLinks.map((env) => ({ env, label: ENVS.find((e) => e.id === env)?.name ?? env })), createdAt: Date.now() };
              setProjects({ projects: [proj, ...projects.projects] });
              if (pLinks.length >= 2) u.unlock("project-linked");
              u.act("hub", `Created shared project "${proj.name}"`);
              setPName(""); setPDesc(""); setPLinks([]);
            }}>Create project</Btn>
            <p style={{ fontSize: 12.5, color: "var(--dim)", margin: 0 }}>Example: found the company in EMPIRE, draft its plan in AETHER, score its launch track in SONORA, and audit it in SENTINEL — one project, four environments.</p>
          </div>
        </Panel>
      </div>

      <Panel title="Achievements">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8 }}>
          {ACHIEVEMENTS.map((a) => {
            const got = !!unlocked[a.id];
            return (
              <div key={a.id} className="panel" style={{ padding: 10, opacity: got ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 14 }}>{a.name}</strong>
                  <span style={{ color: got ? "var(--warn)" : "var(--dim)", fontSize: 15 }}>{got ? "★" : "☆"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{a.desc}</div>
                <div className="font-mono2" style={{ fontSize: 11.5, color: "var(--dim)" }}>{a.env.toUpperCase()} · {a.xp} XP{got ? ` · ${new Date(num(unlocked[a.id])).toLocaleDateString("en-CA")}` : ""}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
