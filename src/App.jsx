import React, { useEffect, useState, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const uid = () => Math.random().toString(36).slice(2, 10);
const toISO = (d = new Date()) => d.toISOString().slice(0, 10);
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function App() {
  const [tab, setTab] = useState("daily");
  const [owners, setOwners] = useState([]);
  const [horses, setHorses] = useState([]);
  const [jobs, setJobs] = useState([
    { key: "turnout", label: "Turnout", price: 3 },
    { key: "bringin", label: "Bring In", price: 2 },
    { key: "muckout", label: "Muck Out", price: 5 },
    { key: "feed", label: "Feed", price: 2 },
    { key: "rug", label: "Rug Change", price: 1 },
    { key: "haywater", label: "Hay / Water", price: 2 },
    { key: "shoot", label: "Shoot ⚠️", price: 0 },
    { key: "other", label: "Other", price: 0 },
  ]);
  const [logs, setLogs] = useState([]);
  const [paidHistory, setPaidHistory] = useState([]);
  const [activeHorseId, setActiveHorseId] = useState("");
  const [showDay, setShowDay] = useState(null);
  const [currentDate, setCurrentDate] = useState(toISO());

  // ── Load & persist ──
  useEffect(() => {
    const ls = (k) => JSON.parse(localStorage.getItem(k) || "[]");
    setOwners(ls("fm_owners"));
    setHorses(ls("fm_horses"));
    setJobs(ls("fm_jobs").length ? ls("fm_jobs") : jobs);
    setLogs(ls("fm_logs"));
    setPaidHistory(ls("fm_paid"));
  }, []);

  useEffect(() => localStorage.setItem("fm_owners", JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem("fm_horses", JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem("fm_jobs", JSON.stringify(jobs)), [jobs]);
  useEffect(() => localStorage.setItem("fm_logs", JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem("fm_paid", JSON.stringify(paidHistory)), [paidHistory]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map(o => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map(h => [h.id, h])), [horses]);

  // ── Logging jobs ──
  const logJob = (horseId, job, date = currentDate) => {
    if (!horseId) return alert("Choose a horse first");
    let label = job.label, price = job.price;
    if (job.key === "other") {
      const desc = prompt("Job description?"); if (desc === null) return;
      const amt = parseFloat(prompt("Price (£)?")) || 0;
      label = `Other — ${desc}`; price = amt;
    }
    if (job.key === "shoot") {
      const time = prompt("Until what time? (e.g. 13:00 or all day)");
      label = `Shoot ⚠️ — until ${time || "unknown"}`;
    }
    setLogs(p => [{ id: uid(), horseId, jobKey: job.key, jobLabel: label, price, ts: date, paid: false }, ...p]);
    if (window.navigator.vibrate) window.navigator.vibrate(15);
  };

  const removeLog = (id) => {
    if (!confirm("Delete this log entry?")) return;
    setLogs(p => p.filter(l => l.id !== id));
  };

  const undoLast = () => {
    if (!logs.length) return;
    if (!confirm("Undo last job entry?")) return;
    setLogs(p => p.slice(1));
  };

  const clearDay = () => {
    const dayLogs = logs.filter(l => l.ts === currentDate);
    if (!dayLogs.length) return alert("No jobs today.");
    if (!confirm("Clear all jobs for today?")) return;
    setLogs(p => p.filter(l => l.ts !== currentDate));
  };

  const clearCalendar = () => {
    if (!logs.length) return alert("No jobs to clear.");
    if (!confirm("⚠️ Clear ALL jobs (paid & unpaid) from calendar?")) return;
    setLogs([]);
  };

  // ── Daily helpers ──
  const dailyLogs = logs.filter(l => l.ts === currentDate);
  const totalForDay = dailyLogs.reduce((s, x) => s + Number(x.price || 0), 0);

  const nextDate = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(toISO(d)); };
  const prevDate = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(toISO(d)); };

  // ── Totals by owner ──
  const totals = useMemo(() => {
    const map = new Map();
    for (const l of logs) {
      const h = horseMap[l.horseId]; if (!h) continue;
      const o = ownerMap[h.ownerId]; if (!o) continue;
      if (!map.has(o.id)) map.set(o.id, { owner:o, horses:new Map(), ownerTotal:0 });
      const ob = map.get(o.id);
      if (!ob.horses.has(h.id)) ob.horses.set(h.id, { horse:h, jobs:0, total:0 });
      const hb = ob.horses.get(h.id); hb.jobs++; hb.total += Number(l.price||0); ob.ownerTotal += Number(l.price||0);
    }
    return map;
  }, [logs, horses, owners]);

  const fmtCurrency = (v) => GBP.format(v || 0);

  // ── Daily View ──
  const DailyView = () => (
    <section className="card">
      <div className="header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontWeight:800}}>Daily Log — {fmtDate(currentDate)}</div>
        <div className="hstack">
          <button className="btn sm" onClick={prevDate}>⏪</button>
          <input type="date" value={currentDate} onChange={(e)=>setCurrentDate(e.target.value)} />
          <button className="btn sm" onClick={nextDate}>⏩</button>
        </div>
      </div>
      <div className="content stack">
        <div className="grid" style={{gridTemplateColumns:"2fr 1fr",gap:"8px"}}>
          <div>
            <label className="label">Horse</label>
            <select value={activeHorseId} onChange={(e)=>setActiveHorseId(e.target.value)}>
              <option value="">Choose horse</option>
              {horses.map(h=>(
                <option key={h.id} value={h.id}>{h.name} — {ownerMap[h.ownerId]?.name}</option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={()=>{
            const name=prompt("Horse name?"); if(!name)return;
            const ownerName=prompt("Owner name?"); if(!ownerName)return;
            let ownerId=owners.find(o=>o.name.toLowerCase()===ownerName.toLowerCase())?.id;
            if(!ownerId){ ownerId=uid(); setOwners(p=>[...p,{id:ownerId,name:ownerName}]); }
            const id=uid(); setHorses(p=>[...p,{id,name,ownerId}]); setActiveHorseId(id);
          }}>+ Add Horse</button>
        </div>

        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"8px"}}>
          {jobs.map(j=>(
            <button key={j.key} className="btn"
              style={{background:j.key==="shoot"?"#f87171":"#0ea5e9",color:"#fff"}}
              onClick={()=>logJob(activeHorseId,j)}>
              {j.label}{j.price?` • ${fmtCurrency(j.price)}`:""}
            </button>
          ))}
        </div>

        <div className="hstack">
          <button className="btn" onClick={undoLast}>Undo Last</button>
          <button className="btn danger" onClick={clearDay}>Clear Today</button>
        </div>

        <div className="stack">
          <div className="small" style={{fontWeight:700}}>Today’s Jobs ({fmtCurrency(totalForDay)})</div>
          {dailyLogs.length===0 && <div className="muted small">No jobs logged today.</div>}
          {dailyLogs.map(l=>{
            const h=horseMap[l.horseId]; const o=h?ownerMap[h.ownerId]:null;
            return(
              <div key={l.id} className="rowline small" style={{opacity:l.paid?0.6:1}}>
                <div><strong>{l.jobLabel}</strong> — {h?.name||"Horse"} <span className="muted">({o?.name||"Owner"}) {l.paid&&"✅"}</span></div>
                <div className="hstack">
                  <div className="badge">{fmtCurrency(l.price)}</div>
                  <button className="btn sm danger" onClick={()=>removeLog(l.id)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
  // ── Calendar View ──
  const CalendarView = () => {
    const [month, setMonth] = useState(new Date());
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const startDay = first.getDay();

    const dayLogs = {};
    for (const l of logs) {
      const d = l.ts;
      if (!dayLogs[d]) dayLogs[d] = [];
      dayLogs[d].push(l);
    }

    const changeMonth = (diff) => {
      const nm = new Date(month);
      nm.setMonth(nm.getMonth() + diff);
      setMonth(nm);
    };

    return (
      <section className="card">
        <div className="header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button className="btn sm" onClick={()=>changeMonth(-1)}>⏪</button>
          <div style={{fontWeight:800}}>
            {month.toLocaleString("default",{month:"long"})} {year}
          </div>
          <div className="hstack">
            <button className="btn sm" onClick={()=>changeMonth(1)}>⏩</button>
            <button className="btn danger sm" onClick={clearCalendar}>🗑 Clear Calendar</button>
          </div>
        </div>
        <div className="content">
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px",fontSize:"12px",color:"#64748b",textAlign:"center",marginBottom:"6px"}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px"}}>
            {[...Array(startDay).keys()].map(i=><div key={"e"+i}></div>)}
            {[...Array(daysInMonth).keys()].map(i=>{
              const day = i+1;
              const iso = toISO(new Date(year, m, day));
              const logsForDay = dayLogs[iso]||[];
              const total = logsForDay.reduce((s,x)=>s+Number(x.price||0),0);
              const paid = logsForDay.some(x=>x.paid);
              const hasShoot = logsForDay.some(x=>x.jobKey==="shoot");
              return (
                <div key={iso} className="card"
                     style={{
                       padding:"4px",
                       border:"1px solid #e2e8f0",
                       background:"#fff",
                       borderRadius:"8px",
                       cursor:"pointer",
                       minHeight:"60px",
                       display:"flex",
                       flexDirection:"column",
                       justifyContent:"space-between"
                     }}
                     onClick={()=>setShowDay(iso)}>
                  <div style={{fontWeight:600,fontSize:"13px"}}>{day}</div>
                  <div style={{fontSize:"11px",textAlign:"right"}}>
                    {hasShoot && <span style={{color:"#facc15"}}>⚠️ </span>}
                    {paid && <span>💰 </span>}
                    {total>0 && <span>{GBP.format(total)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  // ── Paid History (with owner filter) ──
  const PaidHistoryCard = () => {
    const [filterOwner, setFilterOwner] = useState("all");
    const filtered = filterOwner==="all"
      ? paidHistory
      : paidHistory.filter(p=>p.ownerId===filterOwner);

    return (
      paidHistory.length===0 ? null : (
        <div className="card">
          <div className="header" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>Paid History</div>
            <select value={filterOwner} onChange={(e)=>setFilterOwner(e.target.value)} style={{padding:"4px",borderRadius:"8px"}}>
              <option value="all">All Owners</option>
              {owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="content stack small">
            {filtered.map(rec=>{
              const o = ownerMap[rec.ownerId];
              return (
                <div key={rec.id} style={{border:"1px solid #e2e8f0",borderRadius:"8px",padding:"8px"}}>
                  <div style={{fontWeight:700}}>
                    {o?.name||"Owner"} — {GBP.format(rec.total)} — Paid on {fmtDate(rec.ts)}
                  </div>
                  {rec.items.map(it=>{
                    const h = horses.find(x=>x.id===it.horseId);
                    return (
                      <div key={it.id}>
                        • {h?.name||"Horse"} — {it.jobLabel} — {GBP.format(it.price)} — ({fmtDate(it.ts)})
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )
    );
  };

  // ── Header & Tabs ──
  const Header = () => (
    <header style={{background:"linear-gradient(to right,#0284c7,#0ea5e9)",color:"#fff",padding:"10px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",flexWrap:"wrap"}}>
        <div style={{fontWeight:800,fontSize:"18px"}}>Farm Mate</div>
        <nav style={{display:"flex",gap:"12px"}}>
          {["daily","calendar","owners","jobs","settings"].map(k=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{
                background:"transparent",border:"none",color:"#fff",fontWeight:700,
                borderBottom:tab===k?"2px solid #fff":"2px solid transparent",
                padding:"4px 2px",cursor:"pointer"
              }}>
              {k[0].toUpperCase()+k.slice(1)}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );

  // ── Main render ──
  return (
    <div style={{background:"linear-gradient(to bottom,#0ea5e9,#f8fafc)",minHeight:"100vh"}}>
      <Header />
      <div className="container" style={{paddingTop:"12px"}}>
        {tab==="daily" && (
          <div className="row">
            <DailyView />
            <section className="stack">
              {/* Totals by Owner */}
              <div className="card">
                <div className="header">Owners — Amount Due</div>
                <div className="content stack small">
                  {owners.map(o=>{
                    const ownerHorses = horses.filter(h=>h.ownerId===o.id).map(h=>h.id);
                    const due = logs.filter(l=>ownerHorses.includes(l.horseId)&&!l.paid)
                                    .reduce((s,x)=>s+Number(x.price||0),0);
                    return (
                      <div key={o.id} className="rowline small">
                        <div style={{fontWeight:600}}>{o.name}</div>
                        <div className="badge">{GBP.format(due)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <PaidHistoryCard />
            </section>
          </div>
        )}
        {tab==="calendar" && <CalendarView />}
        {tab==="owners" && <div className="card"><div className="header">Owners</div><div className="content">Owners tab here…</div></div>}
        {tab==="jobs" && <div className="card"><div className="header">Jobs</div><div className="content">Jobs tab here…</div></div>}
        {tab==="settings" && <div className="card"><div className="header">Settings</div><div className="content">Settings tab here…</div></div>}
      </div>
      <footer style={{textAlign:"center",padding:"12px",color:"#64748b"}}>Data stored locally on this device.</footer>
      {showDay && <div>Day modal placeholder</div>}
    </div>
  );
}
