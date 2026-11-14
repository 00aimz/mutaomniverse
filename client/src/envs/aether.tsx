// AETHER — Browser-Based Operating System. A working window manager
// (drag, resize, minimize, maximize, close, layering) over a persisted
// VIRTUAL file system — clearly labeled virtual, never the user's real
// files. Apps: File Manager, Text Editor (tabs, autosave), Terminal
// Simulator (safe commands over the virtual FS), Calendar, Calculator
// (safe expression parser + history), and an internal Browser for
// OMNIVERSE's own pages and documents.

import { useEffect, useRef, useState } from "react";
import { Btn, download, inputStyle, uid, useDoc, useUniverse } from "../core";

export interface VFile { id: string; parentId: string | null; name: string; type: "file" | "folder"; content: string; updatedAt: number }
export interface CalEvent { id: string; date: string; title: string }
export interface AetherDoc { files: VFile[]; events: CalEvent[] }

const SEED_FILES: VFile[] = [
  { id: "f-root-docs", parentId: null, name: "Documents", type: "folder", content: "", updatedAt: Date.now() },
  { id: "f-root-proj", parentId: null, name: "Projects", type: "folder", content: "", updatedAt: Date.now() },
  { id: "f-welcome", parentId: "f-root-docs", name: "welcome.md", type: "file", content: "# Welcome to AETHER\n\nThis is a virtual drive inside OMNIVERSE. Files here are not on your real computer.\n\nTry the Terminal: type `help`.\n", updatedAt: Date.now() },
  { id: "f-ideas", parentId: "f-root-docs", name: "ideas.txt", type: "file", content: "Ideas:\n- Link the EMPIRE company plan here\n- Draft the SONORA album concept\n", updatedAt: Date.now() },
  { id: "f-plan", parentId: "f-root-proj", name: "universe-plan.md", type: "file", content: "# Universe plan\n\n1. Grow NEXUS to Year 10\n2. First contact in ORBIT\n3. Close a CASEFILE case\n", updatedAt: Date.now() },
];
export const defaultAether = (): AetherDoc => ({ files: SEED_FILES, events: [] });

type AppId = "files" | "editor" | "terminal" | "calendar" | "calculator" | "browser";
interface Win { id: string; app: AppId; title: string; x: number; y: number; w: number; h: number; z: number; min: boolean; max: boolean; payload?: string }
const APP_META: Record<AppId, { name: string; glyph: string }> = {
  files: { name: "File Manager", glyph: "▦" },
  editor: { name: "Text Editor", glyph: "✎" },
  terminal: { name: "Terminal", glyph: "›_" },
  calendar: { name: "Calendar", glyph: "▤" },
  calculator: { name: "Calculator", glyph: "±" },
  browser: { name: "Browser", glyph: "◎" },
};

export function Aether() {
  const [doc, setDoc] = useDoc<AetherDoc>("aether", defaultAether());
  const [wins, setWins] = useState<Win[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const zRef = useRef(10);
  const deskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 20000);
    return () => window.clearInterval(t);
  }, []);

  function open(app: AppId, payload?: string) {
    zRef.current += 1;
    const existing = wins.find((w) => w.app === app && app !== "editor");
    if (existing) {
      setWins(wins.map((w) => (w.id === existing.id ? { ...w, min: false, z: zRef.current, payload: payload ?? w.payload } : w)));
      return;
    }
    const n = wins.length;
    // Fit the window inside the desktop: on a phone the desktop is ~360px
    // wide, so a fixed 620px window would overflow and clip its own content.
    const deskW = deskRef.current?.clientWidth ?? 960;
    const winW = Math.min(app === "calculator" ? 320 : 620, Math.max(280, deskW - 16));
    const winX = Math.max(4, Math.min(24 + (n % 5) * 26, deskW - winW - 4));
    setWins([...wins, {
      id: uid(), app, title: APP_META[app].name,
      x: winX, y: 18 + (n % 5) * 22, w: winW, h: app === "calculator" ? 430 : 430,
      z: zRef.current, min: false, max: false, payload,
    }]);
    setStartOpen(false);
  }
  function focus(id: string) { zRef.current += 1; setWins(wins.map((w) => (w.id === id ? { ...w, z: zRef.current, min: false } : w))); }
  function close(id: string) { setWins(wins.filter((w) => w.id !== id)); }

  function dragStart(e: React.PointerEvent, w: Win) {
    if (w.max) return;
    const sx = e.clientX - w.x; const sy = e.clientY - w.y;
    const move = (ev: PointerEvent) => {
      setWins((cur) => cur.map((x) => (x.id === w.id ? { ...x, x: Math.max(-80, ev.clientX - sx), y: Math.max(0, ev.clientY - sy) } : x)));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  function resizeStart(e: React.PointerEvent, w: Win) {
    e.stopPropagation();
    const sx = e.clientX; const sy = e.clientY; const sw = w.w; const sh = w.h;
    const move = (ev: PointerEvent) => {
      setWins((cur) => cur.map((x) => (x.id === w.id ? { ...x, w: Math.max(300, sw + ev.clientX - sx), h: Math.max(220, sh + ev.clientY - sy) } : x)));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div>
      <div ref={deskRef} style={{ position: "relative", height: "min(72vh, 640px)", minHeight: 480, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "radial-gradient(ellipse at 75% 15%, rgba(167,139,250,.25), transparent 55%), radial-gradient(ellipse at 20% 85%, rgba(34,211,238,.18), transparent 50%), linear-gradient(160deg,#0a1330,#060a18 70%)" }}>
        {/* desktop icons */}
        <div style={{ position: "absolute", top: 12, left: 12, display: "grid", gap: 10, zIndex: 1 }}>
          {(Object.keys(APP_META) as AppId[]).map((a) => (
            <button key={a} type="button" onClick={() => open(a)} aria-label={`Open ${APP_META[a].name}`}
              style={{ background: "rgba(13,21,38,.65)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", padding: "8px 6px", width: 84, cursor: "pointer", backdropFilter: "blur(4px)" }}>
              <div style={{ fontSize: 20, color: "var(--accent2)" }}>{APP_META[a].glyph}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>{APP_META[a].name}</div>
            </button>
          ))}
          <div style={{ fontSize: 11, color: "var(--dim)", width: 84, textAlign: "center" }}>Virtual desktop — files live in OMNIVERSE, not on your device.</div>
        </div>

        {wins.filter((w) => !w.min).map((w) => (
          <div key={w.id} role="dialog" aria-label={w.title}
            style={{ position: "absolute", left: w.max ? 0 : w.x, top: w.max ? 0 : w.y, width: w.max ? "100%" : w.w, height: w.max ? "calc(100% - 40px)" : w.h, zIndex: w.z, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: w.max ? 0 : 10, boxShadow: "0 18px 50px rgba(0,0,0,.5)", overflow: "hidden" }}
            onPointerDown={() => focus(w.id)}>
            <div onPointerDown={(e) => dragStart(e, w)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", cursor: w.max ? "default" : "move", touchAction: "none", userSelect: "none" }}>
              <span style={{ color: "var(--accent2)" }}>{APP_META[w.app].glyph}</span>
              <strong style={{ fontSize: 13.5, flex: 1 }}>{w.title}</strong>
              <button type="button" aria-label={`Minimize ${w.title}`} onClick={() => setWins(wins.map((x) => (x.id === w.id ? { ...x, min: true } : x)))} style={winBtn}>—</button>
              <button type="button" aria-label={`${w.max ? "Restore" : "Maximize"} ${w.title}`} onClick={() => setWins(wins.map((x) => (x.id === w.id ? { ...x, max: !x.max } : x)))} style={winBtn}>{w.max ? "❐" : "☐"}</button>
              <button type="button" aria-label={`Close ${w.title}`} onClick={() => close(w.id)} style={{ ...winBtn, color: "var(--bad)" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 10 }} className="scrollthin">
              {w.app === "files" && <FilesApp doc={doc} setDoc={setDoc} openEditor={(fid) => open("editor", fid)} />}
              {w.app === "editor" && <EditorApp doc={doc} setDoc={setDoc} initial={w.payload} />}
              {w.app === "terminal" && <TerminalApp doc={doc} setDoc={setDoc} openApp={open} />}
              {w.app === "calendar" && <CalendarApp doc={doc} setDoc={setDoc} />}
              {w.app === "calculator" && <CalculatorApp />}
              {w.app === "browser" && <BrowserApp doc={doc} openEnv={(env) => window.dispatchEvent(new CustomEvent("goto-env", { detail: env }))} />}
            </div>
            {!w.max && <div aria-hidden onPointerDown={(e) => resizeStart(e, w)} style={{ position: "absolute", right: 0, bottom: 0, width: 18, height: 18, cursor: "nwse-resize", touchAction: "none" }} />}
          </div>
        ))}

        {/* start menu */}
        {startOpen && (
          <div className="panel rise" style={{ position: "absolute", left: 8, bottom: 48, zIndex: 500, width: 260, padding: 10 }}>
            <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>AETHER · Virtual OS</div>
            {(Object.keys(APP_META) as AppId[]).map((a) => (
              <button key={a} type="button" onClick={() => open(a)} style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--text)", padding: "8px 6px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
                <span style={{ color: "var(--accent2)" }}>{APP_META[a].glyph}</span> {APP_META[a].name}
              </button>
            ))}
            <button type="button" onClick={() => { setStartOpen(false); window.dispatchEvent(new CustomEvent("open-omni")); }} style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--text)", padding: "8px 6px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
              <span style={{ color: "var(--violet)" }}>✦</span> OMNI — OS assistant
            </button>
          </div>
        )}

        {/* taskbar */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40, background: "rgba(10,17,34,.92)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6, padding: "0 8px", zIndex: 400 }}>
          <button type="button" aria-label="Start menu" onClick={() => setStartOpen(!startOpen)} style={{ background: "linear-gradient(135deg,#0ea5e9,#7c3aed)", border: "none", color: "#fff", fontWeight: 700, borderRadius: 7, padding: "4px 12px", cursor: "pointer", minHeight: 30, fontFamily: "var(--font-display)", letterSpacing: ".08em" }}>AETHER</button>
          <div style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1 }} className="scrollthin">
            {wins.map((w) => (
              <button key={w.id} type="button" onClick={() => (w.min ? focus(w.id) : setWins(wins.map((x) => (x.id === w.id ? { ...x, min: true } : x))))}
                style={{ whiteSpace: "nowrap", background: w.min ? "transparent" : "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 12.5, minHeight: 28 }}>
                {APP_META[w.app].glyph} {w.title}
              </button>
            ))}
          </div>
          <span className="font-mono2" style={{ fontSize: 12, color: "var(--dim)" }}>{clock.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })} · {doc.files.length} files</span>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 8 }}>Windows are draggable by their title bars and resizable from the bottom-right corner. On small screens, maximize a window for the best experience. Everything here is virtual and stored in your OMNIVERSE.</p>
    </div>
  );
}
const winBtn: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 5, width: 28, height: 24, minHeight: 24, cursor: "pointer", fontSize: 12, lineHeight: 1 };

// ---------------------------------------------------------------- Files
function FilesApp({ doc, setDoc, openEditor }: { doc: AetherDoc; setDoc: (d: AetherDoc) => void; openEditor: (id: string) => void }) {
  const u = useUniverse();
  const [cwd, setCwd] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<VFile | null>(null);
  const [renameTo, setRenameTo] = useState("");
  const items = doc.files.filter((f) => (query ? f.name.toLowerCase().includes(query.toLowerCase()) : f.parentId === cwd));
  const folderName = cwd ? doc.files.find((f) => f.id === cwd)?.name : "Home";

  function create(type: "file" | "folder") {
    if (!name.trim()) return;
    const f: VFile = { id: uid(), parentId: cwd, name: name.trim(), type, content: type === "file" ? "" : "", updatedAt: Date.now() };
    setDoc({ ...doc, files: [...doc.files, f] });
    setName("");
    if (type === "file") { u.unlock("os-user"); u.act("aether", `Created file "${f.name}"`); }
  }
  function move(file: VFile, toFolder: string | null) {
    setDoc({ ...doc, files: doc.files.map((f) => (f.id === file.id ? { ...f, parentId: toFolder } : f)) });
    setSelected(null);
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <Btn small kind="ghost" disabled={cwd === null} onClick={() => setCwd(doc.files.find((f) => f.id === cwd)?.parentId ?? null)}>↑ Up</Btn>
        <strong style={{ alignSelf: "center" }}>{query ? `Search: "${query}"` : folderName}</strong>
        <input aria-label="Search files" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" style={{ ...inputStyle, flex: 1, minWidth: 110 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(104px,1fr))", gap: 8 }}>
        {items.map((f) => (
          <button key={f.id} type="button" onClick={() => (f.type === "folder" ? (setCwd(f.id), setQuery("")) : openEditor(f.id))}
            onContextMenu={(e) => { e.preventDefault(); setSelected(f); }}
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 6px", color: "var(--text)", cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".06em", color: f.type === "folder" ? "var(--accent2)" : "var(--dim)", fontFamily: "var(--font-display)" }}>{f.type === "folder" ? "DIR" : (f.name.split(".").pop() ?? "file").toUpperCase().slice(0, 4)}</div>
            <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
          </button>
        ))}
        {items.length === 0 && <div style={{ color: "var(--dim)", fontSize: 13 }}>Empty folder.</div>}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <input aria-label="New item name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New name…" style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
        <Btn small onClick={() => create("file")}>+ File</Btn>
        <Btn small onClick={() => create("folder")}>+ Folder</Btn>
      </div>
      {selected && (
        <div className="panel" style={{ padding: 10, marginTop: 10 }}>
          <strong style={{ fontSize: 13.5 }}>{selected.name}</strong>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
            <input aria-label="Rename to" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder={selected.name} style={{ ...inputStyle, flex: "1 1 130px" }} />
            <Btn small disabled={!renameTo.trim()} onClick={() => { setDoc({ ...doc, files: doc.files.map((f) => (f.id === selected.id ? { ...f, name: renameTo.trim() } : f)) }); setSelected(null); setRenameTo(""); }}>Rename</Btn>
            <Btn small onClick={() => { const copy: VFile = { ...selected, id: uid(), name: selected.name + " copy" }; setDoc({ ...doc, files: [...doc.files, copy] }); setSelected(null); }}>Copy</Btn>
            <select aria-label="Move to folder" defaultValue="" onChange={(e) => { if (e.target.value !== "__") move(selected, e.target.value === "" ? null : e.target.value); }} style={{ ...inputStyle, width: "auto" }}>
              <option value="__">Move to…</option><option value="">Home</option>
              {doc.files.filter((f) => f.type === "folder" && f.id !== selected.id).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <Btn small kind="danger" onClick={() => { setDoc({ ...doc, files: doc.files.filter((f) => f.id !== selected.id && f.parentId !== selected.id) }); setSelected(null); }}>Delete</Btn>
            <Btn small kind="ghost" onClick={() => setSelected(null)}>Close</Btn>
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>Right-click a file for actions — rename, copy, move and delete act on the virtual drive only.</div>
        </div>
      )}
    </div>
  );
}
// ---------------------------------------------------------------- Editor
function EditorApp({ doc, setDoc, initial }: { doc: AetherDoc; setDoc: (d: AetherDoc) => void; initial?: string }) {
  const files = doc.files.filter((f) => f.type === "file");
  const [openIds, setOpenIds] = useState<string[]>(initial ? [initial] : files[0] ? [files[0].id] : []);
  const [activeId, setActiveId] = useState<string | undefined>(initial ?? files[0]?.id);
  const active = doc.files.find((f) => f.id === activeId);
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  function edit(content: string) {
    if (!active) return;
    setDoc({ ...doc, files: doc.files.map((f) => (f.id === active.id ? { ...f, content, updatedAt: Date.now() } : f)) });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {openIds.map((id) => {
          const f = doc.files.find((x) => x.id === id);
          if (!f) return null;
          return (
            <button key={id} type="button" onClick={() => setActiveId(id)} style={{ background: id === activeId ? "var(--surface2)" : "transparent", border: "1px solid var(--border)", borderBottom: id === activeId ? "2px solid var(--accent)" : "1px solid var(--border)", color: "var(--text)", borderRadius: "6px 6px 0 0", padding: "4px 10px", cursor: "pointer", fontSize: 12.5, minHeight: 28 }}>
              {f.name} <span role="button" aria-label={`Close tab ${f.name}`} onClick={(e) => { e.stopPropagation(); setOpenIds(openIds.filter((x) => x !== id)); }}>✕</span>
            </button>
          );
        })}
        <select aria-label="Open a file in the editor" value="" onChange={(e) => { if (e.target.value) { setOpenIds([...new Set([...openIds, e.target.value])]); setActiveId(e.target.value); } }} style={{ ...inputStyle, width: "auto", marginLeft: "auto" }}>
          <option value="">Open file…</option>
          {files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      {active ? (
        <>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>{active.name} · {active.content.length} chars · autosaves as you type · Markdown renders in the preview below</div>
          <textarea aria-label={`Edit ${active.name}`} value={active.content} onChange={(e) => edit(e.target.value)} rows={10} className="font-mono2"
            style={{ ...inputStyle, flex: 1, resize: "vertical", fontSize: 13, lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <input aria-label="Find text" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find" style={{ ...inputStyle, flex: 1, minWidth: 90 }} />
            <input aria-label="Replace with" value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replace" style={{ ...inputStyle, flex: 1, minWidth: 90 }} />
            <Btn small disabled={!find} onClick={() => { setHistory([active.content, ...history].slice(0, 10)); edit(active.content.split(find).join(replace)); }}>Replace all</Btn>
            <Btn small kind="ghost" disabled={!history.length} onClick={() => { const prev = history[0]; if (prev != null) { edit(prev); setHistory(history.slice(1)); } }}>Undo replace</Btn>
            <Btn small onClick={() => download(active.name, active.content, "text/plain")}>Download .txt</Btn>
          </div>
          <details>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--accent)" }}>Markdown preview</summary>
            <div style={{ background: "#0a1122", borderRadius: 8, padding: 10, marginTop: 6, whiteSpace: "pre-wrap", fontSize: 13.5 }}>{active.content}</div>
          </details>
        </>
      ) : <p style={{ color: "var(--dim)", fontSize: 14 }}>Open a file from the File Manager or the dropdown above.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Terminal
function TerminalApp({ doc, setDoc, openApp }: { doc: AetherDoc; setDoc: (d: AetherDoc) => void; openApp: (a: AppId) => void }) {
  const [lines, setLines] = useState<string[]>(["AETHER Terminal — simulated shell over the virtual drive. It cannot touch your real computer.", "Type `help` for commands."]);
  const [cmd, setCmd] = useState("");
  const [cwd, setCwd] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [lines]);

  const here = doc.files.filter((f) => f.parentId === cwd);
  const path = cwd ? "/" + (doc.files.find((f) => f.id === cwd)?.name ?? "") : "/";

  function run(raw: string) {
    const out: string[] = [`${path} $ ${raw}`];
    const [c, ...rest] = raw.trim().split(/\s+/);
    const arg = rest.join(" ");
    const filesNow = doc.files;
    switch ((c ?? "").toLowerCase()) {
      case "help": out.push("Commands: ls · cd <folder|..> · cat <file> · mkdir <name> · touch <name> · rm <name> · echo <text> · date · whoami · open <files|editor|calendar|calculator|browser> · clear"); break;
      case "ls": out.push(here.length ? here.map((f) => (f.type === "folder" ? f.name + "/" : f.name)).join("  ") : "(empty)"); break;
      case "cd": {
        if (arg === ".." || arg === "/") setCwd(null);
        else { const f = here.find((x) => x.type === "folder" && x.name === arg); if (f) setCwd(f.id); else out.push(`cd: no such folder: ${arg}`); }
        break;
      }
      case "cat": { const f = here.find((x) => x.type === "file" && x.name === arg); out.push(f ? f.content || "(empty file)" : `cat: no such file: ${arg}`); break; }
      case "mkdir": if (arg) { setDoc({ ...doc, files: [...filesNow, { id: uid(), parentId: cwd, name: arg, type: "folder", content: "", updatedAt: Date.now() }] }); out.push(`Created folder ${arg}`); } break;
      case "touch": if (arg) { setDoc({ ...doc, files: [...filesNow, { id: uid(), parentId: cwd, name: arg, type: "file", content: "", updatedAt: Date.now() }] }); out.push(`Created file ${arg}`); } break;
      case "rm": { const f = here.find((x) => x.name === arg); if (f) { setDoc({ ...doc, files: filesNow.filter((x) => x.id !== f.id && x.parentId !== f.id) }); out.push(`Removed ${arg}`); } else out.push(`rm: no such item: ${arg}`); break; }
      case "echo": out.push(arg); break;
      case "date": out.push(new Date().toString()); break;
      case "whoami": out.push("architect — AETHER virtual user (simulated)"); break;
      case "open": { const a = arg.toLowerCase() as AppId; if (a in APP_META) { openApp(a); out.push(`Opening ${APP_META[a].name}…`); } else out.push("open: unknown app"); break; }
      case "clear": setLines([]); return;
      case "": break;
      default: out.push(`Unknown command: ${c}. Type \`help\`.`);
    }
    setLines((l) => [...l, ...out].slice(-120));
  }
  return (
    <div className="font-mono2" style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: 13 }}>
      <div style={{ flex: 1, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5 }} className="scrollthin">
        {lines.map((l, i) => <div key={i}>{l}</div>)}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); run(cmd); setCmd(""); }} style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <span style={{ color: "var(--accent2)", alignSelf: "center" }}>{path} $</span>
        <input aria-label="Terminal command" value={cmd} onChange={(e) => setCmd(e.target.value)} style={{ ...inputStyle, flex: 1, fontFamily: "inherit" }} autoFocus />
        <Btn small kind="primary" onClick={() => { run(cmd); setCmd(""); }}>Run</Btn>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Calendar
function CalendarApp({ doc, setDoc }: { doc: AetherDoc; setDoc: (d: AetherDoc) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Btn small kind="ghost" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹ Prev</Btn>
        <strong>{cursor.toLocaleString("en-CA", { month: "long", year: "numeric" })}</strong>
        <Btn small kind="ghost" onClick={() => setCursor(new Date(year, month + 1, 1))}>Next ›</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, fontSize: 12 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <div key={d} style={{ textAlign: "center", color: "var(--dim)", fontWeight: 700 }}>{d}</div>)}
        {cells.map((d, i) => {
          const evs = d ? doc.events.filter((e) => e.date === iso(d)) : [];
          return (
            <div key={i} style={{ minHeight: 46, background: d ? "var(--surface2)" : "transparent", border: "1px solid var(--border)", borderRadius: 5, padding: 3 }}>
              {d && <><div style={{ fontWeight: 600 }}>{d}</div>{evs.map((e) => <div key={e.id} style={{ fontSize: 10.5, color: "var(--accent2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>)}</>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <input aria-label="Event date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
        <input aria-label="Event title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event / deadline / reminder" style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        <Btn small kind="primary" disabled={!title.trim()} onClick={() => { setDoc({ ...doc, events: [...doc.events, { id: uid(), date, title: title.trim() }] }); setTitle(""); }}>Add</Btn>
      </div>
      <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
        {doc.events.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span><span className="font-mono2" style={{ color: "var(--dim)" }}>{e.date}</span> · {e.title}</span>
            <Btn small kind="ghost" onClick={() => setDoc({ ...doc, events: doc.events.filter((x) => x.id !== e.id) })}>Delete</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Calculator
function evalExpr(src: string): number {
  // Safe recursive-descent parser: numbers, + - * / % ^, parentheses, sqrt/sin/cos/tan/log/exp/pi/e.
  let i = 0;
  const peek = () => src[i];
  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") { const op = src[i++]; const r = parseTerm(); v = op === "+" ? v + r : v - r; }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") { const op = src[i++]; const r = parseFactor(); v = op === "*" ? v * r : v / r; }
    return v;
  }
  function parseFactor(): number {
    let v = parseUnary();
    while (peek() === "^") { i++; v = Math.pow(v, parseUnary()); }
    return v;
  }
  function parseUnary(): number {
    if (peek() === "-") { i++; return -parseUnary(); }
    if (peek() === "(") { i++; const v = parseExpr(); if (peek() === ")") i++; return v; }
    const rest = src.slice(i);
    const fn = /^(sqrt|sin|cos|tan|log|exp)\(/.exec(rest);
    if (fn?.[1]) { i += fn[1].length + 1; const v = parseExpr(); if (peek() === ")") i++; const f = { sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, log: Math.log10, exp: Math.exp }[fn[1]] ?? ((x: number) => x); return f(v); }
    if (rest.startsWith("pi")) { i += 2; return Math.PI; }
    if (/^e(?![a-z])/.test(rest)) { i += 1; return Math.E; }
    const num = /^[0-9]*\.?[0-9]+/.exec(rest);
    if (num) { i += num[0].length; return parseFloat(num[0]); }
    throw new Error("parse");
  }
  const v = parseExpr();
  return v;
}
function CalculatorApp() {
  const [expr, setExpr] = useState("");
  const [hist, setHist] = useState<Array<{ e: string; r: string }>>([]);
  const [err, setErr] = useState("");
  function calc() {
    try {
      const v = evalExpr(expr.replace(/\s/g, ""));
      if (!Number.isFinite(v)) throw new Error("range");
      const r = String(Math.round(v * 1e10) / 1e10);
      setHist([{ e: expr, r }, ...hist].slice(0, 12));
      setExpr(r); setErr("");
    } catch { setErr("Invalid expression — try e.g. sqrt(144) + 3^2 * (4-1)"); }
  }
  const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")", "+", "^", "sqrt(", "C"];
  return (
    <div>
      <div className="font-mono2" style={{ background: "#0a1122", border: "1px solid var(--border)", borderRadius: 8, padding: 10, fontSize: 20, minHeight: 52, wordBreak: "break-all" }}>{expr || "0"}</div>
      {err && <div style={{ color: "var(--bad)", fontSize: 12.5, marginTop: 4 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginTop: 8 }}>
        {keys.map((k) => (
          <button key={k} type="button" aria-label={`Key ${k}`} onClick={() => (k === "C" ? setExpr("") : setExpr(expr + k))}
            style={{ padding: "9px 0", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontWeight: 600, minHeight: 38 }}>{k}</button>
        ))}
        <button type="button" aria-label="Equals" onClick={calc} style={{ gridColumn: "span 4", padding: "9px 0", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#0ea5e9,#2563eb)", color: "#fff", cursor: "pointer", fontWeight: 700, minHeight: 38 }}>=</button>
      </div>
      <input aria-label="Type an expression" value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && calc()} placeholder="…or type: sin(pi/2), log(1000), exp(2)" style={{ ...inputStyle, marginTop: 8, fontFamily: "var(--font-mono2)" }} />
      {hist.length > 0 && (
        <div className="font-mono2" style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 8, display: "grid", gap: 2 }}>
          {hist.map((h, i) => <div key={i}>{h.e} = <span style={{ color: "var(--text)" }}>{h.r}</span></div>)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Browser
function BrowserApp({ doc, openEnv }: { doc: AetherDoc; openEnv: (env: string) => void }) {
  const [page, setPage] = useState<string>("home");
  const mdFiles = doc.files.filter((f) => f.type === "file");
  const file = mdFiles.find((f) => f.id === page);
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <span className="font-mono2" style={{ background: "#0a1122", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 12px", fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>omniverse://{file ? "files/" + file.name : page}</span>
      </div>
      {file ? (
        <div>
          <Btn small kind="ghost" onClick={() => setPage("home")}>‹ Browser home</Btn>
          <h4 style={{ margin: "8px 0" }}>{file.name}</h4>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>{file.content || "(empty file)"}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ fontSize: 13.5, color: "var(--dim)", margin: 0 }}>This internal browser navigates OMNIVERSE itself — environments and your virtual documents. It does not browse the real web.</p>
          <strong style={{ fontSize: 13 }}>Environments</strong>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["nexus", "orbit", "sonora", "empire", "casefile", "chronicles", "sentinel"].map((e) => (
              <Btn key={e} small onClick={() => openEnv(e)}>Open {e.toUpperCase()}</Btn>
            ))}
          </div>
          <strong style={{ fontSize: 13 }}>Documents</strong>
          {mdFiles.map((f) => (
            <button key={f.id} type="button" onClick={() => setPage(f.id)} style={{ textAlign: "left", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 10px", color: "var(--accent)", cursor: "pointer", fontSize: 13.5 }}>omniverse://files/{f.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}
