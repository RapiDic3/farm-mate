import React, { useEffect, useMemo, useState } from 'react'

const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const uid = () => Math.random().toString(36).slice(2, 10)
const todayISO = () => new Date().toISOString()

const JOBS = [
  { key: 'turnout', label: 'Turnout', price: 3 },
  { key: 'muckout', label: 'Muck out', price: 4 },
  { key: 'feed', label: 'Feed', price: 2 },
  { key: 'rug', label: 'Rug change', price: 1 },
  { key: 'bringin', label: 'Bring in', price: 3 },
  { key: 'haywater', label: 'Hay / water', price: 2 },
]

const LS = {
  owners: 'fm_owners_v1',
  horses: 'fm_horses_v1',
  logs: 'fm_logs_v1',
  paid: 'fm_paid_v1'
}

export default function App() {
  const [owners, setOwners] = useState([])
  const [horses, setHorses] = useState([])
  const [logs, setLogs] = useState([])
  const [paidHistory, setPaidHistory] = useState([]) // {id, ownerId, items:[logs], ts}
  const [activeHorseId, setActiveHorseId] = useState('')

  const [ownerName, setOwnerName] = useState('')
  const [horseName, setHorseName] = useState('')
  const [horseOwnerId, setHorseOwnerId] = useState('')

  // load
  useEffect(() => {
    setOwners(JSON.parse(localStorage.getItem(LS.owners) || '[]'))
    const h = JSON.parse(localStorage.getItem(LS.horses) || '[]')
    setHorses(h)
    setLogs(JSON.parse(localStorage.getItem(LS.logs) || '[]'))
    setPaidHistory(JSON.parse(localStorage.getItem(LS.paid) || '[]'))
    if (h[0]) setActiveHorseId(h[0].id)
  }, [])

  // persist
  useEffect(() => localStorage.setItem(LS.owners, JSON.stringify(owners)), [owners])
  useEffect(() => localStorage.setItem(LS.horses, JSON.stringify(horses)), [horses])
  useEffect(() => localStorage.setItem(LS.logs, JSON.stringify(logs)), [logs])
  useEffect(() => localStorage.setItem(LS.paid, JSON.stringify(paidHistory)), [paidHistory])

  const ownerMap = useMemo(() => Object.fromEntries(owners.map(o => [o.id, o])), [owners])
  const horseMap = useMemo(() => Object.fromEntries(horses.map(h => [h.id, h])), [horses])

  const addOwner = () => {
    const name = ownerName.trim()
    if (!name) return
    setOwners(prev => [...prev, { id: uid(), name }])
    setOwnerName('')
  }

  const removeOwner = (ownerId) => {
    if (!confirm('Delete owner, their horses and related logs?')) return
    setOwners(prev => prev.filter(o => o.id !== ownerId))
    const horseIds = horses.filter(h => h.ownerId === ownerId).map(h => h.id)
    setHorses(prev => prev.filter(h => h.ownerId !== ownerId))
    setLogs(prev => prev.filter(l => !horseIds.includes(l.horseId)))
  }

  const addHorse = () => {
    const name = horseName.trim()
    if (!name || !horseOwnerId) return
    const id = uid()
    setHorses(prev => [{ id, name, ownerId: horseOwnerId }, ...prev])
    setHorseName('')
    setHorseOwnerId('')
    if (!activeHorseId) setActiveHorseId(id)
  }

  const removeHorse = (horseId) => {
    if (!confirm('Delete horse and related logs?')) return
    setHorses(prev => prev.filter(h => h.id !== horseId))
    setLogs(prev => prev.filter(l => l.horseId !== horseId))
    if (horseId === activeHorseId) setActiveHorseId('')
  }

  const logJob = (horseId, job) => {
    if (!horseId) return alert('Choose a horse first')
    const record = { id: uid(), horseId, jobKey: job.key, jobLabel: job.label, price: job.price, ts: todayISO() }
    setLogs(prev => [record, ...prev])
    // haptic (mobile)
    if (window.navigator.vibrate) window.navigator.vibrate(10)
  }

  // Undo last log
  const undoLast = () => {
    if (!logs.length) return
    setLogs(prev => prev.slice(1))
  }

  // Mark owner as paid
  const markOwnerPaid = (ownerId) => {
    const ownerHorses = horses.filter(h => h.ownerId === ownerId).map(h => h.id)
    const toPay = logs.filter(l => ownerHorses.includes(l.horseId))
    const remainder = logs.filter(l => !ownerHorses.includes(l.horseId))
    if (!toPay.length) return
    setPaidHistory(prev => [{ id: uid(), ownerId, items: toPay, ts: todayISO() }, ...prev])
    setLogs(remainder)
  }

  // Clear all
  const clearAll = () => {
    if (!logs.length) return
    if (!confirm('Clear ALL logged jobs?')) return
    setLogs([])
  }

  // CSV export
  const exportCSV = () => {
    const rows = [['Date','Owner','Horse','Job','Price']]
    for (const l of logs) {
      const h = horseMap[l.horseId]; const o = h ? ownerMap[h.ownerId] : null
      rows.push([new Date(l.ts).toLocaleString(), o?.name || '', h?.name || '', l.jobLabel, l.price])
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `farmmate_logs_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const summaryText = () => {
    const byOwner = groupTotals(logs, owners, horses)
    const lines = []
    for (const { owner, horses: hmap, ownerTotal } of byOwner) {
      lines.push(`${owner.name} (Owner)`)
      for (const { horse, jobs, total } of hmap) {
        lines.push(`▪️ ${horse.name} — ${jobs} jobs, ${GBP.format(total)}`)
      }
      lines.push(`${owner.name} owes ${GBP.format(ownerTotal)} total`)
      lines.push('')
    }
    return lines.length ? lines.join('\n') : 'No jobs logged yet.'
  }

  const copySummary = () => {
    navigator.clipboard.writeText(summaryText()).then(() => alert('Summary copied to clipboard'))
  }

  const totals = useMemo(() => reduceTotals(logs, owners, horses), [logs, owners, horses])

  return (
    <div className="container">
      <header className="top">
        <div className="title">
          <span style={{fontWeight:800, fontSize: '20px'}}>Farm Mate</span>
          <span className="pill">Horse Job Logger</span>
        </div>
        <div className="hstack">
          <button className="btn" onClick={copySummary}>Copy summary</button>
          <button className="btn" onClick={exportCSV}>Download CSV</button>
          <button className="btn danger" onClick={clearAll}>Clear totals</button>
        </div>
      </header>

      <div className="row">
        <section className="card">
          <div className="header">Quick log</div>
          <div className="content stack">
            <div className="grid" style={{gridTemplateColumns:'2fr 1fr', gap:'8px', alignItems:'end'}}>
              <div>
                <label className="label">Horse</label>
                <select value={activeHorseId} onChange={e=>setActiveHorseId(e.target.value)}>
                  <option value="">Choose a horse</option>
                  {horses.map(h => (
                    <option key={h.id} value={h.id}>{h.name} — {ownerMap[h.ownerId]?.name || 'No owner'}</option>
                  ))}
                </select>
              </div>
              <div>
                <button className="btn block" onClick={()=>{
                  const name = prompt('Horse name?'); if(!name) return
                  const ownerId = prompt('Owner name (existing or new)?')
                  let chosenOwnerId = owners.find(o=>o.name.toLowerCase()===String(ownerId||'').toLowerCase())?.id
                  if(!chosenOwnerId && ownerId){ const id=uid(); setOwners(prev=>[...prev,{id,name:ownerId}]); chosenOwnerId=id }
                  if(!chosenOwnerId) return
                  const id = uid()
                  setHorses(prev=>[{id,name,ownerId:chosenOwnerId}, ...prev])
                  setActiveHorseId(id)
                }}>Add horse</button>
              </div>
            </div>

            <div className="grid cols-3 jobs-grid">
              {JOBS.map(j => (
                <button key={j.key} className="btn" onClick={()=>logJob(activeHorseId, j)}>
                  <div style={{display:'grid', placeItems:'center'}}>
                    <div style={{fontWeight:700}}>{j.label}</div>
                    <div className="small muted">{GBP.format(j.price)}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="hstack">
              <button className="btn" onClick={undoLast}>Undo last</button>
            </div>

            <Recent logs={logs.slice(0,10)} horseMap={horseMap} ownerMap={ownerMap} />
          </div>
        </section>

        <section className="stack">
          <div className="card">
            <div className="header">Setup</div>
            <div className="content stack">
              <div className="stack">
                <h3 style={{margin:'0'}}>Owners</h3>
                <div className="hstack">
                  <input className="input" placeholder="Owner name" value={ownerName} onChange={e=>setOwnerName(e.target.value)} />
                  <button className="btn primary" onClick={addOwner}>Add</button>
                </div>
                <div className="stack">
                  {owners.length===0 && <div className="muted small">No owners yet.</div>}
                  {owners.map(o => (
                    <div key={o.id} className="rowline">
                      <div style={{fontWeight:600}}>{o.name}</div>
                      <div className="hstack">
                        <button className="btn sm" onClick={()=>markOwnerPaid(o.id)}>Mark as paid</button>
                        <button className="btn sm ghost" onClick={()=>removeOwner(o.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stack" style={{marginTop:'8px'}}>
                <h3 style={{margin:'0'}}>Horses</h3>
                <input className="input" placeholder="Horse name" value={horseName} onChange={e=>setHorseName(e.target.value)} />
                <select value={horseOwnerId} onChange={e=>setHorseOwnerId(e.target.value)}>
                  <option value="">Select owner</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <button className="btn primary" onClick={addHorse}>Add horse</button>

                <div className="stack">
                  {horses.length===0 && <div className="muted small">No horses yet.</div>}
                  {horses.map(h => (
                    <div key={h.id} className="rowline">
                      <div><strong>{h.name}</strong> <span className="muted">— {ownerMap[h.ownerId]?.name || 'No owner'}</span></div>
                      <button className="btn sm ghost" onClick={()=>removeHorse(h.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <TotalsCard totals={totals} onMarkPaid={markOwnerPaid} />
          <PaidHistory history={paidHistory} owners={owners} />
        </section>
      </div>

      <footer>Data is stored locally on this device.</footer>
    </div>
  )
}

function reduceTotals(logs, owners, horses) {
  const ownerMap = Object.fromEntries(owners.map(o=>[o.id,o]))
  const horseMap = Object.fromEntries(horses.map(h=>[h.id,h]))
  const byOwner = new Map()
  for (const l of logs) {
    const h = horseMap[l.horseId]; if (!h) continue
    const o = ownerMap[h.ownerId]; if (!o) continue
    if (!byOwner.has(o.id)) byOwner.set(o.id, { owner:o, horses:new Map(), ownerTotal:0 })
    const ob = byOwner.get(o.id)
    if (!ob.horses.has(h.id)) ob.horses.set(h.id, { horse:h, jobs:0, total:0 })
    const hb = ob.horses.get(h.id); hb.jobs += 1; hb.total += l.price; ob.ownerTotal += l.price
  }
  return byOwner
}

function groupTotals(logs, owners, horses) {
  const map = reduceTotals(logs, owners, horses)
  return Array.from(map.values()).map(v => ({
    owner: v.owner,
    horses: Array.from(v.horses.values()),
    ownerTotal: v.ownerTotal
  }))
}

function Recent({ logs, horseMap, ownerMap }){
  if (!logs.length) return null
  return (
    <div className="stack">
      <div className="small" style={{fontWeight:700}}>Recent</div>
      <div className="stack">
        {logs.map(l => {
          const h = horseMap[l.horseId]; const o = h ? ownerMap[h.ownerId] : null
          return (
            <div key={l.id} className="rowline small">
              <div>
                <div style={{fontWeight:600}}>{l.jobLabel} — {h?.name || 'Horse'}</div>
                <div className="muted">{o?.name || 'Owner'} • {new Date(l.ts).toLocaleString()}</div>
              </div>
              <div className="badge">{GBP.format(l.price)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TotalsCard({ totals, onMarkPaid }){
  if (!totals || totals.size === 0) {
    return (
      <div className="card">
        <div className="header">Totals</div>
        <div className="content muted small">No jobs yet — tap a job to start logging.</div>
      </div>
    )
  }
  const entries = Array.from(totals.values()).sort((a,b)=>a.owner.name.localeCompare(b.owner.name))
  return (
    <div className="card">
      <div className="header">Totals by owner</div>
      <div className="content stack">
        {entries.map(({ owner, horses, ownerTotal }) => {
          const horseRows = Array.from(horses.values()).sort((a,b)=>a.horse.name.localeCompare(b.horse.name))
          return (
            <div key={owner.id} className="owner-block">
              <div className="owner-head">
                <div style={{fontWeight:700}}>{owner.name}</div>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <div className="badge">{GBP.format(ownerTotal)}</div>
                  <button className="btn sm" onClick={()=>onMarkPaid(owner.id)}>Mark paid</button>
                </div>
              </div>
              <div className="owner-rows">
                {horseRows.map(({ horse, jobs, total }) => (
                  <div key={horse.id} className="rowline small">
                    <div>{horse.name}</div>
                    <div className="muted">{jobs} jobs • {GBP.format(total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PaidHistory({ history, owners }){
  if (!history.length) return null
  const ownerMap = Object.fromEntries(owners.map(o=>[o.id,o]))
  return (
    <div className="card">
      <div className="header">Paid history</div>
      <div className="content stack">
        {history.map(h => {
          const o = ownerMap[h.ownerId]
          const total = h.items.reduce((s,x)=>s+x.price,0)
          const count = h.items.length
          return (
            <div key={h.id} className="rowline small">
              <div><strong>{o?.name || 'Owner'}</strong> — {count} jobs • {new Date(h.ts).toLocaleString()}</div>
              <div className="badge">{GBP.format(total)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
