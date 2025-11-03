import React, { useState, useEffect } from "react";
import { GBP, fmtDate, longDate } from "../utils";

export default function DayModal({
  iso,
  onClose,
  horses,
  ownerMap,
  horseMap,
  jobs,
  logJob,
  setLogs,
  activeHorseId,
  setActiveHorseId,
  toISO,
}) {
  const [initDate] = useState(() => iso);

  const [fromDate, setFromDate] = useState(() => {
    const saved = localStorage.getItem("fm_last_from");
    return saved || initDate;
  });
  const [toDate, setToDate] = useState(() => {
    const saved = localStorage.getItem("fm_last_to");
    return saved || initDate;
  });
  const [selectedHorse, setSelectedHorse] = useState(() => {
    const saved = localStorage.getItem("fm_last_horse");
    return saved || activeHorseId || "";
  });

  const [previewDates, setPreviewDates] = useState([]);

  useEffect(() => {
    if (selectedHorse) {
      setActiveHorseId(selectedHorse);
      localStorage.setItem("fm_last_horse", selectedHorse);
    }
  }, [selectedHorse]);

  useEffect(() => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const range = [];
    const d = new Date(start);
    while (d <= end) {
      range.push(toISO(d));
      d.setDate(d.getDate() + 1);
    }
    setPreviewDates(range);

    localStorage.setItem("fm_last_from", fromDate);
    localStorage.setItem("fm_last_to", toDate);
  }, [fromDate, toDate]);

  const rangeLogs = setLogs
    ? setLogs.filter((l) => previewDates.includes(l.ts.slice(0, 10)))
    : [];
  const total = rangeLogs.reduce((s, x) => s + Number(x.price || 0), 0);

  const addJob = (job) => {
    if (!selectedHorse) return alert("Choose a horse first");

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (end < start) return alert("The 'To' date must be after the 'From' date.");

    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isoStr = toISO(d);
      dates.push(isoStr);
    }

    dates.forEach((isoStr) => logJob(selectedHorse, job, isoStr));
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const removeJob = (id) => {
    if (!confirm("Remove this job?")) return;
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
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
          maxWidth: "520px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "18px" }}>
            Book Jobs —{" "}
            {fromDate === toDate
              ? longDate(fromDate)
              : `${fmtDate(fromDate)} → ${fmtDate(toDate)}`}
          </div>
          <button className="btn sm danger" onClick={onClose}>
            ✖
          </button>
        </div>

        {/* Date pickers */}
        <div style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
          <div style={{ flex: 1 }}>
            <label className="small muted">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="small muted">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Horse selector */}
        <div>
          <div className="muted small" style={{ fontWeight: 700 }}>
            Select Horse
          </div>
          <select
            value={selectedHorse}
            onChange={(e) => setSelectedHorse(e.target.value)}
            style={{ width: "100%", marginBottom: "10px" }}
          >
            <option value="">Choose horse</option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} — {ownerMap[h.ownerId]?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Job buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          {jobs.map((j) => (
            <button key={j.key} className="btn" onClick={() => addJob(j)}>
              {j.label}
              {j.price ? ` • ${GBP.format(j.price)}` : ""}
            </button>
          ))}
        </div>

        <hr style={{ margin: "10px 0" }} />

        <div style={{ fontWeight: 700, marginBottom: "6px" }}>Jobs in Range</div>
        {rangeLogs.length === 0 && (
          <div className="muted small">No jobs logged yet in this range.</div>
        )}

        {rangeLogs.map((l) => {
          const h = horseMap[l.horseId];
          const o = h ? ownerMap[h.ownerId] : null;
          return (
            <div
              key={l.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
                fontSize: "14px",
              }}
            >
              <div>
                <strong>{l.jobLabel}</strong> — {h?.name || "Horse"}{" "}
                <span className="muted small">
                  ({o?.name || "Owner"}) — {fmtDate(l.ts)}
                </span>
              </div>
              <div className="hstack" style={{ gap: "6px" }}>
                <span>{GBP.format(l.price)}</span>
                <button className="btn sm danger" onClick={() => removeJob(l.id)}>
                  🗑
                </button>
              </div>
            </div>
          );
        })}

        {rangeLogs.length > 0 && (
          <div style={{ textAlign: "right", fontWeight: 700, marginTop: "10px" }}>
            Total: {GBP.format(total)}
          </div>
        )}
      </div>
    </div>
  );
}
