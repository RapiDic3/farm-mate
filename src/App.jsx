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

  // load / persist
  useEffect(() => {
    const ls = (k) => JSON.parse(localStorage.getItem(k) || "[]");
    setOwners(ls("fm_owners"));
    setHorses(ls("fm_horses"));
    setLogs(ls("fm_logs"));
    setPaidHistory(ls("fm_paid"));
  }, []);
  useEffect(() => localStorage.setItem("fm_owners", JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem("fm_horses", JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem("fm_logs", JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem("fm_paid", JSON.stringify(paidHistory)), [paidHistory]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map(o => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map(h => [h.id, h])), [horses]);

  // job logging
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
  };

  const removeLog = (id) => setLogs(p => p.filter(l => l.id !== id));
  const undoLast = () => setLogs(p => p.slice(1));
  const clearDay = () => { if (confirm("Clear today’s jobs?")) setLogs(p => p.filter(l => l.ts !== currentDate)); };
  const clearCalendar = () => { if (confirm("⚠️ Clear ALL jobs?")) setLogs([]); };

  const dailyLogs = logs.filter(l => l.ts === currentDate);
  const totalForDay = dailyLogs.reduce((s, x) => s + Number(x.price || 0), 0);

  const fmt = (v) => GBP.format(v || 0);

  // daily view
  const DailyView = () => (
    <section className="card">
      <div className="header" style={{display:"flex",justifyContent:"space-between"}}>
        <div style={{fontWeight:800}}>Daily Log — {fmtDate(currentDate)}</div>
        <input type="date" value={currentDate} onChange={e=>setCurrentDate(e.target.value)} />
      </div>
      <div className="content stack">
        <select value={activeHorseId} onChange={e=>setActiveHorseId(e.target.value)}>
          <option value="">Choose horse</option>
          {horses.map(h=><option key={h.id} value={h.id}>{h.name} — {ownerMap[h.ownerId]?.name}</option>)}
        </select>
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"8px"}}>
          {jobs.map(j=>(
            <button key={j.key} className="btn"
              style={{background:j.key==="shoot"?"#f87171":"#0ea5e9",color:"#fff"}}
              onClick={()=>logJob(activeHorseId,j)}>
              {j.label}{j.price?` • ${fmt(j.price)}`:""}
            </button>
          ))}
        </div>
        <div className="hstack">
          <button className="btn" onClick={undoLast}>Undo</button>
          <button className="btn danger" onClick={clearDay}>Clear Today</button>
        </div>
        <div className="stack small">
          <div style={{fontWeight:700}}>Today’s Jobs ({fmt(totalForDay)})</div>
          {dailyLogs.map(l=>{
            const h=horseMap[l.horseId], o=h?ownerMap[h.ownerId]:null;
            return(
              <div key={l.id} className="rowline">
                <div><b>{l.jobLabel}</b> — {h?.name} ({o?.name})</div>
                <button className="btn sm danger" onClick={()=>removeLog(l.id)}>🗑</button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  // calendar view
  const CalendarView = () => {
    const [month, setMonth] = useState(new Date());
    const year = month.getFullYear(), m = month.getMonth();
    const first = new Date(year, m, 1);
    const days = new Date(year, m + 1, 0).getDate();
    const start = first.getDay();
    const map = {};
    for (const l of logs) (map[l.ts] ||= []).push(l);

    const changeMonth = (d) => { const n = new Date(month); n.setMonth(n.getMonth()+d); setMonth(n); };

    return (
      <section className="card">
        <div className="header" style={{display:"flex",justifyContent:"space-between"}}>
          <button className="btn sm" onClick={()=>changeMonth(-1)}>⏪</button>
          <b>{month.toLocaleString("default",{month:"long"})} {year}</b>
          <div className="hstack">
            <button className="btn sm" onClick={()=>changeMonth(1)}>⏩</button>
            <button className="btn danger sm" onClick={clearCalendar}>🗑 Clear</button>
          </div>
        </div>
        <div className="content">
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px"}}>
            {[...Array(start).keys()].map(i=><div key={"e"+i}></div>)}
            {[...Array(days).keys()].map(i=>{
              const d=i+1, iso=toISO(new Date(year,m,d));
              const arr=map[iso]||[], tot=arr.reduce((s,x)=>s+Number(x.price||0),0);
              const shoot=arr.some(x=>x.jobKey==="shoot");
              return(
                <button key={iso} onClick={()=>setShowDay(iso)}
                  style={{border:"1px solid #e2e8f0",borderRadius:"8px",padding:"4px",minHeight:"65px",cursor:"pointer"}}>
                  <div style={{fontWeight:600}}>{d}</div>
                  <div style={{fontSize:"11px",textAlign:"right"}}>
                    {shoot&&<span style={{color:"#facc15"}}>⚠️ </span>}
                    {tot>0&&<span>{GBP.format(tot)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  };
  const DayModal = ({ iso, onClose }) => {
    const arr = logs.filter(l => l.ts === iso);
    const total = arr.reduce((s,x)=>s+Number(x.price||0),0);
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"grid",placeItems:"center",zIndex:10}}>
        <div style={{background:"#fff",borderRadius:"16px",padding:"16px",width:"min(700px,95%)",maxHeight:"80vh",overflowY:"auto"}}>
          <div className="hstack" style={{justifyContent:"space-between"}}>
            <b>Jobs on {fmtDate(iso)}</b>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
          {arr.map(l=>{
            const h=horseMap[l.horseId], o=h?ownerMap[h.ownerId]:null;
            return(
              <div key={l.id} className="rowline small">
                <div><b>{l.jobLabel}</b> — {h?.name} ({o?.name})</div>
                <button className="btn sm danger" onClick={()=>removeLog(l.id)}>🗑</button>
              </div>
            );
          })}
          <div className="muted small" style={{marginTop:"8px",fontWeight:700}}>Total {GBP.format(total)}</div>
        </div>
      </div>
    );
  };

  const PaidHistoryView = () => (
    <section className="card">
      <div className="header"><b>Paid History</b></div>
      <div className="content small stack">
        {paidHistory.map(rec=>{
          const o=ownerMap[rec.ownerId];
          return(
            <div key={rec.id} style={{border:"1px solid #e2e8f0",borderRadius:"8px",padding:"8px"}}>
              <b>{o?.name||"Owner"}</b> — {fmtDate(rec.ts)}
              {rec.items.map(it=>{
                const h=horseMap[it.horseId];
                return(<div key={it.id}>• {h?.name||"Horse"} — {it.jobLabel} — {GBP.format(it.price)}</div>);
              })}
            </div>
          );
        })}
      </div>
    </section>
  );

  const Header = () => (
    <header style={{background:"linear-gradient(to right,#0284c7,#0ea5e9)",color:"#fff",padding:"10px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <b>Farm Mate</b>
        <nav style={{display:"flex",gap:"12px"}}>
          {["daily","calendar","paid"].map(k=>(
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

  return (
    <div style={{background:"linear-gradient(to bottom,#0ea5e9,#f8fafc)",minHeight:"100vh"}}>
      <Header/>
      <div className="container" style={{paddingTop:"12px"}}>
        {tab==="daily"&&<DailyView/>}
        {tab==="calendar"&&<CalendarView/>}
        {tab==="paid"&&<PaidHistoryView/>}
      </div>
      <footer style={{textAlign:"center",padding:"12px",color:"#64748b"}}>
        Data stored locally on this device.
      </footer>
      {showDay&&<DayModal iso={showDay} onClose={()=>setShowDay(null)}/>}
    </div>
  );
}
