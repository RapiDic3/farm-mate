
import React, { useState } from "react";
import { GBP, fmtDate, todayISO } from "../utils";

export default function DailyView({
  logs,
  horses,
  owners,
  ownerMap,
  horseMap,
  activeHorseId,
  setActiveHorseId,
  selectedDate,
  setSelectedDate,
  addDays,
  logJob,
  undoLast,
  clearDay,
  jobs,
  setLogs,
  setInvoices,
  invoices,
  uid,
  longDate,
}) {
  const todayLogs = logs.filter((l) => l.ts.slice(0, 10) === selectedDate);
  const todayTotal = todayLogs.reduce((s, x) => s + Number(x.price || 0), 0);

  const [fromDate, setFromDate] = useState(addDays(selectedDate, -7));
  const [toDate, setToDate] = useState(selectedDate);

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
    alert("✅ Invoice created! Scroll down to view.");
  };

  const makeRangeInvoices = () => {
    const start = new Date(fromDate);
    const end = new Date(toDate);

    const rangeLogs = logs.filter((l) => {
      const d = new Date(l.ts);
      return d >= start && d <= end && !l.paid;
    });

    if (!rangeLogs.length) return alert("No unbilled jobs found in this range.");

    const byOwner = {};
    rangeLogs.forEach((l) => {
      const h = horseMap[l.horseId];
      const o = h ? ownerMap[h.ownerId] : null;
      if (!o) return;
      if (!byOwner[o.name]) byOwner[o.name] = [];
      byOwner[o.name].push({ ...l, horse: h?.name });
    });

    const newInvoices = Object.entries(byOwner).map(([owner, items]) => ({
      id: uid(),
      date: todayISO(),
      owner,
      items,
      total: items.reduce((sum, x) => sum + Number(x.price || 0), 0),
      paid: false,
      range: `${fmtDate(fromDate)} → ${fmtDate(toDate)}`,
    }));

    setInvoices((prev) => [...newInvoices, ...prev]);
    alert(`✅ Created ${newInvoices.length} invoice(s) for this period.`);
  };

  const markInvoicePaid = (id) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    if (!confirm(`Mark ${inv.owner}'s invoice as paid?`)) return;

    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, paid: true } : i)));
    setLogs((prev) =>
      prev.map((l) =>
        inv.items.some((x) => x.id === l.id) ? { ...l, paid: true } : l
      )
    );
  };

  return (
    <div className="daily-view" style={{ padding: "24px 32px", background: "#f0f9ff" }}>
      <section className="card full" style={{ background: "#fff", border: "none" }}>
        <div
          className="header hstack"
          style={{ justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0" }}
        >
          <div style={{ fontWeight: 700, fontSize: "20px" }}>Jobs — {longDate(selectedDate)}</div>
          <div className="hstack">
            <button className="btn sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>⏪</button>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <button className="btn sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>⏩</button>
          </div>
        </div>

        <div className="content" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Job Entry */}
          <div className="stack">
            <div className="muted small" style={{ fontWeight: 700 }}>Select Horse</div>
            <select value={activeHorseId} onChange={(e) => setActiveHorseId(e.target.value)}>
              <option value="">Choose horse</option>
              {horses.map((h) => (
                <option key={h.id} value={h.id}>{h.name} — {ownerMap[h.ownerId]?.name}</option>
              ))}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: "8px", marginTop: "12px" }}>
              {jobs.map((j) => (
                <button key={j.key} className="btn" onClick={() => logJob(activeHorseId, j)}>
                  {j.label}{j.price ? ` • ${GBP.format(j.price)}` : ""}
                </button>
              ))}
            </div>

            <div className="hstack" style={{ marginTop: "12px" }}>
              <button className="btn sm" onClick={undoLast}>↩️ Undo Last</button>
              <button className="btn sm danger" onClick={clearDay}>🗑 Clear Day</button>
            </div>
          </div>

          {/* Job List */}
          <div className="stack">
            <div className="muted small" style={{ fontWeight: 700 }}>Jobs Logged</div>

            {todayLogs.map((l) => {
              const h = horseMap[l.horseId];
              const o = h ? ownerMap[h.ownerId] : null;
              return (
                <div key={l.id} className="rowline small" style={{ opacity: l.paid ? 0.6 : 1 }}>
                  <div><strong>{l.jobLabel}</strong> — {h?.name} <span className="muted">({o?.name}) {l.paid && "✅"}</span></div>
                  <div className="hstack">
                    <div className="badge">{GBP.format(l.price)}</div>
                    <button className="btn sm danger" onClick={() => setLogs((p) => p.filter((x) => x.id !== l.id))}>🗑</button>
                  </div>
                </div>
              );
            })}

            {todayLogs.length > 0 && (
              <>
                <div style={{ fontWeight: 700, marginTop: "8px" }}>Total {GBP.format(todayTotal)}</div>
                <button className="btn primary" onClick={makeInvoice} style={{ marginTop: "10px" }}>🧾 Invoice</button>
              </>
            )}
          </div>

          {/* Range Invoice */}
          <div style={{ borderTop: "2px solid #e2e8f0", background: "#f9fafb", borderRadius: "10px", padding: "12px" }}>
            <div className="muted small" style={{ fontWeight: 700 }}>Generate Range / Weekly Invoice</div>
            <div className="hstack" style={{ gap: "8px", marginBottom: "8px" }}>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span>→</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button className="btn primary" onClick={makeRangeInvoices}>📅 Create Invoices for Period</button>
          </div>

          {/* Invoices List */}
          {invoices.map((inv) => (
            <div key={inv.id} style={{ background: inv.paid ? "#dcfce7" : "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", marginBottom: "12px", padding: "14px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700 }}>{inv.owner}</div>
                  <div className="muted small" style={{ fontSize: "13px" }}>
                    {inv.range ? `Dates: ${inv.range}` : `Date: ${fmtDate(inv.date)}`}
                  </div>
                </div>
                <span style={{ color: inv.paid ? "#166534" : "#b91c1c" }}>{inv.paid ? "✅ Paid" : "🧾 Unpaid"}</span>
              </div>

              {inv.items.map((x) => (
                <div key={x.id} className="small muted" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", padding: "4px 0" }}>
                  <div>
                    <strong>{x.horse}</strong> — {x.jobLabel}
                    <div style={{ fontSize: "12px" }}>{fmtDate(x.ts)}</div>
                  </div>
                  <span>{GBP.format(x.price)}</span>
                </div>
              ))}

              <div style={{ textAlign: "right", fontWeight: 700, marginTop: "8px" }}>
                Total: {GBP.format(inv.total)}
              </div>

              {!inv.paid && (
                <button className="btn sm primary" onClick={() => markInvoicePaid(inv.id)} style={{ marginTop: "10px", float: "right" }}>
                  💰 Mark Paid
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
