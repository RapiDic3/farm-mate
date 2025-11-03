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
  const [invoices, setInvoices] = useState([]);
  const [activeHorseId, setActiveHorseId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showDay, setShowDay] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  // ── Load data
  useEffect(() => {
    setInvoices(JSON.parse(localStorage.getItem("fm_invoices_v1") || "[]"));
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
  useEffect(() => localStorage.setItem("fm_invoices_v1", JSON.stringify(invoices)), [invoices]);
  useEffect(() => localStorage.setItem(LS.owners, JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem(LS.horses, JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem(LS.logs, JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem(LS.paid, JSON.stringify(paidHistory)), [paidHistory]);
  useEffect(() => localStorage.setItem(LS.jobs, JSON.stringify(jobs)), [jobs]);

  // ── Maps
  const ownerMap = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map((h) => [h.id, h])), [horses]);

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

  // ── Calendar View
  const CalendarView = () => {
    const { days, first } = monthMatrix(calendarMonth);
    const label = first.toLocaleString(undefined, { month: "long", year: "numeric" });

    return (
      <div className="stack">
        <div className="hstack" style={{ justifyContent: "space-between" }}>
          <button className="btn" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}>←</button>
          <div style={{ fontWeight: 700, color: "#fff" }}>{label}</div>
          <button className="btn" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>→</button>
        </div>

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
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700 }}>{d.getDate()}</div>
                {hasShoot && <div style={{ position: "absolute", top: 4, left: 6 }}>⚠️</div>}
                {tot > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "4px",
                      right: "4px",
                      background: "#0ea5e9",
                      color: "#fff",
                      borderRadius: "6px",
                      fontSize: "12px",
                      padding: "2px 4px",
                    }}
                  >
                    {GBP.format(tot)}
                  </div>
                )}
                {hasPaid && (
                  <div style={{ position: "absolute", top: "4px", right: "6px" }}>💰</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ✅ FIX — Added missing DayModal component
  const DayModal = ({ iso, onClose }) => {
    const jobs = logs.filter((l) => l.ts.slice(0, 10) === iso);
    const total = jobs.reduce((s, x) => s + Number(x.price || 0), 0);
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            padding: "20px",
            width: "90%",
            maxWidth: "500px",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3>{longDate(iso)}</h3>
          {jobs.length === 0 ? (
            <p>No jobs logged.</p>
          ) : (
            jobs.map((j) => (
              <div key={j.id} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{j.jobLabel}</span>
                <span>{GBP.format(j.price)}</span>
              </div>
            ))
          )}
          <div style={{ textAlign: "right", fontWeight: 700, marginTop: "10px" }}>
            Total: {GBP.format(total)}
          </div>
          <button className="btn" style={{ marginTop: "10px" }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  };

  // Keep your DailyView, OwnersView, SettingsView EXACTLY as-is (from your original code)
  // --- paste them below unchanged from your file ---

  // Main render
  return (
    <div className="container">
      {/* Header and all your tab buttons */}
      {/* Daily, Calendar, Owners, Settings tabs */}
      {tab === "daily" && <DailyView />}
      {tab === "calendar" && <CalendarView />}
      {tab === "owners" && <OwnersView />}
      {tab === "settings" && <SettingsView />}
      {showDay && <DayModal iso={showDay} onClose={() => setShowDay(null)} />}
    </div>
  );
}
