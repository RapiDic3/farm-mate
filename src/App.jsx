import React, { useState, useEffect, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const longDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const LS = {
  owners: "fm_owners_v9",
  horses: "fm_horses_v9",
  logs: "fm_logs_v9",
  paid: "fm_paid_v9",
  jobs: "fm_jobs_v9",
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
  const [selectedDate, setSelectedDate] = useState(todayISO());

  // ── Load data
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

  // ── Save data
  useEffect(() => localStorage.setItem(LS.owners, JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem(LS.horses, JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem(LS.logs, JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem(LS.paid, JSON.stringify(paidHistory)), [paidHistory]);
  useEffect(() => localStorage.setItem(LS.jobs, JSON.stringify(jobs)), [jobs]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map((h) => [h.id, h])), [horses]);
  const goBackToMain = () => setTab("daily"); // ✅ Back button handler

  const toISO = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
  const addDays = (iso, n) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  };

  const logJob = (horseId, job, date = selectedDate) => {
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
    setLogs((prev) => [record, ...prev]);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const removeLog = (id) => setLogs((prev) => prev.filter((l) => l.id !== id));
  const undoLast = () => setLogs((prev) => prev.slice(1));
  const clearDay = () => {
    if (!confirm(`Clear all jobs for ${longDate(selectedDate)}?`)) return;
    setLogs((prev) => prev.filter((l) => l.ts.slice(0, 10) !== selectedDate));
  };

  // ── Calendar helpers
  const jobsOnDate = (iso) => logs.filter((l) => l.ts.slice(0, 10) === iso);
  const dayTotal = (iso) => jobsOnDate(iso).reduce((s, x) => s + Number(x.price || 0), 0);
  const dayHasPaid = (iso) => jobsOnDate(iso).some((x) => x.paid);

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

  // ── CalendarView (⚠️ + Back)
  const CalendarView = () => {
    const { days, first } = monthMatrix(calendarMonth);
    const label = first.toLocaleString(undefined, { month: "long", year: "numeric" });
    return (
      <div className="stack">
        <div className="stack">
          <div className="hstack" style={{ justifyContent: "space-between" }}>
            <button className="btn" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}>
              ←
            </button>
            <div style={{ fontWeight: 700, color: "#fff" }}>{label}</div>
            <button className="btn" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
              →
            </button>
          </div>
        </div>

        {/* ✅ Back to main */}
        <button className="btn" onClick={goBackToMain} style={{ margin: "8px 0" }}>
          ⬅️ Back to Main
        </button>

        <div
          className="muted small"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            textAlign: "center",
          }}
        >
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: "4px",
          }}
        >
          {days.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === calendarMonth.getMonth();
            const tot = dayTotal(iso);
            const hasPaid = dayHasPaid(iso);
            const hasShoot = jobsOnDate(iso).some((x) => x.jobKey === "shoot"); // ✅ shoot flag

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
                {hasShoot && (
                  <div
                    style={{
                      position: "absolute",
                      left: "6px",
                      top: "4px",
                      color: "#f87171",
                      fontWeight: 900,
                    }}
                    title="Shoot day"
                  >
                    ⚠️
                  </div>
                )}
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
                  <div style={{ position: "absolute", top: "4px", right: "6px", fontSize: "14px" }}>
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
// ── DayModal (multi-job + date-range + completed)
const DayModal = ({ iso, onClose }) => {
  const [selectedHorseId, setSelectedHorseId] = useState("");
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [start, setStart] = useState(iso);
  const [end, setEnd] = useState(iso);
  const list = logs.filter((l) => l.ts.slice(0, 10) === iso);
  const tot = list.reduce((s, x) => s + Number(x.price || 0), 0);

  const toggleJob = (jobKey) =>
    setSelectedJobs((prev) =>
      prev.includes(jobKey)
        ? prev.filter((k) => k !== jobKey)
        : [...prev, jobKey]
    );

  const markCompleted = (id) => {
    setLogs((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, completed: !l.completed } : l
      )
    );
  };

  const addJobsAcrossRange = () => {
    if (!selectedHorseId) return alert("Choose a horse first");
    if (selectedJobs.length === 0) return alert("Select at least one job");
    const s = new Date(start);
    const e = new Date(end);
    if (e < s) return alert("End date must be after or same as start date.");

    const days = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    setLogs((prev) => {
      const out = [...prev];
      for (const d of days) {
        const isoDay = toISO(d);
        for (const jobKey of selectedJobs) {
          const job = jobs.find((j) => j.key === jobKey);
          if (!job) continue;
          const dup = out.some(
            (l) =>
              l.horseId === selectedHorseId &&
              l.jobKey === job.key &&
              l.ts.slice(0, 10) === isoDay
          );
          if (!dup) {
            out.unshift({
              id: uid(),
              horseId: selectedHorseId,
              jobKey: job.key,
              jobLabel: job.label,
              price: Number(job.price || 0),
              ts: isoDay,
              paid: false,
              completed: false, // ✅ new flag
            });
          }
        }
      }
      return out;
    });

    alert("✅ Jobs added across selected dates!");
    setSelectedJobs([]);
    setSelectedHorseId("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "grid",
        placeItems: "center",
        padding: "16px",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "min(720px,100%)",
          padding: "16px",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <div
          className="hstack"
          style={{ justifyContent: "space-between", marginBottom: "8px" }}
        >
          <div style={{ fontWeight: 800 }}>Jobs on {fmtDate(iso)}</div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Existing jobs */}
        {list.length === 0 && <div className="muted small">No jobs on this day.</div>}
        {list.map((l) => {
          const h = horseMap[l.horseId];
          const o = h ? ownerMap[h.ownerId] : null;
          return (
            <div
              key={l.id}
              className="rowline small"
              style={{
                opacity: l.paid ? 0.6 : l.completed ? 0.75 : 1,
              }}
            >
              <div>
                <strong>{l.jobLabel}</strong> — {h?.name || "Horse"}{" "}
                <span className="muted">
                  ({o?.name || "Owner"}){" "}
                  {l.completed && "✅ Completed"} {l.paid && "💰 Paid"}
                </span>
              </div>
<div
  className="hstack"
  style={{
    gap: "6px",
    flexWrap: "wrap",
    justifyContent: "flex-end",   // ✅ space for all buttons
    alignItems: "center",
  }}
>
  <div className="badge">{GBP.format(l.price)}</div>
  <button
    className="btn sm"
    onClick={() => markCompleted(l.id)}
    style={{
      background: l.completed ? "#10b981" : "#e2e8f0",
      color: l.completed ? "#fff" : "#000",
    }}
  >
    {l.completed ? "Undo" : "Complete"}
  </button>
  <button className="btn sm danger" onClick={() => removeLog(l.id)}>
    🗑
  </button>
</div>

        {/* Multi-job + range add */}
        <div
          className="stack"
          style={{
            marginTop: "16px",
            paddingTop: "8px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontWeight: 800 }}>Add jobs across date range</div>

          <div
            className="grid"
            style={{ gridTemplateColumns: "1fr 1fr", gap: "8px" }}
          >
            <div>
              <label className="label">Start</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="label">End</label>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <label className="label">Horse</label>
          <select
            value={selectedHorseId}
            onChange={(e) => setSelectedHorseId(e.target.value)}
          >
            <option value="">Choose horse</option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} — {ownerMap[h.ownerId]?.name}
              </option>
            ))}
          </select>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
              gap: "8px",
            }}
          >
            {jobs.map((j) => (
              <button
                key={j.key}
                className="btn"
                onClick={() => toggleJob(j.key)}
                style={{
                  background: selectedJobs.includes(j.key) ? "#0ea5e9" : "#fff",
                  color: selectedJobs.includes(j.key) ? "#fff" : "#000",
                  border:
                    j.key === "shoot" ? "2px solid #f87171" : "1px solid #e2e8f0",
                }}
              >
                {j.label}
                {j.price ? ` • ${GBP.format(j.price)}` : ""}
              </button>
            ))}
          </div>

          {selectedJobs.length > 0 && (
            <button className="btn primary" onClick={addJobsAcrossRange}>
              ✅ Add {selectedJobs.length} Job
              {selectedJobs.length > 1 ? "s" : ""} for {fmtDate(start)} → {fmtDate(end)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

  const DailyView = () => {
    const todayLogs = logs.filter((l) => l.ts.slice(0, 10) === selectedDate);
    const todayTotal = todayLogs.reduce((s, x) => s + Number(x.price || 0), 0);

    return (
      <div className="row">
        <section className="card">
          <div
            className="header hstack"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <div>Jobs — {longDate(selectedDate)}</div>
            <div className="hstack">
              <button
                className="btn sm"
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              >
                ⏪
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button
                className="btn sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                ⏩
              </button>
            </div>
          </div>
          <div className="content stack">
            <div
              className="grid"
              style={{ gridTemplateColumns: "2fr 1fr", gap: "8px", alignItems: "end" }}
            >
              <div>
                <label className="label">Horse</label>
                <select
                  value={activeHorseId}
                  onChange={(e) => setActiveHorseId(e.target.value)}
                >
                  <option value="">Choose a horse</option>
                  {horses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} — {ownerMap[h.ownerId]?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid cols-3 jobs-grid">
              {jobs.map((j) => (
                <button
                  key={j.key}
                  className="btn"
                  onClick={() => logJob(activeHorseId, j, selectedDate)}
                >
                  <div style={{ display: "grid", placeItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>{j.label}</div>
                    <div className="small muted">{GBP.format(j.price)}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="hstack">
              <button className="btn" onClick={undoLast}>
                Undo Last
              </button>
              <button className="btn danger" onClick={clearDay}>
                Clear Day
              </button>
            </div>
            <div className="stack">
              <div className="small" style={{ fontWeight: 700 }}>
                Recent
              </div>
              {todayLogs.length === 0 && (
                <div className="muted small">No jobs logged yet.</div>
              )}
              {todayLogs.map((l) => {
                const h = horseMap[l.horseId];
                const o = h ? ownerMap[h.ownerId] : null;
                return (
                  <div
                    key={l.id}
                    className="rowline small"
                    style={{ opacity: l.paid ? 0.6 : 1 }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {l.jobLabel} — {h?.name || "Horse"} {l.paid && "✅"}
                      </div>
                      <div className="muted">
                        {o?.name || "Owner"} • {fmtDate(l.ts)}
                      </div>
                    </div>
                    <div className="hstack">
                      <div className="badge">{GBP.format(l.price)}</div>
                      <button
                        className="btn sm ghost"
                        onClick={() => removeLog(l.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
              {todayLogs.length > 0 && (
                <div style={{ fontWeight: 700, marginTop: "8px" }}>
                  Total {GBP.format(todayTotal)}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  };
  // ── Mark owner paid (unchanged)
  const markOwnerPaid = (ownerId) => {
    const owner = owners.find((o) => o.id === ownerId);
    if (!owner) return;
    const ok = confirm(
      `Mark all UNPAID jobs for ${owner.name} as PAID?\n(They will stay visible with a ✅.)`
    );
    if (!ok) return;
    const horseIds = horses.filter((h) => h.ownerId === ownerId).map((h) => h.id);
    const toPay = logs.filter((l) => horseIds.includes(l.horseId) && !l.paid);
    if (!toPay.length) return alert("No unpaid jobs for this owner.");
    const updated = logs.map((l) =>
      toPay.some((x) => x.id === l.id)
        ? { ...l, paid: true, paidAt: new Date().toISOString() }
        : l
    );
    setLogs(updated);
    const total = toPay.reduce((s, x) => s + Number(x.price || 0), 0);
    setPaidHistory((p) => [
      { id: uid(), ownerId, ts: new Date().toISOString(), total, items: toPay },
      ...p,
    ]);
  };

  // ── Owners / Horses management
  const addOwner = () => {
    const name = prompt("Owner name?");
    if (!name) return;
    setOwners((p) => [...p, { id: uid(), name: name.trim() }]);
  };
  const editOwner = (id) => {
    const o = owners.find((x) => x.id === id);
    if (!o) return;
    const newName = prompt("Owner name:", o.name);
    if (newName === null) return;
    setOwners((p) =>
      p.map((x) => (x.id === id ? { ...x, name: newName.trim() } : x))
    );
  };
  const removeOwner = (id) => {
    if (!confirm("Delete this owner, their horses and related jobs?")) return;
    const horseIds = horses.filter((h) => h.ownerId === id).map((h) => h.id);
    setOwners((p) => p.filter((o) => o.id !== id));
    setHorses((p) => p.filter((h) => h.ownerId !== id));
    setLogs((p) => p.filter((l) => !horseIds.includes(l.horseId)));
  };
  const addHorse = (ownerId) => {
    const n = prompt("Horse name?");
    if (!n) return;
    setHorses((p) => [...p, { id: uid(), name: n.trim(), ownerId }]);
  };
  const removeHorse = (horseId) => {
    if (!confirm("Delete this horse and its jobs?")) return;
    setHorses((p) => p.filter((h) => h.id !== horseId));
    setLogs((p) => p.filter((l) => l.horseId !== horseId));
  };

  // ── Jobs Tab
  const JobsTab = () => {
    const [label, setLabel] = useState("");
    const [price, setPrice] = useState("");
    const addJobType = () => {
      if (!label.trim()) return;
      const p = parseFloat(price) || 0;
      setJobs((prev) => [...prev, { key: uid(), label: label.trim(), price: p }]);
      setLabel("");
      setPrice("");
    };
    const removeJobType = (key) =>
      setJobs((prev) => prev.filter((j) => j.key !== key));
    return (
      <div className="stack">
        <div className="card">
          <div className="header">Add Job Type</div>
          <div className="content hstack" style={{ flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Job name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="£"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{ maxWidth: "100px" }}
            />
            <button className="btn primary" onClick={addJobType}>
              Add
            </button>
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
                  <button
                    className="btn sm danger"
                    onClick={() => removeJobType(j.key)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="muted small">No jobs configured.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Settings Tab
  const downloadJSON = (obj, filename) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const backupAll = () =>
    downloadJSON(
      { owners, horses, logs, paidHistory, jobs },
      `farmmate_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
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
    const rows = [["Owner", "Horse", "Job", "Price", "Job Date", "Paid At"]];
    for (const ph of paidHistory) {
      const o = ownerMap[ph.ownerId];
      for (const it of ph.items) {
        const horse = horses.find((x) => x.id === it.horseId);
        rows.push([
          o?.name || "",
          horse?.name || "",
          it.jobLabel,
          it.price,
          it.ts,
          ph.ts,
        ]);
      }
    }
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paid_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const clearPaidHistory = () => {
    if (confirm("Clear ALL payment history?")) setPaidHistory([]);
  };

  const SettingsTab = () => (
    <div className="stack">
      <div className="card">
        <div className="header">📦 Backup & Restore</div>
        <div className="content hstack" style={{ flexWrap: "wrap" }}>
          <button className="btn primary" onClick={backupAll}>
            ⬇️ Download Backup
          </button>
          <label className="btn" style={{ cursor: "pointer" }}>
            ⬆️ Restore Backup
            <input
              type="file"
              accept=".json"
              onChange={restoreAll}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>
      <div className="card">
        <div className="header">💷 Paid History</div>
        <div className="content hstack" style={{ flexWrap: "wrap" }}>
          <button className="btn" onClick={exportPaidCSV}>
            📤 Export CSV
          </button>
          <button className="btn danger" onClick={clearPaidHistory}>
            🗑 Clear Payment History
          </button>
        </div>
      </div>
    </div>
  );

  // ── Owners Tab
  const OwnersTab = () => (
    <div className="stack">
      {owners.map((o) => {
        const ownerHorses = horses.filter((h) => h.ownerId === o.id);
        const due = logs
          .filter(
            (l) => ownerHorses.some((h) => h.id === l.horseId) && !l.paid
          )
          .reduce((s, x) => s + Number(x.price || 0), 0);
        return (
          <div key={o.id} className="card">
            <div className="header">{o.name}</div>
            <div className="content stack">
              <div className="hstack">
                <button className="btn sm" onClick={() => editOwner(o.id)}>
                  ✏️ Edit
                </button>
                <button className="btn sm" onClick={() => markOwnerPaid(o.id)}>
                  💷 Mark Paid
                </button>
                <button className="btn sm danger" onClick={() => removeOwner(o.id)}>
                  🗑 Delete
                </button>
              </div>
              <div>
                <strong>Horses</strong>
              </div>
              {ownerHorses.length === 0 && (
                <div className="muted small">No horses yet.</div>
              )}
              {ownerHorses.map((h) => (
                <div key={h.id} className="rowline small">
                  {h.name}
                  <button
                    className="btn sm ghost"
                    onClick={() => removeHorse(h.id)}
                  >
                    🗑
                  </button>
                </div>
              ))}
              <button className="btn primary" onClick={() => addHorse(o.id)}>
                + Add Horse
              </button>
              <div className="muted">Total owed: {GBP.format(due)}</div>
            </div>
          </div>
        );
      })}
      <button className="btn primary" onClick={addOwner}>
        + Add Owner
      </button>
    </div>
  );

  // ── Right-side cards for Daily tab
  const OwnersDueCard = () => (
    <div className="card">
      <div className="header">Owners — Amount Due</div>
      <div className="content stack">
        {owners.length === 0 && <div className="muted small">No owners yet.</div>}
        {owners.map((o) => {
          const ownerHorses = horses.filter((h) => h.ownerId === o.id).map((h) => h.id);
          const due = logs
            .filter((l) => ownerHorses.includes(l.horseId) && !l.paid)
            .reduce((s, x) => s + Number(x.price || 0), 0);
          return (
            <div key={o.id} className="rowline small">
              <div style={{ fontWeight: 600 }}>{o.name}</div>
              <div className="hstack">
                <div className="badge">{GBP.format(due)}</div>
                <button className="btn sm" onClick={() => markOwnerPaid(o.id)}>
                  Mark paid
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const PaidHistoryCard = () =>
    paidHistory.length === 0 ? null : (
      <div className="card">
        <div className="header">Paid History</div>
        <div className="content stack">
          {paidHistory.map((rec) => {
            const o = ownerMap[rec.ownerId];
            return (
              <div
                key={rec.id}
                className="stack small"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "8px",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {o?.name || "Owner"} — {GBP.format(rec.total)} — Paid on{" "}
                  {fmtDate(rec.ts)}
                </div>
                {rec.items.map((it) => {
                  const h = horses.find((x) => x.id === it.horseId);
                  return (
                    <div key={it.id}>
                      • {h?.name || "Horse"} — {it.jobLabel} — {GBP.format(it.price)} — (
                      {fmtDate(it.ts)})
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );

  // ── Header
  const Header = () => (
    <header
      style={{
        background: "linear-gradient(to right,#0284c7,#0ea5e9)",
        color: "#fff",
        padding: "10px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
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
                borderBottom:
                  tab === k ? "2px solid #fff" : "2px solid transparent",
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

  // ── Main render
  return (
    <div
      style={{
        background: "linear-gradient(to bottom,#0ea5e9,#f8fafc)",
        minHeight: "100vh",
      }}
    >
      <Header />
      <div className="container" style={{ paddingTop: "12px" }}>
        {tab === "daily" && (
          <div className="row">
            <DailyView />
            <section className="stack">
              <OwnersDueCard />
              <PaidHistoryCard />
            </section>
          </div>
        )}
        {tab === "calendar" && <CalendarView />}
        {tab === "owners" && <OwnersTab />}
        {tab === "jobs" && <JobsTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
      <footer
        style={{ textAlign: "center", padding: "12px", color: "#64748b" }}
      >
        Data stored locally on this device.
      </footer>

      {showDay && <DayModal iso={showDay} onClose={() => setShowDay(null)} />}
    </div>
  );
}
