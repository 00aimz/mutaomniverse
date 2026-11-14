// EMPIRE — Business & Entrepreneurship Simulator. The monthly tick is a real
// demand model: your products and seeded AI competitors split a finite market
// by price, quality and marketing lift. Every number on the dashboards comes
// from that simulation — the OMNI advisor reads the same figures.

import { useState } from "react";
import {
Btn, Chip, EmptyState, Panel, Stat,
fmt, hashSeed, inputStyle, money, pick, rng, uid, useDoc, useUniverse,
} from "../core";

export interface EProduct { id: string; name: string; price: number; cost: number; quality: number; stage: "Research" | "Prototype" | "Testing" | "Launched"; progress: number; units: number; revenue: number }
export interface Competitor { id: string; name: string; price: number; quality: number; share: number; strategy: string }
export interface Campaign { id: string; name: string; channel: string; budget: number; monthsLeft: number; lift: number }
export interface EmpireDoc {
  company: { name: string; industry: string; cash: number; month: number; reputation: number; satisfaction: number; bridges: number } | null;
  products: EProduct[]; staff: { count: number; avgSalary: number; morale: number };
  competitors: Competitor[]; campaigns: Campaign[];
  history: Array<{ month: number; revenue: number; expenses: number; profit: number; cash: number }>;
  marketSize: number;
}

const INDUSTRIES = ["Software", "Technology", "Retail", "Healthcare", "Manufacturing", "Entertainment", "Finance", "Transportation", "Education", "Energy"];
const COMP_A = ["Nova", "Vertex", "Quantum", "Atlas", "Pinnacle", "Echo", "Zenith", "Forge"];
const COMP_B = ["Works", "Labs", "Industries", "Systems", "Collective", "Dynamics"];
const STRATS = ["Price cutter", "Quality leader", "Marketing heavy", "Balanced", "Premium niche"];
const CHANNELS = ["Social", "Search ads", "Video", "Events", "Partnerships"];

const emptyDoc: EmpireDoc = { company: null, products: [], staff: { count: 3, avgSalary: 900, morale: 70 }, competitors: [], campaigns: [], history: [], marketSize: 4200 };

function foundCompany(name: string, industry: string): EmpireDoc {
  const r = rng(hashSeed("empire:" + name));
  const competitors: Competitor[] = Array.from({ length: 4 }, () => ({
    id: uid(), name: `${pick(r, COMP_A)}${pick(r, COMP_B)}`, price: 30 + Math.round(r() * 70),
    quality: 40 + Math.round(r() * 45), share: 12 + r() * 16, strategy: pick(r, STRATS),
  }));
  const total = competitors.reduce((s, c) => s + c.share, 0);
  competitors.forEach((c) => (c.share = (c.share / total) * 82));
  return {
    company: { name, industry, cash: 25000, month: 1, reputation: 50, satisfaction: 55, bridges: 0 },
    products: [], staff: { count: 3, avgSalary: 900, morale: 70 },
    competitors, campaigns: [], history: [], marketSize: 4200,
  };
}

export function Empire() {
  const u = useUniverse();
  const [doc, setDoc] = useDoc<EmpireDoc>("empire", emptyDoc);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0] ?? "Software");
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState(49);
  const [pCost, setPCost] = useState(18);
  const [cName, setCName] = useState("");
  const [cChannel, setCChannel] = useState(CHANNELS[0] ?? "Social");
  const [cBudget, setCBudget] = useState(1500);

  const c = doc.company;
  if (!c) {
    return (
      <EmptyState title="Found your company" body="Choose an industry and name. You start with $25,000, a small team, and four AI competitors already splitting the market. Every figure from here is simulated from your decisions.">
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <input aria-label="Company name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" style={{ ...inputStyle, maxWidth: 220 }} />
          <select aria-label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
          <Btn kind="primary" disabled={!name.trim()} onClick={() => { const d = foundCompany(name.trim(), industry); setDoc(d); u.unlock("founder"); u.act("empire", `Founded ${d.company?.name} (${industry})`); u.notify("empire", "Company founded", `${name.trim()} enters the ${industry} market.`); }}>Found company</Btn>
        </div>
      </EmptyState>
    );
  }

  const C = c;
  function runMonth() {
    const r = rng(hashSeed(`empire:${C.name}:${doc.company?.month}`));
    const lift = doc.campaigns.reduce((s, x) => s + x.lift, 0);
    const launched = doc.products.filter((p) => p.stage === "Launched");
    const attract = (price: number, quality: number, extra = 0) =>
      Math.max(0.02, (quality / 60) * Math.pow(55 / Math.max(8, price), 1.15) * (1 + extra));
    const mine = launched.map((p) => attract(p.price, p.quality, lift / 100));
    const theirs = doc.competitors.map((x) => attract(x.price, x.quality));
    const totalA = mine.reduce((s, v) => s + v, 0) + theirs.reduce((s, v) => s + v, 0);
    let revenue = 0; let cogs = 0;
    const products = doc.products.map((p, i) => {
      if (p.stage === "Launched") {
        const share = totalA > 0 ? (mine[i < launched.length ? launched.indexOf(p) : 0] ?? 0) / totalA : 0;
        const units = Math.round(doc.marketSize * share * (0.9 + r() * 0.25));
        const rev = units * p.price;
        revenue += rev; cogs += units * p.cost;
        return { ...p, units: p.units + units, revenue: p.revenue + rev };
      }
      const speed = 12 + doc.staff.count * 2.2 + (doc.staff.morale - 50) / 8;
      const progress = Math.min(100, p.progress + speed);
      const stage: EProduct["stage"] = progress >= 100 ? (p.stage === "Research" ? "Prototype" : p.stage === "Prototype" ? "Testing" : "Launched") : p.stage;
      return { ...p, progress: stage !== p.stage ? 0 : progress, stage };
    });
    const competitors = doc.competitors.map((x, i) => {
      const share = totalA > 0 ? ((theirs[i] ?? 0) / totalA) * 100 * (0.92 + r() * 0.16) : x.share;
      const drift = x.strategy === "Price cutter" ? -1.5 : x.strategy === "Premium niche" ? 1.5 : 0;
      return { ...x, share: Math.max(2, Math.min(60, share)), price: Math.max(10, x.price + drift + (r() - 0.5) * 4), quality: Math.max(25, Math.min(95, x.quality + (r() - 0.5) * 3)) };
    });
    const devCost = doc.products.filter((p) => p.stage !== "Launched").length * 420;
    const salaries = doc.staff.count * doc.staff.avgSalary;
    const rent = 650;
    const expenses = cogs + salaries + rent + devCost;
    const profit = revenue - expenses;
    const cash = C.cash + profit;
    const avgQuality = launched.length ? launched.reduce((s, p) => s + p.quality, 0) / launched.length : C.satisfaction;
    const satisfaction = Math.max(5, Math.min(99, C.satisfaction + (avgQuality - 58) / 6 + (profit > 0 ? 1.5 : -1)));
    const reputation = Math.max(2, Math.min(99, C.reputation + (satisfaction - 55) / 9 + lift / 60));
    const campaigns = doc.campaigns.map((x) => ({ ...x, monthsLeft: x.monthsLeft - 1 })).filter((x) => x.monthsLeft > 0);
    const next: EmpireDoc = {
      ...doc, products, competitors, campaigns,
      company: { ...C, cash: Math.round(cash), month: C.month + 1, satisfaction: Math.round(satisfaction), reputation: Math.round(reputation) },
      staff: { ...doc.staff, morale: Math.max(10, Math.min(98, doc.staff.morale + (profit > 0 ? 2 : -3))) },
      history: [...doc.history, { month: C.month, revenue: Math.round(revenue), expenses: Math.round(expenses), profit: Math.round(profit), cash: Math.round(cash) }].slice(-36),
    };
    setDoc(next);
    if (profit > 0) u.unlock("profitable");
    u.act("empire", `Month ${C.month} closed: ${profit >= 0 ? "+" : ""}${money(profit)} profit`);
    if (cash < 0) u.notify("empire", "Cash warning", `${C.name} is below $0 — take an investor bridge or cut costs.`);
  }

  const maxBar = Math.max(1, ...doc.history.map((h) => Math.max(h.revenue, h.expenses)));
  const myShare = doc.competitors.length ? Math.max(0, 100 - doc.competitors.reduce((s, x) => s + x.share, 0)) : 0;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 26, letterSpacing: ".05em" }}>{C.name}</h2>
          <div style={{ color: "var(--dim)", fontSize: 13 }}>{C.industry} · Month {C.month} · est. market share {myShare.toFixed(1)}%</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => window.dispatchEvent(new CustomEvent("open-omni"))}>AI advisor (OMNI)</Btn>
          <Btn kind="primary" onClick={runMonth}>Run month ▸</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        <Stat label="Cash" value={money(C.cash)} color={C.cash < 0 ? "var(--bad)" : "var(--good)"} />
        <Stat label="Reputation" value={`${C.reputation}`} sub="brand strength" />
        <Stat label="Satisfaction" value={`${C.satisfaction}%`} sub="customers" />
        <Stat label="Team" value={String(doc.staff.count)} sub={`${money(doc.staff.avgSalary)}/mo · morale ${doc.staff.morale}`} />
        <Stat label="Products live" value={String(doc.products.filter((p) => p.stage === "Launched").length)} sub={`${doc.products.length} total`} />
      </div>

      {C.cash < 2000 && (
        <Panel pad={12}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14 }}><strong>Cash is tight.</strong> An investor bridge adds $8,000 at the cost of 5 reputation. Used {C.bridges}×.</span>
            <Btn small kind="primary" onClick={() => setDoc({ ...doc, company: { ...C, cash: C.cash + 8000, reputation: Math.max(2, C.reputation - 5), bridges: C.bridges + 1 } })}>Take bridge · +$8,000</Btn>
          </div>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <Panel title="Products">
            <div style={{ display: "grid", gap: 8 }}>
              {doc.products.map((p) => (
                <div key={p.id} className="panel" style={{ padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{p.name}</strong>
                    <Chip color={p.stage === "Launched" ? "var(--good)" : "var(--violet)"}>{p.stage}{p.stage !== "Launched" ? ` ${Math.round(p.progress)}%` : ""}</Chip>
                  </div>
                  <div className="font-mono2" style={{ fontSize: 12, color: "var(--dim)" }}>price {money(p.price)} · cost {money(p.cost)} · quality {p.quality} · sold {fmt(p.units)} · lifetime rev {money(p.revenue)}</div>
                  {p.stage !== "Launched" && <div style={{ marginTop: 6 }}><div style={{ height: 6, background: "#0a1122", borderRadius: 99 }}><div style={{ width: `${p.progress}%`, height: "100%", background: "var(--violet)", borderRadius: 99 }} /></div></div>}
                  <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                    <Btn small onClick={() => setDoc({ ...doc, products: doc.products.map((x) => (x.id === p.id ? { ...x, price: Math.max(5, x.price - 5) } : x)) })}>Price −5</Btn>
                    <Btn small onClick={() => setDoc({ ...doc, products: doc.products.map((x) => (x.id === p.id ? { ...x, price: x.price + 5 } : x)) })}>Price +5</Btn>
                    <Btn small disabled={C.cash < 600} onClick={() => setDoc({ ...doc, company: { ...C, cash: C.cash - 600 }, products: doc.products.map((x) => (x.id === p.id ? { ...x, quality: Math.min(99, x.quality + 6) } : x)) })}>Improve quality · $600</Btn>
                    <Btn small kind="ghost" onClick={() => setDoc({ ...doc, products: doc.products.filter((x) => x.id !== p.id) })}>Discontinue</Btn>
                  </div>
                </div>
              ))}
              <div style={{ display: "grid", gap: 6 }}>
                <input aria-label="New product name" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="New product name" style={inputStyle} />
                <div style={{ display: "flex", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--dim)", flex: 1 }}>Price <input aria-label="Product price" type="number" value={pPrice} onChange={(e) => setPPrice(Number(e.target.value))} style={inputStyle} /></label>
                  <label style={{ fontSize: 12, color: "var(--dim)", flex: 1 }}>Unit cost <input aria-label="Product unit cost" type="number" value={pCost} onChange={(e) => setPCost(Number(e.target.value))} style={inputStyle} /></label>
                </div>
                <Btn small kind="primary" disabled={!pName.trim() || C.cash < 1200} onClick={() => {
                  const p: EProduct = { id: uid(), name: pName.trim(), price: Math.max(5, pPrice), cost: Math.max(1, pCost), quality: 52, stage: "Research", progress: 0, units: 0, revenue: 0 };
                  setDoc({ ...doc, company: { ...C, cash: C.cash - 1200 }, products: [...doc.products, p] });
                  setPName(""); u.act("empire", `Started developing "${p.name}" (−$1,200 R&D)`);
                }}>Start development · $1,200</Btn>
              </div>
            </div>
          </Panel>

          <Panel title="Team">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Btn small onClick={() => setDoc({ ...doc, staff: { ...doc.staff, count: doc.staff.count + 1 } })}>Hire (+1)</Btn>
              <Btn small disabled={doc.staff.count <= 1} onClick={() => setDoc({ ...doc, staff: { ...doc.staff, count: doc.staff.count - 1, morale: Math.max(10, doc.staff.morale - 6) } })}>Let go (−1)</Btn>
              <label style={{ fontSize: 13, color: "var(--dim)" }}>Avg salary
                <input aria-label="Average salary" type="number" step={50} value={doc.staff.avgSalary} onChange={(e) => setDoc({ ...doc, staff: { ...doc.staff, avgSalary: Math.max(300, Number(e.target.value) || 300) } })} style={{ ...inputStyle, width: 100, marginLeft: 6, display: "inline-block" }} />
              </label>
            </div>
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 0 }}>More staff speeds product development and costs {money(doc.staff.count * doc.staff.avgSalary)}/month in salaries. Morale moves with profitability and layoffs, and feeds development speed.</p>
          </Panel>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Panel title="Financial history">
            {doc.history.length === 0 ? <p style={{ color: "var(--dim)", fontSize: 14, margin: 0 }}>Run your first month to start the books.</p> : (
              <>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 110 }} role="img" aria-label="Revenue versus expenses by month">
                  {doc.history.map((h) => (
                    <div key={h.month} style={{ flex: 1, display: "flex", gap: 1, alignItems: "flex-end", height: "100%" }} title={`Month ${h.month}: revenue ${money(h.revenue)}, expenses ${money(h.expenses)}, profit ${money(h.profit)}`}>
                      <div style={{ flex: 1, background: "var(--good)", height: `${(h.revenue / maxBar) * 100}%`, borderRadius: "2px 2px 0 0" }} />
                      <div style={{ flex: 1, background: "var(--bad)", height: `${(h.expenses / maxBar) * 100}%`, borderRadius: "2px 2px 0 0" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--dim)", marginTop: 4 }}>
                  <span><span style={{ color: "var(--good)" }}>■</span> Revenue · <span style={{ color: "var(--bad)" }}>■</span> Expenses</span>
                  <span>Last profit: {money(doc.history[doc.history.length - 1]?.profit ?? 0)}</span>
                </div>
                <div className="font-mono2" style={{ fontSize: 12, color: "var(--dim)", maxHeight: 120, overflowY: "auto", marginTop: 6 }} >
                  {[...doc.history].reverse().slice(0, 6).map((h) => <div key={h.month}>M{h.month}: rev {money(h.revenue)} · exp {money(h.expenses)} · profit {money(h.profit)} · cash {money(h.cash)}</div>)}
                </div>
              </>
            )}
          </Panel>

          <Panel title="Competitors">
            <div style={{ display: "grid", gap: 8 }}>
              {doc.competitors.map((x) => (
                <div key={x.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                    <span><strong>{x.name}</strong> <span style={{ color: "var(--dim)" }}>· {x.strategy} · {money(x.price)} · Q{x.quality}</span></span>
                    <span className="font-mono2">{x.share.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 7, background: "#0a1122", borderRadius: 99, marginTop: 3 }}><div style={{ width: `${x.share}%`, height: "100%", background: "var(--warn)", borderRadius: 99 }} /></div>
                </div>
              ))}
              <div style={{ fontSize: 13.5 }}><strong>Your share</strong> <span className="font-mono2" style={{ float: "right" }}>{myShare.toFixed(1)}%</span>
                <div style={{ height: 7, background: "#0a1122", borderRadius: 99, marginTop: 3 }}><div style={{ width: `${myShare}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} /></div>
              </div>
            </div>
          </Panel>

          <Panel title="Marketing">
            <div style={{ display: "grid", gap: 8 }}>
              {doc.campaigns.map((x) => (
                <div key={x.id} style={{ fontSize: 13.5 }}><strong>{x.name}</strong> <span style={{ color: "var(--dim)" }}>· {x.channel} · +{x.lift}% demand · {x.monthsLeft} mo left</span></div>
              ))}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input aria-label="Campaign name" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Campaign name" style={{ ...inputStyle, flex: "1 1 120px" }} />
                <select aria-label="Campaign channel" value={cChannel} onChange={(e) => setCChannel(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                  {CHANNELS.map((ch) => <option key={ch}>{ch}</option>)}
                </select>
                <label style={{ fontSize: 12, color: "var(--dim)" }}>Budget <input aria-label="Campaign budget" type="number" step={250} value={cBudget} onChange={(e) => setCBudget(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} /></label>
                <Btn small kind="primary" disabled={!cName.trim() || C.cash < cBudget} onClick={() => {
                  const lift = Math.round(6 + cBudget / 220);
                  setDoc({ ...doc, company: { ...C, cash: C.cash - cBudget }, campaigns: [...doc.campaigns, { id: uid(), name: cName.trim(), channel: cChannel, budget: cBudget, monthsLeft: 3, lift }] });
                  setCName(""); u.act("empire", `Launched campaign (+${lift}% demand for 3 months)`);
                }}>Launch · 3 months</Btn>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Btn kind="ghost" onClick={() => setDoc(emptyDoc)}>Dissolve company & start over</Btn>
    </div>
  );
}
