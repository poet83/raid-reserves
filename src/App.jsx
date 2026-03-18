import { useState, useEffect } from "react";
import raids from "./data/raids.json";
import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  onSnapshot
} from "firebase/firestore";

function App() {
  const [selectedRaidId, setSelectedRaidId] = useState(null);
  const [reserves, setReserves] = useState({});
  const [adminMode, setAdminMode] = useState(false);
  const [showMyReserves, setShowMyReserves] = useState(false);

  const raidList = Object.values(raids);
  const selectedRaid = raidList.find(r => r.id === selectedRaidId) || null;

  // Real-time reserves listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reserves"), snapshot => {
      const data = {};

      snapshot.forEach(docSnap => {
        const r = docSnap.data();
        const key = `${r.boss}-${r.item}`;

        data[key] = Array.isArray(r.reservedBy)
          ? r.reservedBy
          : r.reservedBy
          ? [r.reservedBy]
          : [];
      });

      setReserves(data);
    });

    return () => unsub();
  }, []);

  // Count reserves per raid (items with at least one reserver)
  function countRaidReserves(raid) {
    let total = 0;

    raid.bosses.forEach(boss => {
      boss.items.forEach(item => {
        const key = `${boss.name}-${item.name}`;
        const arr = reserves[key];
        if (Array.isArray(arr) && arr.length > 0) total++;
      });
    });

    return total;
  }

  // Shared unreserve function (used by RaidDetail + MyReserves)
  async function unreserveItem(raidId, bossName, itemName) {
    const saved = localStorage.getItem("playerName") || "";
    const trimmedName = saved.trim();
    if (!trimmedName) return;

    const key = `${raidId}-${bossName}-${itemName}`;
    const ref = doc(db, "reserves", key);
    const existing = await getDoc(ref);

    if (!existing.exists()) return;

    const data = existing.data();
    const updated = data.reservedBy.filter(name => name !== trimmedName);

    if (updated.length === 0) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        ...data,
        reservedBy: updated
      });
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Raid Reserves</h1>

      {/* Mode buttons */}
      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center"
        }}
      >
        <button
          onClick={() => {
            setAdminMode(true);
            setShowMyReserves(false);
          }}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            background: adminMode ? "#444" : "#222",
            color: "white",
            border: "1px solid #555"
          }}
        >
          Current Reserves
        </button>

        <button
          onClick={() => {
            setShowMyReserves(true);
            setAdminMode(false);
          }}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            background: showMyReserves ? "#444" : "#222",
            color: "white",
            border: "1px solid #555"
          }}
        >
          My Reserves
        </button>

        <button
          onClick={() => {
            setAdminMode(false);
            setShowMyReserves(false);
          }}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            background: !adminMode && !showMyReserves ? "#444" : "#222",
            color: "white",
            border: "1px solid #555"
          }}
        >
          Reserve Items
        </button>
      </div>

      {/* Raid list */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          justifyContent: "center",
          flexWrap: "wrap"
        }}
      >
        {raidList.map(raid => {
          const count = adminMode ? countRaidReserves(raid) : null;

          return (
            <button
              key={raid.id}
              onClick={() => setSelectedRaidId(raid.id)}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #444",
                background: raid.id === selectedRaidId ? "#333" : "#222",
                color: "white",
                cursor: "pointer"
              }}
            >
              {raid.name}
              {adminMode && (
                <span style={{ marginLeft: "0.5rem", color: "#ffcc00" }}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      {showMyReserves ? (
        <MyReservesView
          raids={raidList}
          reserves={reserves}
          unreserveItem={unreserveItem}
        />
      ) : selectedRaid ? (
        adminMode ? (
          <AdminPanel
            raid={selectedRaid}
            reserves={reserves}
            allRaids={raidList}
          />
        ) : (
          <RaidDetail
            raid={selectedRaid}
            reserves={reserves}
            unreserveItem={unreserveItem}
          />
        )
      ) : (
        <p>Select a raid to view bosses and items.</p>
      )}
    </div>
  );
}

function RaidDetail({ raid, reserves, unreserveItem }) {
  const [playerName, setPlayerName] = useState("");
  const [selectedBoss, setSelectedBoss] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("playerName");
    if (saved) setPlayerName(saved);
  }, []);

  const trimmedName = playerName.trim();

  const playerReserveCount = Object.values(reserves).filter(
    arr => Array.isArray(arr) && arr.includes(trimmedName)
  ).length;

  async function reserveItem(raidId, bossName, itemName) {
    if (!trimmedName) {
      alert("Please enter your character name first.");
      return;
    }

    if (playerReserveCount >= 2) {
      alert("You have reached the maximum of 2 reserves.");
      return;
    }

    const key = `${raidId}-${bossName}-${itemName}`;
    const ref = doc(db, "reserves", key);
    const existing = await getDoc(ref);

    if (existing.exists()) {
      const data = existing.data();

      if (data.reservedBy.includes(trimmedName)) {
        alert("You already reserved this item.");
        return;
      }

      await setDoc(ref, {
        raid: raidId,
        boss: bossName,
        item: itemName,
        reservedBy: [...data.reservedBy, trimmedName]
      });
    } else {
      await setDoc(ref, {
        raid: raidId,
        boss: bossName,
        item: itemName,
        reservedBy: [trimmedName]
      });
    }
  }

  return (
    <div>
      <h2>{raid.name}</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Enter your character name"
          value={playerName}
          onChange={e => {
            setPlayerName(e.target.value);
            localStorage.setItem("playerName", e.target.value);
          }}
          style={{
            padding: "0.5rem",
            marginRight: "0.5rem",
            border: "1px solid #444",
            background: "#222",
            color: "white"
          }}
        />
      </div>

      {raid.bosses.map(boss => (
        <div
          key={boss.name}
          style={{
            marginTop: "1rem",
            padding: "1rem",
            border: "1px solid #444",
            borderRadius: "4px",
            cursor: "pointer"
          }}
          onClick={() =>
            setSelectedBoss(selectedBoss === boss.name ? null : boss.name)
          }
        >
          <h3>{boss.name}</h3>

          {selectedBoss === boss.name && (
            <ul style={{ marginTop: "0.5rem" }}>
              {boss.items.map(item => {
                const key = `${boss.name}-${item.name}`;
                const arr = Array.isArray(reserves[key]) ? reserves[key] : [];

                let color = "#9cf";
                if (arr.length === 1) color = "#ffcc00";
                if (arr.length >= 2) color = "#ff5555";

                return (
                  <li
                    key={item.name}
                    style={{
                      padding: "0.25rem 0",
                      cursor: "pointer",
                      color: color
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      reserveItem(raid.id, boss.name, item.name);
                    }}
                  >
                    {item.name}

                    {arr.length > 0 && (
                      <span style={{ marginLeft: "0.5rem" }}>
                        — Reserved by: {arr.join(", ")}
                      </span>
                    )}

                    {arr.includes(trimmedName) && (
                      <button
                        style={{
                          marginLeft: "0.5rem",
                          padding: "0.1rem 0.4rem",
                          fontSize: "0.8rem",
                          cursor: "pointer"
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          unreserveItem(raid.id, boss.name, item.name);
                        }}
                      >
                        Unreserve
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function MyReservesView({ raids, reserves, unreserveItem }) {
  const [playerName, setPlayerName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("playerName");
    if (saved) setPlayerName(saved);
  }, []);

  const trimmedName = playerName.trim();

  const grouped = {};

  raids.forEach(raid => {
    raid.bosses.forEach(boss => {
      boss.items.forEach(item => {
        const key = `${boss.name}-${item.name}`;
        const arr = reserves[key];

        if (Array.isArray(arr) && arr.includes(trimmedName)) {
          if (!grouped[raid.name]) grouped[raid.name] = {};
          if (!grouped[raid.name][boss.name]) grouped[raid.name][boss.name] = [];
          grouped[raid.name][boss.name].push({
            itemName: item.name,
            raidId: raid.id,
            raidName: raid.name,
            bossName: boss.name
          });
        }
      });
    });
  });

  const hasReserves = Object.keys(grouped).length > 0;

  function handleUnreserveClick(item) {
    setModalData(item);
    setModalOpen(true);
  }

  async function handleConfirmUnreserve() {
    if (!modalData) return;
    await unreserveItem(modalData.raidId, modalData.bossName, modalData.itemName);
    setModalOpen(false);
    setModalData(null);
  }

  function handleCancelUnreserve() {
    setModalOpen(false);
    setModalData(null);
  }

  return (
    <div>
      <h2>My Reserves</h2>

      {!trimmedName && (
        <p style={{ marginBottom: "0.5rem" }}>
          Set your character name in the main view to see your reserves.
        </p>
      )}

      {!hasReserves && trimmedName && <p>You have no reserves yet.</p>}

      {Object.entries(grouped).map(([raidName, bosses]) => (
        <div
          key={raidName}
          style={{
            marginTop: "1rem",
            padding: "1rem",
            border: "1px solid #444",
            borderRadius: "4px"
          }}
        >
          <h3>{raidName}</h3>
          {Object.entries(bosses).map(([bossName, items]) => (
            <div
              key={bossName}
              style={{ marginLeft: "1rem", marginTop: "0.5rem" }}
            >
              <strong>{bossName}</strong>
              <ul style={{ marginTop: "0.25rem" }}>
                {items.map(item => (
                  <li
                    key={item.itemName}
                    style={{ marginBottom: "0.25rem" }}
                  >
                    {item.itemName}
                    <button
                      style={{
                        marginLeft: "0.5rem",
                        padding: "0.1rem 0.4rem",
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                      onClick={() => handleUnreserveClick(item)}
                    >
                      Unreserve
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}

      <ConfirmModal
        isOpen={modalOpen}
        onCancel={handleCancelUnreserve}
        onConfirm={handleConfirmUnreserve}
        message={
          modalData
            ? `Unreserve "${modalData.itemName}" from ${modalData.bossName} in ${modalData.raidName}?`
            : ""
        }
      />
    </div>
  );
}

function AdminPanel({ raid, reserves, allRaids }) {
  const [selectedBoss, setSelectedBoss] = useState(null);

  function countBossReserves(boss) {
    let total = 0;

    boss.items.forEach(item => {
      const key = `${boss.name}-${item.name}`;
      const arr = reserves[key];
      if (Array.isArray(arr) && arr.length > 0) total++;
    });

    return total;
  }

  function buildRowsForRaid(raidObj) {
    const rows = [];

    raidObj.bosses.forEach(boss => {
      boss.items.forEach(item => {
        const key = `${boss.name}-${item.name}`;
        const arr = Array.isArray(reserves[key]) ? reserves[key] : [];

        if (arr.length > 0) {
          rows.push({
            raid: raidObj.name,
            boss: boss.name,
            item: item.name,
            reservedBy: arr.join(", ")
          });
        }
      });
    });

    return rows;
  }

  function downloadTxt(filename, rows) {
    const header = "Raid | Boss | Item | ReservedBy\n";
    const body = rows
      .map(r => `${r.raid} | ${r.boss} | ${r.item} | ${r.reservedBy}`)
      .join("\n");

    const blob = new Blob([header + body], {
      type: "text/plain;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportThisRaid() {
    const rows = buildRowsForRaid(raid);
    downloadTxt(`${raid.name}-reserves.txt`, rows);
  }

  function exportAllRaids() {
    let rows = [];
    allRaids.forEach(r => {
      rows = rows.concat(buildRowsForRaid(r));
    });
    downloadTxt("all-raids-reserves.txt", rows);
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Admin Panel — {raid.name}</h2>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <button
          onClick={exportThisRaid}
          style={{
            padding: "0.4rem 0.8rem",
            cursor: "pointer",
            border: "1px solid #555",
            background: "#222",
            color: "white"
          }}
        >
          Export This Raid
        </button>
        <button
          onClick={exportAllRaids}
          style={{
            padding: "0.4rem 0.8rem",
            cursor: "pointer",
            border: "1px solid #555",
            background: "#222",
            color: "white"
          }}
        >
          Export All Reserves
        </button>
      </div>

      {raid.bosses.map(boss => {
        const count = countBossReserves(boss);

        return (
          <div
            key={boss.name}
            style={{
              marginTop: "1rem",
              padding: "1rem",
              border: "1px solid #555",
              borderRadius: "4px",
              cursor: "pointer"
            }}
            onClick={() =>
              setSelectedBoss(selectedBoss === boss.name ? null : boss.name)
            }
          >
            <h3>
              {boss.name}
              <span style={{ marginLeft: "0.5rem", color: "#ffcc00" }}>
                ({count})
              </span>
            </h3>

            {selectedBoss === boss.name && (
              <ul style={{ marginTop: "0.5rem" }}>
                {boss.items.map(item => {
                  const key = `${boss.name}-${item.name}`;
                  const arr = Array.isArray(reserves[key]) ? reserves[key] : [];

                  return (
                    <li key={item.name} style={{ marginBottom: "0.5rem" }}>
                      <strong>{item.name}</strong>

                      {arr.length > 0 ? (
                        <span
                          style={{ marginLeft: "0.5rem", color: "#ffcc00" }}
                        >
                          — {arr.length} reserve(s): {arr.join(", ")}
                        </span>
                      ) : (
                        <span style={{ marginLeft: "0.5rem", color: "#9cf" }}>
                          — No reserves
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfirmModal({ isOpen, onCancel, onConfirm, message }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        style={{
          background: "#222",
          color: "#eee",
          padding: "1.5rem",
          borderRadius: "6px",
          border: "1px solid #555",
          minWidth: "280px",
          maxWidth: "400px",
          boxShadow: "0 0 12px rgba(0, 0, 0, 0.7)"
        }}
      >
        <p style={{ marginBottom: "1rem" }}>{message}</p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem"
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "0.3rem 0.8rem",
              background: "#333",
              color: "#eee",
              border: "1px solid #555",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.3rem 0.8rem",
              background: "#aa3333",
              color: "#eee",
              border: "1px solid #cc4444",
              cursor: "pointer"
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
