import React, { useState, useEffect, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const longDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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
  const [selectedJobs, setSelectedJobs] = useState([]); // ✅ NEW

  // ── Load from localStorage
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

  // ── Persist to localStorage
  useEffect(() => localStorage.setItem(LS.owners, JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem(LS.horses, JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem(LS.logs, JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem(LS.paid, JSON.stringify(paidHistory)), [paidHistory]);
  useEffect(() => localStorage.setItem(LS.jobs, JSON.stringify(jobs)), [jobs]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map((h) => [h.id, h])), [horses]);

  const goBackToMain = () => setTab("daily"); // ✅ BACK BUTTON HANDLER

  // ── Helpers
  const toISO = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
  const addDays = (iso, n) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  };

  // ── Logging jobs
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

  // ── Day + Calendar data
  const todayLogs = logs.filter((l) => l.ts.slice(0, 10) === selectedDate);
  const todayTotal = todayLogs.reduce((s, x) => s + Number(x.price || 0), 0);
  const jobsOnDate = (iso) => logs.filter((l) => l.ts.slice(0, 10) === iso);
  const dayTotal = (iso) => jobsOnDate(iso).reduce((s, x) => s + Number(x.price || 0), 0);
  const dayHasPaid = (iso) => jobsOnDate(iso).some((x) => x.paid);

  // ── Calendar generation helpers
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

  // ── Calendar View (with ⚠️ shoot marker + back button)
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

        {/* ✅ Back button */}
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
          {days.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === calendarMonth.getMonth();
            const tot = dayTotal(iso);
            const hasPaid = dayHasPaid(iso);
            const hasShoot = jobsOnDate(iso).some((l) => l.jobKey === "shoot"); // ✅ shoot marker

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

  // ── Daily view (multi-job select)
  const toggleJobSelect = (key) => {
    setSelectedJobs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const logSelectedJobs = () => {
    if (!activeHorseId) return alert("Choose a horse first");
    if (selectedJobs.length === 0) return alert("Select at least one job");
    selectedJobs.forEach((k) => {
      const job = jobs.find((j) => j.key === k);
      if (job) logJob(activeHorseId, job, selectedDate);
    });
    setSelectedJobs([]);
  };
  // ── Daily view with date navigation + multi-job select buttons
  const DailyView = () => (
    <div className="row">
      <section className="card">
        <div className="header hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>Jobs — {longDate(selectedDate)}</div>
          <div className="hstack">
            <button className="btn sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
              ⏪
            </button>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <button className="btn sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              ⏩
            </button>
          </div>
        </div>

        <div className="content stack">
          <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: "8px", alignItems: "end" }}>
            <div>
              <label className="label">Horse</label>
              <select value={activeHorseId} onChange={(e) => setActiveHorseId(e.target.value)}>
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
                onClick={() => toggleJobSelect(j.key)}
                style={{
                  background: selectedJobs.includes(j.key)
                    ? "#0ea5e9"
                    : "#fff",
                  color: selectedJobs.includes(j.key)
                    ? "#fff"
                    : "#000",
                }}
              >
                <div style={{ display: "grid", placeItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>{j.label}</div>
                  <div className="small muted">{GBP.format(j.price)}</div>
                </div>
              </button>
            ))}
          </div>

          {selectedJobs.length > 0 && (
            <button className="btn primary" onClick={logSelectedJobs}>
              ✅ Log Selected ({selectedJobs.length})
            </button>
          )}

          <div className="hstack">
            <button className="btn" onClick={undoLast}>Undo Last</button>
            <button className="btn danger" onClick={clearDay}>Clear Day</button>
          </div>

          <div className="stack">
            <div className="small" style={{ fontWeight: 700 }}>Recent</div>
            {todayLogs.length === 0 && <div className="muted small">No jobs logged yet.</div>}
            {todayLogs.map((l) => {
              const h = horseMap[l.horseId];
              const o = h ? ownerMap[h.ownerId] : null;
              return (
                <div key={l.id} className="rowline small" style={{ opacity: l.paid ? 0.6 : 1 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {l.jobLabel} — {h?.name || "Horse"} {l.paid && "✅"}
                    </div>
                    <div className="muted">{o?.name || "Owner"} • {fmtDate(l.ts)}</div>
                  </div>
                  <div className="hstack">
                    <div className="badge">{GBP.format(l.price)}</div>
                    <button className="btn sm ghost" onClick={() => removeLog(l.id)}>🗑</button>
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

  /* All other tabs (Owners, Jobs, Settings, etc.) remain identical to your original code */
  /* Keep your existing OwnersTab, JobsTab, SettingsTab, DayModal, Header, etc. */

  // ── Header ──
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

  // ── Main render ──
  return (
    <div style={{ background: "linear-gradient(to bottom,#0ea5e9,#f8fafc)", minHeight: "100vh" }}>
      <Header />
      <div className="container" style={{ paddingTop: "12px" }}>
        {tab === "daily" && (
          <div className="row">
            <DailyView />
            <section className="stack">
              {/* keep your OwnersDueCard + PaidHistoryCard */}
            </section>
          </div>
        )}
        {tab === "calendar" && <CalendarView />}
        {/* keep your other tabs */}
      </div>
      <footer style={{ textAlign: "center", padding: "12px", color: "#64748b" }}>
        Data stored locally on this device.
      </footer>
    </div>
  );
}
