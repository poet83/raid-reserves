import { useState, useEffect } from "react";
import raids from "./data/raids.json";
import { auth, db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot
} from "firebase/firestore";

// Store player name in Firestore under players/{uid}
async function savePlayerName(name) {
  const trimmed = name.trim();
  if (!trimmed || !auth.currentUser) return;

  await setDoc(doc(db, "players", auth.currentUser.uid), {
    name: trimmed
  });
}

function App() {
  const [selectedRaidId, setSelectedRaidId] = useState(null);
  const [reserves, setReserves] = useState({});
  const [playerNames, setPlayerNames] = useState({});
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

  // Real-time player names listener (UID -> name)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "players"), snapshot => {
      const map = {};
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        map[docSnap.id] = d.name || docSnap.id;
      });
      setPlayerNames(map);
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
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const docId = `${raidId}-${bossName}-${itemName}`;
  const ref = doc(db, "reserves", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const current = Array.isArray(data.reservedBy) ? data.reservedBy : [];
  const updated = current.filter(x => x !== uid);

  if (updated.length === 0) {
    await deleteDoc(ref);
  } else {
    await updateDoc(ref, { reservedBy: updated });
  }
}

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
  <h1
    style={{
      margin: 0,
      fontSize: "3rem",
      letterSpacing: "0.1rem",
      color: "#f8e6a0",
      textShadow:
        "0 0 6px rgba(255, 215, 0, 0.6), 0 0 12px rgba(255, 215, 0, 0.4)"
    }}
  >
    NOVA
  </h1>

  <div style={{ height: "1.5rem" }}></div> {/* spacing */}

  <h2
    style={{
      margin: 0,
      fontSize: "1.6rem",
      color: "#e0d8c0",
      letterSpacing: "0.05rem",
      textShadow:
        "0 0 4px rgba(255, 255, 255, 0.4), 0 0 8px rgba(255, 255, 255, 0.2)"
    }}
  >
    Raid Item Reserves
  </h2>
</div>
<div
  style={{
    textAlign: "center",
    marginBottom: "2rem",
    color: "#e8e0c0",
    fontSize: "1rem",
    maxWidth: "700px",
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: "1.4",
    opacity: 0.95
  }}
>
  Welcome to NOVA's <strong>OFFICIAL</strong> raid loot soft reserve app!  
  Here you can select <strong>TWO</strong> items from every raid as your preferred loot.  
  This will drastically increase your chances of winning your roll when the time comes and your item drops.

  <br /><br />

  You can also export everyone's reserves to a <strong>.txt</strong> file under <em>Current Reserves</em>.
</div>



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
          playerNames={playerNames}
          unreserveItem={unreserveItem}
        />
      ) : selectedRaid ? (
        adminMode ? (
          <AdminPanel
            raid={selectedRaid}
            reserves={reserves}
            allRaids={raidList}
            playerNames={playerNames}
          />
        ) : (
          <RaidDetail
            raid={selectedRaid}
            reserves={reserves}
            playerNames={playerNames}
            unreserveItem={unreserveItem}
          />
        )
      ) : (
        <p>Select a raid to view bosses and items.</p>
      )}
    </div>
  );
}

function RaidDetail({ raid, reserves, playerNames, unreserveItem }) {
  const [playerName, setPlayerName] = useState("");
  const [selectedBoss, setSelectedBoss] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("playerName");
    if (saved) setPlayerName(saved);
  }, []);

  const trimmedName = playerName.trim();
  const uid = auth.currentUser?.uid || null;

  const playerReserveCountForThisRaid = raid.bosses.reduce((count, boss) => {
  boss.items.forEach(item => {
    const key = `${boss.name}-${item.name}`;
    const arr = reserves[key];
    if (Array.isArray(arr) && uid && arr.includes(uid)) {
      count++;
    }
  });
  return count;
}, 0);


  async function reserveItem(raidId, bossName, itemName) {
    if (!trimmedName) {
      alert("Please enter your character name first.");
      return;
    }

    if (!uid) {
      alert("No user ID available yet. Try refreshing.");
      return;
    }

    if (playerReserveCountForThisRaid >= 2) {
  alert("You have reached the maximum of 2 reserves for this raid.");
  return;
}


    const docId = `${raidId}-${bossName}-${itemName}`;
    const ref = doc(db, "reserves", docId);
    const existing = await getDoc(ref);

    if (existing.exists()) {
      const data = existing.data();
      const current = Array.isArray(data.reservedBy) ? data.reservedBy : [];

      if (current.includes(uid)) {
        alert("You already reserved this item.");
        return;
      }

      await setDoc(ref, {
        raid: raidId,
        boss: bossName,
        item: itemName,
        reservedBy: [...current, uid]
      });
    } else {
      await setDoc(ref, {
        raid: raidId,
        boss: bossName,
        item: itemName,
        reservedBy: [uid]
      });
    }

    // Also save the display name for this UID
    await savePlayerName(trimmedName);
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
            savePlayerName(e.target.value);
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
            <ul style={{ marginTop: "0.5rem", listStyle: "none", paddingLeft: 0 }}>
              {boss.items.map(item => {
                const key = `${boss.name}-${item.name}`;
                const arr = Array.isArray(reserves[key]) ? reserves[key] : [];

                let color = "#9cf";
                if (arr.length === 1) color = "#ffcc00";
                if (arr.length >= 2) color = "#ff5555";

                const displayNames = arr.map(
                  id => playerNames[id] || id
                );

                const userHasThisReserved = uid && arr.includes(uid);

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
        — Reserved by: {displayNames.join(", ")}
      </span>
    )}

    {userHasThisReserved && (
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

function MyReservesView({ raids, reserves, playerNames, unreserveItem }) {
  const [playerName, setPlayerName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("playerName");
    if (saved) setPlayerName(saved);
  }, []);

  const trimmedName = playerName.trim();
  const uid = auth.currentUser?.uid || null;

  const grouped = {};

  raids.forEach(raid => {
    raid.bosses.forEach(boss => {
      boss.items.forEach(item => {
        const key = `${boss.name}-${item.name}`;
        const arr = reserves[key];

        if (Array.isArray(arr) && uid && arr.includes(uid)) {
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
    await unreserveItem(
      modalData.raidId,
      modalData.bossName,
      modalData.itemName
    );
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
              <ul style={{ marginTop: "0.5rem", listStyle: "none", paddingLeft: 0 }}>
                {items.map(item => {
  const key = `${item.bossName}-${item.itemName}`;
  const arr = Array.isArray(reserves[key]) ? reserves[key] : [];

  // Same color logic as RaidDetail & AdminPanel
  let color = "#9cf";
  if (arr.length === 1) color = "#ffcc00";
  if (arr.length >= 2) color = "#ff5555";

  return (
    <li
      key={item.itemName}
      style={{
        marginBottom: "0.25rem",
        color: color
      }}
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
  );
})}

              </ul>
            </div>
          ))}
        </div>
      ))}

      {/* Assuming you already have ConfirmModal defined somewhere */}
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

function AdminPanel({ raid, reserves, allRaids, playerNames }) {
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
          const displayNames = arr.map(
            id => playerNames[id] || id
          );

          rows.push({
            raid: raidObj.name,
            boss: boss.name,
            item: item.name,
            reservedBy: displayNames.join(", ")
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
              <ul style={{ marginTop: "0.5rem", listStyle: "none", paddingLeft: 0 }}>
                {boss.items.map(item => {
  const key = `${boss.name}-${item.name}`;
  const arr = Array.isArray(reserves[key]) ? reserves[key] : [];
  const displayNames = arr.map(id => playerNames[id] || id);

  // Color logic MUST come AFTER arr is defined
  const count = arr.length;
  let color = "#9cf";
  if (count === 1) color = "#ffcc00";
  if (count >= 2) color = "#ff5555";

  return (
    <li
      key={item.name}
      style={{
        padding: "0.25rem 0",
        color: color
      }}
    >
      {item.name}

      {arr.length > 0 && (
        <span style={{ marginLeft: "0.5rem" }}>
          — Reserved by: {displayNames.join(", ")}
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
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}
    >
      <div
        style={{
          background: "#222",
          padding: "1rem 1.5rem",
          border: "1px solid #555",
          borderRadius: "6px",
          color: "white",
          maxWidth: "300px",
          textAlign: "center"
        }}
      >
        <p style={{ marginBottom: "1rem" }}>{message}</p>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "0.3rem 0.8rem",
              background: "#444",
              border: "1px solid #666",
              color: "white",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            style={{
              padding: "0.3rem 0.8rem",
              background: "#b33",
              border: "1px solid #d55",
              color: "white",
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
