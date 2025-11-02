import React, { useEffect, useState, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);

const JOBS = [
  { key: "turnout", label: "Turnout", price: 2 },
  { key: "bringin", label: "Bring In", price: 2 },
  { key: "muckout", label: "Muck Out", price: 5 },
  { key: "shoot", label: "Shoot (warning)", price: 0 },
  { key: "other", label: "Other", price: 0 },
];

const LS = { owners: "fm_owners_v2", horses: "fm_horses_v2", logs: "fm_logs_v2", paid: "fm_paid_v2" };

export default function App() {
  const [owners, setOwners] = useState([]);
  const [horses, setHorses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [paidHistory, setPaidHistory] = useState([]);
  const [activeHorseId, setActiveHorseId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [horseName, setHorseName] = useState("");
  const [horseOwnerId, setHorseOwnerId] = useState("");
  const [viewDate, setViewDate] = useState(todayISO());
  const [filter, setFilter] = useState("all");

  // load local data
  useEffect(() => {
    setOwners(JSON.parse(localStorage.getItem(LS.owners) || "[]"));
    const h = JSON.parse(localStorage.getItem(LS.horses) || "[]");
    setHorses(h);
    setLogs(JSON.parse(localStorage.getItem(LS.logs) || "[]"));
    setPaidHistory(JSON.parse(localStorage.getItem(LS.paid) || "[]"));
    if (h[0]) setActiveHorseId(h[0].id);
  }, []);

  // persist
  useEffect(() => localStorage.setItem(LS.owners, JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem(LS.horses, JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem(LS.logs, JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem(LS.paid, JSON.stringify(paidHistory)), [paidHistory]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map((h) => [h.id, h])), [horses]);

  // --- CRUD helpers ---
  const addOwner = () => {
    const name = ownerName.trim();
    if (!name) return;
    setOwners((p) => [...p, { id: uid(), name }]);
    setOwnerName("");
  };

  const addHorse = () => {
    const name = horseName.trim();
    if (!name || !horseOwnerId) return;
    const id = uid();
    setHorses((p) => [{ id, name, ownerId: horseOwnerId }, ...p]);
    setHorseName("");
    setHorseOwnerId("");
  };

  const removeOwner = (id) => {
    if (!confirm("Delete owner, their horses and jobs?")) return;
    const horseIds = horses.filter((h) => h.ownerId === id).map((h) => h.id);
    setOwners((p) => p.filter((o) => o.id !== id));
    setHorses((p) => p.filter((h) => h.ownerId !== id));
    setLogs((p) => p.filter((l) => !horseIds.includes(l.horseId)));
  };

  const removeHorse = (id) => {
    if (!confirm("Delete horse and jobs?")) return;
    setHorses((p) => p.filter((h) => h.id !== id));
    setLogs((p) => p.filter((l) => l.horseId !== id));
  };

  const clearAll = () => {
    if (!confirm("Clear all jobs, owners and horses?")) return;
    setOwners([]);
    setHorses([]);
    setLogs([]);
    setPaidHistory([]);
  };

  // --- Job logging ---
  const logJob = (horseId, job) => {
    if (!horseId) return alert("Select a horse first");
    const record = {
      id: uid(),
      horseId,
      jobKey: job.key,
      jobLabel: job.label,
      price: Number(job.price),
      ts: todayISO(),
    };
    setLogs((p) => [record, ...p]);
  };

  const markOwnerPaid = (ownerId) => {
    const horseIds = horses.filter((h) => h.ownerId === ownerId).map((h) => h.id);
    const toPay = logs.filter((l) => horseIds.includes(l.horseId));
    if (!toPay.length) return alert("No unpaid jobs for this owner.");
    setPaidHistory((p) => [{ id: uid(), ownerId, items: toPay, ts: todayISO() }, ...p]);
    setLogs((p) => p.filter((l) => !horseIds.includes(l.horseId)));
  };

  // --- Calendar helpers ---
  const thisYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(thisYear, i, 1));

  const jobsByDate = useMemo(() => {
    const map = {};
    for (const l of logs) {
      const d = l.ts.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(l);
    }
    return map;
  }, [logs]);

  const dailyTotal = (date) => {
    const list = jobsByDate[date] || [];
    return list.reduce((s, x) => s + Number(x.price || 0), 0);
  };

  // --- totals ---
  const totals = useMemo(() => reduceTotals(logs, owners, horses), [logs, owners, horses]);
  const totalEarned = paidHistory.reduce(
    (sum, ph) => sum + ph.items.reduce((s, x) => s + x.price, 0),
    0
  );

  // --- render ---
  return (
    <div className="p-4 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold text-sky-600 mb-3">Farm Mate</h1>
      <div className="hstack mb-2">
        <button className="btn" onClick={clearAll}>
          Clear All
        </button>
        <div className="muted small">Total earned: {GBP.format(totalEarned)}</div>
      </div>

      {/* Quick log */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Quick Log</h2>
        <div className="grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
          <select value={activeHorseId} onChange={(e) => setActiveHorseId(e.target.value)}>
            <option value="">Choose horse</option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} — {ownerMap[h.ownerId]?.name || "No owner"}
              </option>
            ))}
          </select>
          <button
            className="btn"
            onClick={() => {
              const hName = prompt("Horse name?");
              if (!hName) return;
              const oName = prompt("Owner name?");
              let o = owners.find((x) => x.name.toLowerCase() === oName.toLowerCase());
              if (!o) {
                o = { id: uid(), name: oName };
                setOwners((p) => [...p, o]);
              }
              const id = uid();
              setHorses((p) => [{ id, name: hName, ownerId: o.id }, ...p]);
              setActiveHorseId(id);
            }}
          >
            Add horse
          </button>
        </div>

        <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: "8px", marginTop: "8px" }}>
          {JOBS.map((j) => (
            <button
              key={j.key}
              className="btn"
              style={{ background: j.key === "shoot" ? "#f87171" : "#0ea5e9" }}
              onClick={() => logJob(activeHorseId, j)}
            >
              <div style={{ fontWeight: 600 }}>{j.label}</div>
              <div className="small">{j.price ? GBP.format(j.price) : "⚠️"}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-2 text-sky-600">Calendar ({thisYear})</h2>
        {months.map((m) => {
          const monthName = m.toLocaleString("default", { month: "long" });
          const days = new Date(thisYear, m.getMonth() + 1, 0).getDate();
          return (
            <div key={monthName} className="mb-3">
              <div className="font-semibold text-sky-700 mb-1">{monthName}</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "4px",
                  fontSize: "0.8rem",
                }}
              >
                {Array.from({ length: days }, (_, d) => {
                  const date = `${thisYear}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(
                    d + 1
                  ).padStart(2, "0")}`;
                  const tot = dailyTotal(date);
                  return (
                    <div
                      key={date}
                      title={GBP.format(tot)}
                      style={{
                        textAlign: "center",
                        borderRadius: "6px",
                        padding: "4px",
                        background: tot ? "#0ea5e9" : "#e2e8f0",
                        color: tot ? "#fff" : "#475569",
                      }}
                      onClick={() => setViewDate(date)}
                    >
                      {d + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage Owners/Horses */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Manage</h2>
        <div className="stack">
          <input
            placeholder="Owner name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <button className="btn" onClick={addOwner}>
            Add owner
          </button>
          {owners.map((o) => (
            <div key={o.id} className="rowline small">
              <div>{o.name}</div>
              <div className="hstack">
                <button className="btn sm" onClick={() => markOwnerPaid(o.id)}>
                  Mark paid
                </button>
                <button className="btn sm ghost" onClick={() => removeOwner(o.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          <hr />
          <input
            placeholder="Horse name"
            value={horseName}
            onChange={(e) => setHorseName(e.target.value)}
          />
          <select value={horseOwnerId} onChange={(e) => setHorseOwnerId(e.target.value)}>
            <option value="">Select owner</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button className="btn" onClick={addHorse}>
            Add horse
          </button>
          {horses.map((h) => (
            <div key={h.id} className="rowline small">
              <div>
                {h.name} <span className="muted">— {ownerMap[h.ownerId]?.name}</span>
              </div>
              <button className="btn sm ghost" onClick={() => removeHorse(h.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <footer>Data stored locally • Blue theme © Farm Mate</footer>
    </div>
  );
}

// --- Totals helper ---
function reduceTotals(logs, owners, horses) {
  const oMap = Object.fromEntries(owners.map((o) => [o.id, o]));
  const hMap = Object.fromEntries(horses.map((h) => [h.id, h]));
  const byOwner = new Map();
  for (const l of logs) {
    const h = hMap[l.horseId];
    const o = h ? oMap[h.ownerId] : null;
    if (!h || !o) continue;
    if (!byOwner.has(o.id)) byOwner.set(o.id, { owner: o, total: 0 });
    byOwner.get(o.id).total += Number(l.price || 0);
  }
  return byOwner;
}
