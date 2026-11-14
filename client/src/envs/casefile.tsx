// CASEFILE — Detective & Investigation Universe. Fictional cases with a FIXED
// underlying truth authored into the case data: the culprit never changes,
// statements never contradict the evidence, and conclusions are scored on
// culprit + key-evidence coverage + reasoning. Interviews are scripted from
// each character's knowledge; with a Gemini key, free-form questions are
// roleplayed by OMNI using only that character's established facts.

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api";
import {
Btn, Chip, Panel, Stat,
getGeminiKey, inputStyle, uid, useDoc, useUniverse, type SettingsDoc,
} from "../core";

export interface Topic { id: string; q: string; a: string }
export interface Suspect { id: string; name: string; role: string; personality: string; knows: string; topics: Topic[]; deflect: string[] }
export interface Evidence { id: string; title: string; kind: string; location: string; desc: string; key: boolean }
export interface Progress {
  status: "new" | "open" | "closed"; foundEvidence: string[]; asked: Record<string, string[]>;
  notes: string; hypotheses: Array<{ id: string; text: string; suspectId: string }>;
  transcript: Array<{ suspectId: string; q: string; a: string }>;
  accusedId?: string; score?: number; verdict?: string;
}
export interface CaseDef {
  id: string; title: string; category: string; briefing: string; culpritId: string; motive: string;
  suspects: Suspect[]; evidence: Evidence[]; locations: string[]; progress: Progress;
}
export interface CasefileDoc { cases: CaseDef[] }

const freshProgress = (): Progress => ({ status: "new", foundEvidence: [], asked: {}, notes: "", hypotheses: [], transcript: [] });

function seedCases(): CaseDef[] {
  return [
    {
      id: "case-vanished-vault", title: "The Vanished Vault", category: "Corporate mystery",
      briefing: "At 09:00 the Meridian Bank's vault audit found the Hartley diamond deposit box empty. The vault was sealed at 18:00 the previous evening. Three people had access. The diamond is still missing.",
      culpritId: "s-okafor", motive: "Debt — Okafor owed money to an illegal lender and planned to fence the diamond through a contact at the docks.",
      locations: ["Vault Antechamber", "Security Office", "Loading Dock"],
      suspects: [
        { id: "s-okafor", name: "Chidi Okafor", role: "Vault Manager", personality: "Precise, proud, quietly anxious about money.", knows: "He opened the vault alone at 17:40 claiming a 'final check', took the diamond, and wiped the antechamber camera's local buffer — but the security office terminal kept a login record.",
          topics: [
            { id: "t1", q: "Where were you at 17:40?", a: "At my desk, finishing the day's reconciliation. I never went near the vault after the 17:00 count." },
            { id: "t2", q: "Who else can open the vault?", a: "Only myself, Director Ansel, and — in emergencies — security chief Brandt with a dual key. No one else. Ever." },
            { id: "t3", q: "Have you noticed anything unusual lately?", a: "Brandt has been asking odd questions about the audit schedule. Very odd questions." },
          ], deflect: ["I have told you everything relevant.", "The vault procedures are flawless. Look at the people, not the process."] },
        { id: "s-ansel", name: "Director Mara Ansel", role: "Bank Director", personality: "Composed, direct, protective of the bank's reputation.", knows: "She was at a charity gala from 17:00 with two hundred witnesses. She noticed Okafor's new expensive watch last week.",
          topics: [
            { id: "t1", q: "Where were you that evening?", a: "At the Hartley charity gala from five until midnight. Two hundred people can confirm it — including your own chief inspector." },
            { id: "t2", q: "Anything unusual about your staff?", a: "Chidi has been… flashier lately. A watch he could not afford on his salary. I said nothing; it was not my business. Perhaps it should have been." },
            { id: "t3", q: "Could someone bypass the vault camera?", a: "The antechamber camera records locally. But every vault login is mirrored to the security office terminal — that cannot be wiped from the vault side." },
          ], deflect: ["I want this solved as much as you do.", "The bank's reputation is bleeding. Find the diamond."] },
        { id: "s-brandt", name: "Felix Brandt", role: "Security Chief", personality: "Gruff, defensive, loyal to his team.", knows: "He never entered the vault that day. His dock keycard was used at 17:52 — but he had lent it to Okafor that morning and was afraid to admit it.",
          topics: [
            { id: "t1", q: "Where were you at 17:40?", a: "Doing rounds on the third floor. The cameras up there will show me — check them before you waste more time on me." },
            { id: "t2", q: "Was your keycard used at the dock?", a: "…Yes. And I should have reported it. I lent my dock card to Okafor that morning — he said he'd misplaced his. I was covering for a colleague, that's all." },
            { id: "t3", q: "What does the security terminal show?", a: "A vault login at 17:40 under Okafor's credentials. I saw it when I came in this morning. I told no one because of the keycard business." },
          ], deflect: ["Twenty years I've kept this bank safe.", "Ask the terminal. Machines don't lie; people do."] },
      ],
      evidence: [
        { id: "e1", title: "Security terminal login log", kind: "Digital record", location: "Security Office", desc: "Vault login at 17:40 under C. Okafor's credentials — mirrored and impossible to wipe from the vault side.", key: true },
        { id: "e2", title: "Wiped camera buffer", kind: "Digital evidence", location: "Vault Antechamber", desc: "The antechamber camera's local buffer was deliberately erased at 17:47. The main cameras were untouched.", key: true },
        { id: "e3", title: "Dock keycard record", kind: "Access log", location: "Loading Dock", desc: "Brandt's keycard opened the dock at 17:52. Brandt admits lending the card to Okafor that morning.", key: true },
        { id: "e4", title: "Gala guest list", kind: "Document", location: "Security Office", desc: "Director Ansel signed in at the Hartley gala at 17:05 and appears in photographs all evening.", key: false },
        { id: "e5", title: "Empty deposit box", kind: "Physical", location: "Vault Antechamber", desc: "The Hartley box is empty but undamaged — opened with a proper key, not forced.", key: false },
        { id: "e6", title: "Pawnshop flyer", kind: "Document", location: "Loading Dock", desc: "A dock-district pawnshop flyer, the kind handed out near the freight offices. Circumstantial at best.", key: false },
      ],
      progress: freshProgress(),
    },
    {
      id: "case-last-train", title: "The Last Train from Aldermere", category: "Disappearance",
      briefing: "Antiquarian Joseph Wren boarded the 23:10 to Aldermere carrying a 17th-century star atlas. He never arrived. His compartment was empty, the atlas gone, the window latched from inside.",
      culpritId: "s-ives", motive: "Ives, a rival collector's agent, took the atlas during a brief stop and left by the platform side while the train waited at Millcross.",
      locations: ["Wren's Compartment", "Dining Car", "Millcross Platform"],
      suspects: [
        { id: "s-ives", name: "Tobias Ives", role: "Fellow passenger", personality: "Smooth, well-read, a little too helpful.", knows: "He slipped into Wren's compartment at the Millcross stop, took the atlas, and hid it in a lining of his own suitcase. He claims he slept all night.",
          topics: [
            { id: "t1", q: "Did you know Mr. Wren?", a: "By sight only. We exchanged pleasantries about the weather in the dining car. Tragic business." },
            { id: "t2", q: "Where were you at the Millcross stop?", a: "Asleep in my seat, I'm afraid. The stop woke no one — the train barely paused." },
            { id: "t3", q: "What do you collect?", a: "Me? Stamps, mostly. Harmless little things. Nothing like antique atlases, if that's your implication." },
          ], deflect: ["You should ask the conductor — staff see everything.", "I am cooperating fully, as you see."] },
        { id: "s-halloway", name: "Conductor Ruth Halloway", role: "Train conductor", personality: "Sharp-eyed, methodical, keeps meticulous notes.", knows: "Her notebook records the Millcross stop lasted 6 minutes and a tall man in a grey coat crossed the platform with a flat parcel.",
          topics: [
            { id: "t1", q: "How long was the Millcross stop?", a: "Six minutes — I timed it, as always. Long enough to stretch your legs, not long enough for a disappearance… or so I thought." },
            { id: "t2", q: "Did you see anyone on the platform?", a: "A tall man in a grey coat, carrying a flat parcel under his arm. I assumed he was meeting someone. I wrote it in my notebook." },
            { id: "t3", q: "Who wore a grey coat?", a: "Mr. Ives. Wren wore black; the student wore green. I notice coats — it helps with lost property." },
          ], deflect: ["Everything I know is in my notebook.", "Check the luggage rack timings if you doubt me."] },
        { id: "s-pell", name: "Nadia Pell", role: "Student passenger", personality: "Nervous, earnest, observant when calm.", knows: "She heard the compartment door latch twice around the Millcross stop and saw atlas-sized wrapping paper in the dining car bin.",
          topics: [
            { id: "t1", q: "Did you hear anything in the night?", a: "The latch on Wren's door. Twice, close together, right around the Millcross stop. I thought he'd gone for tea." },
            { id: "t2", q: "Did you find anything odd?", a: "In the dining car bin this morning — brown wrapping paper, atlas-sized, with a bookseller's stamp from Wren's own shop. Someone unwrapped it on the train." },
            { id: "t3", q: "Where were you?", a: "In the reading nook with my thesis notes. The porter brought me tea at half eleven and can say so." },
          ], deflect: ["I really didn't see a face. Only heard the latch.", "Please find him. He was kind about my thesis."] },
      ],
      evidence: [
        { id: "e1", title: "Conductor's notebook", kind: "Document", location: "Dining Car", desc: "Six-minute Millcross stop; a tall man in a grey coat crossed the platform carrying a flat parcel. Ives wears grey.", key: true },
        { id: "e2", title: "Atlas wrapping paper", kind: "Physical", location: "Dining Car", desc: "Brown wrapping with Wren's own bookseller stamp, discarded in the dining car bin — the atlas was unwrapped on board.", key: true },
        { id: "e3", title: "Suitcase lining residue", kind: "Forensic", location: "Millcross Platform", desc: "Gold-leaf flakes matching the atlas binding were found in the lining of a suitcase checked at Millcross under Ives's ticket.", key: true },
        { id: "e4", title: "Wren's ticket stub", kind: "Document", location: "Wren's Compartment", desc: "A valid ticket to Aldermere, punched at boarding. Wren definitely boarded.", key: false },
        { id: "e5", title: "Latched window", kind: "Physical", location: "Wren's Compartment", desc: "The window is latched from inside — nobody left through it. The door was the only way out.", key: false },
        { id: "e6", title: "Tea tray receipt", kind: "Document", location: "Dining Car", desc: "Tea delivered to the reading nook at 23:30 for N. Pell, confirming her account.", key: false },
      ],
      progress: freshProgress(),
    },
    {
      id: "case-glasshouse", title: "The Glasshouse Orchid", category: "Missing object",
      briefing: "The night before the National Flower Show, the one-of-a-kind Midnight Orchid vanished from the locked Hartwell Glasshouse. No glass was broken. Only three people held keys.",
      culpritId: "s-verme", motive: "Unfinished — replaced by completeGlasshouse below.", locations: [],
      suspects: [], evidence: [], progress: freshProgress(),
    },
  ];
}

// Fill in the third case fully (kept separate for readability of the seed).
function completeGlasshouse(c: CaseDef): CaseDef {
  return {
    ...c,
    motive: "Head gardener Verme, passed over for the show's curator prize for a decade, took the orchid to sabotage the show and sell a cutting to a private collector.",
    locations: ["Orchid House", "Potting Shed", "Curator's Office"],
    suspects: [
      { id: "s-verme", name: "Anders Verme", role: "Head Gardener", personality: "Bitter, brilliant with plants, feels unappreciated.", knows: "He took the orchid at 21:15 using his key, and hid it in the potting shed's cold frame under sacking. He left soil from the show bed on the shed floor.",
        topics: [
          { id: "t1", q: "Where were you at 21:15?", a: "Home, with my supper gone cold, like every night before a show nobody thanks me for." },
          { id: "t2", q: "Who benefits if the show fails?", a: "Ask Curator Leigh — a disaster would be blamed on her security, not her precious prize committee." },
          { id: "t3", q: "What soil is used in the show bed?", a: "A special mix — charcoal flecks, my own recipe. You'd know it anywhere. Why?" },
        ], deflect: ["Thirty years I've given this place.", "The orchid needed darkness and quiet. Perhaps it has them."] },
      { id: "s-leigh", name: "Curator Simone Leigh", role: "Glasshouse Curator", personality: "Organized, anxious, transparent.", knows: "She locked up at 20:30 with the night guard and has the alarm log showing a key entry at 21:15 — not an alarm breach.",
        topics: [
          { id: "t1", q: "What does the alarm log show?", a: "No breach at all. The door was opened with a proper key at 21:15 and locked again at 21:22. It was one of us — that's the horror of it." },
          { id: "t2", q: "Who held keys?", a: "Myself, Anders Verme, and our apprentice June Park. Three keys, all accounted for this morning." },
          { id: "t3", q: "Any tensions on the team?", a: "Anders has been passed over for the curator prize ten years running. He stopped coming to the awards entirely." },
        ], deflect: ["My key never left my handbag that night.", "Please — the show opens in two days."] },
      { id: "s-park", name: "June Park", role: "Apprentice Gardener", personality: "Eager, honest, a little star-struck by the orchid.", knows: "She was at the cinema until 23:00. She noticed the potting shed padlock was warm — recently handled — when she arrived early next morning.",
        topics: [
          { id: "t1", q: "Where were you that night?", a: "At the Palace Cinema with my sister — the late showing. I have the ticket stubs in my coat, look." },
          { id: "t2", q: "Did you notice anything next morning?", a: "The potting shed padlock was warm, like someone had just held it. And there was dark soil — with little charcoal flecks — scattered by the cold frame." },
          { id: "t3", q: "Whose soil has charcoal flecks?", a: "Only the show-bed mix. Mr. Verme makes it himself; nobody else is allowed." },
        ], deflect: ["I would never touch the Midnight. It's… it's sacred, honestly.", "Check my ticket stubs, please."] },
    ],
    evidence: [
      { id: "e1", title: "Alarm & key log", kind: "Digital record", location: "Curator's Office", desc: "Door opened with an authorized key at 21:15, locked at 21:22. No breach — an insider with a key.", key: true },
      { id: "e2", title: "Charcoal-fleck soil", kind: "Forensic", location: "Potting Shed", desc: "Show-bed soil — unique charcoal-fleck mix made only by Verme — scattered by the cold frame where the orchid was hidden.", key: true },
      { id: "e3", title: "The orchid, recovered", kind: "Physical", location: "Potting Shed", desc: "The Midnight Orchid itself, under sacking in the cold frame, watered recently with the shed's measured feed — a gardener's care.", key: true },
      { id: "e4", title: "Cinema ticket stubs", kind: "Document", location: "Curator's Office", desc: "Two stubs for the 20:45 late showing, corroborating Park's account.", key: false },
      { id: "e5", title: "Prize committee letter", kind: "Document", location: "Curator's Office", desc: "This year's shortlist — Verme's name absent for the eleventh year.", key: false },
      { id: "e6", title: "Unbroken glass", kind: "Physical", location: "Orchid House", desc: "Every pane intact; the lock undamaged. Entry was with a key.", key: false },
    ],
  };
}

export function defaultCasefile(): CasefileDoc {
  const cases = seedCases().map((c) => (c.id === "case-glasshouse" ? completeGlasshouse(c) : c));
  return { cases };
}

export function Casefile() {
  const u = useUniverse();
  const [doc, setDoc] = useDoc<CasefileDoc>("casefile", defaultCasefile());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [suspectId, setSuspectId] = useState<string | null>(null);
  const [freeQ, setFreeQ] = useState("");
  const [hypText, setHypText] = useState("");
  const [hypSuspect, setHypSuspect] = useState("");
  const [accuseId, setAccuseId] = useState("");
  const [accuseEvidence, setAccuseEvidence] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [searchLoc, setSearchLoc] = useState<string | null>(null);

  const active = doc.cases.find((c) => c.id === activeId) ?? null;
  const suspect = active?.suspects.find((s) => s.id === suspectId) ?? null;
  const settings = (u.docs.settings as SettingsDoc | undefined);

  const askFree = useMutation({
    mutationFn: async (args: { c: CaseDef; s: Suspect; q: string }) => {
      const key = getGeminiKey();
      if (!key) {
        const s = args.s;
        const lower = args.q.toLowerCase();
        const topic = s.topics.find((t) => lower.split(/\s+/).some((w) => w.length > 4 && t.q.toLowerCase().includes(w)));
        return { answer: topic ? `${topic.a} (Demo mode: scripted from ${s.name}'s established knowledge.)` : `${s.deflect[Math.floor(Math.random() * s.deflect.length)]} (Demo mode — connect Gemini in Settings for full roleplay.)`, demo: true };
      }
      const res = await api.omniChat({
        environment: "casefile", mode: `roleplay:${args.s.name}`, message: args.q,
        context: `You are roleplaying ${args.s.name}, ${args.s.role} in the fictional case "${args.c.title}". Personality: ${args.s.personality} What you know (never reveal beyond this, deflect or stay vague on anything else, never invent facts that contradict it): ${args.s.knows} Case briefing: ${args.c.briefing}`,
        history: [], apiKey: key, model: settings?.model ?? "gemini-3.1-flash-lite",
      });
      return { answer: res.reply, demo: res.demo };
    },
    onSuccess: (res, args) => {
      patchCase(args.c.id, (p) => ({ ...p, transcript: [...p.transcript, { suspectId: args.s.id, q: args.q, a: res.answer }] }));
    },
  });

  function patchCase(id: string, fn: (p: Progress) => Progress) {
    setDoc({ ...doc, cases: doc.cases.map((c) => (c.id === id ? { ...c, progress: fn(c.progress) } : c)) });
  }

  if (!active) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ color: "var(--dim)", fontSize: 14, margin: 0 }}>Every case is fictional and has one fixed truth. Evidence never changes, statements never contradict it, and your score rewards reasoning — not guessing.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
          {doc.cases.map((c) => (
            <div key={c.id} className="panel glow" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 16 }}>{c.title}</strong>
                <Chip color={c.progress.status === "closed" ? "var(--good)" : c.progress.status === "open" ? "#f472b6" : "var(--dim)"}>
                  {c.progress.status === "closed" ? `Closed · ${c.progress.score ?? 0}/100` : c.progress.status}
                </Chip>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", margin: "2px 0 6px" }}>{c.category} · {c.suspects.length} suspects · {c.evidence.length} evidence items</div>
              <p style={{ fontSize: 13.5, color: "var(--dim)", margin: "0 0 10px" }}>{c.briefing}</p>
              <Btn kind="primary" small onClick={() => {
                setActiveId(c.id);
                if (c.progress.status === "new") { patchCase(c.id, (p) => ({ ...p, status: "open" })); u.unlock("case-opened"); u.act("casefile", `Opened case "${c.title}"`); }
              }}>{c.progress.status === "closed" ? "Review case" : c.progress.status === "open" ? "Continue investigation" : "Open case"}</Btn>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const prog = active.progress;
  const foundHere = (loc: string) => active.evidence.filter((e) => e.location === loc);

  function conclude() {
    if (!active || !accuseId) return;
    const keyTotal = active.evidence.filter((e) => e.key).length;
    const keyFound = active.evidence.filter((e) => e.key && accuseEvidence.includes(e.id)).length;
    const culpritPts = accuseId === active.culpritId ? 50 : 0;
    const evPts = keyTotal ? Math.round((keyFound / keyTotal) * 30) : 0;
    const reasonPts = reasoning.trim().length >= 60 ? 20 : reasoning.trim().length >= 25 ? 12 : reasoning.trim() ? 6 : 0;
    const score = culpritPts + evPts + reasonPts;
    const culprit = active.suspects.find((s) => s.id === active.culpritId);
    const verdict = accuseId === active.culpritId
      ? `Correct. ${culprit?.name} did it. Motive: ${active.motive} Key evidence cited: ${keyFound}/${keyTotal}. Reasoning: ${reasonPts}/20.`
      : `Not proven. The evidence you cited does not convict ${active.suspects.find((s) => s.id === accuseId)?.name}. The real culprit was ${culprit?.name}. Motive: ${active.motive} Reopen the case and keep investigating — the truth does not change.`;
    patchCase(active.id, (p) => ({ ...p, status: "closed", accusedId: accuseId, score, verdict }));
    if (accuseId === active.culpritId) { u.unlock("case-closed"); u.notify("casefile", "Case closed", `${active.title} solved · ${score}/100`); }
    u.act("casefile", `Concluded "${active.title}" · ${score}/100`);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 24, letterSpacing: ".04em" }}>{active.title}</h2>
          <div style={{ color: "var(--dim)", fontSize: 13 }}>{active.category} · Evidence {prog.foundEvidence.length}/{active.evidence.length} · {prog.status}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => window.dispatchEvent(new CustomEvent("open-omni"))}>Detective assistant (OMNI)</Btn>
          <Btn kind="ghost" onClick={() => setActiveId(null)}>All cases</Btn>
        </div>
      </div>
      <p style={{ fontSize: 14, color: "var(--dim)", margin: 0 }}>{active.briefing}</p>

      {prog.status === "closed" && (
        <Panel title="Verdict" pad={12}>
          <p style={{ margin: 0, fontSize: 14.5 }}>{prog.verdict}</p>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <Stat label="Score" value={`${prog.score ?? 0}/100`} />
            <Btn onClick={() => patchCase(active.id, (p) => ({ ...freshProgress(), status: "open", notes: p.notes }))}>Reopen case</Btn>
          </div>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <Panel title="Locations — search for evidence">
            <div style={{ display: "grid", gap: 8 }}>
              {active.locations.map((loc) => {
                const items = foundHere(loc);
                const foundCount = items.filter((e) => prog.foundEvidence.includes(e.id)).length;
                return (
                  <div key={loc} className="panel" style={{ padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 14.5 }}>{loc}</strong>
                      <Btn small disabled={foundCount >= items.length} onClick={() => {
                        const next = items.find((e) => !prog.foundEvidence.includes(e.id));
                        if (next) { patchCase(active.id, (p) => ({ ...p, foundEvidence: [...p.foundEvidence, next.id] })); setSearchLoc(loc); u.act("casefile", `Found evidence "${next.title}"`); }
                      }}>{foundCount >= items.length ? "Fully searched" : `Search (${foundCount}/${items.length} found)`}</Btn>
                    </div>
                    {items.filter((e) => prog.foundEvidence.includes(e.id)).map((e) => (
                      <div key={e.id} style={{ fontSize: 13, marginTop: 6, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                        <strong>{e.title}</strong> <span style={{ color: "var(--dim)" }}>· {e.kind}{e.key ? " · ★ key" : ""}</span>
                        <div style={{ color: "var(--dim)" }}>{e.desc}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Investigation notes">
            <textarea aria-label="Investigation notes" value={prog.notes} onChange={(e) => patchCase(active.id, (p) => ({ ...p, notes: e.target.value }))} rows={4} style={{ ...inputStyle, resize: "vertical" }} placeholder="Your reasoning, timelines, contradictions…" />
          </Panel>

          <Panel title="Hypotheses">
            <div style={{ display: "grid", gap: 6 }}>
              {prog.hypotheses.map((h) => (
                <div key={h.id} style={{ fontSize: 13.5 }}><strong>{active.suspects.find((s) => s.id === h.suspectId)?.name ?? "?"}:</strong> {h.text}</div>
              ))}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select aria-label="Hypothesis suspect" value={hypSuspect} onChange={(e) => setHypSuspect(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                  <option value="">Suspect…</option>
                  {active.suspects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input aria-label="Hypothesis text" value={hypText} onChange={(e) => setHypText(e.target.value)} placeholder="Theory…" style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                <Btn small disabled={!hypText.trim() || !hypSuspect} onClick={() => { patchCase(active.id, (p) => ({ ...p, hypotheses: [...p.hypotheses, { id: uid(), text: hypText.trim(), suspectId: hypSuspect }] })); setHypText(""); }}>Add</Btn>
              </div>
            </div>
          </Panel>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Panel title="Suspects — interview">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {active.suspects.map((s) => (
                <Chip key={s.id} active={suspectId === s.id} onClick={() => setSuspectId(s.id)} color="#f472b6">{s.name}</Chip>
              ))}
            </div>
            {suspect ? (
              <div>
                <div style={{ fontSize: 13.5, color: "var(--dim)", marginBottom: 8 }}><strong style={{ color: "var(--text)" }}>{suspect.name}</strong> · {suspect.role} · {suspect.personality}</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {suspect.topics.map((t) => {
                    const asked = (prog.asked[suspect.id] ?? []).includes(t.id);
                    return (
                      <div key={t.id}>
                        <Btn small kind={asked ? "ghost" : "soft"} onClick={() => patchCase(active.id, (p) => ({ ...p, asked: { ...p.asked, [suspect.id]: [...new Set([...(p.asked[suspect.id] ?? []), t.id])] } }))}>{asked ? "✓ " : ""}{t.q}</Btn>
                        {asked && <div style={{ fontSize: 13.5, margin: "5px 0 2px", padding: "8px 10px", background: "#0a1122", borderRadius: 8, borderLeft: "3px solid #f472b6" }}>"{t.a}"</div>}
                      </div>
                    );
                  })}
                </div>
                {prog.transcript.filter((t) => t.suspectId === suspect.id).map((t, i) => (
                  <div key={i} style={{ fontSize: 13.5, marginTop: 8 }}>
                    <div style={{ color: "var(--dim)" }}>You: {t.q}</div>
                    <div style={{ padding: "8px 10px", background: "#0a1122", borderRadius: 8, borderLeft: "3px solid #f472b6", marginTop: 3 }}>"{t.a}"</div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <input aria-label="Ask a free question" value={freeQ} onChange={(e) => setFreeQ(e.target.value)} placeholder={`Ask ${suspect.name.split(" ")[0]} anything…`} style={{ ...inputStyle, flex: 1 }} />
                  <Btn small kind="primary" disabled={!freeQ.trim() || askFree.isPending} onClick={() => { if (active && suspect) { askFree.mutate({ c: active, s: suspect, q: freeQ.trim() }); setFreeQ(""); } }}>{askFree.isPending ? "…" : "Ask"}</Btn>
                </div>
              </div>
            ) : <p style={{ color: "var(--dim)", fontSize: 14, margin: 0 }}>Pick a suspect to interview. Scripted questions always draw on their fixed knowledge; free questions use OMNI roleplay when a Gemini key is connected, scripted deflections in demo mode.</p>}
          </Panel>

          <Panel title="Present your conclusion">
            <div style={{ display: "grid", gap: 8 }}>
              <select aria-label="Accuse a suspect" value={accuseId} onChange={(e) => setAccuseId(e.target.value)} style={inputStyle}>
                <option value="">Accuse…</option>
                {active.suspects.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
              </select>
              <div>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 4 }}>Cite evidence (key evidence marked ★ in Locations):</div>
                {active.evidence.filter((e) => prog.foundEvidence.includes(e.id)).map((e) => (
                  <label key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, padding: "3px 0" }}>
                    <input type="checkbox" checked={accuseEvidence.includes(e.id)} onChange={(ev) => setAccuseEvidence(ev.target.checked ? [...accuseEvidence, e.id] : accuseEvidence.filter((x) => x !== e.id))} style={{ width: 18, height: 18 }} />
                    {e.title}
                  </label>
                ))}
                {prog.foundEvidence.length === 0 && <div style={{ fontSize: 13, color: "var(--dim)" }}>No evidence found yet — search the locations first.</div>}
              </div>
              <textarea aria-label="Reasoning" value={reasoning} onChange={(e) => setReasoning(e.target.value)} rows={3} placeholder="Your reasoning (60+ characters earns full reasoning marks)…" style={{ ...inputStyle, resize: "vertical" }} />
              <Btn kind="primary" disabled={!accuseId || prog.status === "closed"} onClick={conclude}>Present conclusion & close case</Btn>
            </div>
          </Panel>
        </div>
      </div>
      {searchLoc && <span aria-live="polite" style={{ position: "absolute", left: -9999 }}>{`Evidence found at ${searchLoc}`}</span>}
    </div>
  );
}
