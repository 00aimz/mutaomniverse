// SENTINEL — Cybersecurity Intelligence Platform (inside OMNIVERSE).
// ALL alert / threat / vulnerability data is SIMULATED and labeled as such.
// The real tools are genuinely local: SHA-256 runs in the browser via
// crypto.subtle on files the user picks (only name + hash are stored), and
// the password analyzer never stores, logs, or transmits the password —
// it is never sent to OMNI/Gemini.

import { useMemo, useState } from "react";
import {
Bar, Btn, Chip, Field, Modal, Panel, Stat,
download, inputStyle, uid, useDoc, useUniverse,
} from "../core";

export interface SAlert { id: string; title: string; severity: "critical" | "high" | "medium" | "low"; category: string; source: string; status: "open" | "investigating" | "resolved"; ts: number; desc: string; indicators: string[]; analyst: string; notes: string[] }
export interface SThreat { id: string; name: string; category: string; severity: string; desc: string; indicators: string[]; defenses: string }
export interface SInvestigation { id: string; title: string; status: "open" | "closed"; alertIds: string[]; notes: Array<{ ts: number; text: string }>; createdAt: number }
export interface SVuln { id: string; title: string; severity: string; cvss: number; asset: string; status: "Open" | "In progress" | "Remediated" | "Accepted risk"; desc: string }
export interface SentinelDoc {
  alerts: SAlert[]; threats: SThreat[]; investigations: SInvestigation[]; vulns: SVuln[];
  labs: Record<string, { score: number; total: number; ts: number }>;
  hashes: Array<{ name: string; hash: string; ts: number }>;
}

const now = Date.now();
const H = 3600_000;
export function seedSentinel(): SentinelDoc {
  const alerts: SAlert[] = [
    { id: "ALT-1042", title: "Repeated failed logins — brute-force pattern", severity: "critical", category: "Authentication", source: "auth-service (simulated)", status: "open", ts: now - 2 * H, desc: "412 failed logins against one account in 9 minutes from a single source, followed by one success. Classic password-spraying/brute-force signature.", indicators: ["198.51.100.23", "acct: j.mbeki", "412 failures / 9 min"], analyst: "", notes: [] },
    { id: "ALT-1041", title: "Impossible travel: logins in two countries 1h apart", severity: "high", category: "Authentication", source: "identity-provider (simulated)", status: "open", ts: now - 5 * H, desc: "Same account authenticated from Edmonton and then from an overseas IP 58 minutes later. Physically impossible travel.", indicators: ["acct: r.osei", "2 geo locations", "58 min apart"], analyst: "", notes: [] },
    { id: "ALT-1039", title: "Outbound beaconing to rare domain", severity: "high", category: "Network", source: "dns-monitor (simulated)", status: "investigating", ts: now - 9 * H, desc: "One workstation resolves a newly-registered domain every 60 seconds with machine-like regularity — a beaconing pattern worth investigating.", indicators: ["ws-2214", "60s interval", "domain age 2 days"], analyst: "A. Novak", notes: ["Isolated the workstation from the shared drive pending review."] },
    { id: "ALT-1036", title: "Privilege escalation outside change window", severity: "medium", category: "Access control", source: "iam-audit (simulated)", status: "open", ts: now - 26 * H, desc: "A service account was granted admin scope at 03:12 with no matching change ticket.", indicators: ["svc-reporting", "03:12 local", "no ticket"], analyst: "", notes: [] },
    { id: "ALT-1033", title: "Mass file rename in shared folder", severity: "medium", category: "File integrity", source: "fim-agent (simulated)", status: "open", ts: now - 30 * H, desc: "1,900 files renamed within 4 minutes in the shared projects folder, extensions changed uniformly. Could be ransomware-like behavior or a bad script — verify before assuming.", indicators: ["1,900 renames", "uniform extension change"], analyst: "", notes: [] },
    { id: "ALT-1030", title: "Unusual egress volume to cloud storage", severity: "low", category: "Network", source: "netflow (simulated)", status: "resolved", ts: now - 50 * H, desc: "4.2 GB uploaded overnight. Traced to a scheduled backup job whose window had shifted.", indicators: ["4.2 GB egress", "backup window"], analyst: "A. Novak", notes: ["Confirmed scheduled backup. Closed as benign."] },
    { id: "ALT-1028", title: "New admin account created", severity: "medium", category: "Access control", source: "iam-audit (simulated)", status: "resolved", ts: now - 74 * H, desc: "Admin account created by HR onboarding automation; matched an approved ticket on review.", indicators: ["ticket HR-2210"], analyst: "You", notes: ["Matched approved onboarding ticket."] },
    { id: "ALT-1025", title: "Phishing email reported by 3 staff", severity: "high", category: "Email", source: "user reports (simulated)", status: "investigating", ts: now - 12 * H, desc: "A message impersonating the payroll provider asks staff to 're-verify' bank details on a lookalike domain.", indicators: ["lookalike domain", "urgent language", "3 reports"], analyst: "You", notes: [] },
  ];
  const threats: SThreat[] = [
    { id: "t1", name: "Credential Stuffing Campaigns", category: "Credential theft", severity: "High", desc: "Attackers replay breached username/password pairs against login pages. Simulated educational record.", indicators: ["High login failure rates", "Many accounts, one source"], defenses: "MFA, rate limiting, breached-password screening, lockout with care." },
    { id: "t2", name: "Business Email Compromise", category: "Phishing", severity: "Critical", desc: "Impersonation of executives or suppliers to redirect payments. Simulated educational record.", indicators: ["Lookalike domains", "Urgency + secrecy", "Changed bank details"], defenses: "Out-of-band verification for payment changes, DMARC, staff training." },
    { id: "t3", name: "Ransomware (simulated pattern)", category: "Malware", severity: "Critical", desc: "Encryption of shared files for extortion. Studied here only as detection patterns in fictional data.", indicators: ["Mass renames", "Shadow-copy deletion attempts"], defenses: "Offline backups, least privilege, segmentation, patching." },
    { id: "t4", name: "DNS Beaconing", category: "Suspicious network activity", severity: "Medium", desc: "Implanted software checking in at fixed intervals through DNS. Simulated educational record.", indicators: ["Fixed-interval queries", "Rare/new domains"], defenses: "DNS logging, egress filtering, endpoint detection." },
    { id: "t5", name: "Insider Data Hoarding", category: "Insider threats", severity: "Medium", desc: "Unusual collection of files ahead of a departure. Simulated educational record.", indicators: ["Off-hours mass downloads", "Access outside role"], defenses: "Least privilege, access reviews, DLP alerts." },
  ];
  const vulns: SVuln[] = [
    { id: "v1", title: "Outdated TLS configuration on web gateway", severity: "High", cvss: 7.4, asset: "gw-web-01 (fictional)", status: "Open", desc: "Legacy protocol versions still enabled. Demonstration data." },
    { id: "v2", title: "Default credentials on lab printer", severity: "Medium", cvss: 5.3, asset: "printer-lab (fictional)", status: "In progress", desc: "Vendor default admin password unchanged. Demonstration data." },
    { id: "v3", title: "Missing MFA on VPN", severity: "Critical", cvss: 9.1, asset: "vpn-edge (fictional)", status: "Open", desc: "Single-factor remote access. Demonstration data." },
    { id: "v4", title: "Unpatched library in internal dashboard", severity: "High", cvss: 7.1, asset: "dash-int-02 (fictional)", status: "Open", desc: "Known CVE with a published fix. Demonstration data." },
    { id: "v5", title: "Overly broad file-share permissions", severity: "Medium", cvss: 5.9, asset: "fs-projects (fictional)", status: "Remediated", desc: "Share was readable by all staff. Demonstration data." },
    { id: "v6", title: "Verbose error messages in API", severity: "Low", cvss: 3.7, asset: "api-int (fictional)", status: "Accepted risk", desc: "Stack traces visible to authenticated users. Demonstration data." },
  ];
  return { alerts, threats, investigations: [], vulns, labs: {}, hashes: [] };
}

const SEV_COLOR: Record<string, string> = { critical: "var(--bad)", high: "#fb923c", medium: "var(--warn)", low: "var(--accent)" };

async function sha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function passwordAnalysis(pw: string): { score: number; notes: string[]; entropy: number } {
  const notes: string[] = [];
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  const entropy = pw.length ? Math.round(pw.length * Math.log2(Math.max(2, pool))) : 0;
  if (pw.length < 8) notes.push("Very short — length is the single biggest strength factor.");
  else if (pw.length < 12) notes.push("Decent length; 14+ characters is the modern guidance.");
  else if (pw.length >= 16) notes.push("Excellent length — long passphrases beat complex short passwords.");
  if (pool <= 26) notes.push("Only one character class — add variety or, better, more length.");
  if (/(.)\1{2,}/.test(pw)) notes.push("Repeated characters reduce real strength.");
  if (/123|abc|qwerty|password|letmein|admin/i.test(pw)) notes.push("Contains a common pattern found in every cracking dictionary.");
  if (/^\d+$/.test(pw)) notes.push("Digits only — extremely predictable.");
  if (!notes.length) notes.push("No obvious weaknesses found by local checks. Still use a unique password per site, stored in a password manager, with MFA on.");
  notes.push("This analysis is 100% local: the password was never stored, logged, or sent anywhere.");
  const score = Math.max(0, Math.min(100, Math.round(entropy * 0.9) - (/123|abc|qwerty|password/i.test(pw) ? 25 : 0)));
  return { score, notes, entropy };
}

const LOG_LAB = {
  logs: [
    "08:01:12 auth: login ok user=ana ip=10.0.0.14",
    "08:02:03 auth: login FAIL user=admin ip=203.0.113.9",
    "08:02:05 auth: login FAIL user=admin ip=203.0.113.9",
    "08:02:07 auth: login FAIL user=admin ip=203.0.113.9",
    "08:02:09 auth: login FAIL user=admin ip=203.0.113.9",
    "08:02:31 auth: login ok user=admin ip=203.0.113.9",
    "08:03:44 auth: login ok user=bola ip=10.0.0.21",
  ],
  q: "What is the most serious pattern in these (fictional) logs?",
  options: ["A user mistyped their password once", "Rapid repeated failures then a success for 'admin' from an external IP — likely brute force that succeeded", "Two staff logged in during work hours", "Nothing unusual"],
  answer: 1,
  explain: "Four failures in 8 seconds followed by a success, for the admin account, from an external address — that cadence is automated guessing, and the success means it worked. Escalate and force a reset.",
};
const PHISH_LAB = [
  { from: "Payroll Team <payroll@meridian-bank-secure.example>", subject: "URGENT: re-verify your bank details today", body: "Dear employee, our records failed. Verify your salary account within 2 hours or payment will be withheld.", phish: true, why: "Lookalike domain, urgency, and a request to enter bank details — three classic flags." },
  { from: "IT Service Desk <it@yourcompany.example>", subject: "Scheduled maintenance Sunday 02:00", body: "The VPN will be down for maintenance on Sunday between 02:00 and 03:00. No action is needed.", phish: false, why: "Internal sender, no links or requests, no urgency trick — informational only." },
  { from: "CEO <ceo.private.mail@freemail.example>", subject: "Confidential — gift cards", body: "I need you to buy 10 gift cards for clients and send me the codes. Keep this between us, I'm in meetings all day.", phish: true, why: "Impersonation from a free-mail address, secrecy, and gift-card codes — a textbook BEC pattern." },
];

export function Sentinel() {
  const u = useUniverse();
  const [doc, setDoc] = useDoc<SentinelDoc>("sentinel", seedSentinel());
  const [sevFilter, setSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [alertId, setAlertId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [tab, setTab] = useState<"soc" | "labs" | "tools">("soc");
  const [pw, setPw] = useState("");
  const [phishPicks, setPhishPicks] = useState<boolean[]>([false, false, false]);
  const [logPick, setLogPick] = useState<number | null>(null);
  const [labMsg, setLabMsg] = useState("");
  const [caesarIn, setCaesarIn] = useState("");
  const [caesarShift, setCaesarShift] = useState(3);
  const [hashMsg, setHashMsg] = useState("");
  const [invTitle, setInvTitle] = useState("");
  const [activeInv, setActiveInv] = useState<string | null>(null);
  const [invNote, setInvNote] = useState("");

  const alert = doc.alerts.find((a) => a.id === alertId) ?? null;
  const filtered = useMemo(() => doc.alerts.filter((a) =>
    (sevFilter === "all" || a.severity === sevFilter) &&
    (statusFilter === "all" || a.status === statusFilter) &&
    (a.title.toLowerCase().includes(query.toLowerCase()) || a.id.toLowerCase().includes(query.toLowerCase())),
  ).sort((a, b) => b.ts - a.ts), [doc.alerts, sevFilter, statusFilter, query]);

  const open = doc.alerts.filter((a) => a.status !== "resolved");
  const posture = Math.max(5, 100 - open.filter((a) => a.severity === "critical").length * 22 - open.filter((a) => a.severity === "high").length * 10 - open.filter((a) => a.severity === "medium").length * 4);
  const pwResult = pw ? passwordAnalysis(pw) : null;

  const caesar = (s: string, shift: number) => s.replace(/[a-z]/gi, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26 + 26) % 26 + base);
  });

  function patchAlert(id: string, fn: (a: SAlert) => SAlert) {
    setDoc({ ...doc, alerts: doc.alerts.map((a) => (a.id === id ? fn(a) : a)) });
  }
  function completeLab(id: string, score: number, total: number, msg: string) {
    setDoc({ ...doc, labs: { ...doc.labs, [id]: { score, total, ts: Date.now() } } });
    setLabMsg(msg);
    u.unlock("lab-done");
    u.act("sentinel", `Completed lab ${id} · ${score}/${total}`);
  }

  async function onHashFile(file: File | undefined, mode: "baseline" | "check") {
    if (!file) return;
    const h = await sha256(file);
    if (mode === "baseline") {
      setDoc({ ...doc, hashes: [{ name: file.name, hash: h, ts: Date.now() }, ...doc.hashes.filter((x) => x.name !== file.name)] });
      setHashMsg(`Baseline saved for ${file.name}. Only the name and hash are stored — never the file.`);
      u.act("sentinel", `SHA-256 baseline created for ${file.name}`);
    } else {
      const base = doc.hashes.find((x) => x.name === file.name);
      setHashMsg(!base ? `No baseline for ${file.name} yet — create one first.` : base.hash === h ? `✓ MATCH — ${file.name} is unchanged since its baseline.` : `✗ CHANGED — ${file.name} hash differs from its baseline. Investigate before trusting it.`);
    }
  }

  function generateReport(inv: SInvestigation) {
    const linked = doc.alerts.filter((a) => inv.alertIds.includes(a.id));
    const md = `# Incident Report — ${inv.title}\nGenerated: ${new Date().toLocaleString()}\nStatus: ${inv.status}\n\n## Executive summary\nInvestigation of ${linked.length} simulated alert(s) inside SENTINEL (all data simulated).\n\n## Linked alerts\n${linked.map((a) => `- [${a.severity.toUpperCase()}] ${a.id}: ${a.title} — ${a.desc}`).join("\n") || "- None linked"}\n\n## Timeline & notes\n${inv.notes.map((n) => `- ${new Date(n.ts).toLocaleString()}: ${n.text}`).join("\n") || "- No notes"}\n\n## Recommendations\n- Keep least-privilege access and MFA everywhere.\n- Review indicators, tune detections, and document lessons learned.\n`;
    download(`${inv.title.replace(/\s+/g, "-")}-report.md`, md, "text/markdown");
    u.act("sentinel", `Generated incident report "${inv.title}"`);
  }

  const inv = doc.investigations.find((i) => i.id === activeInv) ?? null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.45)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
        <strong>SIMULATED DATA.</strong> Every alert, threat and finding here is fictional and generated for education. The hashing and password tools are real — and run entirely on your device.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["soc", "labs", "tools"] as const).map((t) => <Chip key={t} active={tab === t} onClick={() => setTab(t)} color="#f87171">{t === "soc" ? "SOC Center" : t === "labs" ? "Defensive Labs" : "Security Tools"}</Chip>)}
        </div>
        <Btn onClick={() => window.dispatchEvent(new CustomEvent("open-omni"))}>Security tutor (OMNI)</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 8 }}>
        <Stat label="Posture (simulated)" value={`${posture}/100`} color={posture > 70 ? "var(--good)" : posture > 45 ? "var(--warn)" : "var(--bad)"} />
        <Stat label="Open alerts" value={String(open.length)} />
        <Stat label="Critical" value={String(open.filter((a) => a.severity === "critical").length)} color="var(--bad)" />
        <Stat label="Investigations" value={String(doc.investigations.length)} />
        <Stat label="Labs done" value={String(Object.keys(doc.labs).length)} sub="of 3 interactive" />
      </div>

      {tab === "soc" && (
        <>
          <Panel title="Alerts (simulated)" right={<span style={{ fontSize: 12, color: "var(--dim)" }}>{filtered.length} shown</span>}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <input aria-label="Search alerts" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or ID…" style={{ ...inputStyle, flex: "1 1 160px" }} />
              <select aria-label="Severity filter" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                <option value="all">All severities</option>{["critical", "high", "medium", "low"].map((s) => <option key={s}>{s}</option>)}
              </select>
              <select aria-label="Status filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                <option value="all">All statuses</option>{["open", "investigating", "resolved"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {filtered.map((a) => (
                <button key={a.id} type="button" onClick={() => setAlertId(a.id)} style={{ textAlign: "left", background: "var(--surface2)", border: "1px solid var(--border)", borderLeft: `3px solid ${SEV_COLOR[a.severity]}`, borderRadius: 8, padding: "9px 11px", color: "var(--text)", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14 }}>{a.title}</strong>
                    <span className="font-mono2" style={{ fontSize: 11.5, color: "var(--dim)" }}>{a.id} · {new Date(a.ts).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{a.category} · {a.source} · <span style={{ color: SEV_COLOR[a.severity], fontWeight: 700 }}>{a.severity.toUpperCase()}</span> · {a.status}{a.analyst ? ` · ${a.analyst}` : ""}</div>
                </button>
              ))}
              {filtered.length === 0 && <p style={{ color: "var(--dim)", fontSize: 14, margin: 0 }}>No simulated alerts match those filters.</p>}
            </div>
          </Panel>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
            <Panel title="Threat intelligence (simulated)">
              <div style={{ display: "grid", gap: 8 }}>
                {doc.threats.map((t) => (
                  <div key={t.id} className="panel" style={{ padding: 10 }}>
                    <strong style={{ fontSize: 14.5 }}>{t.name}</strong> <Chip color={SEV_COLOR[t.severity.toLowerCase()] ?? "var(--dim)"}>{t.severity}</Chip>
                    <p style={{ fontSize: 13, color: "var(--dim)", margin: "5px 0" }}>{t.desc}</p>
                    <div style={{ fontSize: 12.5 }}><span style={{ color: "var(--dim)" }}>Indicators:</span> {t.indicators.join(" · ")}</div>
                    <div style={{ fontSize: 12.5 }}><span style={{ color: "var(--dim)" }}>Defenses:</span> {t.defenses}</div>
                  </div>
                ))}
              </div>
            </Panel>
            <div style={{ display: "grid", gap: 12 }}>
              <Panel title="Vulnerability findings (demonstration data)">
                <div style={{ display: "grid", gap: 8 }}>
                  {doc.vulns.map((v) => (
                    <div key={v.id} className="panel" style={{ padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong style={{ fontSize: 14 }}>{v.title}</strong>
                        <span className="font-mono2" style={{ fontSize: 12, color: SEV_COLOR[v.severity.toLowerCase()] ?? "var(--dim)" }}>CVSS {v.cvss}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{v.asset} · {v.severity} · {v.desc}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                        {(["Open", "In progress", "Remediated", "Accepted risk"] as const).map((s) => (
                          <Chip key={s} active={v.status === s} onClick={() => setDoc({ ...doc, vulns: doc.vulns.map((x) => (x.id === v.id ? { ...x, status: s } : x)) })}>{s}</Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Investigations">
                <div style={{ display: "grid", gap: 8 }}>
                  {doc.investigations.map((i) => (
                    <button key={i.id} type="button" onClick={() => setActiveInv(i.id)} style={{ textAlign: "left", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", cursor: "pointer" }}>
                      <strong style={{ fontSize: 14 }}>{i.title}</strong>
                      <div style={{ fontSize: 12.5, color: "var(--dim)" }}>{i.status} · {i.alertIds.length} linked alerts · {i.notes.length} notes</div>
                    </button>
                  ))}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input aria-label="New investigation title" value={invTitle} onChange={(e) => setInvTitle(e.target.value)} placeholder="Investigation title" style={{ ...inputStyle, flex: 1 }} />
                    <Btn small kind="primary" disabled={!invTitle.trim()} onClick={() => { const inv2: SInvestigation = { id: uid(), title: invTitle.trim(), status: "open", alertIds: [], notes: [], createdAt: Date.now() }; setDoc({ ...doc, investigations: [inv2, ...doc.investigations] }); setInvTitle(""); setActiveInv(inv2.id); }}>Create</Btn>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}

      {tab === "labs" && (
        <div style={{ display: "grid", gap: 12 }}>
          {labMsg && <div style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.4)", borderRadius: 8, padding: "8px 12px", fontSize: 13.5 }}>{labMsg}</div>}
          <Panel title="Lab 1 — Log analysis (fictional logs)">
            <pre className="font-mono2" style={{ background: "#070d1d", borderRadius: 8, padding: 10, fontSize: 12, overflowX: "auto", margin: "0 0 10px" }}>{LOG_LAB.logs.join("\n")}</pre>
            <p style={{ fontSize: 14, margin: "0 0 8px" }}>{LOG_LAB.q}</p>
            <div style={{ display: "grid", gap: 6 }}>
              {LOG_LAB.options.map((o, i) => (
                <Btn key={i} kind={logPick === i ? "primary" : "soft"} style={{ textAlign: "left" }} onClick={() => setLogPick(i)}>{o}</Btn>
              ))}
            </div>
            <Btn kind="primary" disabled={logPick === null} style={{ marginTop: 8 }} onClick={() => completeLab("logs", logPick === LOG_LAB.answer ? 1 : 0, 1, logPick === LOG_LAB.answer ? `Correct — ${LOG_LAB.explain}` : `Not quite. ${LOG_LAB.explain}`)}>Submit answer{doc.labs.logs ? ` · best: ${doc.labs.logs.score}/${doc.labs.logs.total}` : ""}</Btn>
          </Panel>

          <Panel title="Lab 2 — Phishing awareness (fictional emails)">
            <div style={{ display: "grid", gap: 10 }}>
              {PHISH_LAB.map((m, i) => (
                <div key={i} className="panel" style={{ padding: 10 }}>
                  <div className="font-mono2" style={{ fontSize: 12, color: "var(--dim)" }}>From: {m.from}</div>
                  <strong style={{ fontSize: 14 }}>{m.subject}</strong>
                  <p style={{ fontSize: 13.5, color: "var(--dim)", margin: "4px 0 8px" }}>{m.body}</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Chip active={phishPicks[i] === true} onClick={() => setPhishPicks(phishPicks.map((v, j) => (j === i ? true : v)))} color="var(--bad)">Phishing</Chip>
                    <Chip active={phishPicks[i] === false} onClick={() => setPhishPicks(phishPicks.map((v, j) => (j === i ? false : v)))} color="var(--good)">Legitimate</Chip>
                  </div>
                </div>
              ))}
            </div>
            <Btn kind="primary" style={{ marginTop: 10 }} onClick={() => {
              const score = PHISH_LAB.filter((m, i) => phishPicks[i] === m.phish).length;
              completeLab("phishing", score, 3, `You scored ${score}/3. ` + PHISH_LAB.map((m) => m.why).join(" "));
            }}>Grade my answers{doc.labs.phishing ? ` · best: ${doc.labs.phishing.score}/${doc.labs.phishing.total}` : ""}</Btn>
          </Panel>

          <Panel title="Lab 3 — Cryptography fundamentals (Caesar cipher)">
            <p style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 0 }}>Encoding is not encryption, and Caesar is a teaching cipher only — but it shows the core idea: a key (the shift) transforms plaintext into ciphertext. Modern systems use AES/ChaCha with keys you'd never guess.</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input aria-label="Text to shift" value={caesarIn} onChange={(e) => setCaesarIn(e.target.value)} placeholder="Type a message…" style={{ ...inputStyle, flex: "1 1 200px" }} />
              <label style={{ fontSize: 13, color: "var(--dim)" }}>Shift <input aria-label="Caesar shift" type="number" min={1} max={25} value={caesarShift} onChange={(e) => setCaesarShift(Math.max(1, Math.min(25, Number(e.target.value) || 3)))} style={{ ...inputStyle, width: 70, display: "inline-block", marginLeft: 4 }} /></label>
            </div>
            <div className="font-mono2" style={{ marginTop: 8, fontSize: 13.5 }}>Encrypted: <strong>{caesar(caesarIn, caesarShift) || "—"}</strong></div>
            <div className="font-mono2" style={{ fontSize: 13.5 }}>Decrypted back: <strong>{caesar(caesar(caesarIn, caesarShift), -caesarShift) || "—"}</strong></div>
            <Btn small kind="primary" style={{ marginTop: 8 }} onClick={() => completeLab("crypto", 1, 1, "Lab complete — you encrypted and decrypted with a key. Remember: real security needs modern algorithms, never home-made ciphers.")}>Mark lab complete</Btn>
          </Panel>
        </div>
      )}

      {tab === "tools" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
          <Panel title="SHA-256 file integrity (real, local)">
            <p style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 0 }}>Pick a file to record its fingerprint, then pick it again later — if even one byte changed, the hash changes completely. The file itself is never uploaded or stored; only its name and hash are kept.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13.5 }}>Create baseline<input aria-label="Choose a file to baseline" type="file" onChange={(e) => void onHashFile(e.target.files?.[0], "baseline")} style={{ display: "block", marginTop: 4 }} /></label>
              <label style={{ fontSize: 13.5 }}>Verify against baseline<input aria-label="Choose a file to verify" type="file" onChange={(e) => void onHashFile(e.target.files?.[0], "check")} style={{ display: "block", marginTop: 4 }} /></label>
            </div>
            {hashMsg && <div style={{ fontSize: 13.5, marginTop: 8 }}>{hashMsg}</div>}
            <div style={{ display: "grid", gap: 5, marginTop: 10 }}>
              {doc.hashes.map((h) => (
                <div key={h.name} className="font-mono2" style={{ fontSize: 11.5, wordBreak: "break-all" }}><strong style={{ fontFamily: "inherit" }}>{h.name}</strong><br />{h.hash}<br /><span style={{ color: "var(--dim)" }}>{new Date(h.ts).toLocaleString()}</span></div>
              ))}
            </div>
          </Panel>

          <Panel title="Password strength (real, local-only)">
            <p style={{ fontSize: 13.5, color: "var(--dim)", marginTop: 0 }}>Type a password to analyze it. It is analyzed in this tab only — never stored, never logged, never sent to OMNI or Gemini. Use a throwaway example if you prefer.</p>
            <Field label="Password to analyze">
              <input aria-label="Password to analyze locally" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={inputStyle} autoComplete="off" />
            </Field>
            {pwResult && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}><Bar value={pwResult.score} color={pwResult.score > 65 ? "var(--good)" : pwResult.score > 35 ? "var(--warn)" : "var(--bad)"} height={10} /></div>
                  <strong>{pwResult.score}/100</strong>
                </div>
                <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>Estimated entropy: ~{pwResult.entropy} bits (rough guide only — no password is ever guaranteed secure).</div>
                <ul style={{ fontSize: 13.5, margin: "8px 0", paddingLeft: 18 }}>
                  {pwResult.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
                <Btn small onClick={() => setPw("")}>Clear password</Btn>
              </div>
            )}
          </Panel>
        </div>
      )}

      {alert && (
        <Modal title={`${alert.id} — Alert detail (simulated)`} onClose={() => setAlertId(null)} wide>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <div><strong>{alert.title}</strong></div>
            <div style={{ color: "var(--dim)" }}>{alert.category} · {alert.source} · {new Date(alert.ts).toLocaleString()} · <span style={{ color: SEV_COLOR[alert.severity], fontWeight: 700 }}>{alert.severity.toUpperCase()}</span></div>
            <p style={{ margin: 0 }}>{alert.desc}</p>
            <div>Indicators: <span className="font-mono2" style={{ fontSize: 12.5 }}>{alert.indicators.join(" · ")}</span></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "var(--dim)", fontSize: 13 }}>Status:</span>
              {(["open", "investigating", "resolved"] as const).map((s) => (
                <Chip key={s} active={alert.status === s} onClick={() => { patchAlert(alert.id, (a) => ({ ...a, status: s })); if (s === "resolved") { u.unlock("alert-triaged"); u.act("sentinel", `Resolved simulated alert ${alert.id}`); } }}>{s}</Chip>
              ))}
              <input aria-label="Assign analyst" defaultValue={alert.analyst} placeholder="Analyst" onBlur={(e) => patchAlert(alert.id, (a) => ({ ...a, analyst: e.target.value }))} style={{ ...inputStyle, width: 130 }} />
              <Btn small onClick={() => download(`${alert.id}.json`, JSON.stringify(alert, null, 2))}>Export alert JSON</Btn>
              <Btn small disabled={doc.investigations.length === 0} onClick={() => {
                const target = doc.investigations[0];
                if (target) setDoc({ ...doc, investigations: doc.investigations.map((i) => (i.id === target.id ? { ...i, alertIds: [...new Set([...i.alertIds, alert.id])] } : i)) });
              }}>Link to newest investigation</Btn>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 4 }}>Investigation notes</div>
              {alert.notes.map((n, i) => <div key={i} style={{ fontSize: 13.5, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>{n}</div>)}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input aria-label="Add a note to this alert" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add note…" style={{ ...inputStyle, flex: 1 }} />
                <Btn small disabled={!noteText.trim()} onClick={() => { patchAlert(alert.id, (a) => ({ ...a, notes: [...a.notes, noteText.trim()] })); setNoteText(""); }}>Add note</Btn>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--dim)", margin: 0 }}>Defensive next steps: verify the indicators in your (real) environment's logs, scope affected accounts, force credential resets where compromise is plausible, and document everything. This record is simulated.</p>
          </div>
        </Modal>
      )}

      {inv && (
        <Modal title={`Investigation — ${inv.title}`} onClose={() => setActiveInv(null)} wide>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Chip active={inv.status === "open"} onClick={() => setDoc({ ...doc, investigations: doc.investigations.map((i) => (i.id === inv.id ? { ...i, status: "open" } : i)) })}>Open</Chip>
              <Chip active={inv.status === "closed"} onClick={() => setDoc({ ...doc, investigations: doc.investigations.map((i) => (i.id === inv.id ? { ...i, status: "closed" } : i)) })}>Closed</Chip>
              <Btn small kind="primary" onClick={() => generateReport(inv)}>Generate report (.md)</Btn>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--dim)" }}>Linked alerts — tap to link/unlink:</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                {doc.alerts.map((a) => (
                  <Chip key={a.id} active={inv.alertIds.includes(a.id)} onClick={() => setDoc({ ...doc, investigations: doc.investigations.map((i) => (i.id === inv.id ? { ...i, alertIds: i.alertIds.includes(a.id) ? i.alertIds.filter((x) => x !== a.id) : [...i.alertIds, a.id] } : i)) })}>{a.id}</Chip>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 4 }}>Timeline & notes</div>
              {inv.notes.map((n, i) => <div key={i} style={{ fontSize: 13.5, padding: "4px 0", borderBottom: "1px solid var(--border)" }}><span className="font-mono2" style={{ fontSize: 11.5, color: "var(--dim)" }}>{new Date(n.ts).toLocaleString()}</span> · {n.text}</div>)}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input aria-label="Add investigation note" value={invNote} onChange={(e) => setInvNote(e.target.value)} placeholder="Finding, hypothesis, action taken…" style={{ ...inputStyle, flex: 1 }} />
                <Btn small disabled={!invNote.trim()} onClick={() => { setDoc({ ...doc, investigations: doc.investigations.map((i) => (i.id === inv.id ? { ...i, notes: [...i.notes, { ts: Date.now(), text: invNote.trim() }] } : i)) }); setInvNote(""); }}>Add</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
