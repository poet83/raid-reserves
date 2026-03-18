// src/components/ReserveModal.jsx
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

function ReserveModal({ raid, boss, item, onClose }) {
  const [playerName, setPlayerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleReserve = async () => {
    if (!playerName.trim()) {
      setError("Enter a player name.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await addDoc(collection(db, "reserves"), {
        raidID: raid.id,
        raidName: raid.name,
        bossName: boss.name,
        itemID: item.itemID,
        itemName: item.name,
        player: playerName.trim(),
        createdAt: serverTimestamp()
      });
      setSaved(true);
    } catch (e) {
      console.error(e);
      setError("Failed to save reserve.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          background: "#1e1e1e",
          padding: "16px 20px",
          borderRadius: "8px",
          minWidth: "320px"
        }}
      >
        <h3>Reserve Item</h3>
        <p>
          <strong>Raid:</strong> {raid.name}
          <br />
          <strong>Boss:</strong> {boss.name}
          <br />
          <strong>Item:</strong> [{item.itemID}] {item.name}
        </p>

        {!saved ? (
          <>
            <label>
              Player name:
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{ width: "100%", marginTop: "4px", marginBottom: "8px" }}
              />
            </label>
            {error && (
              <p style={{ color: "salmon", marginBottom: "8px" }}>{error}</p>
            )}
            <button onClick={handleReserve} disabled={saving}>
              {saving ? "Saving..." : "Confirm Reserve"}
            </button>{" "}
            <button onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "lightgreen" }}>Reserve saved.</p>
            <button onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}

export default ReserveModal;
