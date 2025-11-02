import React, { useState, useEffect, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const todayLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const LS = {
  owners: "fm_owners_v6",
  horses: "fm_horses_v6",
  logs: "fm_logs_v6",
  paid: "fm_paid_v6",
  jobs: "fm_jobs_v6",
};

export default function App() {
  const [tab, setTab] = useState("daily");
  const [owners, setOwners] = useState([]);
  const [horses, setHorses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [paidHistory, setPaidHistory] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeHorseId, setActiveHorseId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showDay, setShowDay] = useState(null);

  // Load data
  useEffect(() => {
    setOwners(JSON.parse(localStorage.getItem(LS.owners) || "[]"));
    setHorses(JSON.parse(localStorage.getItem(LS.horses) || "[]"));
    setLogs(JSON.parse(localStorage.getItem(LS.logs) || "[]"));
    setPaidHistory(JSON.parse(localStorage.getItem(LS.paid) || "[]"));
    const storedJobs = JSON.parse(localStorage.getItem(LS.jobs) || "[]");
    setJobs(
      storedJobs.length
        ? storedJobs
        : [
            { key: "turnout", label: "Turnout", price: 2 },
            { key: "bringin", label: "Bring In", price: 2 },
            { key: "muckout", label: "Muck Out", price: 5 },
            { key: "feed", label: "Feed", price: 2 },
            { key: "rug", label: "Rug Change", price: 1 },
            { key: "haywater", label: "Hay / Water", price: 2 },
            { key: "shoot", label: "Shoot ⚠️", price: 0 },
            { key: "other", label: "Other", price: 0 },
          ]
    );
  }, []);

  // Persist data
  useEffect(() => localStorage.setItem(LS.owners, JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem(LS.horses, JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem(LS.logs, JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem(LS.paid, JSON.stringify(paidHistory)), [paidHistory]);
  useEffect(() => localStorage.setItem(LS.jobs, JSON.stringify(jobs)), [jobs]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map((h) => [h.id, h])), [horses]);

  // ---- Log Job ----
  const logJob = (horseId, job, date = todayISO()) => {
    if (!horseId) return alert("Choose a horse first");
    let label = job.label,
      price = job.price;
    if (job.key === "other") {
      const desc = prompt("Description?");
      if (desc === null) return;
      const amtStr = prompt("Price (£)?");
      if (amtStr === null) return;
      const amt = parseFloat(amtStr) || 0;
      label = `Other — ${desc}`;
      price = amt;
    }
    const record = {
      id: uid(),
      horseId,
      jobKey: job.key,
      jobLabel: label,
      price: Number(price || 0),
      ts: date,
      paid: false,
    };
    setLogs((p) => [record, ...p]);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const removeLog = (id) => setLogs((p) => p.filter((l) => l.id !== id));
  const undoLast = () => setLogs((p) => p.slice(1));
  const clearToday = () => {
    if (!confirm("Clear only today’s jobs?")) return;
    const t = todayISO();
    setLogs((p) => p.filter((l) => l.ts.slice(0, 10) !== t));
  };

  const todayLogs = logs.filter((l) => l.ts.slice(0, 10) === todayISO());
  const todayTotal = todayLogs.reduce((s, x) => s + Number(x.price || 0), 0);

  // ---- Calendar helpers ----
  const toISO = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const startOfWeek = (d) => {
    const t = new Date(d);
    const w = (t.getDay() + 6) % 7;
    t.setDate(t.getDate() - w);
    return t;
  };
  const endOfWeek = (d) => {
    const t = new Date(d);
    const w = (t.getDay() + 6) % 7;
    t.setDate(t.getDate() + (6 - w));
    return t;
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
    return { days, first };
  };
  const jobsOnDate = (iso) => logs.filter((l) => l.ts.slice(0, 10) === iso);
  const dayTotal = (iso) => jobsOnDate(iso).reduce((s, x) => s + Number(x.price || 0), 0);
  const dayHasPaid = (iso) => jobsOnDate(iso).some((x) => x.paid);

  // ---- Calendar View ----
  const CalendarView = () => {
    const { days, first } = monthMatrix(calendarMonth);
    const label = first.toLocaleString(undefined, { month: "long", year: "numeric" });
    return (
      <div className="stack">
        <div className="hstack" style={{ justifyContent: "space-between" }}>
          <button className="btn" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}>
            ←
          </button>
          <div style={{ fontWeight: 700, color: "#0ea5e9" }}>{label}</div>
          <button className="btn" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
            →
          </button>
        </div>
        <div className="muted small" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
          {days.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === calendarMonth.getMonth();
            const tot = dayTotal(iso);
            const hasPaid = dayHasPaid(iso);
            return (
              <button
                key={iso}
                onClick={() => setShowDay(iso)}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "6px",
                  minHeight: "56px",
                  background: inMonth ? "#fff" : "#f1f5f9",
                  color: inMonth ? "#0f172a" : "#94a3b8",
                  textAlign: "left",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700 }}>{d.getDate()}</div>
                {tot > 0 && (
                  <div
                    className="badge"
                    style={{
                      position: "absolute",
                      right: "4px",
                      bottom: "4px",
                      background: "#0ea5e9",
                      color: "#fff",
                    }}
                  >
                    {GBP.format(tot)}
                  </div>
                )}
                {hasPaid && (
                  <div
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "6px",
                      fontSize: "14px",
                    }}
                  >
                    💰
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  // ---- Mark owner paid ----
  const markOwnerPaid = (ownerId) => {
    const horseIds = horses.filter((h) => h.ownerId === ownerId).map((h) => h.id);
    const toPay = logs.filter((l) => horseIds.includes(l.horseId) && !l.paid);
    if (!toPay.length) return alert("No unpaid jobs for this owner.");
    const updatedLogs = logs.map((l) =>
      toPay.find((x) => x.id === l.id)
        ? { ...l, paid: true, paidAt: new Date().toISOString() }
        : l
    );
    setLogs(updatedLogs);
    const total = toPay.reduce((s, x) => s + Number(x.price || 0), 0);
    setPaidHistory((p) => [
      { id: uid(), ownerId, ts: new Date().toISOString(), total, items: toPay },
      ...p,
    ]);
  };

  // ---- Owner / Horse Management ----
  const addOwner = () => {
    const name = prompt("Owner name?");
    if (!name) return;
    const farm = prompt("Farm name?");
    const o = { id: uid(), name: name.trim(), farm: farm?.trim() || "" };
    setOwners((p) => [...p, o]);
  };

  const editOwner = (id) => {
    const o = owners.find((x) => x.id === id);
    const newName = prompt("Owner name:", o.name);
    if (newName === null) return;
    const newFarm = prompt("Farm name:", o.farm);
    if (newFarm === null) return;
    setOwners((p) =>
      p.map((x) => (x.id === id ? { ...x, name: newName.trim(), farm: newFarm.trim() } : x))
    );
  };

  const removeOwner = (id) => {
    if (!confirm("Delete this owner, their horses and jobs?")) return;
    const horseIds = horses.filter((h) => h.ownerId === id).map((h) => h.id);
    setOwners((p) => p.filter((o) => o.id !== id));
    setHorses((p) => p.filter((h) => h.ownerId !== id));
    setLogs((p) => p.filter((l) => !horseIds.includes(l.horseId)));
  };

  const addHorse = (ownerId) => {
    const n = prompt("Horse name?");
    if (!n) return;
    const id = uid();
    setHorses((p) => [...p, { id, name: n.trim(), ownerId }]);
  };

  const removeHorse = (id) => {
    if (!confirm("Delete this horse and its jobs?")) return;
    setHorses((p) => p.filter((h) => h.id !== id));
    setLogs((p) => p.filter((l) => l.horseId !== id));
  };

  // ---- Jobs Tab ----
  const JobsTab = () => {
    const [label, setLabel] = useState("");
    const [price, setPrice] = useState("");
    const addJob = () => {
      if (!label.trim()) return;
      const p = parseFloat(price) || 0;
      setJobs((prev) => [...prev, { key: uid(), label: label.trim(), price: p }]);
      setLabel("");
      setPrice("");
    };
    const removeJob = (key) => setJobs((prev) => prev.filter((j) => j.key !== key));
    return (
      <div className="stack">
        <div className="card">
          <div className="header">Add Job Type</div>
          <div className="content hstack" style={{ flexWrap: "wrap" }}>
            <input className="input" placeholder="Job name" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input className="input" type="number" placeholder="£" value={price} onChange={(e) => setPrice(e.target.value)} style={{ maxWidth: "100px" }} />
            <button className="btn primary" onClick={addJob}>Add</button>
          </div>
        </div>
        <div className="card">
          <div className="header">Current Jobs</div>
          <div className="content stack">
            {jobs.map((j) => (
              <div key={j.key} className="rowline small">
                <div>{j.label}</div>
                <div className="hstack">
                  <div className="badge">{GBP.format(j.price || 0)}</div>
                  <button className="btn sm danger" onClick={() => removeJob(j.key)}>🗑</button>
                </div>
              </div>
            ))}
            {jobs.length === 0 && <div className="muted small">No jobs configured.</div>}
          </div>
        </div>
      </div>
    );
  };

  // ---- Settings Tab ----
  const downloadJSON = (obj, filename) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const backupAll = () =>
    downloadJSON({ owners, horses, logs, paidHistory, jobs }, `farmmate_backup_${new Date().toISOString().slice(0, 10)}.json`);

  const restoreAll = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setOwners(data.owners || []);
        setHorses(data.horses || []);
        setLogs(data.logs || []);
        setPaidHistory(data.paidHistory || []);
        setJobs(data.jobs || []);
        alert("Backup restored!");
      } catch {
        alert("Invalid file");
      }
    };
    reader.readAsText(file);
  };

  const exportPaidCSV = () => {
    const rows = [["Owner", "Farm", "Horse", "Job", "Price", "Paid At"]];
    for (const h of paidHistory) {
      const o = ownerMap[h.ownerId];
      for (const it of h.items) {
        const horse = horses.find((x) => x.id === it.horseId);
        rows.push([o?.name || "", o?.farm || "", horse?.name || "", it.jobLabel, it.price, h.ts]);
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paid_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearPaidHistory = () => {
    if (confirm("Clear all paid history?")) setPaidHistory([]);
  };

  const SettingsTab = () => (
    <div className="stack">
      <div className="card">
        <div className="header">📦 Backup & Restore</div>
        <div className="content hstack" style={{ flexWrap: "wrap" }}>
          <button className="btn primary" onClick={backupAll}>⬇️ Download Backup</button>
          <label className="btn" style={{ cursor: "pointer" }}>
            ⬆️ Restore Backup
            <input type="file" accept=".json" style={{ display: "none" }} onChange={restoreAll} />
          </label>
        </div>
      </div>
      <div className="card">
        <div className="header">💷 Paid History</div>
        <div className="content hstack" style={{ flexWrap: "wrap" }}>
          <button className="btn" onClick={exportPaidCSV}>📤 Export CSV</button>
          <button className="btn danger" onClick={clearPaidHistory}>🗑 Clear Paid History</button>
        </div>
      </div>
    </div>
  );

  // ---- Header ----
  const Header = () => (
    <header style={{ background: "linear-gradient(to right,#0284c7,#0ea5e9)", color: "#fff", padding: "10px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ fontWeight: 800, fontSize: "18px" }}>Farm Mate</div>
        <nav style={{ display: "flex", gap: "12px" }}>
          {["daily", "calendar", "owners", "jobs", "settings"].map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontWeight: 700,
                borderBottom: tab === k ? "2px solid #fff" : "2px solid transparent",
                padding: "4px 2px",
                cursor: "pointer",
              }}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );

  // ---- Owners Tab ----
  const OwnersTab = () => (
    <div className="stack">
      {owners.map((o) => {
        const ownerHorses = horses.filter((h) => h.ownerId === o.id);
        const total = logs
          .filter((l) => ownerHorses.map((h) => h.id).includes(l.horseId) && !l.paid)
          .reduce((s, x) => s + Number(x.price || 0), 0);
        return (
          <div key={o.id} className="card">
            <div className="header">{o.name} — {o.farm || "No farm"}</div>
            <div className="content stack small">
              <div className="hstack">
                <button className="btn sm" onClick={() => editOwner(o.id)}>✏️ Edit</button>
                <button className="btn sm" onClick={() => markOwnerPaid(o.id)}>💷 Mark Paid</button>
                <button className="btn sm danger" onClick={() => removeOwner(o.id)}>🗑 Delete</button>
              </div>
              <div><strong>Horses</strong></div>
              {ownerHorses.map((h) => (
                <div key={h.id} className="rowline small">
                  {h.name}
                  <button className="btn sm ghost" onClick={() => removeHorse(h.id)}>🗑</button>
                </div>
              ))}
              <button className="btn primary" onClick={() => addHorse(o.id)}>+ Add Horse</button>
              <div className="muted">Total owed: {GBP.format(total)}</div>
            </div>
          </div>
        );
      })}
      <button className="btn primary" onClick={addOwner}>+ Add Owner</button>
    </div>
  );

  // ---- Main Render ----
  return (
    <div style={{ background: "linear-gradient(to bottom,#0ea5e9,#f8fafc)", minHeight: "100vh" }}>
      <Header />
      <div className="container" style={{ paddingTop: "12px" }}>
        {tab === "daily" && <div className="muted">Daily view (from previous build)</div>}
        {tab === "calendar" && <CalendarView />}
        {tab === "owners" && <OwnersTab />}
        {tab === "jobs" && <JobsTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
      <footer style={{ textAlign: "center", padding: "12px", color: "#64748b" }}>Data stored locally on this device.</footer>
    </div>
  );
}
