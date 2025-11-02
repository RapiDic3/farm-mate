import React, { useEffect, useState, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const uid = () => Math.random().toString(36).slice(2, 10);
const toISO = (d = new Date()) => d.toISOString().slice(0, 10);
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function App() {
  const [tab, setTab] = useState("daily");
  const [owners, setOwners] = useState([]);
  const [horses, setHorses] = useState([]);
  const [jobs, setJobs] = useState([
    { key: "turnout", label: "Turnout", price: 3 },
    { key: "bringin", label: "Bring In", price: 2 },
    { key: "muckout", label: "Muck Out", price: 5 },
    { key: "feed", label: "Feed", price: 2 },
    { key: "rug", label: "Rug Change", price: 1 },
    { key: "haywater", label: "Hay / Water", price: 2 },
    { key: "shoot", label: "Shoot ⚠️", price: 0 },
    { key: "other", label: "Other", price: 0 },
  ]);
  const [logs, setLogs] = useState([]);
  const [paidHistory, setPaidHistory] = useState([]);
  const [activeHorseId, setActiveHorseId] = useState("");
  const [showDay, setShowDay] = useState(null);
  const [currentDate, setCurrentDate] = useState(toISO());

  // ── Load + Persist ──
  useEffect(() => {
    const ls = (k) => JSON.parse(localStorage.getItem(k) || "[]");
    setOwners(ls("fm_owners"));
    setHorses(ls("fm_horses"));
    setLogs(ls("fm_logs"));
    setPaidHistory(ls("fm_paid"));
  }, []);

  useEffect(() => localStorage.setItem("fm_owners", JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem("fm_horses", JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem("fm_logs", JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem("fm_paid", JSON.stringify(paidHistory)), [paidHistory]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map(o => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map(h => [h.id, h])), [horses]);

  // ── Job logging ──
  const logJob = (horseId, job, date = currentDate) => {
    if (!horseId) return alert("Select a horse first");
    let label = job.label, price = job.price;
    if (job.key === "other") {
      const desc = prompt("Job description?");
      if (!desc) return;
      const amt = parseFloat(prompt("Price (£)?")) || 0;
      label = `Other — ${desc}`;
      price = amt;
    }
    if (job.key === "shoot") {
      const time = prompt("Until what time? (e.g. 1pm)");
      label = `Shoot ⚠️ — until ${time || "unknown"}`;
    }
    setLogs((p) => [
      { id: uid(), horseId, jobKey: job.key, jobLabel: label, price, ts: date, paid: false },
      ...p,
    ]);
  };

  const removeLog = (id) => setLogs((p) => p.filter((l) => l.id !== id));
  const undoLast = () => setLogs((p) => p.slice(1));
  const clearDay = () => {
    if (confirm("Clear today’s jobs?")) setLogs((p) => p.filter((l) => l.ts !== currentDate));
  };
  const clearCalendar = () => {
    if (confirm("⚠️ Clear ALL calendar jobs (paid & unpaid)?")) setLogs([]);
  };

  const markPaid = (ownerId) => {
    const ownerHorses = horses.filter((h) => h.ownerId === ownerId).map((h) => h.id);
    const items = logs.filter((l) => ownerHorses.includes(l.horseId));
    if (!items.length) return alert("No unpaid jobs for this owner.");
    const total = items.reduce((s, x) => s + Number(x.price || 0), 0);
    setPaidHistory((p) => [{ id: uid(), ownerId, ts: toISO(), total, items }, ...p]);
    setLogs((p) => p.filter((l) => !ownerHorses.includes(l.horseId)));
  };

  const exportCSV = () => {
    const rows = [["Date", "Owner", "Horse", "Job", "Price"]];
    for (const l of logs) {
      const h = horseMap[l.horseId],
        o = h ? ownerMap[h.ownerId] : null;
      rows.push([
        new Date(l.ts).toLocaleString(),
        o?.name || "",
        h?.name || "",
        l.jobLabel,
        l.price,
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farmmate_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const dailyLogs = logs.filter((l) => l.ts === currentDate);
  const totalForDay = dailyLogs.reduce((s, x) => s + Number(x.price || 0), 0);

  // ── Daily View ──
  const DailyView = () => (
    <section className="card">
      <div className="header" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <b>Daily Log</b> — {fmtDate(currentDate)}
        </div>
        <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
      </div>
      <div className="content stack">
        <select value={activeHorseId} onChange={(e) => setActiveHorseId(e.target.value)}>
          <option value="">Select horse</option>
          {horses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} — {ownerMap[h.ownerId]?.name}
            </option>
          ))}
        </select>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
            gap: "8px",
          }}
        >
          {jobs.map((j) => (
            <button
              key={j.key}
              className="btn"
              style={{
                background: j.key === "shoot" ? "#f87171" : "#0ea5e9",
                color: "#fff",
              }}
              onClick={() => logJob(activeHorseId, j)}
            >
              {j.label}
              {j.price ? ` • ${GBP.format(j.price)}` : ""}
            </button>
          ))}
        </div>

        <div className="hstack">
          <button className="btn" onClick={undoLast}>
            Undo
          </button>
          <button className="btn danger" onClick={clearDay}>
            Clear Today
          </button>
          <button className="btn" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        <div className="stack">
          <div className="small" style={{ fontWeight: 700 }}>
            Today’s Jobs ({GBP.format(totalForDay)})
          </div>
          {dailyLogs.length === 0 && (
            <div className="muted small">No jobs logged today.</div>
          )}
          {dailyLogs.map((l) => {
            const h = horseMap[l.horseId],
              o = h ? ownerMap[h.ownerId] : null;
            return (
              <div key={l.id} className="rowline small">
                <div>
                  <b>{l.jobLabel}</b> — {h?.name || "Horse"} ({o?.name || "Owner"})
                </div>
                <button className="btn sm danger" onClick={() => removeLog(l.id)}>
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  // ── Calendar View ──
  const CalendarView = () => {
    const [month, setMonth] = useState(new Date());
    const year = month.getFullYear(),
      m = month.getMonth();
    const first = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const startDay = first.getDay();
    const dayLogs = {};
    for (const l of logs) {
      const d = l.ts;
      if (!dayLogs[d]) dayLogs[d] = [];
      dayLogs[d].push(l);
    }
    const changeMonth = (diff) => {
      const nm = new Date(month);
      nm.setMonth(nm.getMonth() + diff);
      setMonth(nm);
    };
    return (
      <section className="card">
        <div
          className="header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <button className="btn sm" onClick={() => changeMonth(-1)}>
            ⏪
          </button>
          <b>
            {month.toLocaleString("default", { month: "long" })} {year}
          </b>
          <div className="hstack">
            <button className="btn sm" onClick={() => changeMonth(1)}>
              ⏩
            </button>
            <button className="btn danger sm" onClick={clearCalendar}>
              🗑 Clear Calendar
            </button>
          </div>
        </div>
        <div className="content">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: "4px",
              textAlign: "center",
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "6px",
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
            {[...Array(startDay).keys()].map((i) => (
              <div key={"e" + i}></div>
            ))}
            {[...Array(daysInMonth).keys()].map((i) => {
              const day = i + 1;
              const iso = toISO(new Date(year, m, day));
              const logsForDay = dayLogs[iso] || [];
              const total = logsForDay.reduce((s, x) => s + Number(x.price || 0), 0);
              const paid = logsForDay.some((x) => x.paid);
              const hasShoot = logsForDay.some((x) => x.jobKey === "shoot");
              return (
                <button
                  key={iso}
                  onClick={() => setShowDay(iso)}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#fff",
                    minHeight: "65px",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{day}</div>
                  <div style={{ fontSize: "11px", textAlign: "right" }}>
                    {hasShoot && <span style={{ color: "#facc15" }}>⚠️ </span>}
                    {paid && <span>💰 </span>}
                    {total > 0 && <span>{GBP.format(total)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  };
import React, { useEffect, useState, useMemo } from "react";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const uid = () => Math.random().toString(36).slice(2, 10);
const toISO = (d = new Date()) => d.toISOString().slice(0, 10);
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function App() {
  const [tab, setTab] = useState("daily");
  const [owners, setOwners] = useState([]);
  const [horses, setHorses] = useState([]);
  const [jobs, setJobs] = useState([
    { key: "turnout", label: "Turnout", price: 3 },
    { key: "bringin", label: "Bring In", price: 2 },
    { key: "muckout", label: "Muck Out", price: 5 },
    { key: "feed", label: "Feed", price: 2 },
    { key: "rug", label: "Rug Change", price: 1 },
    { key: "haywater", label: "Hay / Water", price: 2 },
    { key: "shoot", label: "Shoot ⚠️", price: 0 },
    { key: "other", label: "Other", price: 0 },
  ]);
  const [logs, setLogs] = useState([]);
  const [paidHistory, setPaidHistory] = useState([]);
  const [activeHorseId, setActiveHorseId] = useState("");
  const [showDay, setShowDay] = useState(null);
  const [currentDate, setCurrentDate] = useState(toISO());

  // ── Load + Persist ──
  useEffect(() => {
    const ls = (k) => JSON.parse(localStorage.getItem(k) || "[]");
    setOwners(ls("fm_owners"));
    setHorses(ls("fm_horses"));
    setLogs(ls("fm_logs"));
    setPaidHistory(ls("fm_paid"));
  }, []);

  useEffect(() => localStorage.setItem("fm_owners", JSON.stringify(owners)), [owners]);
  useEffect(() => localStorage.setItem("fm_horses", JSON.stringify(horses)), [horses]);
  useEffect(() => localStorage.setItem("fm_logs", JSON.stringify(logs)), [logs]);
  useEffect(() => localStorage.setItem("fm_paid", JSON.stringify(paidHistory)), [paidHistory]);

  const ownerMap = useMemo(() => Object.fromEntries(owners.map(o => [o.id, o])), [owners]);
  const horseMap = useMemo(() => Object.fromEntries(horses.map(h => [h.id, h])), [horses]);

  // ── Job logging ──
  const logJob = (horseId, job, date = currentDate) => {
    if (!horseId) return alert("Select a horse first");
    let label = job.label, price = job.price;
    if (job.key === "other") {
      const desc = prompt("Job description?");
      if (!desc) return;
      const amt = parseFloat(prompt("Price (£)?")) || 0;
      label = `Other — ${desc}`;
      price = amt;
    }
    if (job.key === "shoot") {
      const time = prompt("Until what time? (e.g. 1pm)");
      label = `Shoot ⚠️ — until ${time || "unknown"}`;
    }
    setLogs((p) => [
      { id: uid(), horseId, jobKey: job.key, jobLabel: label, price, ts: date, paid: false },
      ...p,
    ]);
  };

  const removeLog = (id) => setLogs((p) => p.filter((l) => l.id !== id));
  const undoLast = () => setLogs((p) => p.slice(1));
  const clearDay = () => {
    if (confirm("Clear today’s jobs?")) setLogs((p) => p.filter((l) => l.ts !== currentDate));
  };
  const clearCalendar = () => {
    if (confirm("⚠️ Clear ALL calendar jobs (paid & unpaid)?")) setLogs([]);
  };

  const markPaid = (ownerId) => {
    const ownerHorses = horses.filter((h) => h.ownerId === ownerId).map((h) => h.id);
    const items = logs.filter((l) => ownerHorses.includes(l.horseId));
    if (!items.length) return alert("No unpaid jobs for this owner.");
    const total = items.reduce((s, x) => s + Number(x.price || 0), 0);
    setPaidHistory((p) => [{ id: uid(), ownerId, ts: toISO(), total, items }, ...p]);
    setLogs((p) => p.filter((l) => !ownerHorses.includes(l.horseId)));
  };

  const exportCSV = () => {
    const rows = [["Date", "Owner", "Horse", "Job", "Price"]];
    for (const l of logs) {
      const h = horseMap[l.horseId],
        o = h ? ownerMap[h.ownerId] : null;
      rows.push([
        new Date(l.ts).toLocaleString(),
        o?.name || "",
        h?.name || "",
        l.jobLabel,
        l.price,
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farmmate_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const dailyLogs = logs.filter((l) => l.ts === currentDate);
  const totalForDay = dailyLogs.reduce((s, x) => s + Number(x.price || 0), 0);

  // ── Daily View ──
  const DailyView = () => (
    <section className="card">
      <div className="header" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <b>Daily Log</b> — {fmtDate(currentDate)}
        </div>
        <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
      </div>
      <div className="content stack">
        <select value={activeHorseId} onChange={(e) => setActiveHorseId(e.target.value)}>
          <option value="">Select horse</option>
          {horses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} — {ownerMap[h.ownerId]?.name}
            </option>
          ))}
        </select>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
            gap: "8px",
          }}
        >
          {jobs.map((j) => (
            <button
              key={j.key}
              className="btn"
              style={{
                background: j.key === "shoot" ? "#f87171" : "#0ea5e9",
                color: "#fff",
              }}
              onClick={() => logJob(activeHorseId, j)}
            >
              {j.label}
              {j.price ? ` • ${GBP.format(j.price)}` : ""}
            </button>
          ))}
        </div>

        <div className="hstack">
          <button className="btn" onClick={undoLast}>
            Undo
          </button>
          <button className="btn danger" onClick={clearDay}>
            Clear Today
          </button>
          <button className="btn" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        <div className="stack">
          <div className="small" style={{ fontWeight: 700 }}>
            Today’s Jobs ({GBP.format(totalForDay)})
          </div>
          {dailyLogs.length === 0 && (
            <div className="muted small">No jobs logged today.</div>
          )}
          {dailyLogs.map((l) => {
            const h = horseMap[l.horseId],
              o = h ? ownerMap[h.ownerId] : null;
            return (
              <div key={l.id} className="rowline small">
                <div>
                  <b>{l.jobLabel}</b> — {h?.name || "Horse"} ({o?.name || "Owner"})
                </div>
                <button className="btn sm danger" onClick={() => removeLog(l.id)}>
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  // ── Calendar View ──
  const CalendarView = () => {
    const [month, setMonth] = useState(new Date());
    const year = month.getFullYear(),
      m = month.getMonth();
    const first = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const startDay = first.getDay();
    const dayLogs = {};
    for (const l of logs) {
      const d = l.ts;
      if (!dayLogs[d]) dayLogs[d] = [];
      dayLogs[d].push(l);
    }
    const changeMonth = (diff) => {
      const nm = new Date(month);
      nm.setMonth(nm.getMonth() + diff);
      setMonth(nm);
    };
    return (
      <section className="card">
        <div
          className="header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <button className="btn sm" onClick={() => changeMonth(-1)}>
            ⏪
          </button>
          <b>
            {month.toLocaleString("default", { month: "long" })} {year}
          </b>
          <div className="hstack">
            <button className="btn sm" onClick={() => changeMonth(1)}>
              ⏩
            </button>
            <button className="btn danger sm" onClick={clearCalendar}>
              🗑 Clear Calendar
            </button>
          </div>
        </div>
        <div className="content">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: "4px",
              textAlign: "center",
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "6px",
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
            {[...Array(startDay).keys()].map((i) => (
              <div key={"e" + i}></div>
            ))}
            {[...Array(daysInMonth).keys()].map((i) => {
              const day = i + 1;
              const iso = toISO(new Date(year, m, day));
              const logsForDay = dayLogs[iso] || [];
              const total = logsForDay.reduce((s, x) => s + Number(x.price || 0), 0);
              const paid = logsForDay.some((x) => x.paid);
              const hasShoot = logsForDay.some((x) => x.jobKey === "shoot");
              return (
                <button
                  key={iso}
                  onClick={() => setShowDay(iso)}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#fff",
                    minHeight: "65px",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{day}</div>
                  <div style={{ fontSize: "11px", textAlign: "right" }}>
                    {hasShoot && <span style={{ color: "#facc15" }}>⚠️ </span>}
                    {paid && <span>💰 </span>}
                    {total > 0 && <span>{GBP.format(total)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  };
