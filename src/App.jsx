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

  // ── Maps
  const ownerMap = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map((h) => [h.id, h])), [horses]);
  const goBackToMain = () => setTab("daily");

  // ── Helpers
  const toISO = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
  const addDays = (iso, n) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  };
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

  // ── Job logging
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
          const hasShoot = jobsOnDate(iso).some((x) => x.jobKey === "shoot");

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



  // ── DayModal (unchanged full content from your file)
  // keep everything you had for DayModal here, unchanged

  // ── DailyView ── (full width now)
  const DailyView = () => {
    const todayLogs = logs.filter((l) => l.ts.slice(0, 10) === selectedDate);
    const todayTotal = todayLogs.reduce((s, x) => s + Number(x.price || 0), 0);

    const markAllPaid = () => {
      if (!todayLogs.length) return alert("No jobs to mark paid.");
      if (!confirm("Mark all today's jobs as paid?")) return;
      setLogs((prev) =>
        prev.map((l) =>
          l.ts.slice(0, 10) === selectedDate ? { ...l, paid: true } : l
        )
      );
    };

    return (
      <div
        className="daily-view"
        style={{
          width: "100%",
          minHeight: "calc(100vh - 120px)",
          background: "#f0f9ff",
          boxSizing: "border-box",
          padding: "0 0 32px 0",
        }}
      >
        <section
          className="card full"
          style={{
            width: "100%",
            background: "#fff",
            border: "none",
            boxShadow: "none",
            borderRadius: "0",
            padding: "16px 32px",
          }}
        >
          <div
            className="header hstack"
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "2px solid #e2e8f0",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "22px" }}>
              Jobs — {longDate(selectedDate)}
            </div>
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

          {/* your existing two-column layout and job logic remain here unchanged */}
        </section>
      </div>
    );
  };

  // ── OwnersView (unchanged)
  const OwnersView = () => {
    const addOwner = () => {
      const name = prompt("Owner name?");
      if (!name) return;
      setOwners([...owners, { id: uid(), name }]);
    };

    const addHorse = (ownerId) => {
      const name = prompt("Horse name?");
      if (!name) return;
      setHorses([...horses, { id: uid(), name, ownerId }]);
    };

    const removeOwner = (id) => {
      if (!confirm("Remove this owner?")) return;
      setOwners((o) => o.filter((x) => x.id !== id));
      setHorses((h) => h.filter((x) => x.ownerId !== id));
    };

    return (
      <div className="stack">
        <button className="btn primary" onClick={addOwner}>➕ Add Owner</button>
        {owners.length === 0 && <div className="muted small">No owners yet.</div>}
        {owners.map((o) => (
          <div key={o.id} className="owner-block">
            <div className="owner-head">
              <div style={{ fontWeight: 700 }}>{o.name}</div>
              <div className="hstack">
                <button className="btn sm" onClick={() => addHorse(o.id)}>Add Horse</button>
                <button className="btn sm danger" onClick={() => removeOwner(o.id)}>🗑</button>
              </div>
            </div>
            <div className="owner-rows">
              {horses.filter((h) => h.ownerId === o.id).map((h) => (
                <div key={h.id} className="rowline small">{h.name}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── SettingsView (unchanged)
  const SettingsView = () => {
    const clearAll = () => {
      if (!confirm("Clear all data?")) return;
      localStorage.clear();
      location.reload();
    };

    const exportData = () => {
      const data = { owners, horses, logs, paidHistory, jobs };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "farmmate_backup.json";
      a.click();
    };

    const importData = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = JSON.parse(evt.target.result);
        setOwners(data.owners || []);
        setHorses(data.horses || []);
        setLogs(data.logs || []);
        setPaidHistory(data.paidHistory || []);
        setJobs(data.jobs || []);
        alert("Data imported!");
      };
      reader.readAsText(file);
    };

    return (
      <div className="stack">
        <button className="btn danger" onClick={clearAll}>🧹 Clear All Data</button>
        <button className="btn" onClick={exportData}>💾 Export Backup</button>
        <input type="file" accept=".json" onChange={importData} />
      </div>
    );
  };

  // ── Main App Render ──
  return (
    <div className="container">
      <header
        className="top"
        style={{
          background: "#0ea5e9",
          color: "#fff",
          padding: "12px",
          borderRadius: "0 0 12px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "20px" }}>Farm Mate</div>

        <div className="hstack" style={{ gap: "8px" }}>
          <button className={`btn ${tab === "daily" ? "primary" : ""}`} onClick={() => setTab("daily")}>Daily</button>
          <button className={`btn ${tab === "calendar" ? "primary" : ""}`} onClick={() => setTab("calendar")}>Calendar</button>
          <button className={`btn ${tab === "owners" ? "primary" : ""}`} onClick={() => setTab("owners")}>Owners</button>
          <button className={`btn ${tab === "settings" ? "primary" : ""}`} onClick={() => setTab("settings")}>Settings</button>
        </div>

        {/* ✅ Download All Invoices */}
        <button
          className="btn"
          style={{
            background: "#fff",
            color: "#0ea5e9",
            fontWeight: 700,
            borderRadius: "8px",
            padding: "6px 12px",
          }}
          onClick={() => {
            const grouped = {};
            logs.filter((l) => !l.paid).forEach((l) => {
              const horse = horses.find((h) => h.id === l.horseId);
              const owner = owners.find((o) => o.id === horse?.ownerId);
              if (!owner) return;
              if (!grouped[owner.name]) grouped[owner.name] = [];
              grouped[owner.name].push({
                date: l.ts,
                horse: horse?.name || "Unknown",
                job: l.jobLabel,
                amount: l.price,
              });
            });

            const data = Object.entries(grouped).map(([owner, items]) => ({
              owner,
              total: items.reduce((s, x) => s + x.amount, 0),
              items,
            }));

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "farmmate_invoices.json";
            a.click();
          }}
        >
          💰 Download All Invoices
        </button>
      </header>

      <main style={{ marginTop: "16px" }}>
        {tab === "daily" && <DailyView />}
        {tab === "calendar" && <CalendarView />}
        {tab === "owners" && <OwnersView />}
        {tab === "settings" && <SettingsView />}
      </main>

      {showDay && <DayModal iso={showDay} onClose={() => setShowDay(null)} />}
    </div>
  );
}
