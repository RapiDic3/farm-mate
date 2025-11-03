import React from "react";
import { uid } from "../utils";

export default function OwnersView({ owners, setOwners, horses, setHorses }) {
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
          <div className="owner-head" style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700 }}>{o.name}</div>
            <div className="hstack" style={{ gap: "6px" }}>
              <button className="btn sm" onClick={() => addHorse(o.id)}>Add Horse</button>
              <button className="btn sm danger" onClick={() => removeOwner(o.id)}>🗑</button>
            </div>
          </div>
          <div>
            {horses.filter((h) => h.ownerId === o.id).map((h) => (
              <div key={h.id} className="rowline small">{h.name}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
