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

  // ✅ FIX — Added missing DayModal (only change)
  const DayModal = ({ iso, onClose }) => {
    const list = logs.filter((l) => l.ts.slice(0, 10) === iso);
    const total = list.reduce((s, x) => s + Number(x.price || 0), 0);
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
            maxWidth: "420px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          }}
        >
          <h3 style={{ marginBottom: "10px" }}>{longDate(iso)}</h3>
          {list.length === 0 ? (
            <div className="muted small">No jobs logged on this day.</div>
          ) : (
            <>
              {list.map((x) => {
                const horse = horseMap[x.horseId];
                const owner = horse ? ownerMap[horse.ownerId] : null;
                return (
                  <div
                    key={x.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                      fontSize: "14px",
                    }}
                  >
                    <span>
                      {x.jobLabel} — {horse?.name || "Horse"}{" "}
                      <span className="muted small">
                        ({owner?.name || "Owner"})
                      </span>
                    </span>
                    <span>{GBP.format(x.price)}</span>
                  </div>
                );
              })}
              <div style={{ textAlign: "right", marginTop: "8px", fontWeight: 700 }}>
                Total: {GBP.format(total)}
              </div>
            </>
          )}
          <button className="btn primary" onClick={onClose} style={{ marginTop: "12px" }}>
            Close
          </button>
        </div>
      </div>
    );
  };

  // 🔽 rest of your file continues exactly as you sent (DailyView, OwnersView, SettingsView, etc.)
}
  const DayModal = ({ iso, onClose }) => {
    const list = logs.filter((l) => l.ts.slice(0, 10) === iso);
    const total = list.reduce((s, x) => s + Number(x.price || 0), 0);

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
            maxWidth: "420px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          }}
        >
          <h3 style={{ marginBottom: "10px" }}>{longDate(iso)}</h3>
          {list.length === 0 ? (
            <div className="muted small">No jobs logged.</div>
          ) : (
            <>
              {list.map((x) => {
                const horse = horseMap[x.horseId];
                const owner = horse ? ownerMap[horse.ownerId] : null;
                return (
                  <div
                    key={x.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                      fontSize: "14px",
                    }}
                  >
                    <span>
                      {x.jobLabel} — {horse?.name || "Horse"}{" "}
                      <span className="muted small">
                        ({owner?.name || "Owner"})
                      </span>
                    </span>
                    <span>{GBP.format(x.price)}</span>
                  </div>
                );
              })}
              <div
                style={{
                    textAlign: "right",
                    marginTop: "8px",
                    fontWeight: 700,
                }}
              >
                Total: {GBP.format(total)}
              </div>
            </>
          )}

          <button
            className="btn primary"
            onClick={onClose}
            style={{ marginTop: "12px" }}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const DailyView = () => {
    const todayLogs = logs.filter((l) => l.ts.slice(0, 10) === selectedDate);
    const todayTotal = todayLogs.reduce((s, x) => s + Number(x.price || 0), 0);

    // ─── Create a new invoice from today's un-invoiced jobs ───────────────
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

    // ─── Mark invoice as paid and update logs ─────────────────────────────
    const markInvoicePaid = (id) => {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) return;
      if (!confirm(`Mark ${inv.owner}'s invoice as paid?`)) return;

      setInvoices((prev) =>
        prev.map((i) => (i.id === id ? { ...i, paid: true } : i))
      );
      setLogs((prev) =>
        prev.map((l) =>
          inv.items.some((x) => x.id === l.id) ? { ...l, paid: true } : l
        )
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
        <section
          className="card full"
          style={{
            width: "100%",
            background: "#fff",
            borderRadius: "0",
            border: "none",
            boxShadow: "none",
          }}
        >
          {/* Header */}
          <div
            className="header hstack"
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "2px solid #e2e8f0",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "20px" }}>
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

          {/* Two-column layout */}
          <div
            className="content"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr",
              gap: "32px",
              alignItems: "start",
              marginTop: "20px",
            }}
          >
            {/* LEFT SIDE — Add Jobs */}
            <div className="stack">
              <div className="muted small" style={{ fontWeight: 700 }}>
                Select Horse
              </div>
              <select
                value={activeHorseId}
                onChange={(e) => setActiveHorseId(e.target.value)}
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
                  marginTop: "12px",
                }}
              >
                {jobs.map((j) => (
                  <button
                    key={j.key}
                    className="btn"
                    onClick={() => logJob(activeHorseId, j)}
                  >
                    {j.label}
                    {j.price ? ` • ${GBP.format(j.price)}` : ""}
                  </button>
                ))}
              </div>

              <div className="hstack" style={{ marginTop: "12px" }}>
                <button className="btn sm" onClick={undoLast}>
                  ↩️ Undo Last
                </button>
                <button className="btn sm danger" onClick={clearDay}>
                  🗑 Clear Day
                </button>
              </div>
            </div>

            {/* RIGHT SIDE — Job Logged + Invoices */}
            <div className="stack">
              <div className="muted small" style={{ fontWeight: 700 }}>
                Jobs Logged
              </div>

              {todayLogs.length === 0 && (
                <div className="muted small">No jobs logged today.</div>
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
                      <strong>{l.jobLabel}</strong> — {h?.name || "Horse"}{" "}
                      <span className="muted">
                        ({o?.name || "Owner"}) {l.paid && "✅"}
                      </span>
                    </div>
                    <div className="hstack">
                      <div className="badge">{GBP.format(l.price)}</div>
                      <button
                        className="btn sm danger"
                        onClick={() => removeLog(l.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}

              {todayLogs.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, marginTop: "8px" }}>
                    Total {GBP.format(todayTotal)}
                  </div>
                  <button
                    className="btn primary"
                    onClick={makeInvoice}
                    style={{ marginTop: "10px" }}
                  >
                    🧾 Invoice
                  </button>
                </>
              )}

              {/* INVOICE LIST */}
              {invoices.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    marginTop: "20px",
                    paddingTop: "10px",
                  }}
                >
                  <div
                    className="muted small"
                    style={{ fontWeight: 700, marginBottom: "6px" }}
                  >
                    Invoices
                  </div>

                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        background: inv.paid ? "#dcfce7" : "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        marginBottom: "10px",
                        padding: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontWeight: 700,
                          marginBottom: "6px",
                        }}
                      >
                        <span>
                          {inv.owner} — {fmtDate(inv.date)}
                        </span>
                        <span>{inv.paid ? "✅ Paid" : "🧾 Unpaid"}</span>
                      </div>

                      {inv.items.map((x) => (
                        <div
                          key={x.id}
                          className="small muted"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            {x.horse} — {x.jobLabel}
                          </span>
                          <span>{GBP.format(x.price)}</span>
                        </div>
                      ))}

                      <div
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          marginTop: "6px",
                        }}
                      >
                        Total: {GBP.format(inv.total)}
                      </div>

                      {!inv.paid && (
                        <button
                          className="btn sm primary"
                          onClick={() => markInvoicePaid(inv.id)}
                          style={{ marginTop: "8px" }}
                        >
                          💰 Mark Paid
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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

