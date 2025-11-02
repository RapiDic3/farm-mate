import React, { useState, useEffect, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"});
const uid = () => Math.random().toString(36).slice(2,9);
const todayISO = () => new Date().toISOString().slice(0,10);

const JOBS = [
  { key:"turnout", label:"Turnout", price:2 },
  { key:"bringin", label:"Bring In", price:2 },
  { key:"muckout", label:"Muck Out", price:5 },
  { key:"feed", label:"Feed", price:2 },
  { key:"rug", label:"Rug change", price:1 },
  { key:"haywater", label:"Hay / water", price:2 },
  { key:"shoot", label:"Shoot ⚠️", price:0 },
  { key:"other", label:"Other", price:0 },
];

const LS = { owners:"fm_owners_v3", horses:"fm_horses_v3", logs:"fm_logs_v3", paid:"fm_paid_v3" };

export default function App(){
  const [tab,setTab]=useState("daily");
  const [owners,setOwners]=useState([]);
  const [horses,setHorses]=useState([]);
  const [logs,setLogs]=useState([]);
  const [paidHistory,setPaidHistory]=useState([]);
  const [activeHorseId,setActiveHorseId]=useState("");
  const [ownerName,setOwnerName]=useState("");
  const [horseName,setHorseName]=useState("");
  const [horseOwnerId,setHorseOwnerId]=useState("");
  const [calendarMonth,setCalendarMonth]=useState(new Date());
  const [showDay,setShowDay]=useState(null);

  // load
  useEffect(()=>{
    setOwners(JSON.parse(localStorage.getItem(LS.owners)||"[]"));
    const h=JSON.parse(localStorage.getItem(LS.horses)||"[]");
    setHorses(h);
    setLogs(JSON.parse(localStorage.getItem(LS.logs)||"[]"));
    setPaidHistory(JSON.parse(localStorage.getItem(LS.paid)||"[]"));
    if(h[0]) setActiveHorseId(h[0].id);
  },[]);
  // persist
  useEffect(()=>localStorage.setItem(LS.owners,JSON.stringify(owners)),[owners]);
  useEffect(()=>localStorage.setItem(LS.horses,JSON.stringify(horses)),[horses]);
  useEffect(()=>localStorage.setItem(LS.logs,JSON.stringify(logs)),[logs]);
  useEffect(()=>localStorage.setItem(LS.paid,JSON.stringify(paidHistory)),[paidHistory]);

  const ownerMap=useMemo(()=>Object.fromEntries(owners.map(o=>[o.id,o])),[owners]);
  const horseMap=useMemo(()=>Object.fromEntries(horses.map(h=>[h.id,h])),[horses]);

  const logJob=(horseId,job,date=todayISO())=>{
    if(!horseId)return alert("Choose horse first");
    const record={id:uid(),horseId,jobKey:job.key,jobLabel:job.label,price:job.price,ts:date};
    setLogs(p=>[record,...p]);
    if(navigator.vibrate)navigator.vibrate(15);
  };

  const dailyJobs=logs.filter(l=>l.ts.slice(0,10)===todayISO());
  const todayTotal=dailyJobs.reduce((s,x)=>s+x.price,0);

  // tabs header
  const Nav=()=>(
    <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #e2e8f0"}}>
      {["daily","calendar","owners"].map(k=>(
        <button key={k}
          onClick={()=>setTab(k)}
          style={{
            flex:1,padding:"10px 0",fontWeight:600,
            color:tab===k?"#0ea5e9":"#475569",
            borderBottom:tab===k?"3px solid #0ea5e9":"3px solid transparent",
            background:"none",cursor:"pointer"}}
        >
          {k==="daily"?"Daily":k==="calendar"?"Calendar":"Owners"}
        </button>
      ))}
    </div>
  );

  // header bar
  const Header=()=>(
    <header style={{background:"#0ea5e9",color:"#fff",padding:"12px 16px",fontWeight:700,fontSize:"18px"}}>
      Farm Mate
    </header>
  );

  // --- DAILY TAB ---
  const DailyView=()=>(
    <div className="stack">
      <div className="card">
        <h2>Quick log</h2>
        <select value={activeHorseId} onChange={e=>setActiveHorseId(e.target.value)}>
          <option value="">Choose horse</option>
          {horses.map(h=><option key={h.id} value={h.id}>{h.name} — {ownerMap[h.ownerId]?.name}</option>)}
        </select>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:"8px",marginTop:"8px"}}>
          {JOBS.map(j=>(
            <button key={j.key} className="btn" style={{background:j.key==="shoot"?"#f87171":"#0ea5e9",color:"#fff"}}
              onClick={()=>logJob(activeHorseId,j)}>
              <div style={{fontWeight:600}}>{j.label}</div>
              <div style={{fontSize:"0.8rem"}}>{j.price?GBP.format(j.price):"⚠️"}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Today’s Jobs</h2>
        {dailyJobs.length===0?<p className="muted small">No jobs yet.</p>:
        dailyJobs.map(l=>{
          const h=horseMap[l.horseId];const o=h?ownerMap[h.ownerId]:null;
          return(
            <div key={l.id} className="rowline small">
              <div><strong>{l.jobLabel}</strong> — {h?.name||"Horse"} <span className="muted">({o?.name||"Owner"})</span></div>
              <div className="badge">{GBP.format(l.price)}</div>
            </div>
          );
        })}
        {dailyJobs.length>0 && <div className="muted" style={{marginTop:"6px",fontWeight:600}}>Total {GBP.format(todayTotal)}</div>}
      </div>
    </div>
  );
  // -------- CALENDAR TAB --------
  const toISO = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const startOfWeek = (d) => {
    const tmp = new Date(d);
    const dow = (tmp.getDay() + 6) % 7; // Mon=0
    tmp.setDate(tmp.getDate() - dow);
    return tmp;
  };
  const endOfWeek = (d) => {
    const tmp = new Date(d);
    const dow = (tmp.getDay() + 6) % 7; // Mon=0
    tmp.setDate(tmp.getDate() + (6 - dow));
    return tmp;
  };

  const monthMatrix = (cursor) => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const start = startOfWeek(first);
    const end = endOfWeek(last);
    const days = [];
    const d = new Date(start);
    while (d <= end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return { days, first, last };
  };

  const jobsOnDate = (iso) => logs.filter((l) => l.ts.slice(0,10) === iso);
  const dayTotal = (iso) => jobsOnDate(iso).reduce((s,x)=>s + Number(x.price||0), 0);

  const CalendarView = () => {
    const { days, first } = monthMatrix(calendarMonth);
    const monthLabel = first.toLocaleString(undefined, { month: "long", year: "numeric" });

    return (
      <div className="stack">
        <div className="hstack" style={{justifyContent:"space-between"}}>
          <button className="btn" onClick={()=>setCalendarMonth(addMonths(calendarMonth, -1))}>←</button>
          <div style={{fontWeight:700}} className="text-sky-700">{monthLabel}</div>
          <button className="btn" onClick={()=>setCalendarMonth(addMonths(calendarMonth, +1))}>→</button>
        </div>

        <div className="muted small" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",textAlign:"center",gap:"4px"}}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d}>{d}</div>)}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px"}}>
          {days.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === calendarMonth.getMonth();
            const tot = dayTotal(iso);
            return (
              <button
                key={iso}
                onClick={()=>setShowDay(iso)}
                style={{
                  border:"1px solid #e2e8f0",
                  borderRadius:"10px",
                  padding:"6px",
                  minHeight:"64px",
                  background: inMonth ? "#fff" : "#f1f5f9",
                  color: inMonth ? "#0f172a" : "#64748b",
                  textAlign:"left",
                  position:"relative",
                  cursor:"pointer"
                }}
              >
                <div style={{fontWeight:700, fontSize:"12px"}}>{d.getDate()}</div>
                {tot>0 && (
                  <div className="badge" style={{position:"absolute", right:"6px", bottom:"6px", background:"#0ea5e9", color:"#fff"}}>
                    {GBP.format(tot)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const DayModal = ({ iso, onClose }) => {
    const list = jobsOnDate(iso);
    const tot = list.reduce((s,x)=>s + Number(x.price||0), 0);
    return (
      <div style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.25)",
        display:"grid", placeItems:"center", padding:"16px", zIndex:50
      }}>
        <div style={{background:"#fff", borderRadius:"16px", width:"min(600px, 100%)", padding:"16px", maxHeight:"80vh", overflow:"auto"}}>
          <div className="hstack" style={{justifyContent:"space-between", marginBottom:"8px"}}>
            <div style={{fontWeight:800}}>{iso}</div>
            <button className="btn" onClick={onClose}>Close</button>
          </div>

          <div className="stack">
            {list.length===0 && <div className="muted small">No jobs on this day.</div>}
            {list.map((l)=> {
              const h=horseMap[l.horseId]; const o=h?ownerMap[h.ownerId]:null;
              return (
                <div key={l.id} className="rowline small">
                  <div><strong>{l.jobLabel}</strong> — {h?.name||"Horse"} <span className="muted">({o?.name||"Owner"})</span></div>
                  <div className="badge">{GBP.format(l.price)}</div>
                </div>
              );
            })}
            {list.length>0 && <div className="muted" style={{fontWeight:700}}>Total {GBP.format(tot)}</div>}

            {/* Quick add to this date */}
            <div className="stack" style={{marginTop:"8px"}}>
              <div className="muted small" style={{fontWeight:700}}>Add job to {iso}</div>
              <div className="hstack" style={{gap:"8px", flexWrap:"wrap"}}>
                <select value={activeHorseId} onChange={e=>setActiveHorseId(e.target.value)} style={{flex:"1 1 220px"}}>
                  <option value="">Choose horse</option>
                  {horses.map(h=> <option key={h.id} value={h.id}>{h.name} — {ownerMap[h.ownerId]?.name}</option>)}
                </select>
                {JOBS.map(j=>(
                  <button key={j.key}
                          className="btn"
                          style={{background: j.key==="shoot" ? "#f87171" : "#0ea5e9", color:"#fff"}}
                          onClick={()=>{ logJob(activeHorseId, j, iso); }}>
                    {j.label} {j.price ? `• ${GBP.format(j.price)}` : "• ⚠️"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------- OWNERS & HORSES TAB --------
  const markOwnerPaid = (ownerId) => {
    const horseIds = horses.filter(h=>h.ownerId===ownerId).map(h=>h.id);
    const toPay = logs.filter(l=>horseIds.includes(l.horseId));
    if (!toPay.length) return alert("No jobs to mark as paid for this owner.");
    setPaidHistory(p=>[{ id: uid(), ownerId, items: toPay, ts: todayISO() }, ...p]);
    setLogs(p=>p.filter(l=>!horseIds.includes(l.horseId)));
  };

  const addOwner = () => {
    const name = prompt("Owner name?");
    if (!name) return;
    setOwners(p=>[...p, { id: uid(), name: name.trim() }]);
  };

  const addHorse = () => {
    const hName = prompt("Horse name?");
    if (!hName) return;
    const oName = prompt("Owner name?");
    if (!oName) return;
    let owner = owners.find(o=>o.name.toLowerCase()===oName.toLowerCase());
    if (!owner) { owner = { id: uid(), name: oName }; setOwners(p=>[...p, owner]); }
    const id = uid();
    setHorses(p=>[{ id, name: hName, ownerId: owner.id }, ...p]);
  };

  const removeOwner = (id) => {
    if (!confirm("Delete this owner, their horses and jobs?")) return;
    const horseIds = horses.filter(h=>h.ownerId===id).map(h=>h.id);
    setOwners(p=>p.filter(o=>o.id!==id));
    setHorses(p=>p.filter(h=>h.ownerId!==id));
    setLogs(p=>p.filter(l=>!horseIds.includes(l.horseId)));
  };

  const removeHorse = (id) => {
    if (!confirm("Delete this horse and its jobs?")) return;
    setHorses(p=>p.filter(h=>h.id!==id));
    setLogs(p=>p.filter(l=>l.horseId!==id));
  };

  const totalEarned = paidHistory.reduce((sum, ph) => sum + ph.items.reduce((s,x)=>s + Number(x.price||0), 0), 0);

  const byOwnerTotals = useMemo(()=>reduceTotals(logs, owners, horses), [logs, owners, horses]);

  const OwnersView = () => (
    <div className="stack">
      <div className="card">
        <h2>Quick actions</h2>
        <div className="hstack" style={{flexWrap:"wrap"}}>
          <button className="btn" onClick={addOwner}>Add owner</button>
          <button className="btn" onClick={addHorse}>Add horse</button>
          <button className="btn danger" onClick={()=>{
            if (confirm("Clear ALL data (owners, horses, jobs, payments)?")) {
              setOwners([]); setHorses([]); setLogs([]); setPaidHistory([]);
            }
          }}>Clear all</button>
          <div className="badge">Total earned: {GBP.format(totalEarned)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Owners</h2>
        <div className="stack">
          {owners.length===0 && <div className="muted small">No owners yet.</div>}
          {owners.map(o=>{
            const ownerHorses = horses.filter(h=>h.ownerId===o.id);
            const totalDue = (byOwnerTotals.get(o.id)?.total || 0);
            return (
              <div key={o.id} className="owner-block">
                <div className="owner-head">
                  <div style={{fontWeight:700}}>{o.name}</div>
                  <div className="hstack">
                    <div className="badge">{GBP.format(totalDue)}</div>
                    <button className="btn sm" onClick={()=>markOwnerPaid(o.id)}>Mark paid</button>
                    <button className="btn sm ghost" onClick={()=>removeOwner(o.id)}>Delete</button>
                  </div>
                </div>
                <div className="owner-rows">
                  {ownerHorses.length===0 && <div className="muted small">No horses yet.</div>}
                  {ownerHorses.map(h=>(
                    <div key={h.id} className="rowline small">
                      <div><strong>{h.name}</strong></div>
                      <button className="btn sm ghost" onClick={()=>removeHorse(h.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {paidHistory.length>0 && (
        <div className="card">
          <h2>Payment history</h2>
          <div className="stack">
            {paidHistory.map(p=>{
              const o = ownerMap[p.ownerId];
              const count = p.items.length;
              const amt = p.items.reduce((s,x)=>s + Number(x.price||0), 0);
              return (
                <div key={p.id} className="rowline small">
                  <div><strong>{o?.name||"Owner"}</strong> — {count} jobs • {new Date(p.ts).toLocaleString()}</div>
                  <div className="badge">{GBP.format(amt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // -------- FINAL RENDER --------
  return (
    <>
      <Header />
      <Nav />
      <div className="container" style={{ paddingTop: "12px" }}>
        {tab==="daily" && <DailyView />}
        {tab==="calendar" && <CalendarView />}
        {tab==="owners" && <OwnersView />}
      </div>
      {showDay && <DayModal iso={showDay} onClose={()=>setShowDay(null)} />}
    </>
  );
}

// -- helpers outside component --
function reduceTotals(logs, owners, horses) {
  const oMap = Object.fromEntries(owners.map(o=>[o.id,o]));
  const hMap = Object.fromEntries(horses.map(h=>[h.id,h]));
  const by = new Map();
  for (const l of logs) {
    const h = hMap[l.horseId]; if (!h) continue;
    const o = oMap[h.ownerId]; if (!o) continue;
    if (!by.has(o.id)) by.set(o.id, { owner:o, total:0 });
    by.get(o.id).total += Number(l.price||0);
  }
  return by;
}

