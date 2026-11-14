// Cross-environment services: OMNI context summaries and the global search
// index. Both are computed from the live document store, so OMNI always
// reasons over real simulation state and search always finds real content.

import { ENVS, fmt } from "./core";

type AnyDoc = Record<string, unknown>;
function obj(v: unknown): AnyDoc {
  return typeof v === "object" && v !== null ? (v as AnyDoc) : {};
}
function arr(v: unknown): AnyDoc[] {
  return Array.isArray(v) ? (v as AnyDoc[]) : [];
}
function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}
function str(v: unknown, d = ""): string {
  return typeof v === "string" ? v : d;
}

export function contextFor(env: string, docs: Record<string, unknown>): string {
  switch (env) {
    case "nexus": {
      const d = obj(docs.nexus);
      if (!d.worldName) return "No NEXUS civilization exists yet. The user has not generated a world.";
      const buildings = obj(d.buildings);
      const built = Object.values(buildings).reduce((s: number, v) => s + num(v), 0);
      const researched = Array.isArray(d.researched) ? d.researched.length : 0;
      return `Civilization "${str(d.worldName)}", Year ${num(d.year, 1)}. Population ${fmt(num(d.population))}, treasury ${fmt(num(d.treasury))} credits, food ${fmt(num(d.food))}, energy ${fmt(num(d.energy))}, materials ${fmt(num(d.materials))}, happiness ${Math.round(num(d.happiness))}%, research points ${fmt(num(d.research))}. Buildings constructed: ${built}. Technologies researched: ${researched}. Neighbors: ${arr(d.neighbors).map((n) => `${str(n.name)} (relations ${num(n.relation)})`).join(", ") || "none"}.`;
    }
    case "orbit": {
      const d = obj(docs.orbit);
      const systems = arr(d.systems);
      const planets = systems.flatMap((s) => arr(s.planets));
      return `ORBIT universe seed ${str(d.seedStr, "—")}. Credits ${fmt(num(d.credits))}, science ${fmt(num(d.science))}. ${systems.length} star systems charted, ${planets.filter((p) => p.scanned).length} planets scanned, ${planets.filter((p) => p.outpost).length} outposts, ${planets.filter((p) => p.colony).length} colonies. Ships: ${arr(d.ships).map((s) => `${str(s.name)} (${str(s.class)})`).join(", ") || "none"}. Alien civilizations contacted: ${arr(d.civs).map((c) => str(c.name)).join(", ") || "none"}.`;
    }
    case "sonora": {
      const d = obj(docs.sonora);
      return `SONORA studio: ${arr(d.projects).length} music projects (${arr(d.projects).map((p) => `"${str(p.name)}" at ${num(p.bpm, 120)} BPM`).join(", ") || "none"}), ${arr(d.artists).length} artists, ${arr(d.albums).length} albums released.`;
    }
    case "empire": {
      const d = obj(docs.empire);
      const c = obj(d.company);
      if (!c.name) return "No EMPIRE company founded yet.";
      const hist = arr(d.history);
      const last = hist[hist.length - 1];
      return `Company "${str(c.name)}" (${str(c.industry)}), month ${num(c.month, 1)}. Cash ${fmt(num(c.cash))}, reputation ${Math.round(num(c.reputation))}, customer satisfaction ${Math.round(num(c.satisfaction))}%, employees ${num(obj(d.staff).count)}. Products: ${arr(d.products).map((p) => `${str(p.name)} (${str(p.stage)}, price ${num(p.price)})`).join(", ") || "none"}. ${last ? `Last month: revenue ${fmt(num(last.revenue))}, profit ${fmt(num(last.profit))}.` : "No months simulated yet."} Competitors: ${arr(d.competitors).map((x) => `${str(x.name)} ${Math.round(num(x.share))}% share`).join(", ")}.`;
    }
    case "casefile": {
      const d = obj(docs.casefile);
      const active = arr(d.cases).find((c) => str(obj(c.progress).status) === "open");
      const base = `CASEFILE: ${arr(d.cases).length} fictional cases; ${arr(d.cases).filter((c) => str(obj(c.progress).status) === "closed").length} closed.`;
      if (!active) return base + " No case currently open.";
      const prog = obj(active.progress);
      return `${base} Open case: "${str(active.title)}" (${str(active.category)}). Evidence found: ${(Array.isArray(prog.foundEvidence) ? prog.foundEvidence.length : 0)} of ${arr(active.evidence).length}. Suspects: ${arr(active.suspects).map((s) => str(s.name)).join(", ")}. Do not reveal the culprit unless the user explicitly asks for a spoiler.`;
    }
    case "aether": {
      const d = obj(docs.aether);
      const files = arr(d.files);
      return `AETHER virtual OS: ${files.length} files/folders in the virtual drive (virtual only — not the user's real computer), ${arr(d.events).length} calendar events. Apps: File Manager, Text Editor, Terminal, Calendar, Calculator, internal Browser.`;
    }
    case "chronicles": {
      const d = obj(docs.chronicles);
      const h = obj(d.hero);
      if (!h.name) return "No CHRONICLES hero created yet.";
      return `Kingdom of ${str(d.kingdom)}. Hero ${str(h.name)}, ${str(h.class)} level ${num(h.level, 1)}, HP ${num(h.hp)}/${num(h.maxHp)}, gold ${num(h.gold)}, XP ${num(h.xp)}. Active quests: ${arr(d.quests).filter((q) => str(q.status) === "active").map((q) => str(q.title)).join(", ") || "none"}. Inventory: ${arr(d.inventory).map((i) => str(i.name)).join(", ") || "empty"}.`;
    }
    case "sentinel": {
      const d = obj(docs.sentinel);
      const alerts = arr(d.alerts);
      return `SENTINEL (ALL DATA SIMULATED): ${alerts.length} simulated alerts — ${alerts.filter((a) => str(a.status) === "open").length} open, ${alerts.filter((a) => str(a.severity) === "critical" && str(a.status) !== "resolved").length} critical unresolved. Investigations: ${arr(d.investigations).length}. Labs completed: ${Object.keys(obj(d.labs)).length}. File baselines tracked: ${arr(d.hashes).length}.`;
    }
    default: {
      const profile = obj(docs.profile);
      return `OMNIVERSE Hub. User: ${str(profile.name, "Explorer")}. Environments: ${ENVS.map((e) => e.name).join(", ")}. One profile, one notification center, one OMNI assistant across all of them.`;
    }
  }
}

export interface SearchHit { env: string; label: string; detail: string }

export function searchIndex(docs: Record<string, unknown>): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const e of ENVS) hits.push({ env: e.id, label: e.name, detail: `${e.tag} — ${e.desc}` });

  const nexus = obj(docs.nexus);
  if (nexus.worldName) {
    hits.push({ env: "nexus", label: `Civilization: ${str(nexus.worldName)}`, detail: `Year ${num(nexus.year, 1)} · population ${fmt(num(nexus.population))}` });
    for (const c of arr(nexus.citizens)) hits.push({ env: "nexus", label: `Citizen: ${str(c.name)}`, detail: `${str(c.occupation)} · age ${num(c.age)} · ${str(nexus.worldName)}` });
    for (const t of Array.isArray(nexus.researched) ? (nexus.researched as string[]) : [])
      hits.push({ env: "nexus", label: `Research: ${t}`, detail: "Researched technology in NEXUS" });
    for (const n of arr(nexus.neighbors)) hits.push({ env: "nexus", label: `Neighbor: ${str(n.name)}`, detail: `Diplomatic relations ${num(n.relation)}` });
  }

  const orbit = obj(docs.orbit);
  for (const s of arr(orbit.systems)) {
    hits.push({ env: "orbit", label: `Star system: ${str(s.name)}`, detail: `${arr(s.planets).length} planets` });
    for (const p of arr(s.planets))
      hits.push({ env: "orbit", label: `Planet: ${str(p.name)}`, detail: `${str(p.type)} world in ${str(s.name)}${p.scanned ? " · scanned" : ""}${p.colony ? " · colony" : ""}` });
  }
  for (const sh of arr(orbit.ships)) hits.push({ env: "orbit", label: `Ship: ${str(sh.name)}`, detail: `${str(sh.class)} · fuel ${num(sh.fuel)}` });
  for (const c of arr(orbit.civs)) hits.push({ env: "orbit", label: `Civilization: ${str(c.name)}`, detail: `Alien civilization · relations ${num(c.relation)}` });

  const sonora = obj(docs.sonora);
  for (const p of arr(sonora.projects)) hits.push({ env: "sonora", label: `Track project: ${str(p.name)}`, detail: `${num(p.bpm, 120)} BPM · ${arr(p.tracks).length} tracks` });
  for (const a of arr(sonora.artists)) hits.push({ env: "sonora", label: `Artist: ${str(a.name)}`, detail: str(a.genre) });
  for (const a of arr(sonora.albums)) hits.push({ env: "sonora", label: `Album: ${str(a.title)}`, detail: `Released ${str(a.year)}` });

  const empire = obj(docs.empire);
  const comp = obj(empire.company);
  if (comp.name) hits.push({ env: "empire", label: `Company: ${str(comp.name)}`, detail: `${str(comp.industry)} · cash ${fmt(num(comp.cash))}` });
  for (const p of arr(empire.products)) hits.push({ env: "empire", label: `Product: ${str(p.name)}`, detail: `${str(p.stage)} · price ${num(p.price)}` });
  for (const c of arr(empire.competitors)) hits.push({ env: "empire", label: `Competitor: ${str(c.name)}`, detail: `${Math.round(num(c.share))}% market share` });

  const cf = obj(docs.casefile);
  for (const c of arr(cf.cases)) {
    hits.push({ env: "casefile", label: `Case: ${str(c.title)}`, detail: `${str(c.category)} · ${str(obj(c.progress).status, "not started")}` });
    for (const s of arr(c.suspects)) hits.push({ env: "casefile", label: `Suspect: ${str(s.name)}`, detail: `${str(s.role)} · ${str(c.title)}` });
    for (const ev of arr(c.evidence)) hits.push({ env: "casefile", label: `Evidence: ${str(ev.title)}`, detail: `${str(ev.kind)} · ${str(c.title)}` });
  }

  const aether = obj(docs.aether);
  for (const f of arr(aether.files)) hits.push({ env: "aether", label: `${str(f.type) === "folder" ? "Folder" : "File"}: ${str(f.name)}`, detail: "AETHER virtual drive" });

  const chron = obj(docs.chronicles);
  const hero = obj(chron.hero);
  if (hero.name) hits.push({ env: "chronicles", label: `Hero: ${str(hero.name)}`, detail: `${str(hero.class)} · level ${num(hero.level, 1)} · ${str(chron.kingdom)}` });
  for (const q of arr(chron.quests)) hits.push({ env: "chronicles", label: `Quest: ${str(q.title)}`, detail: str(q.status) });
  for (const l of arr(chron.locations)) hits.push({ env: "chronicles", label: `Location: ${str(l.name)}`, detail: `${str(l.kind)} · ${str(chron.kingdom)}` });
  for (const f of arr(chron.factions)) hits.push({ env: "chronicles", label: `Faction: ${str(f.name)}`, detail: `Reputation ${num(f.rep)}` });

  const sent = obj(docs.sentinel);
  for (const a of arr(sent.alerts)) hits.push({ env: "sentinel", label: `Alert: ${str(a.title)}`, detail: `SIMULATED · ${str(a.severity)} · ${str(a.status)}` });
  for (const t of arr(sent.threats)) hits.push({ env: "sentinel", label: `Threat: ${str(t.name)}`, detail: `SIMULATED · ${str(t.category)}` });
  for (const v of arr(sent.vulns)) hits.push({ env: "sentinel", label: `Finding: ${str(v.title)}`, detail: `SIMULATED · ${str(v.severity)} · ${str(v.status)}` });

  const proj = obj(docs.projects);
  for (const p of arr(proj.projects)) hits.push({ env: "hub", label: `Project: ${str(p.name)}`, detail: str(p.desc) || "Cross-environment project" });

  return hits;
}

export const SUGGESTIONS: Record<string, string[]> = {
  hub: ["What should I focus on across my universe?", "Summarize everything happening right now", "Give me a creative idea that links two environments"],
  nexus: ["What should I build next, and why?", "Explain my economy like I'm a new mayor", "Draft a diplomatic message to my strongest neighbor"],
  orbit: ["What is my most promising unexplored planet?", "Plan my next expedition", "Explain the civilizations I have contacted"],
  sonora: ["Suggest a chord progression for my current project", "Give me a beat idea in a new genre", "Write an album concept for my artist"],
  empire: ["Analyze my company's real numbers — where am I leaking money?", "How do I beat my biggest competitor?", "Should I launch a new product or improve the current one?"],
  casefile: ["Summarize the evidence I have found so far", "Which questions have I not asked yet?", "Point out contradictions in the statements (no spoilers)"],
  aether: ["How do I organize my virtual files?", "Explain what each AETHER app does", "Suggest a workflow using the Editor and Calendar"],
  chronicles: ["Narrate my hero's story so far", "What quest should I take next?", "Describe the factions and who I should befriend"],
  sentinel: ["Explain my most critical open alert", "Teach me how file hashing detects tampering", "Quiz me on phishing red flags"],
};
