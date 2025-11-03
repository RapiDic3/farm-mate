import React from "react";
import { GBP } from "../utils";

export default function CalendarView({
  calendarMonth,
  setCalendarMonth,
  addMonths,
  monthMatrix,
  toISO,
  dayTotal,
  dayHasPaid,
  jobsOnDate,
  setShowDay,
  goBackToMain,
}) {
  const { days, first } = monthMatrix(calendarMonth);
  const label = first.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="stack">
      {/* Month header and navigation */}
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

      {/* Back button */}
      <button className="btn" onClick={goBackToMain} style={{ margin: "8px 0" }}>
        ⬅️ Back to Main
      </button>

      {/* Weekday headers */}
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

      {/* Calendar grid */}
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
}
