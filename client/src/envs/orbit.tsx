// ORBIT — Space Exploration Simulator. Seeded procedural universe: star
// systems, planets with real attributes, spacecraft with fuel/cargo/crew,
// scanning and exploration, outposts/colonies, alien civilizations with
// diplomacy, and a science research tree. Deterministic from the seed.

import { useMemo, useState } from "react";
import {
Btn, Chip, EmptyState, Modal, Panel, Stat,
fmt, hashSeed, inputStyle, pick, ri, rng, uid, useDoc, useUniverse,
} from "../core";

export interface Planet {
  id: string; name: string; type: string; size: number; gravity: number; temp: number;
  atmosphere: string; resources: string[]; life: boolean; civId?: string;
  scanned: boolean; explored: boolean; outpost: boolean; colony: boolean; data: number;
}
export interface System { id: string; name: string; star: string; x: number; y: number; planets: Planet[] }
export interface Ship { id: string; name: string; cls: string; fuel: number; maxFuel: number; cargo: number; crew: number; systemId: string; hull: number }
export interface Civ { id: string; name: string; species: string; culture: string; tech: string; relation: number; contacted: boolean; trade: boolean }
export interface OrbitDoc {
  seedStr: string; credits: number; science: number; systems: System[]; ships: Ship[];
  currentSystemId: string; civs: Civ[]; researched: string[]; log: Array<{ ts: number; text: string }>;
}

const SYS_A = ["Kepler", "Vega", "Cygnus", "Lyra", "Orion", "Tau", "Zeta", "Nova", "Astra", "Helio", "Rhea", "Cyra"];
const SYS_B = ["-442", "-9", " Prime", "-X", " Minor", "-7b", " Reach", "-12"];
const PTYPES = ["Terran", "Ocean", "Desert", "Ice", "Volcanic", "Jungle", "Barren", "Gas Giant", "Crystal"];
const RES = ["Iron", "Helium-3", "Titanium", "Water Ice", "Rare Crystals", "Biomass", "Platinum", "Antimatter Traces"];
const SPECIES = ["Sylphari", "Korgath", "Velune", "Threxil", "Omari", "Zhenti"];
const CULTURES = ["harmonic collectivists", "honor-bound clans", "curious traders", "ancient archivists", "nomadic singers"];
export const ORBIT_TECHS = [
  { id: "sensors", name: "Deep-Space Sensors", cost: 40, desc: "Scans reveal resources and life" },
  { id: "propulsion", name: "Ion Propulsion", cost: 70, desc: "Travel uses 40% less fuel" },
  { id: "habitats", name: "Orbital Habitats", cost: 90, desc: "Colonies cost 40% less" },
  { id: "xeno", name: "Xenolinguistics", cost: 110, desc: "Diplomacy gains doubled" },
  { id: "materials", name: "Nano Materials", cost: 150, desc: "Ships gain +50 max fuel" },
];
const SHIP_CLASSES = [
  { cls: "Exploration Vessel", cost: 900, fuel: 120, cargo: 20, crew: 6 },
  { cls: "Cargo Hauler", cost: 700, fuel: 90, cargo: 80, crew: 4 },
  { cls: "Research Vessel", cost: 1100, fuel: 100, cargo: 30, crew: 10 },
  { cls: "Colonization Vessel", cost: 1600, fuel: 140, cargo: 60, crew: 24 },
];

export function generateUniverse(seedStr: string): OrbitDoc {
  const r = rng(hashSeed("orbit:" + seedStr));
  const civs: Civ[] = [];
  const systems: System[] = Array.from({ length: 9 }, (_, si) => {
    const name = pick(r, SYS_A) + pick(r, SYS_B) + (si > 3 ? ` ${si}` : "");
    const planets: Planet[] = Array.from({ length: ri(r, 2, 5) }, (_, pi) => {
      const hasLife = r() > 0.72;
      const civ = hasLife && r() > 0.55;
      let civId: string | undefined;
      if (civ) {
        civId = uid();
        civs.push({
          id: civId, name: `${pick(r, SPECIES)} of ${name}`, species: pick(r, SPECIES),
          culture: pick(r, CULTURES), tech: pick(r, ["Industrial", "Orbital", "Interstellar", "Pre-industrial"]),
          relation: ri(r, 10, 40), contacted: false, trade: false,
        });
      }
      return {
        id: uid(), name: `${name} ${["I", "II", "III", "IV", "V"][pi] ?? pi + 1}`, type: pick(r, PTYPES),
        size: Math.round((0.4 + r() * 2.4) * 10) / 10, gravity: Math.round((0.3 + r() * 1.8) * 100) / 100,
        temp: ri(r, -80, 320), atmosphere: pick(r, ["Nitrogen-Oxygen", "Thin CO₂", "Methane", "None", "Dense Nitrogen", "Sulfuric"]),
        resources: Array.from({ length: ri(r, 1, 3) }, () => pick(r, RES)).filter((v, i, a) => a.indexOf(v) === i),
        life: hasLife, civId, scanned: false, explored: false, outpost: false, colony: false, data: 0,
      };
    });
    return { id: uid(), name, star: pick(r, ["G-type", "K-dwarf", "Red dwarf", "Blue giant", "Binary"]), x: ri(r, 6, 94), y: ri(r, 10, 90), planets };
  });
  const first = systems[0];
  return {
    seedStr, credits: 2600, science: 20, systems, currentSystemId: first?.id ?? "",
    ships: [{ id: uid(), name: "ISV Meridian", cls: "Exploration Vessel", fuel: 120, maxFuel: 120, cargo: 0, crew: 6, systemId: first?.id ?? "", hull: 100 }],
    civs, researched: [], log: [{ ts: Date.now(), text: `Universe charted from seed "${seedStr}". ${systems.length} systems, ${civs.length} civilizations await contact.` }],
  };
}

export function Orbit() {
  const u = useUniverse();
  const [doc, setDoc] = useDoc<OrbitDoc | null>("orbit", null);
  const [seedInput, setSeedInput] = useState("");
  const [planetId, setPlanetId] = useState<string | null>(null);
  const [shipName, setShipName] = useState("");
  const [shipClass, setShipClass] = useState(SHIP_CLASSES[0]?.cls ?? "Exploration Vessel");

  const system = doc?.systems.find((s) => s.id === doc.currentSystemId);
  const allPlanets = useMemo(() => doc?.systems.flatMap((s) => s.planets.map((p) => ({ s, p }))) ?? [], [doc]);
  const scanned = allPlanets.filter((x) => x.p.scanned).length;
  const planet = allPlanets.find((x) => x.p.id === planetId);

  if (!doc) {
    return (
      <EmptyState title="The universe is uncharted" body="Generate a procedural universe from a seed: nine star systems, dozens of planets with gravity, atmosphere and resources, hidden life — and civilizations waiting for first contact.">
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <input aria-label="Universe seed" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder="Universe seed (blank = random)" style={{ ...inputStyle, maxWidth: 260 }} />
          <Btn kind="primary" onClick={() => { const d = generateUniverse(seedInput.trim() || uid()); setDoc(d); u.act("orbit", `Charted a new universe (${d.systems.length} systems)`); }}>Chart universe</Btn>
        </div>
      </EmptyState>
    );
  }

  const D: OrbitDoc = doc;
  function patch(fn: (d: OrbitDoc) => OrbitDoc, logText?: string) {
    const next = fn(D);
    setDoc(logText ? { ...next, log: [{ ts: Date.now(), text: logText }, ...next.log].slice(0, 60) } : next);
  }
  function travel(ship: Ship, targetId: string) {
    const cost = Math.round(18 * (D.researched.includes("propulsion") ? 0.6 : 1));
    if (ship.fuel < cost) return;
    patch((d) => ({
      ...d, currentSystemId: targetId,
      ships: d.ships.map((s) => (s.id === ship.id ? { ...s, fuel: s.fuel - cost, systemId: targetId } : s)),
    }), `${ship.name} traveled to ${D.systems.find((s) => s.id === targetId)?.name} (−${cost} fuel).`);
    u.act("orbit", `${ship.name} traveled to ${D.systems.find((s) => s.id === targetId)?.name}`);
  }

  function scan(p: Planet) {
    if (p.scanned) return;
    patch((d) => ({
      ...d, science: d.science + 6,
      systems: d.systems.map((s) => ({ ...s, planets: s.planets.map((x) => (x.id === p.id ? { ...x, scanned: true } : x)) })),
    }), `Scanned ${p.name}: ${p.type} world, ${p.atmosphere} atmosphere${D.researched.includes("sensors") ? `, resources: ${p.resources.join(", ")}${p.life ? ", LIFE SIGNS" : ""}` : ""}. +6 science.`);
    u.unlock("first-planet");
  }

  function explore(p: Planet) {
    if (!p.scanned || p.explored) return;
    const gain = 14 + p.resources.length * 4 + (p.life ? 18 : 0);
    const civ = p.civId ? D.civs.find((c) => c.id === p.civId) : undefined;
    const firstContact = !!civ && !civ.contacted;
    const civNote = firstContact && civ ? ` FIRST CONTACT with the ${civ.name} — ${civ.culture}, ${civ.tech} technology.` : "";
    patch((d) => ({
      ...d, science: d.science + gain, credits: d.credits + p.resources.length * 60,
      systems: d.systems.map((s) => ({ ...s, planets: s.planets.map((x) => (x.id === p.id ? { ...x, explored: true, data: gain } : x)) })),
      civs: firstContact && civ ? d.civs.map((c) => (c.id === civ.id ? { ...c, contacted: true } : c)) : d.civs,
    }), `Explored ${p.name}: +${gain} science, salvage worth ${p.resources.length * 60} credits.${civNote}`);
    if (firstContact && civ) {
      u.unlock("first-contact");
      u.notify("orbit", "First contact", `The ${civ.name} have answered your hail.`);
    }
    u.act("orbit", `Explored ${p.name}`);
  }

  function buildOn(p: Planet, kind: "outpost" | "colony") {
    const base = kind === "outpost" ? 500 : 1400;
    const cost = Math.round(base * (D.researched.includes("habitats") && kind === "colony" ? 0.6 : 1));
    if (D.credits < cost || !p.explored) return;
    patch((d) => ({
      ...d, credits: d.credits - cost,
      systems: d.systems.map((s) => ({ ...s, planets: s.planets.map((x) => (x.id === p.id ? { ...x, [kind]: true } : x)) })),
    }), `${kind === "outpost" ? "Research outpost" : "Colony"} established on ${p.name} (−${cost} credits). Collect yields from the header button.`);
  }

  function claimPassive() {
    // Outposts/colonies generate yield when collected — deterministic from counts.
    const outposts = allPlanets.filter((x) => x.p.outpost).length;
    const colonies = allPlanets.filter((x) => x.p.colony).length;
    if (!outposts && !colonies) return;
    patch((d) => ({ ...d, science: d.science + outposts * 8, credits: d.credits + colonies * 160 }),
      `Collected yields: +${outposts * 8} science from outposts, +${colonies * 160} credits from colonies.`);
  }

  function buyShip() {
    const def = SHIP_CLASSES.find((c) => c.cls === shipClass);
    if (!def || D.credits < def.cost || !system) return;
    const ship: Ship = { id: uid(), name: shipName.trim() || `ISV ${pick(rng(Date.now()), ["Aurora", "Comet", "Vela", "Nomad", "Pioneer"])}`, cls: def.cls, fuel: def.fuel + (D.researched.includes("materials") ? 50 : 0), maxFuel: def.fuel + (D.researched.includes("materials") ? 50 : 0), cargo: 0, crew: def.crew, systemId: system.id, hull: 100 };
    patch((d) => ({ ...d, credits: d.credits - def.cost, ships: [...d.ships, ship] }), `Commissioned ${ship.name} (${def.cls}) at ${system.name}.`);
    setShipName("");
    u.act("orbit", `Commissioned ${ship.name}`);
  }

  function refuel(ship: Ship) {
    const cost = ship.maxFuel - ship.fuel;
    if (cost <= 0 || D.credits < cost) return;
    patch((d) => ({ ...d, credits: d.credits - cost, ships: d.ships.map((s) => (s.id === ship.id ? { ...s, fuel: s.maxFuel } : s)) }), `${ship.name} refueled (−${cost} credits).`);
  }

  function diplomacy(civ: Civ, kind: "gift" | "trade") {
    const gain = D.researched.includes("xeno") ? 16 : 8;
    if (kind === "gift") {
      if (D.credits < 200) return;
      patch((d) => ({ ...d, credits: d.credits - 200, civs: d.civs.map((c) => (c.id === civ.id ? { ...c, relation: Math.min(100, c.relation + gain) } : c)) }), `Gift sent to the ${civ.name}: relations +${gain}.`);
    } else {
      patch((d) => ({
        ...d, credits: d.credits + (civ.trade ? 0 : 90),
        civs: d.civs.map((c) => (c.id === civ.id ? { ...c, trade: !c.trade, relation: Math.min(100, c.relation + 4) } : c)),
      }), `Trade ${civ.trade ? "ended" : "opened"} with the ${civ.name}${civ.trade ? "" : ": +90 credits of first exchanges"}.`);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 26, letterSpacing: ".05em" }}>ORBIT</h2>
          <div style={{ color: "var(--dim)", fontSize: 13 }}>Seed <span className="font-mono2">{D.seedStr}</span> · {scanned}/{allPlanets.length} planets scanned</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={claimPassive}>Collect outpost/colony yields</Btn>
          <Btn onClick={() => window.dispatchEvent(new CustomEvent("open-omni"))}>Ship computer (OMNI)</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        <Stat label="Credits" value={fmt(D.credits)} color="var(--warn)" />
        <Stat label="Science" value={fmt(D.science)} color="var(--violet)" />
        <Stat label="Ships" value={String(D.ships.length)} />
        <Stat label="Contacts" value={`${D.civs.filter((c) => c.contacted).length}/${D.civs.length}`} sub="civilizations" />
      </div>

      <Panel title="Star map — tap a system to focus, send your focused ship from the fleet panel">
        <div style={{ position: "relative", height: 220, background: "radial-gradient(ellipse at 30% 40%, #0e1c3d 0%, #060a18 65%)", borderRadius: 8, overflow: "hidden" }} role="img" aria-label="Star map of charted systems">
          {D.systems.map((s) => (
            <button key={s.id} type="button" aria-label={`Focus system ${s.name}`} onClick={() => patch((d) => ({ ...d, currentSystemId: s.id }))}
              style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)", background: "transparent", border: "none", cursor: "pointer", color: s.id === D.currentSystemId ? "#22d3ee" : "#8fa3c4", textAlign: "center", minHeight: 30 }}>
              <div style={{ fontSize: s.id === D.currentSystemId ? 20 : 14, textShadow: "0 0 12px #22d3ee" }}>✦</div>
              <div style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>{s.name}</div>
            </button>
          ))}
        </div>
      </Panel>

      {system && (
        <Panel title={`${system.name} · ${system.star} star`} right={<Chip color="#22d3ee">{system.planets.length} planets</Chip>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
            {system.planets.map((p) => (
              <div key={p.id} className="panel" style={{ padding: 10 }}>
                <strong>{p.name}</strong>
                <div style={{ fontSize: 12.5, color: "var(--dim)" }}>
                  {p.scanned ? `${p.type} · ${p.size} R⊕ · ${p.gravity}g · ${p.temp}°C` : "Unscanned — signature only"}
                  {p.outpost ? " · OUTPOST" : ""}{p.colony ? " · COLONY" : ""}{p.explored ? " · explored" : ""}
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                  {!p.scanned && <Btn small kind="primary" onClick={() => scan(p)}>Scan</Btn>}
                  {p.scanned && !p.explored && <Btn small kind="primary" onClick={() => explore(p)}>Explore</Btn>}
                  {p.explored && !p.outpost && <Btn small disabled={D.credits < 500} onClick={() => buildOn(p, "outpost")}>Outpost · 500cr</Btn>}
                  {p.explored && !p.colony && <Btn small disabled={D.credits < 1400} onClick={() => buildOn(p, "colony")}>Colony · 1400cr</Btn>}
                  <Btn small kind="ghost" onClick={() => setPlanetId(p.id)}>Details</Btn>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, alignItems: "start" }}>
        <Panel title="Fleet">
          <div style={{ display: "grid", gap: 8 }}>
            {D.ships.map((s) => (
              <div key={s.id} className="panel" style={{ padding: 10 }}>
                <strong>{s.name}</strong> <span style={{ color: "var(--dim)", fontSize: 12.5 }}>{s.cls} · crew {s.crew} · at {D.systems.find((x) => x.id === s.systemId)?.name}</span>
                <div className="font-mono2" style={{ fontSize: 12, color: "var(--dim)", margin: "4px 0" }}>fuel {s.fuel}/{s.maxFuel} · hull {s.hull}%</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <Btn small disabled={s.fuel >= s.maxFuel || D.credits < s.maxFuel - s.fuel} onClick={() => refuel(s)}>Refuel · {s.maxFuel - s.fuel}cr</Btn>
                  {D.systems.filter((x) => x.id !== s.systemId).slice(0, 3).map((t) => (
                    <Btn small key={t.id} disabled={s.fuel < 18} onClick={() => travel(s, t.id)}>→ {t.name}</Btn>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input aria-label="New ship name" value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder="Ship name" style={{ ...inputStyle, flex: "1 1 130px" }} />
              <select aria-label="Ship class" value={shipClass} onChange={(e) => setShipClass(e.target.value)} style={{ ...inputStyle, flex: "1 1 150px" }}>
                {SHIP_CLASSES.map((c) => <option key={c.cls} value={c.cls}>{c.cls} · {c.cost}cr</option>)}
              </select>
              <Btn small kind="primary" disabled={D.credits < (SHIP_CLASSES.find((c) => c.cls === shipClass)?.cost ?? Infinity)} onClick={buyShip}>Commission</Btn>
            </div>
          </div>
        </Panel>

        <div style={{ display: "grid", gap: 12 }}>
          <Panel title="Research">
            <div style={{ display: "grid", gap: 6 }}>
              {ORBIT_TECHS.map((t) => {
                const done = D.researched.includes(t.id);
                return (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div><strong style={{ fontSize: 14 }}>{t.name}</strong><div style={{ fontSize: 12.5, color: "var(--dim)" }}>{t.desc}</div></div>
                    {done ? <Chip color="var(--good)">Done</Chip> : <Btn small disabled={D.science < t.cost} onClick={() => patch((d) => ({ ...d, science: d.science - t.cost, researched: [...d.researched, t.id] }), `Researched ${t.name}.`)}> {t.cost} sci</Btn>}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Civilizations">
            {D.civs.length === 0 && <p style={{ color: "var(--dim)", fontSize: 14, margin: 0 }}>None in this universe — try another seed.</p>}
            <div style={{ display: "grid", gap: 8 }}>
              {D.civs.map((c) => (
                <div key={c.id} className="panel" style={{ padding: 10 }}>
                  <strong>{c.contacted ? c.name : "Unknown civilization"}</strong>
                  <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{c.contacted ? `${c.species} · ${c.culture} · ${c.tech} · relations ${c.relation}${c.trade ? " · trading" : ""}` : "Signals detected on a life-bearing world. Explore it to make contact."}</div>
                  {c.contacted && (
                    <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                      <Btn small disabled={D.credits < 200} onClick={() => diplomacy(c, "gift")}>Send gift · 200cr</Btn>
                      <Btn small onClick={() => diplomacy(c, "trade")}>{c.trade ? "End trade" : "Open trade"}</Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Mission log">
        <div style={{ display: "grid", gap: 4, maxHeight: 220, overflowY: "auto" }} className="scrollthin">
          {D.log.map((l, i) => <div key={i} style={{ fontSize: 13.5, borderBottom: "1px solid var(--border)", paddingBottom: 4 }}>{l.text}</div>)}
        </div>
      </Panel>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn kind="ghost" onClick={() => setDoc(null)}>New universe…</Btn>
        <Btn kind="ghost" onClick={() => u.remove("orbit")}>Reset ORBIT</Btn>
      </div>

      {planet && (
        <Modal title={planet.p.name} onClose={() => setPlanetId(null)}>
          <div style={{ display: "grid", gap: 5, fontSize: 14 }}>
            <div>System: {planet.s.name} ({planet.s.star})</div>
            {planet.p.scanned ? (<>
              <div>Type: {planet.p.type} · Size {planet.p.size} R⊕ · Gravity {planet.p.gravity}g · {planet.p.temp}°C</div>
              <div>Atmosphere: {planet.p.atmosphere}</div>
              <div>Resources: {D.researched.includes("sensors") ? planet.p.resources.join(", ") : "Research Deep-Space Sensors to identify"}</div>
              <div>Life: {planet.p.life ? "Yes — biosignatures present" : "None detected"}</div>
              {planet.p.data > 0 && <div>Scientific data gathered: {planet.p.data} points</div>}
            </>) : <p style={{ color: "var(--dim)" }}>Scan this planet to reveal its attributes.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
