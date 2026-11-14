// SONORA — Music & Creative Production Studio. A working WebAudio studio:
// 16-step sequencer with synthesized drums (no samples), a piano roll for
// melodic tracks, tempo/mute/solo/volume, multiple projects, artists and
// albums. The "AI producer" pattern generator is a deterministic in-app
// action; OMNI handles concepts, lyrics and advice.

import { useEffect, useRef, useState } from "react";
import {
Btn, Chip, EmptyState, Panel, Stat,
download, hashSeed, inputStyle, rng, uid, useDoc, useUniverse,
} from "../core";

export type TrackKind = "kick" | "snare" | "hat" | "clap" | "bass" | "lead";
export interface STrack { id: string; name: string; kind: TrackKind; steps: boolean[]; notes: Array<number | null>; volume: number; mute: boolean; solo: boolean }
export interface SProject { id: string; name: string; bpm: number; tracks: STrack[] }
export interface SonoraDoc {
  projects: SProject[]; activeId: string;
  artists: Array<{ id: string; name: string; genre: string; bio: string }>;
  albums: Array<{ id: string; title: string; artistId: string; projectIds: string[]; year: string; concept: string }>;
}

const STEPS = 16;
const SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor
const LEAD_ROWS = [72, 71, 69, 67, 65, 64, 62, 60, 59, 57];
const BASS_ROWS = [45, 43, 41, 40, 38, 36];

function track(kind: TrackKind, name: string): STrack {
  return { id: uid(), name, kind, steps: Array(STEPS).fill(false), notes: Array(STEPS).fill(null), volume: 0.8, mute: false, solo: false };
}
export function starterProject(): SProject {
  const kick = track("kick", "Kick"); kick.id = "t-kick"; [0, 4, 8, 12].forEach((i) => (kick.steps[i] = true));
  const snare = track("snare", "Snare"); snare.id = "t-snare"; [4, 12].forEach((i) => (snare.steps[i] = true));
  const hat = track("hat", "Hat"); hat.id = "t-hat"; for (let i = 0; i < 16; i += 2) hat.steps[i] = true;
  const bass = track("bass", "Bass"); bass.id = "t-bass"; bass.notes = [45, null, 45, null, 43, null, 45, null, 41, null, 41, null, 43, null, 45, null];
  const lead = track("lead", "Lead"); lead.id = "t-lead"; lead.notes = [69, null, null, 72, null, null, 69, null, 67, null, null, 65, null, 64, null, null];
  return { id: "p-starter", name: "First Light", bpm: 122, tracks: [kick, snare, hat, bass, lead] };
}
export function defaultSonora(): SonoraDoc {
  const p = starterProject();
  return { projects: [p], activeId: p.id, artists: [], albums: [] };
}

const GENRES: Record<string, (r: () => number, p: SProject) => SProject> = {
  House: (r, p) => fill(r, p, { kick: [0, 4, 8, 12], snare: [], clap: [4, 12], hatEvery: 2, bassRoot: 45, leadDensity: 0.3 }),
  Techno: (r, p) => fill(r, p, { kick: [0, 4, 8, 12], snare: [], clap: [], hatEvery: 4, bassRoot: 43, leadDensity: 0.16 }),
  "Hip-Hop": (r, p) => fill(r, p, { kick: [0, 7, 10], snare: [4, 12], clap: [], hatEvery: 2, bassRoot: 41, leadDensity: 0.22 }),
  Chill: (r, p) => fill(r, p, { kick: [0, 8], snare: [8], clap: [], hatEvery: 4, bassRoot: 48, leadDensity: 0.4 }),
};
function fill(r: () => number, p: SProject, o: { kick: number[]; snare: number[]; clap: number[]; hatEvery: number; bassRoot: number; leadDensity: number }): SProject {
  const tracks = p.tracks.map((t) => {
    const nt = { ...t, steps: Array(STEPS).fill(false) as boolean[], notes: Array(STEPS).fill(null) as Array<number | null> };
    if (t.kind === "kick") o.kick.forEach((i) => (nt.steps[i] = true));
    if (t.kind === "snare") o.snare.forEach((i) => (nt.steps[i] = true));
    if (t.kind === "clap") o.clap.forEach((i) => (nt.steps[i] = true));
    if (t.kind === "hat") for (let i = 0; i < STEPS; i += o.hatEvery) nt.steps[i] = r() > 0.15;
    if (t.kind === "bass") for (let i = 0; i < STEPS; i += 2) nt.notes[i] = o.bassRoot + (SCALE[Math.floor(r() * 3)] ?? 0) - 12 + 12;
    if (t.kind === "lead") for (let i = 0; i < STEPS; i++) if (r() < o.leadDensity) nt.notes[i] = 60 + (SCALE[Math.floor(r() * SCALE.length)] ?? 0) + (r() > 0.7 ? 12 : 0);
    return nt;
  });
  return { ...p, tracks };
}

// ------------------------------------------------------------- audio engine
function midiHz(m: number) { return 440 * Math.pow(2, (m - 69) / 12); }

export function Sonora() {
  const u = useUniverse();
  const [doc, setDoc] = useDoc<SonoraDoc>("sonora", defaultSonora());
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [genre, setGenre] = useState("House");
  const [newName, setNewName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [artistGenre, setArtistGenre] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const audioRef = useRef<{ ctx: AudioContext; timer: number; nextTime: number; cur: number } | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const project = doc.projects.find((p) => p.id === doc.activeId) ?? doc.projects[0];

  function playSound(ctx: AudioContext, t: STrack, when: number, s: number) {
    const g = ctx.createGain();
    g.gain.value = t.volume * 0.9;
    g.connect(ctx.destination);
    const noise = (dur: number, filterType: BiquadFilterType, freq: number, vol: number) => {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vol, when);
      ng.gain.exponentialRampToValueAtTime(0.001, when + dur);
      src.connect(f); f.connect(ng); ng.connect(g);
      src.start(when); src.stop(when + dur);
    };
    if (t.kind === "kick") {
      const o = ctx.createOscillator(); const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(160, when);
      o.frequency.exponentialRampToValueAtTime(40, when + 0.12);
      og.gain.setValueAtTime(1, when);
      og.gain.exponentialRampToValueAtTime(0.001, when + 0.24);
      o.connect(og); og.connect(g); o.start(when); o.stop(when + 0.25);
    } else if (t.kind === "snare") noise(0.16, "bandpass", 1800, 0.7);
    else if (t.kind === "hat") noise(0.05, "highpass", 7000, 0.35);
    else if (t.kind === "clap") { noise(0.09, "bandpass", 1200, 0.6); }
    else {
      const note = t.notes[s];
      if (note == null) return;
      const o = ctx.createOscillator(); const og = ctx.createGain();
      o.type = t.kind === "bass" ? "sawtooth" : "triangle";
      o.frequency.value = midiHz(note);
      const dur = t.kind === "bass" ? 0.22 : 0.3;
      og.gain.setValueAtTime(t.kind === "bass" ? 0.5 : 0.4, when);
      og.gain.exponentialRampToValueAtTime(0.001, when + dur);
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = t.kind === "bass" ? 500 : 3200;
      o.connect(f); f.connect(og); og.connect(g);
      o.start(when); o.stop(when + dur + 0.02);
    }
  }

  function start() {
    if (!project) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = audioRef.current?.ctx ?? new AC();
    if (audioRef.current?.ctx !== ctx) {
      audioRef.current = { ctx, timer: 0, nextTime: 0, cur: 0 };
    }
    void ctx.resume();
    const st = audioRef.current;
    st.nextTime = ctx.currentTime + 0.06;
    st.cur = 0;
    const tick = () => {
      const d = docRef.current;
      const p = d.projects.find((x) => x.id === d.activeId) ?? d.projects[0];
      if (!p) return;
      const spb = 60 / p.bpm / 4;
      while (st.nextTime < ctx.currentTime + 0.14) {
        const s = st.cur;
        const anySolo = p.tracks.some((t) => t.solo);
        for (const t of p.tracks) {
          if (t.mute || (anySolo && !t.solo)) continue;
          const hit = t.kind === "bass" || t.kind === "lead" ? t.notes[s] != null : t.steps[s];
          if (hit) playSound(ctx, t, st.nextTime, s);
        }
        setStep(s);
        st.nextTime += spb;
        st.cur = (st.cur + 1) % STEPS;
      }
    };
    tick();
    st.timer = window.setInterval(tick, 27);
    setPlaying(true);
  }
  function stop() {
    if (audioRef.current) window.clearInterval(audioRef.current.timer);
    setPlaying(false);
    setStep(-1);
  }
  useEffect(() => () => { if (audioRef.current) window.clearInterval(audioRef.current.timer); }, []);

  function save(next: SonoraDoc) { setDoc(next); }
  function patchProject(fn: (p: SProject) => SProject) {
    if (!project) return;
    save({ ...doc, projects: doc.projects.map((p) => (p.id === project.id ? fn(p) : p)) });
  }
  function patchTrack(tid: string, fn: (t: STrack) => STrack) {
    patchProject((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === tid ? fn(t) : t)) }));
  }

  if (!project) {
    return (
      <EmptyState title="No projects yet" body="Create your first SONORA project to open the studio.">
        <Btn kind="primary" onClick={() => { const p = starterProject(); save({ ...doc, projects: [p], activeId: p.id }); }}>Create project</Btn>
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select aria-label="Active project" value={project.id} onChange={(e) => save({ ...doc, activeId: e.target.value })} style={{ ...inputStyle, width: "auto", fontWeight: 700 }}>
            {doc.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input aria-label="Rename project" value={project.name} onChange={(e) => patchProject((p) => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, width: 160 }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Btn kind={playing ? "danger" : "primary"} onClick={playing ? stop : start} ariaLabel={playing ? "Stop playback" : "Play project"}>{playing ? "■ Stop" : "▶ Play"}</Btn>
          <Btn onClick={() => { download(`${project.name.replace(/\s+/g, "-")}.sonora.json`, JSON.stringify(project, null, 2)); }}>Export project</Btn>
          <Btn onClick={() => window.dispatchEvent(new CustomEvent("open-omni"))}>AI producer (OMNI)</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        <Stat label="Projects" value={String(doc.projects.length)} />
        <Stat label="Artists" value={String(doc.artists.length)} />
        <Stat label="Albums" value={String(doc.albums.length)} />
        <div className="panel" style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: 11, letterSpacing: ".08em", color: "var(--dim)", textTransform: "uppercase" }}>Tempo · {project.bpm} BPM</div>
          <input aria-label="Tempo in BPM" type="range" min={60} max={180} value={project.bpm} onChange={(e) => patchProject((p) => ({ ...p, bpm: Number(e.target.value) }))} style={{ width: "100%" }} />
        </div>
      </div>

      <Panel title="Step sequencer — tap cells; drums use steps, Bass & Lead use the piano roll below" pad={10}>
        <div style={{ display: "grid", gap: 6, overflowX: "auto" }} className="scrollthin">
          {project.tracks.map((t) => (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "118px repeat(16, minmax(26px,1fr))", gap: 4, alignItems: "center", minWidth: 640 }}>
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <button type="button" aria-label={`Mute ${t.name}`} onClick={() => patchTrack(t.id, (x) => ({ ...x, mute: !x.mute }))} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, border: "1px solid var(--border)", background: t.mute ? "var(--bad)" : "var(--surface2)", color: t.mute ? "#fff" : "var(--dim)", cursor: "pointer", minHeight: 24 }}>M</button>
                <button type="button" aria-label={`Solo ${t.name}`} onClick={() => patchTrack(t.id, (x) => ({ ...x, solo: !x.solo }))} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, border: "1px solid var(--border)", background: t.solo ? "var(--warn)" : "var(--surface2)", color: t.solo ? "#000" : "var(--dim)", cursor: "pointer", minHeight: 24 }}>S</button>
              </div>
              {t.steps.map((on, s) => {
                const melodic = t.kind === "bass" || t.kind === "lead";
                const active = melodic ? t.notes[s] != null : on;
                return (
                  <button key={s} type="button" aria-label={`${t.name} step ${s + 1}${active ? " on" : " off"}`}
                    onClick={() => patchTrack(t.id, (x) => melodic
                      ? { ...x, notes: x.notes.map((n, i) => (i === s ? (n == null ? (t.kind === "bass" ? 45 : 69) : null) : n)) }
                      : { ...x, steps: x.steps.map((v, i) => (i === s ? !v : v)) })}
                    style={{ height: 30, borderRadius: 5, border: "1px solid var(--border)", cursor: "pointer",
                      background: active ? "#a78bfa" : s === step && playing ? "#22345c" : s % 4 === 0 ? "#16233f" : "#0d1526",
                      boxShadow: s === step && playing ? "0 0 0 1px #a78bfa inset" : undefined }} />
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {(["kick", "snare", "hat", "clap", "bass", "lead"] as TrackKind[]).map((k) => (
            <Btn key={k} small onClick={() => patchProject((p) => ({ ...p, tracks: [...p.tracks, track(k, k[0]?.toUpperCase() + k.slice(1))] }))}>+ {k}</Btn>
          ))}
          <Btn small kind="ghost" onClick={() => patchProject((p) => ({ ...p, tracks: p.tracks.slice(0, -1) }))} disabled={project.tracks.length <= 1}>Remove last track</Btn>
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
        <Panel title="Piano roll — Lead & Bass pitch per step (click a cell)">
          {project.tracks.filter((t) => t.kind === "lead" || t.kind === "bass").map((t) => {
            const rows = t.kind === "lead" ? LEAD_ROWS : BASS_ROWS;
            return (
              <div key={t.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{t.name} <span style={{ color: "var(--dim)", fontWeight: 400 }}>volume</span>
                  <input aria-label={`${t.name} volume`} type="range" min={0} max={1} step={0.05} value={t.volume} onChange={(e) => patchTrack(t.id, (x) => ({ ...x, volume: Number(e.target.value) }))} style={{ width: 90, marginLeft: 6, verticalAlign: "middle" }} />
                </div>
                <div style={{ display: "grid", gap: 2, overflowX: "auto" }} className="scrollthin">
                  {rows.map((midi) => (
                    <div key={midi} style={{ display: "grid", gridTemplateColumns: "34px repeat(16, minmax(22px,1fr))", gap: 2, minWidth: 480 }}>
                      <span className="font-mono2" style={{ fontSize: 10.5, color: "var(--dim)", alignSelf: "center" }}>{midi}</span>
                      {Array.from({ length: STEPS }, (_, s) => {
                        const on = t.notes[s] === midi;
                        return (
                          <button key={s} type="button" aria-label={`${t.name} step ${s + 1} pitch ${midi}`}
                            onClick={() => patchTrack(t.id, (x) => ({ ...x, notes: x.notes.map((n, i) => (i === s ? (n === midi ? null : midi) : n)) }))}
                            style={{ height: 16, borderRadius: 3, border: "1px solid var(--border)", cursor: "pointer", background: on ? "#22d3ee" : s === step && playing ? "#22345c" : "#0d1526" }} />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Panel>

        <div style={{ display: "grid", gap: 12 }}>
          <Panel title="AI producer — generate a pattern">
            <p style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 0 }}>Generates drums, bassline and a sparse lead for the current project in the chosen genre. This is a deterministic in-app action — review and keep or regenerate. For concepts, lyrics and arrangement ideas, ask OMNI.</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <select aria-label="Genre for generated pattern" value={genre} onChange={(e) => setGenre(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                {Object.keys(GENRES).map((g) => <option key={g}>{g}</option>)}
              </select>
              <Btn kind="primary" onClick={() => {
                const gen = GENRES[genre];
                if (gen) patchProject((p) => gen(rng(hashSeed(p.id + genre + Date.now())), p));
                u.act("sonora", `Generated a ${genre} pattern in "${project.name}"`);
              }}>Generate {genre} pattern</Btn>
              <Btn onClick={() => { save({ ...doc, projects: [...doc.projects, { ...starterProject(), name: "Untitled " + (doc.projects.length + 1) }] }); u.unlock("first-track"); }}>New project</Btn>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input aria-label="New project name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name for a blank project" style={{ ...inputStyle, flex: 1 }} />
              <Btn small onClick={() => { if (!newName.trim()) return; const p: SProject = { id: uid(), name: newName.trim(), bpm: 120, tracks: [track("kick", "Kick"), track("bass", "Bass"), track("lead", "Lead")] }; save({ ...doc, projects: [...doc.projects, p], activeId: p.id }); setNewName(""); u.unlock("first-track"); u.act("sonora", `Created project "${p.name}"`); }}>Create blank</Btn>
            </div>
          </Panel>

          <Panel title="Artists & albums">
            <div style={{ display: "grid", gap: 8 }}>
              {doc.artists.map((a) => (
                <div key={a.id} className="panel" style={{ padding: 10 }}>
                  <strong>{a.name}</strong> <Chip color="#a78bfa">{a.genre}</Chip>
                  {a.bio && <div style={{ fontSize: 13, color: "var(--dim)" }}>{a.bio}</div>}
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input aria-label="Artist name" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist name" style={{ ...inputStyle, flex: "1 1 120px" }} />
                <input aria-label="Artist genre" value={artistGenre} onChange={(e) => setArtistGenre(e.target.value)} placeholder="Genre" style={{ ...inputStyle, flex: "1 1 100px" }} />
                <Btn small kind="primary" disabled={!artistName.trim()} onClick={() => { save({ ...doc, artists: [...doc.artists, { id: uid(), name: artistName.trim(), genre: artistGenre.trim() || "Electronic", bio: "" }] }); setArtistName(""); setArtistGenre(""); }}>Add artist</Btn>
              </div>
              {doc.albums.map((al) => (
                <div key={al.id} className="panel" style={{ padding: 10 }}>
                  <strong>{al.title}</strong>
                  <div style={{ fontSize: 13, color: "var(--dim)" }}>{doc.artists.find((a) => a.id === al.artistId)?.name ?? "Unknown artist"} · {al.year} · {al.projectIds.length} tracks{al.concept ? ` · ${al.concept}` : ""}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input aria-label="Album title" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} placeholder="Album title" style={{ ...inputStyle, flex: "1 1 130px" }} />
                <select aria-label="Album artist" value={albumArtist} onChange={(e) => setAlbumArtist(e.target.value)} style={{ ...inputStyle, flex: "1 1 130px" }}>
                  <option value="">Choose artist…</option>
                  {doc.artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <Btn small kind="primary" disabled={!albumTitle.trim() || !albumArtist} onClick={() => {
                  save({ ...doc, albums: [...doc.albums, { id: uid(), title: albumTitle.trim(), artistId: albumArtist, projectIds: doc.projects.map((p) => p.id), year: String(new Date().getFullYear()), concept: "" }] });
                  setAlbumTitle(""); u.unlock("producer"); u.notify("sonora", "Album released", albumTitle.trim());
                }}>Release album (all projects as tracks)</Btn>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
