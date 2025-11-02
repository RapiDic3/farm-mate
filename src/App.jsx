import React, { useEffect, useMemo, useState } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

const JOBS_DEFAULT = [
  { key: "turnout", label: "Turnout", price: 3 },
  { key: "bringin", label: "Bring In", price: 2 },
  { key: "muckout", label: "Muck Out", price: 5 },
  { key: "feed", label: "Feed", price: 2 },
  { key: "rug", label: "Rug Change", price: 1 },
  { key: "haywater", label: "Hay / Water", price: 2 },
  { key: "shoot", label: "Shoot ⚠️", price: 0 },
  { key: "other", label: "Other", price: 0 },
];

export default function App() {
  const [tab, setTab] = useState("daily");
  const [owners, setOwners] = useState([]);
  const [horses, setHorses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [jobs, setJobs] = useState(JOBS_DEFAULT);
  const [paidHistory, setPaidHistory] = useState([]);
  const [activeHorseId, setActiveHorseId] = useState("");
  const [currentDate, setCurrentDate] = useState(todayISO());
  const [showDay, setShowDay] = useState(null);

  // ─── Load + Save ───
  useEffect(() => {
    setOwners(JSON.parse(localStorage.getItem("fm_owners") || "[]"));
    setHorses(JSON.parse(localStorage.getItem("fm_horses") || "[]"));
    setLogs(JSON.parse(localStorage.getItem("fm_logs") || "[]"));
    setJobs(JSON.parse(localStorage.getItem("fm_jobs") || JSON.stringify(JOBS_DEFAULT)));
    setPaidHistory(JSON.parse(localStorage.getItem("fm_paid") || "[]"));
  }, []);

  useEffect(() => localStorage.setItem("fm_owners", JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem("fm_horses", JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem("fm_logs", JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem("fm_jobs", JSON.stringify(jobs)), [jobs]);
  useEffect(() => localStorage.setItem("fm_paid", JSON.stringify(paidHistory)), [paidHistory]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map(o => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map(h => [h.id, h])), [horses]);

  // ─── Setup ───
  const addOwner = (name) => {
    name = name.trim();
    if (!name) return;
    setOwners(prev => [...prev, { id: uid(), name }]);
  };
  const removeOwner = (id) => {
    if (!confirm("Delete owner and their horses?")) return;
    const hIds = horses.filter(h => h.ownerId === id).map(h => h.id);
    setOwners(p => p.filter(o => o.id !== id));
    setHorses(p => p.filter(h => h.ownerId !== id));
    setLogs(p => p.filter(l => !hIds.includes(l.horseId)));
  };

  const addHorse = (name, ownerId) => {
    name = name.trim();
    if (!name || !ownerId) return;
    setHorses(p => [...p, { id: uid(), name, ownerId }]);
  };
  const removeHorse = (id) => {
    if (!confirm("Delete horse and its logs?")) return;
    setHorses(p => p.filter(h => h.id !== id));
    setLogs(p => p.filter(l => l.horseId !== id));
  };

  // ─── Jobs ───
  const logJob = (horseId, job) => {
    if (!horseId) return alert("Select a horse first");
    let label = job.label, price = job.price;
    if (job.key === "other") {
      const desc = prompt("Job description?");
      if (!desc) return;
      const amt = parseFloat(prompt("Price (£)?")) || 0;
      label = `Other — ${desc}`;
      price = amt;
    }
    if (job.key === "shoot") {
      const note = prompt("Until what time? (e.g. 13:00 or all day)");
      label = `Shoot ⚠️ — until ${note || "unknown"}`;
    }
    setLogs(prev => [
      { id: uid(), horseId, jobKey: job.key, jobLabel: label, price, ts: currentDate, paid: false },
      ...prev,
    ]);
  };

  const undoLast = () => setLogs(p => p.slice(1));
  const clearToday = () => {
    if (!confirm("Clear all jobs for today?")) return;
    setLogs(p => p.filter(l => l.ts !== currentDate));
  };
  const removeLog = (id) => setLogs(p => p.filter(l => l.id !== id));

  // ─── Mark Paid ───
  const markPaid = (ownerId) => {
    const ownedHorses = horses.filter(h => h.ownerId === ownerId).map(h => h.id);
    const items = logs.filter(l => ownedHorses.includes(l.horseId));
    if (!items.length) return alert("No unpaid jobs for this owner.");
    const total = items.reduce((s, x) => s + x.price, 0);
    setPaidHistory(prev => [{ id: uid(), ownerId, items, ts: todayISO(), total }, ...prev]);
    setLogs(p => p.filter(l => !ownedHorses.includes(l.horseId)));
  };

  // ─── Export ───
  const exportCSV = () => {
    const rows = [["Date", "Owner", "Horse", "Job", "Price"]];
    for (const l of logs) {
      const h = horseMap[l.horseId], o = h ? ownerMap[h.ownerId] : {};
      rows.push([l.ts, o.name || "", h?.name || "", l.jobLabel, l.price]);
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farmmate_logs_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Derived ───
  const totals = useMemo(() => {
    const map = new Map();
    for (const l of logs) {
      const h = horseMap[l.horseId]; if (!h) continue;
      const o = ownerMap[h.ownerId]; if (!o) continue;
      if (!map.has(o.id)) map.set(o.id, { owner: o, horses: new Map(), total: 0 });
      const ob = map.get(o.id);
      if (!ob.horses.has(h.id)) ob.horses.set(h.id, { horse: h, jobs: 0, total: 0 });
      const hb = ob.horses.get(h.id);
      hb.jobs++; hb.total += l.price; ob.total += l.price;
    }
    return map;
  }, [logs, owners, horses]);

  // ─── Views ───
  const DailyView = () => {
    const dailyLogs = logs.filter(l => l.ts === currentDate);
    const totalDay = dailyLogs.reduce((s, x) => s + x.price, 0);

    return (
      <section className="card">
        <div className="header" style={{ display: "flex", justifyContent: "space-between" }}>
          <b>Daily Log — {currentDate}</b>
          <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} />
        </div>
        <div className="content stack">
          <select value={activeHorseId} onChange={e => setActiveHorseId(e.target.value)}>
            <option value="">Select horse</option>
            {horses.map(h => (
              <option key={h.id} value={h.id}>
                {h.name} — {ownerMap[h.ownerId]?.name}
              </option>
            ))}
          </select>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
            {jobs.map(j => (
              <button key={j.key} className="btn"
                style={{ background: j.key === "shoot" ? "#f87171" : "#0ea5e9", color: "#fff" }}
                onClick={() => logJob(activeHorseId, j)}>
                {j.label} {j.price ? `• £${j.price}` : ""}
              </button>
            ))}
          </div>

          <div className="hstack">
            <button className="btn" onClick={undoLast}>Undo</button>
            <button className="btn danger" onClick={clearToday}>Clear Today</button>
            <button className="btn" onClick={exportCSV}>Export CSV</button>
          </div>

          <div className="stack">
            <b>Today's Jobs ({GBP.format(totalDay)})</b>
            {dailyLogs.map(l => {
              const h = horseMap[l.horseId], o = h ? ownerMap[h.ownerId] : {};
              return (
                <div key={l.id} className="rowline small">
                  <div><b>{l.jobLabel}</b> — {h?.name || "Horse"} ({o?.name || "Owner"})</div>
                  <button className="btn sm danger" onClick={() => removeLog(l.id)}>🗑</button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const TotalsCard = () => {
    if (!totals.size) return (
      <div className="card"><div className="header">Totals</div><div className="content small muted">No jobs logged yet.</div></div>
    );
    const entries = Array.from(totals.values());
    return (
      <div className="card">
        <div className="header">Totals by Owner</div>
        <div className="content stack">
          {entries.map(({ owner, horses, total }) => (
            <div key={owner.id} className="owner-block">
              <div className="owner-head">
                <div style={{ fontWeight: 700 }}>{owner.name}</div>
                <div className="hstack">
                  <div className="badge">{GBP.format(total)}</div>
                  <button className="btn sm" onClick={() => markPaid(owner.id)}>Mark Paid</button>
                </div>
              </div>
              <div className="owner-rows">
                {Array.from(horses.values()).map(({ horse, jobs, total }) => (
                  <div key={horse.id} className="rowline small">
                    <div>{horse.name}</div>
                    <div className="muted">{jobs} jobs • {GBP.format(total)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  // ─── Calendar View ───
  const CalendarView = () => {
    const [month, setMonth] = useState(new Date());
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const startDay = first.getDay();

    const dayLogs = {};
    for (const l of logs) {
      if (!dayLogs[l.ts]) dayLogs[l.ts] = [];
      dayLogs[l.ts].push(l);
    }

    const changeMonth = (diff) => {
      const nm = new Date(month);
      nm.setMonth(nm.getMonth() + diff);
      setMonth(nm);
    };

    const clearCalendar = () => {
      if (confirm("Clear ALL calendar entries?")) setLogs([]);
    };

    return (
      <section className="card">
        <div
          className="header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <button className="btn sm" onClick={() => changeMonth(-1)}>⏪</button>
          <b>{month.toLocaleString("default", { month: "long" })} {year}</b>
          <div className="hstack">
            <button className="btn sm" onClick={() => changeMonth(1)}>⏩</button>
            <button className="btn danger sm" onClick={clearCalendar}>🗑 Clear</button>
          </div>
        </div>

        <div className="content">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              textAlign: "center",
              color: "#64748b",
              fontSize: "12px",
              marginBottom: "6px",
            }}
          >
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
            {[...Array(startDay).keys()].map((i) => <div key={"e"+i}></div>)}
            {[...Array(daysInMonth).keys()].map((i) => {
              const day = i + 1;
              const iso = new Date(year, m, day).toISOString().slice(0, 10);
              const list = dayLogs[iso] || [];
              const total = list.reduce((s, x) => s + Number(x.price||0), 0);
              const paid = list.some((x) => x.paid);
              const hasShoot = list.some((x) => x.jobKey === "shoot");
              return (
                <button
                  key={iso}
                  onClick={() => setShowDay(iso)}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    minHeight: "65px",
                    padding: "4px",
                    background: "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{day}</div>
                  <div style={{ fontSize: "11px", textAlign: "right" }}>
                    {hasShoot && <span style={{ color: "#facc15" }}>⚠️ </span>}
                    {paid && <span>💰 </span>}
                    {total>0 && <span>{GBP.format(total)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  // ─── Day Modal ───
  const DayModal = ({ iso, onClose }) => {
    const list = logs.filter((l) => l.ts === iso);
    const total = list.reduce((s, x) => s + Number(x.price||0), 0);
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.5)",
          display: "grid",
          placeItems: "center",
          zIndex: 100,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "16px",
            width: "min(700px,95%)",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <div className="hstack" style={{ justifyContent: "space-between" }}>
            <b>Jobs on {iso}</b>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
          <div className="stack small" style={{ marginTop: "8px" }}>
            {list.map((l) => {
              const h = horseMap[l.horseId], o = h ? ownerMap[h.ownerId] : null;
              return (
                <div key={l.id} className="rowline small">
                  <div><b>{l.jobLabel}</b> — {h?.name} ({o?.name})</div>
                  <button className="btn sm danger" onClick={() => removeLog(l.id)}>🗑</button>
                </div>
              );
            })}
            <div className="muted small" style={{ marginTop: "8px" }}>
              Total: {GBP.format(total)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Paid History ───
  const PaidHistoryView = () => {
    const [filter, setFilter] = useState("all");
    const filtered = filter==="all" ? paidHistory : paidHistory.filter((p)=>p.ownerId===filter);

    const clearPaid = () => { if (confirm("Clear paid history?")) setPaidHistory([]); };

    const exportPaid = () => {
      const rows = [["Date","Owner","Horse","Job","Price"]];
      for (const rec of paidHistory) {
        const o = ownerMap[rec.ownerId];
        for (const l of rec.items) {
          const h = horseMap[l.horseId];
          rows.push([l.ts,o?.name||"",h?.name||"",l.jobLabel,l.price]);
        }
      }
      const csv = rows.map(r=>r.join(",")).join("\n");
      const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `farmmate_paid_${todayISO()}.csv`;
      a.click();
    };

    return (
      <section className="card">
        <div className="header" style={{display:"flex",justifyContent:"space-between"}}>
          <b>Paid History</b>
          <div className="hstack">
            <select value={filter} onChange={(e)=>setFilter(e.target.value)}>
              <option value="all">All Owners</option>
              {owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button className="btn sm" onClick={exportPaid}>⬇️ Export</button>
            <button className="btn danger sm" onClick={clearPaid}>🗑 Clear</button>
          </div>
        </div>

        <div className="content stack small">
          {filtered.length===0 && <div className="muted small">No paid history.</div>}
          {filtered.map(rec=>{
            const o = ownerMap[rec.ownerId];
            return (
              <div key={rec.id} style={{border:"1px solid #e2e8f0",borderRadius:"8px",padding:"8px"}}>
                <b>{o?.name}</b> — {rec.ts} — {GBP.format(rec.total)}
                {rec.items.map(it=>{
                  const h = horseMap[it.horseId];
                  return (
                    <div key={it.id}>• {h?.name} — {it.jobLabel} — {GBP.format(it.price)} — {it.ts}</div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  // ─── Header / Layout ───
  const Header = () => (
    <header style={{background:"#0ea5e9",color:"#fff",padding:"10px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
        <b>Farm Mate</b>
        <nav style={{display:"flex",gap:"12px"}}>
          {["daily","calendar","paid"].map(k=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{
                background:"transparent",border:"none",color:"#fff",fontWeight:700,
                borderBottom:tab===k?"2px solid #fff":"2px solid transparent",cursor:"pointer"
              }}>
              {k[0].toUpperCase()+k.slice(1)}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );

  // ─── Return Layout ───
  return (
    <div style={{background:"#f8fafc",minHeight:"100vh"}}>
      <Header />
      <div className="container" style={{padding:"16px"}}>
        {tab==="daily" && <><DailyView /><TotalsCard /></>}
        {tab==="calendar" && <CalendarView />}
        {tab==="paid" && <PaidHistoryView />}
      </div>
      <footer style={{textAlign:"center",padding:"12px",color:"#64748b"}}>Data stored locally on this device.</footer>
      {showDay && <DayModal iso={showDay} onClose={()=>setShowDay(null)} />}
    </div>
  );
}
