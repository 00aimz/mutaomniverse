// NEXUS — Civilization Simulator. Procedural seeded worlds; every building has
// real effects on the yearly tick (food, energy, taxes, upkeep, research);
// citizens are persistent named people; diplomacy and research are validated
// deterministic mechanics. OMNI advises; the simulation decides.

import { useMemo, useState } from "react";
import {
Bar, Btn, Chip, EmptyState, Modal, Panel, Stat,
fmt, hashSeed, inputStyle, personName, pick, ri, rng, uid, useDoc, useUniverse,
} from "../core";

export interface Citizen { id: string; name: string; age: number; occupation: string; education: string; income: number; mood: string; goal: string }
export interface NexusDoc {
  seedStr: string; worldName: string; year: number; population: number; capacity: number;
  treasury: number; food: number; energy: number; materials: number; happiness: number; research: number;
  terrain: Record<string, number>; buildings: Record<string, number>; researched: string[];
  citizens: Citizen[]; neighbors: Array<{ name: string; relation: number; stance: string; trade: boolean; allied: boolean }>;
  history: Array<{ year: number; text: string }>; taxRate: number;
}

interface Building { id: string; name: string; cost: number; mats: number; upkeep: number; desc: string; needsTech?: string }
export const BUILDINGS: Building[] = [
  { id: "housing", name: "Residential Block", cost: 400, mats: 20, upkeep: 6, desc: "+500 population capacity, +happiness" },
  { id: "farm", name: "Agri-Dome Farm", cost: 300, mats: 15, upkeep: 8, desc: "+900 food per year" },
  { id: "solar", name: "Solar Array", cost: 350, mats: 25, upkeep: 5, desc: "+60 energy per year" },
  { id: "mine", name: "Materials Mine", cost: 380, mats: 10, upkeep: 9, desc: "+40 materials per year" },
  { id: "factory", name: "Factory", cost: 600, mats: 40, upkeep: 18, desc: "+420 treasury/yr, consumes energy & materials" },
  { id: "market", name: "Commercial Market", cost: 450, mats: 20, upkeep: 10, desc: "+260 treasury/yr, +happiness" },
  { id: "school", name: "School", cost: 420, mats: 22, upkeep: 14, desc: "+education, +4 research/yr" },
  { id: "university", name: "University", cost: 900, mats: 50, upkeep: 30, desc: "+26 research/yr, +happiness", needsTech: "education" },
  { id: "hospital", name: "Hospital", cost: 700, mats: 35, upkeep: 26, desc: "+happiness, +population growth" },
  { id: "police", name: "Police Station", cost: 380, mats: 18, upkeep: 16, desc: "+stability & happiness" },
  { id: "park", name: "Central Park", cost: 250, mats: 8, upkeep: 4, desc: "+6 happiness" },
  { id: "lab", name: "Research Center", cost: 800, mats: 45, upkeep: 24, desc: "+34 research/yr", needsTech: "science" },
  { id: "port", name: "Orbital Port", cost: 1200, mats: 80, upkeep: 40, desc: "+trade income with neighbors", needsTech: "logistics" },
  { id: "powerplant", name: "Fusion Plant", cost: 1500, mats: 90, upkeep: 45, desc: "+220 energy/yr", needsTech: "energy" },
];

export const TECHS: Array<{ id: string; name: string; tier: number; cost: number; desc: string }> = [
  { id: "agriculture", name: "Advanced Agriculture", tier: 1, cost: 60, desc: "Farms produce +40% food" },
  { id: "education", name: "Public Education", tier: 1, cost: 60, desc: "Unlocks Universities; schools +research" },
  { id: "science", name: "Scientific Method", tier: 1, cost: 80, desc: "Unlocks Research Centers" },
  { id: "medicine", name: "Modern Medicine", tier: 2, cost: 140, desc: "Hospitals twice as effective" },
  { id: "logistics", name: "Global Logistics", tier: 2, cost: 150, desc: "Unlocks Orbital Ports; trade +50%" },
  { id: "energy", name: "Fusion Energy", tier: 2, cost: 180, desc: "Unlocks Fusion Plants" },
  { id: "computing", name: "Computing", tier: 3, cost: 260, desc: "All research +30%" },
  { id: "ai", name: "Machine Intelligence", tier: 3, cost: 340, desc: "Factories +50% output, +research" },
  { id: "ecology", name: "Planetary Ecology", tier: 3, cost: 300, desc: "Happiness +10 permanently" },
  { id: "spaceflight", name: "Orbital Flight", tier: 4, cost: 500, desc: "Your civilization reaches for ORBIT" },
];

const WORLD_A = ["Aure", "Nov", "Ther", "Cal", "Ost", "Ver", "Zyn", "Hal", "Mir", "Kor"];
const WORLD_B = ["lia", "gard", "mere", "thon", "via", " Prime", "os", "ara", "ion", "eth"];
const OCC = ["Farmer", "Engineer", "Teacher", "Medic", "Trader", "Miner", "Artist", "Guard", "Scientist", "Builder", "Pilot", "Chef"];
const GOALS = ["Raise a family", "Open a workshop", "Study the stars", "Write a history", "Master a craft", "Explore the wilds", "Serve the city", "Invent something new"];
const EVENTS = [
  { text: "A bumper harvest fills the granaries.", food: 300 },
  { text: "A meteor shower inspires a festival of lights.", happy: 4 },
  { text: "Drought strains the farms this year.", food: -260 },
  { text: "Traders from a neighboring land bring exotic goods.", treasury: 220 },
  { text: "A brilliant young engineer patents a new turbine.", research: 40 },
  { text: "Flu season tests the hospitals.", happy: -3 },
  { text: "Miners strike a rich vein of ore.", materials: 60 },
  { text: "A poet's epic about the founding goes viral across the city.", happy: 3 },
];

export function generateWorld(seedStr: string): NexusDoc {
  const r = rng(hashSeed("nexus:" + seedStr));
  const worldName = pick(r, WORLD_A) + pick(r, WORLD_B);
  const biomes = ["Ocean", "Plains", "Forest", "Desert", "Mountains", "Tundra", "Jungle"];
  const terrain: Record<string, number> = {};
  let left = 100;
  biomes.forEach((b, i) => {
    const v = i === biomes.length - 1 ? left : ri(r, 4, Math.max(5, left - 4 * (biomes.length - i - 1)));
    terrain[b] = v; left -= v;
  });
  const citizens: Citizen[] = Array.from({ length: 18 }, () => ({
    id: uid(), name: personName(r), age: ri(r, 19, 68), occupation: pick(r, OCC),
    education: pick(r, ["Secondary", "Vocational", "Bachelor", "Master", "Doctorate"]),
    income: ri(r, 900, 5200), mood: "Content", goal: pick(r, GOALS),
  }));
  const neighbors = Array.from({ length: 3 }, (_, i) => ({
    name: pick(r, WORLD_A) + pick(r, WORLD_B) + (i ? ` ${["II", "III", "IV"][i - 1] ?? ""}` : ""),
    relation: ri(r, 15, 65), stance: pick(r, ["Cautious", "Friendly", "Mercantile", "Proud"]), trade: false, allied: false,
  }));
  return {
    seedStr, worldName, year: 1, population: 2400, capacity: 3000,
    treasury: 5200, food: 2600, energy: 120, materials: 160, happiness: 62, research: 30,
    terrain, buildings: { housing: 4, farm: 3, solar: 2, school: 1 }, researched: [],
    citizens, neighbors, taxRate: 12,
    history: [{ year: 1, text: `The first settlers found ${worldName}. ${fmt(2400)} citizens raise the first banners.` }],
  };
}

export function Nexus() {
  const u = useUniverse();
  const [doc, setDoc] = useDoc<NexusDoc | null>("nexus", null);
  const [seedInput, setSeedInput] = useState("");
  const [tab, setTab] = useState<"city" | "people" | "research" | "diplomacy" | "history">("city");
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);

  const stats = useMemo(() => {
    if (!doc) return null;
    const b = doc.buildings;
    const foodProd = (b.farm ?? 0) * 900 * (doc.researched.includes("agriculture") ? 1.4 : 1);
    const energyProd = (b.solar ?? 0) * 60 + (b.powerplant ?? 0) * 220;
    const energyUse = doc.population / 100 + (b.factory ?? 0) * 8 + (b.lab ?? 0) * 4;
    const upkeep = BUILDINGS.reduce((s, x) => s + (b[x.id] ?? 0) * x.upkeep, 0);
    const taxIncome = doc.population * doc.taxRate * 0.11;
    const researchRate = (b.school ?? 0) * 4 + (b.university ?? 0) * 26 + (b.lab ?? 0) * 34;
    return { foodProd, energyProd, energyUse, upkeep, taxIncome, researchRate };
  }, [doc]);

  if (!doc) {
    return (
      <EmptyState title="No civilization yet" body="Generate a procedural world from a seed — continents, biomes, resources, neighbors and a founding population. The same seed always rebuilds the same world.">
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <input aria-label="World seed" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder="World seed (blank = random)" style={{ ...inputStyle, maxWidth: 260 }} />
          <Btn kind="primary" onClick={() => {
            const w = generateWorld(seedInput.trim() || uid());
            setDoc(w);
            u.unlock("first-world");
            u.act("nexus", `Founded the civilization of ${w.worldName}`);
            u.notify("nexus", "Civilization founded", `${w.worldName} · Year 1 · ${fmt(w.population)} citizens`);
          }}>Generate world</Btn>
        </div>
      </EmptyState>
    );
  }

  const totalBuildings = Object.values(doc.buildings).reduce((s, v) => s + v, 0);

  function build(b: Building) {
    if (!doc) return;
    if (doc.treasury < b.cost || doc.materials < b.mats) return;
    const next: NexusDoc = {
      ...doc,
      treasury: doc.treasury - b.cost,
      materials: doc.materials - b.mats,
      buildings: { ...doc.buildings, [b.id]: (doc.buildings[b.id] ?? 0) + 1 },
      capacity: b.id === "housing" ? doc.capacity + 500 : doc.capacity,
      happiness: Math.min(100, doc.happiness + (b.id === "park" ? 6 : b.id === "housing" || b.id === "market" ? 1 : 0)),
      history: [...doc.history, { year: doc.year, text: `Construction completed: ${b.name} #${(doc.buildings[b.id] ?? 0) + 1}.` }],
    };
    setDoc(next);
    u.act("nexus", `Built ${b.name} in ${doc.worldName}`);
    if (Object.values(next.buildings).reduce((s, v) => s + v, 0) >= 10) u.unlock("city-builder");
  }

  function advanceYear() {
    if (!doc || !stats) return;
    const r = rng(hashSeed(`nexus:${doc.seedStr}:${doc.year}`));
    const ev = pick(r, EVENTS);
    const foodNet = stats.foodProd - doc.population * 0.9;
    const energyBalance = doc.energy + stats.energyProd - stats.energyUse;
    const tradeIncome = doc.neighbors.reduce((s, n) => s + (n.trade ? 130 * (doc.researched.includes("logistics") ? 1.5 : 1) : 0), 0)
      + (doc.buildings.port ?? 0) * 90;
    const factoryIncome = (doc.buildings.factory ?? 0) * 420 * (doc.researched.includes("ai") ? 1.5 : 1);
    const marketIncome = (doc.buildings.market ?? 0) * 260;
    const treasury = Math.max(0, doc.treasury + stats.taxIncome + tradeIncome + factoryIncome + marketIncome - stats.upkeep);
    const food = Math.max(0, doc.food + foodNet + (ev.food ?? 0));
    let happiness = doc.happiness + (ev.happy ?? 0)
      + (foodNet < 0 ? -6 : 2) + (energyBalance < 0 ? -5 : 1)
      + (doc.buildings.hospital ?? 0) * 0.6 + (doc.buildings.police ?? 0) * 0.4;
    if (doc.researched.includes("ecology")) happiness += 0.5;
    happiness = Math.max(2, Math.min(99, happiness));
    const growthRate = (happiness - 45) / 900 + (foodNet > 0 ? 0.012 : -0.02) + (doc.buildings.hospital ?? 0) * 0.002 * (doc.researched.includes("medicine") ? 2 : 1);
    const population = Math.max(120, Math.min(doc.capacity, Math.round(doc.population * (1 + growthRate))));
    const citizens = doc.citizens.map((c) => ({
      ...c, age: c.age + 1,
      mood: happiness > 70 ? pick(r, ["Joyful", "Content", "Hopeful"]) : happiness > 45 ? "Content" : pick(r, ["Worried", "Tired", "Restless"]),
    }));
    while (citizens.length < Math.min(60, 18 + Math.floor((population - 2400) / 900)) && citizens.length < 60) {
      citizens.push({ id: uid(), name: personName(r), age: ri(r, 18, 40), occupation: pick(r, OCC), education: pick(r, ["Secondary", "Vocational", "Bachelor"]), income: ri(r, 900, 4200), mood: "Hopeful", goal: pick(r, GOALS) });
    }
    const next: NexusDoc = {
      ...doc, year: doc.year + 1, population, treasury: Math.round(treasury), food: Math.round(food),
      energy: Math.max(0, Math.round(energyBalance)), materials: doc.materials + (doc.buildings.mine ?? 0) * 40 - (doc.buildings.factory ?? 0) * 6 + (ev.materials ?? 0),
      happiness: Math.round(happiness), research: Math.round(doc.research + stats.researchRate * (doc.researched.includes("computing") ? 1.3 : 1) + (ev.research ?? 0)),
      citizens,
      history: [...doc.history, { year: doc.year + 1, text: ev.text }, ...(population >= doc.capacity ? [{ year: doc.year + 1, text: "The city is full — build more Residential Blocks to grow." }] : [])].slice(-80),
    };
    setDoc(next);
    u.act("nexus", `Year ${next.year} begins in ${doc.worldName} · pop ${fmt(next.population)}`);
  }

  function researchTech(t: (typeof TECHS)[number]) {
    if (!doc || doc.research < t.cost || doc.researched.includes(t.id)) return;
    setDoc({ ...doc, research: doc.research - t.cost, researched: [...doc.researched, t.id], history: [...doc.history, { year: doc.year, text: `Breakthrough: ${t.name} researched.` }] });
    u.act("nexus", `Researched ${t.name}`);
    if (t.id === "spaceflight") u.notify("nexus", "Orbital Flight achieved", "Your civilization can now reach for the stars — visit ORBIT.");
  }

  function diplomacy(i: number, kind: "gift" | "trade" | "ally") {
    if (!doc) return;
    const neighbors = doc.neighbors.map((n, j) => {
      if (j !== i) return n;
      if (kind === "gift") return { ...n, relation: Math.min(100, n.relation + 12) };
      if (kind === "trade") return { ...n, trade: !n.trade, relation: n.relation + (n.trade ? 0 : 3) };
      return { ...n, allied: true, relation: Math.min(100, n.relation + 8) };
    });
    const cost = kind === "gift" ? 300 : 0;
    if (kind === "gift" && doc.treasury < cost) return;
    const n = neighbors[i];
    setDoc({ ...doc, neighbors, treasury: doc.treasury - cost, history: [...doc.history, { year: doc.year, text: kind === "gift" ? `A gift of 300 credits improves relations with ${n?.name}.` : kind === "trade" ? `Trade ${n?.trade ? "agreement signed" : "agreement ended"} with ${n?.name}.` : `Alliance sealed with ${n?.name}.` }] });
    u.act("nexus", `Diplomacy: ${kind} with ${n?.name}`);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 26, letterSpacing: ".05em" }}>{doc.worldName}</h2>
          <div style={{ color: "var(--dim)", fontSize: 13 }}>Year {doc.year} · Seed <span className="font-mono2">{doc.seedStr}</span> · {totalBuildings} buildings</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => window.dispatchEvent(new CustomEvent("open-omni"))}>Ask OMNI advisor</Btn>
          <Btn kind="primary" onClick={advanceYear}>Advance year ▸</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        <Stat label="Population" value={fmt(doc.population)} sub={`capacity ${fmt(doc.capacity)}`} />
        <Stat label="Treasury" value={fmt(doc.treasury)} sub={`tax ${doc.taxRate}% · upkeep ${fmt(stats?.upkeep ?? 0)}/yr`} color="var(--warn)" />
        <Stat label="Food" value={fmt(doc.food)} sub={`${(stats?.foodProd ?? 0) >= doc.population * 0.9 ? "surplus" : "deficit"} · farms make ${fmt(stats?.foodProd ?? 0)}/yr`} color={doc.food < doc.population * 0.3 ? "var(--bad)" : "var(--good)"} />
        <Stat label="Energy" value={fmt(doc.energy)} sub={`${fmt(stats?.energyProd ?? 0)} made · ${fmt(Math.round(stats?.energyUse ?? 0))} used`} />
        <Stat label="Materials" value={fmt(doc.materials)} />
        <Stat label="Research" value={fmt(doc.research)} sub={`+${fmt(stats?.researchRate ?? 0)}/yr`} color="var(--violet)" />
      </div>

      <Panel title="Happiness">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}><Bar value={doc.happiness} color={doc.happiness > 60 ? "var(--good)" : doc.happiness > 40 ? "var(--warn)" : "var(--bad)"} height={10} /></div>
          <strong>{Math.round(doc.happiness)}%</strong>
          <label style={{ fontSize: 13, color: "var(--dim)" }}>Tax rate
            <input aria-label="Tax rate percent" type="number" min={0} max={40} value={doc.taxRate} onChange={(e) => setDoc({ ...doc, taxRate: Math.max(0, Math.min(40, Number(e.target.value) || 0)), happiness: Math.max(2, Math.min(99, doc.happiness - ((Number(e.target.value) || 0) - doc.taxRate) * 0.4)) })} style={{ ...inputStyle, width: 70, marginLeft: 6, display: "inline-block" }} />
          </label>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          {Object.entries(doc.terrain).map(([b, v]) => <Chip key={b}>{b} {v}%</Chip>)}
        </div>
      </Panel>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="tablist" aria-label="NEXUS sections">
        {(["city", "people", "research", "diplomacy", "history"] as const).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)} color="#38bdf8">{t[0]?.toUpperCase() + t.slice(1)}</Chip>
        ))}
      </div>

      {tab === "city" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 8 }}>
          {BUILDINGS.map((b) => {
            const locked = b.needsTech && !doc.researched.includes(b.needsTech);
            const afford = doc.treasury >= b.cost && doc.materials >= b.mats;
            return (
              <div key={b.id} className="panel" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{b.name}</strong><Chip color="#38bdf8">×{doc.buildings[b.id] ?? 0}</Chip>
                </div>
                <p style={{ color: "var(--dim)", fontSize: 13, margin: "6px 0" }}>{b.desc}</p>
                <div className="font-mono2" style={{ fontSize: 12, color: "var(--dim)" }}>{b.cost} cr · {b.mats} mats · upkeep {b.upkeep}/yr</div>
                <Btn small kind="primary" disabled={!!locked || !afford} onClick={() => build(b)} style={{ marginTop: 8 }}>
                  {locked ? `Requires ${TECHS.find((t) => t.id === b.needsTech)?.name}` : afford ? "Build" : "Can't afford"}
                </Btn>
              </div>
            );
          })}
        </div>
      )}

      {tab === "people" && (
        <Panel title={`Notable citizens (${doc.citizens.length} of ${fmt(doc.population)})`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
            {doc.citizens.map((c) => (
              <button key={c.id} type="button" onClick={() => setCitizen(c)} style={{ textAlign: "left", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, color: "var(--text)", cursor: "pointer" }}>
                <strong>{c.name}</strong>
                <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{c.occupation} · age {c.age} · {c.mood}</div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {tab === "research" && (
        <div style={{ display: "grid", gap: 8 }}>
          {[1, 2, 3, 4].map((tier) => (
            <Panel key={tier} title={`Tier ${tier}`} pad={12}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 8 }}>
                {TECHS.filter((t) => t.tier === tier).map((t) => {
                  const done = doc.researched.includes(t.id);
                  return (
                    <div key={t.id} className="panel" style={{ padding: 10, opacity: done ? 0.75 : 1 }}>
                      <strong>{t.name}</strong> {done && <Chip color="var(--good)">Researched</Chip>}
                      <p style={{ color: "var(--dim)", fontSize: 13, margin: "5px 0" }}>{t.desc}</p>
                      {!done && <Btn small disabled={doc.research < t.cost} onClick={() => researchTech(t)}>Research · {t.cost} pts</Btn>}
                    </div>
                  );
                })}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {tab === "diplomacy" && (
        <div style={{ display: "grid", gap: 8 }}>
          {doc.neighbors.map((n, i) => (
            <Panel key={n.name} pad={12}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{n.name}</strong>
                  <div style={{ fontSize: 13, color: "var(--dim)" }}>{n.stance} · {n.trade ? "Trade pact active (+130 cr/yr) · " : ""}{n.allied ? "Allied" : "Not allied"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, maxWidth: 260 }}><span style={{ fontSize: 12, color: "var(--dim)" }}>Relations {n.relation}</span><div style={{ flex: 1 }}><Bar value={n.relation} color="var(--accent2)" /></div></div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Btn small disabled={doc.treasury < 300} onClick={() => diplomacy(i, "gift")}>Send gift · 300cr</Btn>
                  <Btn small onClick={() => diplomacy(i, "trade")}>{n.trade ? "End trade pact" : "Propose trade pact"}</Btn>
                  <Btn small kind="primary" disabled={n.allied || n.relation < 60} onClick={() => diplomacy(i, "ally")}>{n.allied ? "Allied" : n.relation < 60 ? "Alliance needs 60 relations" : "Form alliance"}</Btn>
                </div>
              </div>
            </Panel>
          ))}
          <p style={{ fontSize: 13, color: "var(--dim)" }}>For negotiation dialogue, open OMNI and ask it to draft terms — OMNI advises, but pacts only change when you use the validated controls above.</p>
        </div>
      )}

      {tab === "history" && (
        <Panel title="World history">
          <div style={{ display: "grid", gap: 0 }}>
            {[...doc.history].reverse().map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="font-mono2" style={{ color: "var(--accent)", fontSize: 13, minWidth: 62 }}>Year {h.year}</span>
                <span style={{ fontSize: 14 }}>{h.text}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {confirmNew
          ? <><Btn kind="danger" onClick={() => setDoc(null)}>Confirm: abandon {doc.worldName}</Btn><Btn kind="ghost" onClick={() => setConfirmNew(false)}>Keep it</Btn></>
          : <Btn kind="ghost" onClick={() => setConfirmNew(true)}>New world…</Btn>}
        <Btn kind="ghost" onClick={() => u.remove("nexus")}>Reset NEXUS</Btn>
      </div>

      {citizen && (
        <Modal title={citizen.name} onClose={() => setCitizen(null)}>
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <div>Occupation: <strong>{citizen.occupation}</strong></div>
            <div>Age: {citizen.age} · Education: {citizen.education}</div>
            <div>Income: {fmt(citizen.income)} cr/yr · Mood: {citizen.mood}</div>
            <div>Personal goal: {citizen.goal}</div>
            <p style={{ color: "var(--dim)" }}>Citizens react to the city: mood follows happiness, and new citizens arrive as the population grows. For a conversation, open OMNI — it can roleplay this citizen using this profile.</p>
            <Btn onClick={() => { setCitizen(null); window.dispatchEvent(new CustomEvent("open-omni")); }}>Talk via OMNI</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
