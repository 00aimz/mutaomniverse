// CHRONICLES — Fantasy & Adventure Universe. Procedural kingdoms from a seed;
// heroes with real progression math (XP, levels, HP, gold); quests are node
// graphs whose choices apply persistent effects (items, reputation, flags);
// factions remember what you did. OMNI narrates — the app owns the state.

import { useState } from "react";
import {
Btn, Chip, EmptyState, Panel, Stat,
hashSeed, inputStyle, pick, ri, rng, uid, useDoc, useUniverse,
} from "../core";

export interface Fx { xp?: number; gold?: number; hp?: number; item?: string; rep?: { faction: string; delta: number }; flag?: string }
export interface QChoice { label: string; result: string; fx: Fx; next: string | null }
export interface QNode { text: string; choices: QChoice[] }
export interface Quest { id: string; title: string; desc: string; status: "available" | "active" | "done"; nodeId: string; nodes: Record<string, QNode>; doneText?: string }
export interface Hero { name: string; cls: string; level: number; xp: number; hp: number; maxHp: number; gold: number; str: number; agi: number; wit: number }
export interface ChroniclesDoc {
  seedStr: string; kingdom: string; hero: Hero | null; locationId: string;
  locations: Array<{ id: string; name: string; kind: string; desc: string; x: number; y: number }>;
  quests: Quest[]; factions: Array<{ name: string; rep: number; desc: string }>;
  inventory: Array<{ id: string; name: string; qty: number }>; journal: string[]; flags: string[];
}

const PLACE_A = ["Ember", "Thorn", "Glimmer", "Stone", "Raven", "Mist", "Gold", "Wolf", "Ash", "Star"];
const PLACE_B = ["fell", "hold", "mere", "watch", "gate", "ford", "spire", "hollow", "crest", "marsh"];
const KINDS = ["Capital city", "Village", "Forest", "Ruins", "Castle", "Dungeon", "Port town", "Mountain pass"];
const FACTIONS = [
  { name: "The Ember Court", desc: "The royal house — law, taxes and old pride." },
  { name: "Thieves of the Hollow", desc: "A smugglers' guild that hates owing favors." },
  { name: "Wardens of the Wild", desc: "Rangers who answer to the forest first." },
];
const CLASSES = [
  { cls: "Blade Knight", str: 8, agi: 5, wit: 3 },
  { cls: "Wild Ranger", str: 5, agi: 8, wit: 4 },
  { cls: "Rune Scholar", str: 3, agi: 5, wit: 9 },
  { cls: "Shadow Rogue", str: 5, agi: 9, wit: 5 },
];

function mainQuest(): Quest {
  return {
    id: "q-sunshard", title: "The Sunken Sunshard", status: "available", nodeId: "start",
    desc: "A shard of the fallen sun-star sleeps in the drowned vault beneath the old capital. The Ember Court wants it. So does everyone else.",
    nodes: {
      start: { text: "At the capital's gate, a court herald presses a sealed letter into your hand: the Sunshard has been located. Bring it to the Court — and trust no one who offers to 'help'.", choices: [
        { label: "Accept the Court's commission", result: "You swear the Court's oath. The herald marks your map.", fx: { xp: 10, rep: { faction: "The Ember Court", delta: 5 } }, next: "road" },
        { label: "Ask who else is hunting it", result: "The herald pales. 'The Hollow already has a crew on the road. Move fast.'", fx: { xp: 14 }, next: "road" },
      ] },
      road: { text: "On the forest road, Wardens of the Wild stop you. Poachers have been bleeding the old forest dry, and the Wardens will trade a shortcut through the trees for your help.", choices: [
        { label: "Help the Wardens drive off the poachers", result: "A short, sharp fight in the rain. The Wardens owe you now.", fx: { xp: 22, hp: -6, rep: { faction: "Wardens of the Wild", delta: 10 } }, next: "vault" },
        { label: "Pay the poachers' toll and pass quietly", result: "Expensive, but your blade stays clean and your strength unspent.", fx: { xp: 10, gold: -30 }, next: "vault" },
        { label: "Refuse and take the long road", result: "Two days lost in the marsh. You arrive mud-caked but unentangled.", fx: { xp: 8, hp: -3 }, next: "vault" },
      ] },
      vault: { text: "The drowned vault. The Sunshard glows on its plinth — and the Hollow's crew leader, Sable, is already here, smiling like a drawn knife. 'Split it?' she offers.", choices: [
        { label: "Take the shard for the Court", result: "Sable's smile dies. Steel rings in the flooded dark — and you walk out with the shard.", fx: { xp: 30, hp: -10, item: "Sunshard", rep: { faction: "Thieves of the Hollow", delta: -12 } }, next: "end_court" },
        { label: "Split the prize with the Hollow", result: "Sable cuts the shard's setting with impossible care. Half the glory, none of the blood.", fx: { xp: 24, gold: 80, item: "Sunshard Fragment", rep: { faction: "Thieves of the Hollow", delta: 12 }, flag: "shard-shared" }, next: "end_shared" },
        { label: "Leave the shard — some things should sleep", result: "You seal the vault behind you. Both factions will call it madness. The forest, somehow, approves.", fx: { xp: 26, rep: { faction: "Wardens of the Wild", delta: 8 }, flag: "shard-left" }, next: "end_left" },
      ] },
      end_court: { text: "The Court receives the Sunshard with full ceremony. Your name is entered in the Ember Roll.", choices: [{ label: "Complete the quest", result: "Quest complete: The Sunken Sunshard (Court ending).", fx: { xp: 25, gold: 120, rep: { faction: "The Ember Court", delta: 10 } }, next: null }] },
      end_shared: { text: "A fragment for the Court, a fortune from the Hollow. Everyone is slightly furious; everyone paid.", choices: [{ label: "Complete the quest", result: "Quest complete: The Sunken Sunshard (Shared ending).", fx: { xp: 25, gold: 60 }, next: null }] },
      end_left: { text: "The shard sleeps on. Songs will argue about you for years.", choices: [{ label: "Complete the quest", result: "Quest complete: The Sunken Sunshard (Warden ending).", fx: { xp: 30 }, next: null }] },
    },
  };
}
function sideQuest(): Quest {
  return {
    id: "q-wolves", title: "Wolves at the Ford", status: "available", nodeId: "start",
    desc: "Something bolder than wolves is taking sheep — and now a shepherd — at the river ford.",
    nodes: {
      start: { text: "The ford's shepherd begs for help: three sheep gone, tracks 'too big for wolves'.", choices: [
        { label: "Track the beast", result: "The tracks lead to a marsh cave — and a wounded marsh-troll, its leg in a poacher's trap.", fx: { xp: 12 }, next: "cave" },
      ] },
      cave: { text: "The troll roars, more in pain than rage. The trap's chain is stamped with the Hollow's mark.", choices: [
        { label: "Free the troll", result: "It regards you a long moment… then lumbers off toward the hills. The sheep-stealing stops.", fx: { xp: 26, rep: { faction: "Wardens of the Wild", delta: 8 }, flag: "troll-freed" }, next: "end" },
        { label: "Fight the beast", result: "A brutal fight in the mud. You prevail, barely.", fx: { xp: 30, hp: -14, gold: 45 }, next: "end" },
        { label: "Report the Hollow's trap to the Court", result: "The Court fines the guild and posts a guard at the ford. The troll is driven off by soldiers.", fx: { xp: 18, gold: 25, rep: { faction: "The Ember Court", delta: 6 } }, next: "end" },
      ] },
      end: { text: "The ford is safe again. The shepherd pays in cheese, coin, and embarrassing gratitude.", choices: [{ label: "Complete the quest", result: "Quest complete: Wolves at the Ford.", fx: { xp: 15, gold: 20 }, next: null }] },
    },
  };
}

export function generateKingdom(seedStr: string, hero: Hero): ChroniclesDoc {
  const r = rng(hashSeed("chron:" + seedStr));
  const kingdom = pick(r, PLACE_A) + pick(r, PLACE_B);
  const locations = Array.from({ length: 9 }, (_, i) => ({
    id: uid(), name: i === 0 ? `${kingdom} City` : pick(r, PLACE_A) + pick(r, PLACE_B),
    kind: i === 0 ? "Capital city" : pick(r, KINDS), desc: pick(r, ["Salt wind and gull cries.", "Pine smoke and old songs.", "Stones older than the kingdom.", "Lanterns in every window.", "A place that watches strangers."]),
    x: ri(r, 6, 94), y: ri(r, 10, 88),
  }));
  return {
    seedStr, kingdom, hero, locationId: locations[0]?.id ?? "",
    locations, quests: [mainQuest(), sideQuest()],
    factions: FACTIONS.map((f) => ({ ...f, rep: 0 })),
    inventory: [{ id: uid(), name: "Traveler's Pack", qty: 1 }, { id: uid(), name: "Healing Draught", qty: 2 }],
    journal: [`${hero.name} the ${hero.cls} arrived in ${kingdom}. The Sunken Sunshard quest awaits.`],
    flags: [],
  };
}

const EXPLORE_EVENTS = [
  { text: "You find a moss-covered shrine. Someone left coins in the offering bowl.", choices: [
    { label: "Leave a coin", result: "The air feels lighter. Somewhere, something approves.", fx: { xp: 12, gold: -5 } },
    { label: "Take the coins", result: "Heavy pockets, heavier conscience.", fx: { gold: 22, xp: 4 } },
  ] },
  { text: "Bandits block the path, demanding a toll.", choices: [
    { label: "Fight them off", result: "You win, but not without cost.", fx: { xp: 20, hp: -8, gold: 15 } },
    { label: "Pay the toll", result: "They let you pass, laughing.", fx: { gold: -18, xp: 5 } },
    { label: "Talk your way past", result: "A story for a story — they let you through for the tale of the Sunshard.", fx: { xp: 16 } },
  ] },
  { text: "A traveling merchant's cart has lost a wheel in the mud.", choices: [
    { label: "Help lift the cart", result: "She presses a vial into your hand: 'For the road.'", fx: { xp: 10, item: "Healing Draught" } },
    { label: "Walk on", result: "The road is long and your time is your own.", fx: { xp: 3 } },
  ] },
];

export function Chronicles() {
  const u = useUniverse();
  const [doc, setDoc] = useDoc<ChroniclesDoc | null>("chronicles", null);
  const [seedInput, setSeedInput] = useState("");
  const [heroName, setHeroName] = useState("");
  const [heroClass, setHeroClass] = useState(CLASSES[0]?.cls ?? "Blade Knight");
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [eventIdx, setEventIdx] = useState<number | null>(null);

  if (!doc || !doc.hero) {
    return (
      <EmptyState title="Create your hero" body="Name your character and choose a class. Your kingdom is generated procedurally from a seed — its locations, factions and fortunes are persistent, and your choices in quests will change them for good.">
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <input aria-label="Hero name" value={heroName} onChange={(e) => setHeroName(e.target.value)} placeholder="Hero name" style={{ ...inputStyle, maxWidth: 190 }} />
          <select aria-label="Hero class" value={heroClass} onChange={(e) => setHeroClass(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            {CLASSES.map((c) => <option key={c.cls} value={c.cls}>{c.cls} (STR {c.str} · AGI {c.agi} · WIT {c.wit})</option>)}
          </select>
          <input aria-label="Kingdom seed" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder="Seed (blank = random)" style={{ ...inputStyle, maxWidth: 170 }} />
          <Btn kind="primary" disabled={!heroName.trim()} onClick={() => {
            const def = CLASSES.find((c) => c.cls === heroClass) ?? CLASSES[0] ?? { cls: "Blade Knight", str: 8, agi: 5, wit: 3 };
            const hero: Hero = { name: heroName.trim(), cls: def.cls, level: 1, xp: 0, hp: 40, maxHp: 40, gold: 60, str: def.str, agi: def.agi, wit: def.wit };
            const d = generateKingdom(seedInput.trim() || uid(), hero);
            setDoc(d);
            u.unlock("hero-born");
            u.act("chronicles", `${hero.name} the ${hero.cls} entered ${d.kingdom}`);
          }}>Begin the adventure</Btn>
        </div>
      </EmptyState>
    );
  }

  const hero = doc.hero;
  const D: ChroniclesDoc = doc;
  const location = D.locations.find((l) => l.id === D.locationId);
  const xpForNext = hero.level * 100;

  function applyFx(fx: Fx, resultText: string): ChroniclesDoc {
    let h = { ...hero };
    let inventory = D.inventory.map((i) => ({ ...i }));
    if (fx.item) {
      const ex = inventory.find((i) => i.name === fx.item);
      if (ex) ex.qty += 1; else inventory.push({ id: uid(), name: fx.item ?? "Item", qty: 1 });
    }
    h = { ...h, xp: h.xp + (fx.xp ?? 0), gold: Math.max(0, h.gold + (fx.gold ?? 0)), hp: h.hp + (fx.hp ?? 0) };
    while (h.xp >= h.level * 100) { h = { ...h, level: h.level + 1, maxHp: h.maxHp + 8, hp: h.maxHp + 8, str: h.str + 1, agi: h.agi + 1, wit: h.wit + 1 }; }
    h.hp = Math.max(1, Math.min(h.maxHp, h.hp));
    const factions = fx.rep ? D.factions.map((f) => (f.name === fx.rep?.faction ? { ...f, rep: Math.max(-100, Math.min(100, f.rep + (fx.rep?.delta ?? 0))) } : f)) : D.factions;
    const flags = fx.flag && !D.flags.includes(fx.flag) ? [...D.flags, fx.flag] : D.flags;
    return { ...D, hero: h, inventory, factions, flags, journal: [resultText, ...D.journal].slice(0, 60) };
  }

  function choose(q: Quest, ch: QChoice) {
    let next = applyFx(ch.fx, ch.result);
    const quests = next.quests.map((x) => {
      if (x.id !== q.id) return x;
      if (ch.next === null) return { ...x, status: "done" as const, doneText: ch.result };
      return { ...x, status: "active" as const, nodeId: ch.next };
    });
    next = { ...next, quests };
    setDoc(next);
    if (ch.next === null) { u.unlock("quest-done"); u.notify("chronicles", "Quest complete", q.title); setActiveQuest(null); }
    u.act("chronicles", `Quest "${q.title}": ${ch.label}`);
  }

  function rest() {
    setDoc({ ...D, hero: { ...hero, hp: hero.maxHp, gold: Math.max(0, hero.gold - 10) }, journal: [`${hero.name} rested and recovered. (−10 gold)`, ...D.journal].slice(0, 60) });
  }
  function useDraught() {
    const d = D.inventory.find((i) => i.name === "Healing Draught" && i.qty > 0);
    if (!d) return;
    setDoc({ ...D, hero: { ...hero, hp: Math.min(hero.maxHp, hero.hp + 18) }, inventory: D.inventory.map((i) => (i.id === d.id ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0) });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 26, letterSpacing: ".05em" }}>The Kingdom of {D.kingdom}</h2>
          <div style={{ color: "var(--dim)", fontSize: 13 }}>{hero.name} · {hero.cls} · Level {hero.level} · at {location?.name}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={rest} disabled={hero.gold < 10 || hero.hp >= hero.maxHp}>Rest · 10g</Btn>
          <Btn onClick={useDraught} disabled={!D.inventory.some((i) => i.name === "Healing Draught")}>Use Healing Draught (+18 HP)</Btn>
          <Btn onClick={() => window.dispatchEvent(new CustomEvent("open-omni"))}>Guide (OMNI)</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
        <Stat label="HP" value={`${hero.hp}/${hero.maxHp}`} color={hero.hp < hero.maxHp * 0.35 ? "var(--bad)" : "var(--good)"} />
        <Stat label="XP" value={String(hero.xp)} sub={`next level at ${xpForNext}`} />
        <Stat label="Gold" value={String(hero.gold)} color="var(--warn)" />
        <Stat label="STR / AGI / WIT" value={`${hero.str} / ${hero.agi} / ${hero.wit}`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
        <Panel title="World map — tap a location to travel">
          <div style={{ position: "relative", height: 250, background: "radial-gradient(ellipse at 40% 30%, #14301f 0%, #0a1410 60%, #060a18)", borderRadius: 8, overflow: "hidden" }} role="img" aria-label={`Map of ${D.kingdom}`}>
            {D.locations.map((l) => (
              <button key={l.id} type="button" aria-label={`Travel to ${l.name}`} onClick={() => { setDoc({ ...D, locationId: l.id, journal: [`Traveled to ${l.name} (${l.kind}).`, ...D.journal].slice(0, 60) }); setEventIdx(null); }}
                style={{ position: "absolute", left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%,-50%)", background: "transparent", border: "none", cursor: "pointer", color: l.id === D.locationId ? "#fb923c" : "#c9d6ee", textAlign: "center", minHeight: 30 }}>
                <div style={{ fontSize: 16 }}>{l.kind === "Dungeon" ? "☠" : l.kind === "Castle" ? "♜" : l.kind === "Forest" ? "♣" : l.kind === "Ruins" ? "⌂" : "◆"}</div>
                <div style={{ fontSize: 10.5, whiteSpace: "nowrap", textShadow: "0 1px 4px #000" }}>{l.name}</div>
              </button>
            ))}
          </div>
          {location && (
            <div style={{ marginTop: 10 }}>
              <strong>{location.name}</strong> <span style={{ color: "var(--dim)", fontSize: 13 }}>{location.kind} · {location.desc}</span>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <Btn small kind="primary" onClick={() => setEventIdx(Math.floor(Math.random() * EXPLORE_EVENTS.length))}>Explore {location.name}</Btn>
              </div>
              {eventIdx !== null && EXPLORE_EVENTS[eventIdx] && (
                <div className="panel" style={{ padding: 10, marginTop: 8 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 14 }}>{EXPLORE_EVENTS[eventIdx]?.text}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {EXPLORE_EVENTS[eventIdx]?.choices.map((ch) => (
                      <Btn key={ch.label} small onClick={() => { setDoc(applyFx(ch.fx, ch.result)); setEventIdx(null); }}>{ch.label}</Btn>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>

        <div style={{ display: "grid", gap: 12 }}>
          <Panel title="Quest journal">
            <div style={{ display: "grid", gap: 8 }}>
              {D.quests.map((q) => (
                <div key={q.id} className="panel" style={{ padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 14.5 }}>{q.title}</strong>
                    <Chip color={q.status === "done" ? "var(--good)" : q.status === "active" ? "#fb923c" : "var(--dim)"}>{q.status}</Chip>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--dim)", margin: "4px 0 8px" }}>{q.status === "done" ? q.doneText : q.desc}</p>
                  {q.status !== "done" && <Btn small kind={q.status === "active" ? "primary" : "soft"} onClick={() => setActiveQuest(activeQuest === q.id ? null : q.id)}>{q.status === "active" ? (activeQuest === q.id ? "Close quest" : "Continue quest") : "Begin quest"}</Btn>}
                  {activeQuest === q.id && q.status !== "done" && (() => {
                    const node = q.nodes[q.nodeId];
                    if (!node) return null;
                    return (
                      <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <p style={{ fontSize: 14, margin: "0 0 10px", lineHeight: 1.55 }}>{node.text}</p>
                        <div style={{ display: "grid", gap: 6 }}>
                          {node.choices.map((ch) => (
                            <Btn key={ch.label} onClick={() => choose(q, ch)} style={{ textAlign: "left", justifyContent: "flex-start" }}>{ch.label}</Btn>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </Panel>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Panel title="Inventory" pad={12}>
              {D.inventory.length === 0 && <span style={{ color: "var(--dim)", fontSize: 13 }}>Empty.</span>}
              {D.inventory.map((i) => <div key={i.id} style={{ fontSize: 13.5 }}>{i.name} {i.qty > 1 ? `×${i.qty}` : ""}</div>)}
            </Panel>
            <Panel title="Factions" pad={12}>
              {D.factions.map((f) => (
                <div key={f.name} style={{ fontSize: 13, marginBottom: 6 }}>
                  <strong>{f.name}</strong> <span style={{ color: f.rep > 0 ? "var(--good)" : f.rep < 0 ? "var(--bad)" : "var(--dim)" }}>({f.rep > 0 ? "+" : ""}{f.rep})</span>
                  <div style={{ color: "var(--dim)", fontSize: 12 }}>{f.desc}</div>
                </div>
              ))}
            </Panel>
          </div>

          <Panel title="Journal" pad={12}>
            <div style={{ display: "grid", gap: 4, maxHeight: 180, overflowY: "auto" }} className="scrollthin">
              {D.journal.map((j, i) => <div key={i} style={{ fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 3 }}>{j}</div>)}
            </div>
          </Panel>
        </div>
      </div>

      <Btn kind="ghost" onClick={() => setDoc(null)}>Abandon hero & start anew</Btn>
    </div>
  );
}
