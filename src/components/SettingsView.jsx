import React from "react";

export default function SettingsView({
  owners,
  horses,
  logs,
  paidHistory,
  jobs,
  setOwners,
  setHorses,
  setLogs,
  setPaidHistory,
  setJobs,
}) {
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
}
