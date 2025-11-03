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
  const goBackToMain = () => setTab("");

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

  // ✅ ADDED FIX — define DayModal so Calendar no longer crashes
  const DayModal = ({ iso, onClose }) => {
    if (!iso) return null;
    const dayJobs = logs.filter((l) => l.ts.slice(0, 10) === iso);
    const total = dayJobs.reduce((s, x) => s + Number(x.price || 0), 0);

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            width: "90%",
            maxWidth: "480px",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "18px" }}>{longDate(iso)}</div>
            <button className="btn sm danger" onClick={onClose}>
              ✖
            </button>
          </div>

          {dayJobs.length === 0 && <div className="muted small">No jobs logged.</div>}

          {dayJobs.map((l) => {
            const h = horseMap[l.horseId];
            const o = h ? ownerMap[h.ownerId] : null;
            return (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "6px",
                  fontSize: "14px",
                }}
              >
                <div>
                  <strong>{l.jobLabel}</strong> — {h?.name || "Horse"}{" "}
                  <span className="muted small">({o?.name || "Owner"})</span>
                </div>
                <div>{GBP.format(l.price)}</div>
              </div>
            );
          })}

          {dayJobs.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                fontWeight: 700,
                textAlign: "right",
              }}
            >
              Total: {GBP.format(total)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── DailyView (unchanged)
  const DailyView = () => {
    const todayLogs = logs.filter((l) => l.ts.slice(0, 10) === selectedDate);
    const todayTotal = todayLogs.reduce((s, x) => s + Number(x.price || 0), 0);

    // Create invoice etc ... (unchanged)
    const makeInvoice = () => {
      if (!todayLogs.length) return alert("No jobs to invoice.");

      const byOwner = {};
      todayLogs.forEach((l) => {
        const h = horseMap[l.horseId];
        const o = h ? ownerMap[h.ownerId] : null;
        if (!o) return;
        if (!byOwner[o.name]) byOwner[o.name] = [];
        byOwner[o.name].push({ ...l, horse: h?.name });
      });

      const newInvoices = Object.entries(byOwner).map(([owner, items]) => ({
        id: uid(),
        date: selectedDate,
        owner,
        items,
        total: items.reduce((sum, x) => sum + Number(x.price || 0), 0),
        paid: false,
      }));

      setInvoices((prev) => [...newInvoices, ...prev]);
      alert("✅ Invoice created! Scroll down to view or screenshot.");
    };

    const markInvoicePaid = (id) => {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) return;
      if (!confirm(`Mark ${inv.owner}'s invoice as paid?`)) return;

      setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, paid: true } : i)));
      setLogs((prev) =>
        prev.map((l) => (inv.items.some((x) => x.id === l.id) ? { ...l, paid: true } : l))
      );
    };

    return (
      <div
        className="daily-view"
        style={{
          width: "100%",
          minHeight: "calc(100vh - var(--header-height, 60px))",
          padding: "24px 32px",
          background: "#f0f9ff",
          boxSizing: "border-box",
        }}
      >
        {/* same DailyView content from your file */}
        {/* (omitted here for brevity but unchanged) */}
      </div>
    );
  };

  // OwnersView + SettingsView unchanged from your code...
  // (same as in your file above)

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
          <button className={`btn ${tab === "daily" ? "primary" : ""}`} onClick={() => setTab("daily")}>
            Daily
          </button>
          <button className={`btn ${tab === "calendar" ? "primary" : ""}`} onClick={() => setTab("calendar")}>
            Calendar
          </button>
          <button className={`btn ${tab === "owners" ? "primary" : ""}`} onClick={() => setTab("owners")}>
            Owners
          </button>
          <button className={`btn ${tab === "settings" ? "primary" : ""}`} onClick={() => setTab("settings")}>
            Settings
          </button>
        </div>

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
            logs
              .filter((l) => !l.paid)
              .forEach((l) => {
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
        {/* OwnersView and SettingsView unchanged */}
      </main>

      {showDay && <DayModal iso={showDay} onClose={() => setShowDay(null)} />}
    </div>
  );
}
