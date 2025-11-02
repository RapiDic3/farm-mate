import React, { useState, useEffect, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"});
const uid = () => Math.random().toString(36).slice(2,9);
const todayISO = () => new Date().toISOString().slice(0,10);
const todayLabel = () =>
  new Date().toLocaleDateString(undefined,{
    weekday:"long", day:"numeric", month:"long", year:"numeric"
  });

const LS = {
  owners:"fm_owners_v4",
  horses:"fm_horses_v4",
  logs:"fm_logs_v4",
  paid:"fm_paid_v4",
  jobs:"fm_jobs_v4"
};

export default function App(){
  const [tab,setTab]=useState("daily");
  const [owners,setOwners]=useState([]);
  const [horses,setHorses]=useState([]);
  const [logs,setLogs]=useState([]);
  const [paidHistory,setPaidHistory]=useState([]);
  const [jobs,setJobs]=useState([]);
  const [activeHorseId,setActiveHorseId]=useState("");
  const [calendarMonth,setCalendarMonth]=useState(new Date());
  const [showDay,setShowDay]=useState(null);

  // load
  useEffect(()=>{
    setOwners(JSON.parse(localStorage.getItem(LS.owners)||"[]"));
    const h=JSON.parse(localStorage.getItem(LS.horses)||"[]");
    setHorses(h);
    setLogs(JSON.parse(localStorage.getItem(LS.logs)||"[]"));
    setPaidHistory(JSON.parse(localStorage.getItem(LS.paid)||"[]"));
    const storedJobs=JSON.parse(localStorage.getItem(LS.jobs)||"[]");
    setJobs(storedJobs.length?storedJobs:[
      { key:"turnout", label:"Turnout", price:2 },
      { key:"bringin", label:"Bring In", price:2 },
      { key:"muckout", label:"Muck Out", price:5 },
      { key:"feed", label:"Feed", price:2 },
      { key:"rug", label:"Rug change", price:1 },
      { key:"haywater", label:"Hay / water", price:2 },
      { key:"shoot", label:"Shoot ⚠️", price:0 },
      { key:"other", label:"Other", price:0 },
    ]);
    if(h[0]) setActiveHorseId(h[0].id);
  },[]);
  // persist
  useEffect(()=>localStorage.setItem(LS.owners,JSON.stringify(owners)),[owners]);
  useEffect(()=>localStorage.setItem(LS.horses,JSON.stringify(horses)),[horses]);
  useEffect(()=>localStorage.setItem(LS.logs,JSON.stringify(logs)),[logs]);
  useEffect(()=>localStorage.setItem(LS.paid,JSON.stringify(paidHistory)),[paidHistory]);
  useEffect(()=>localStorage.setItem(LS.jobs,JSON.stringify(jobs)),[jobs]);

  const ownerMap=useMemo(()=>Object.fromEntries(owners.map(o=>[o.id,o])),[owners]);
  const horseMap=useMemo(()=>Object.fromEntries(horses.map(h=>[h.id,h])),[horses]);

  // ----- job logging -----
  const logJob=(horseId,job,date=todayISO())=>{
    if(!horseId) return alert("Choose a horse first");
    let label=job.label, price=job.price;
    if(job.key==="other"){
      const desc=prompt("Description?");
      if(desc===null) return;
      const amtStr=prompt("Price (£)?");
      if(amtStr===null) return;
      const amt=parseFloat(amtStr)||0;
      label=`Other — ${desc}`; price=amt;
    }
    const record={id:uid(),horseId,jobKey:job.key,jobLabel:label,price:Number(price||0),ts:date};
    setLogs(p=>[record,...p]);
    if(navigator.vibrate) navigator.vibrate(15);
  };
  const removeLog=(id)=>setLogs(p=>p.filter(l=>l.id!==id));
  const undoLast=()=>setLogs(p=>p.slice(1));
  const clearToday=()=>{
    const t=todayISO();
    if(!confirm("Clear only today’s jobs?")) return;
    setLogs(p=>p.filter(l=>l.ts.slice(0,10)!==t));
  };

  // totals
  const todayLogs=logs.filter(l=>l.ts.slice(0,10)===todayISO());
  const todayTotal=todayLogs.reduce((s,x)=>s+Number(x.price||0),0);

  // ----- calendar helpers -----
  const toISO=(d)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10);
  const addMonths=(d,n)=>new Date(d.getFullYear(),d.getMonth()+n,1);
  const startOfWeek=(d)=>{const t=new Date(d);const w=(t.getDay()+6)%7;t.setDate(t.getDate()-w);return t;};
  const endOfWeek=(d)=>{const t=new Date(d);const w=(t.getDay()+6)%7;t.setDate(t.getDate()+(6-w));return t;};
  const monthMatrix=(cursor)=>{
    const first=new Date(cursor.getFullYear(),cursor.getMonth(),1);
    const last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0);
    const start=startOfWeek(first);
    const end=endOfWeek(last);
    const days=[];const d=new Date(start);
    while(d<=end){days.push(new Date(d));d.setDate(d.getDate()+1);}
    return {days,first};
  };
  const jobsOnDate=(iso)=>logs.filter(l=>l.ts.slice(0,10)===iso);
  const dayTotal=(iso)=>jobsOnDate(iso).reduce((s,x)=>s+Number(x.price||0),0);

  // calendar view
  const CalendarView=()=>{
    const {days,first}=monthMatrix(calendarMonth);
    const label=first.toLocaleString(undefined,{month:"long",year:"numeric"});
    return (
      <div className="stack">
        <div className="hstack" style={{justifyContent:"space-between"}}>
          <button className="btn" onClick={()=>setCalendarMonth(addMonths(calendarMonth,-1))}>←</button>
          <div style={{fontWeight:700,color:"#0ea5e9"}}>{label}</div>
          <button className="btn" onClick={()=>setCalendarMonth(addMonths(calendarMonth,1))}>→</button>
        </div>
        <div className="muted small" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",textAlign:"center"}}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px"}}>
          {days.map(d=>{
            const iso=toISO(d); const inMonth=d.getMonth()===calendarMonth.getMonth(); const tot=dayTotal(iso);
            return (
              <button key={iso} onClick={()=>setShowDay(iso)}
                style={{
                  border:"1px solid #e2e8f0",borderRadius:"10px",padding:"6px",minHeight:"56px",
                  background:inMonth?"#fff":"#f1f5f9",color:inMonth?"#0f172a":"#94a3b8",
                  textAlign:"left",position:"relative",cursor:"pointer"
                }}>
                <div style={{fontSize:"12px",fontWeight:700}}>{d.getDate()}</div>
                {tot>0 && <div className="badge" style={{position:"absolute",right:"4px",bottom:"4px",background:"#0ea5e9",color:"#fff"}}>
                  {GBP.format(tot)}
                </div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const DayModal=({iso,onClose})=>{
    const list=jobsOnDate(iso);
    const tot=list.reduce((s,x)=>s+Number(x.price||0),0);
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"grid",placeItems:"center",padding:"16px",zIndex:100}}>
        <div style={{background:"#fff",borderRadius:"16px",width:"min(640px,100%)",padding:"16px",maxHeight:"80vh",overflow:"auto"}}>
          <div className="hstack" style={{justifyContent:"space-between",marginBottom:"8px"}}>
            <div style={{fontWeight:800}}>{iso}</div>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
          <div className="stack">
            {list.length===0 && <div className="muted small">No jobs on this day.</div>}
            {list.map(l=>{
              const h=horseMap[l.horseId];const o=h?ownerMap[h.ownerId]:null;
              return (
                <div key={l.id} className="rowline small">
                  <div><strong>{l.jobLabel}</strong> — {h?.name||"Horse"} <span className="muted">({o?.name||"Owner"})</span></div>
                  <div className="hstack">
                    <div className="badge">{GBP.format(l.price)}</div>
                    <button className="btn sm danger" onClick={()=>removeLog(l.id)}>🗑</button>
                  </div>
                </div>
              );
            })}
            {list.length>0 && <div className="muted" style={{fontWeight:700}}>Total {GBP.format(tot)}</div>}

            {/* Quick add to this day */}
            <div className="stack" style={{marginTop:"8px"}}>
              <div className="muted small" style={{fontWeight:700}}>Add job to {iso}</div>
              <select value={activeHorseId} onChange={e=>setActiveHorseId(e.target.value)}>
                <option value="">Choose horse</option>
                {horses.map(h=><option key={h.id} value={h.id}>{h.name} — {ownerMap[h.ownerId]?.name}</option>)}
              </select>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"8px"}}>
                {jobs.map(j=>(
                  <button key={j.key} className="btn" style={{background:j.key==="shoot"?"#f87171":"#0ea5e9",color:"#fff"}}
                          onClick={()=>logJob(activeHorseId,j,iso)}>
                    {j.label}{j.price?` • ${GBP.format(j.price)}`:" • ⚠️"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ----- owners / horses / payments -----
  const markOwnerPaid=(ownerId)=>{
    const horseIds=horses.filter(h=>h.ownerId===ownerId).map(h=>h.id);
    const toPay=logs.filter(l=>horseIds.includes(l.horseId));
    if(!toPay.length) return alert("No jobs to mark paid for this owner.");
    setPaidHistory(p=>[{id:uid(),ownerId,items:toPay,ts:todayISO()},...p]);
    setLogs(p=>p.filter(l=>!horseIds.includes(l.horseId)));
  };
  const addOwner=()=>{const name=prompt("Owner name?"); if(!name) return; setOwners(p=>[...p,{id:uid(),name:name.trim()}]);};
  const addHorse=()=>{const n=prompt("Horse name?"); if(!n) return; const o=prompt("Owner name?"); if(!o) return;
    let owner=owners.find(x=>x.name.toLowerCase()===o.toLowerCase());
    if(!owner){ owner={id:uid(),name:o}; setOwners(p=>[...p,owner]); }
    const id=uid(); setHorses(p=>[{id,name:n,ownerId:owner.id},...p]);
  };
  const removeOwner=(id)=>{ if(!confirm("Delete this owner, their horses and jobs?")) return;
    const horseIds=horses.filter(h=>h.ownerId===id).map(h=>h.id);
    setOwners(p=>p.filter(o=>o.id!==id));
    setHorses(p=>p.filter(h=>h.ownerId!==id));
    setLogs(p=>p.filter(l=>!horseIds.includes(l.horseId)));
  };
  const removeHorse=(id)=>{ if(!confirm("Delete this horse and its jobs?")) return;
    setHorses(p=>p.filter(h=>h.id!==id));
    setLogs(p=>p.filter(l=>l.horseId!==id));
  };

  // ----- jobs management tab -----
  const JobsTab=()=>{
    const [label,setLabel]=useState("");
    const [price,setPrice]=useState("");
    const addJob=()=>{
      if(!label.trim()) return;
      const p=parseFloat(price)||0;
      setJobs(prev=>[...prev,{key:uid(),label:label.trim(),price:p}]);
      setLabel(""); setPrice("");
    };
    const removeJob=(key)=>setJobs(prev=>prev.filter(j=>j.key!==key));
    return (
      <div className="stack">
        <div className="card">
          <div className="header">Add job type</div>
          <div className="content hstack" style={{flexWrap:"wrap"}}>
            <input className="input" placeholder="Job name" value={label} onChange={e=>setLabel(e.target.value)} />
            <input className="input" style={{maxWidth:"120px"}} type="number" placeholder="£" value={price} onChange={e=>setPrice(e.target.value)} />
            <button className="btn primary" onClick={addJob}>Add</button>
          </div>
        </div>
        <div className="card">
          <div className="header">Current jobs</div>
          <div className="content stack">
            {jobs.map(j=>(
              <div key={j.key} className="rowline small">
                <div><strong>{j.label}</strong></div>
                <div className="hstack">
                  <div className="badge">{GBP.format(j.price||0)}</div>
                  <button className="btn sm danger" onClick={()=>removeJob(j.key)}>🗑</button>
                </div>
              </div>
            ))}
            {jobs.length===0 && <div className="muted small">No jobs configured.</div>}
          </div>
        </div>
      </div>
    );
  };

  // header + tabs
  const Header=()=>(
    <header style={{background:"#0ea5e9",color:"#fff",padding:"10px 16px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",flexWrap:"wrap"}}>
        <div style={{fontWeight:800,fontSize:"18px"}}>Farm Mate</div>
        <nav style={{display:"flex",gap:"12px"}}>
          {["daily","calendar","owners","jobs"].map(k=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{
                background:"transparent",border:"none",color:"#fff",fontWeight:700,
                borderBottom:tab===k?"2px solid #fff":"2px solid transparent",
                padding:"4px 2px",cursor:"pointer"
              }}>
              {k==="daily"?"Daily":k[0].toUpperCase()+k.slice(1)}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );

  // main render
  return (
    <>
      <Header/>
      <div className="container" style={{paddingTop:"12px"}}>
        {tab==="daily" && (
          <div className="row">
            {/* Left column — Quick log + Recent */}
            <section className="card">
              <div className="header">Quick log</div>
              <div className="content stack">
                <div className="muted small" style={{fontWeight:700}}>{todayLabel()}</div>

                <div className="grid" style={{gridTemplateColumns:"2fr 1fr",gap:"8px",alignItems:"end"}}>
                  <div>
                    <label className="label">Horse</label>
                    <select value={activeHorseId} onChange={e=>setActiveHorseId(e.target.value)}>
                      <option value="">Choose a horse</option>
                      {horses.map(h=>(
                        <option key={h.id} value={h.id}>{h.name} — {ownerMap[h.ownerId]?.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid cols-3 jobs-grid">
                  {jobs.map(j=>(
                    <button key={j.key} className="btn"
                      style={{background:j.key==="shoot"?"#f87171":"#0ea5e9",color:"#fff"}}
                      onClick={()=>logJob(activeHorseId,j)}>
                      <div style={{fontWeight:700}}>{j.label}</div>
                      <div className="small">{j.price?GBP.format(j.price):"⚠️"}</div>
                    </button>
                  ))}
                </div>

                <div className="hstack">
                  <button className="btn" onClick={undoLast}>Undo last</button>
                  <button className="btn danger" onClick={clearToday}>Clear today</button>
                </div>

                <div className="stack">
                  <div className="small" style={{fontWeight:700}}>Today’s jobs</div>
                  {todayLogs.length===0 && <div className="muted small">No jobs yet.</div>}
                  {todayLogs.map(l=>{
                    const h=horseMap[l.horseId]; const o=h?ownerMap[h.ownerId]:null;
                    return (
                      <div key={l.id} className="rowline small">
                        <div><strong>{l.jobLabel}</strong> — {h?.name||"Horse"} <span className="muted">({o?.name||"Owner"})</span></div>
                        <div className="hstack">
                          <div className="badge">{GBP.format(l.price)}</div>
                          <button className="btn sm danger" onClick={()=>removeLog(l.id)}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                  {todayLogs.length>0 && (
                    <div className="muted" style={{fontWeight:700}}>Total {GBP.format(todayTotal)}</div>
                  )}
                </div>
              </div>
            </section>

            {/* Right column — Owners / Horses / Totals / Paid history */}
            <section className="stack">
              <div className="card">
                <div className="header">Owners</div>
                <div className="content stack">
                  <div className="hstack" style={{flexWrap:"wrap"}}>
                    <button className="btn" onClick={addOwner}>Add owner</button>
                    <button className="btn" onClick={addHorse}>Add horse</button>
                  </div>
                  {owners.length===0 && <div className="muted small">No owners yet.</div>}
                  {owners.map(o=>{
                    const ownerHorses = horses.filter(h=>h.ownerId===o.id);
                    const total = logs.filter(l=>ownerHorses.map(h=>h.id).includes(l.horseId))
                                      .reduce((s,x)=>s+Number(x.price||0),0);
                    return (
                      <div key={o.id} className="rowline small">
                        <div style={{fontWeight:600}}>{o.name}</div>
                        <div className="hstack">
                          <div className="badge">{GBP.format(total)}</div>
                          <button className="btn sm" onClick={()=>markOwnerPaid(o.id)}>Mark paid</button>
                          <button className="btn sm ghost" onClick={()=>removeOwner(o.id)}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <div className="header">Horses</div>
                <div className="content stack">
                  {horses.length===0 && <div className="muted small">No horses yet.</div>}
                  {horses.map(h=>(
                    <div key={h.id} className="rowline small">
                      <div><strong>{h.name}</strong> <span className="muted">— {ownerMap[h.ownerId]?.name}</span></div>
                      <button className="btn sm ghost" onClick={()=>removeHorse(h.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              {paidHistory.length>0 && (
                <div className="card">
                  <div className="header">Paid history</div>
                  <div className="content stack">
                    {paidHistory.map(p=>{
                      const o=ownerMap[p.ownerId];
                      const count=p.items.length;
                      const amt=p.items.reduce((s,x)=>s+Number(x.price||0),0);
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
            </section>
          </div>
        )}

        {tab==="calendar" && <CalendarView/>}
        {tab==="owners" && (
          <div className="stack">
            {/* re-use the owners section from the right column */}
            {/* You already have Owners/Horses cards above; this tab offers them full-width if preferred */}
            {/* For simplicity, we render the same OwnersTab as a wide view */}
            {/* If you want a different layout here, say the word and I’ll split it cleanly */}
            {/* Here we inline it directly to avoid extra component duplication */}
            <div className="card">
              <div className="header">Owners (full view)</div>
              <div className="content stack">
                <div className="hstack" style={{flexWrap:"wrap"}}>
                  <button className="btn" onClick={addOwner}>Add owner</button>
                  <button className="btn" onClick={addHorse}>Add horse</button>
                  <button className="btn danger" onClick={()=>{ if(confirm("Clear ALL data?")){ setOwners([]); setHorses([]); setLogs([]); setPaidHistory([]); } }}>Clear all</button>
                </div>
                {owners.map(o=>{
                  const ownerHorses=horses.filter(h=>h.ownerId===o.id);
                  const total = logs.filter(l=>ownerHorses.map(h=>h.id).includes(l.horseId))
                                    .reduce((s,x)=>s+Number(x.price||0),0);
                  return (
                    <div key={o.id} className="owner-block">
                      <div className="owner-head">
                        <div style={{fontWeight:700}}>{o.name}</div>
                        <div className="hstack">
                          <div className="badge">{GBP.format(total)}</div>
                          <button className="btn sm" onClick={()=>markOwnerPaid(o.id)}>Mark paid</button>
                          <button className="btn sm ghost" onClick={()=>removeOwner(o.id)}>Delete</button>
                        </div>
                      </div>
                      <div className="owner-rows">
                        {ownerHorses.map(h=>(
                          <div key={h.id} className="rowline small">
                            <div>{h.name}</div>
                            <button className="btn sm ghost" onClick={()=>removeHorse(h.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {tab==="jobs" && <JobsTab/>}
      </div>

      <footer>Data is stored locally on this device.</footer>
      {showDay && <DayModal iso={showDay} onClose={()=>setShowDay(null)} />}
    </>
  );
}
