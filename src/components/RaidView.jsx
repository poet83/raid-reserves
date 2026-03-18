// src/components/RaidView.jsx
import { useState } from "react";
import ReserveModal from "./ReserveModal";

function RaidView({ raid }) {
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleItemClick = (boss, item) => {
    setSelectedBoss(boss);
    setSelectedItem(item);
  };

  return (
    <div>
      <h2>{raid.name}</h2>
      <div style={{ display: "flex", gap: "24px" }}>
        <div style={{ minWidth: "200px" }}>
          <h3>Bosses</h3>
          <ul>
            {raid.bosses.map((boss) => (
              <li
                key={boss.name}
                style={{
                  cursor: "pointer",
                  fontWeight:
                    selectedBoss && selectedBoss.name === boss.name
                      ? "bold"
                      : "normal",
                  marginBottom: "4px"
                }}
                onClick={() => setSelectedBoss(boss)}
              >
                {boss.name}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Loot</h3>
          {selectedBoss ? (
            <ul>
              {selectedBoss.items.map((item) => (
                <li
                  key={item.itemID}
                  style={{ cursor: "pointer", marginBottom: "4px" }}
                  onClick={() => handleItemClick(selectedBoss, item)}
                >
                  [{item.itemID}] {item.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>Select a boss to view loot.</p>
          )}
        </div>
      </div>

      {selectedItem && selectedBoss && (
        <ReserveModal
          raid={raid}
          boss={selectedBoss}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

export default RaidView;
