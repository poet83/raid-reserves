// src/components/RaidList.jsx
function RaidList({ raids, selectedRaidId, onSelectRaid }) {
  return (
    <div>
      <h2>Raids</h2>
      <ul>
        {raids.map((raid) => (
          <li
            key={raid.id}
            style={{
              cursor: "pointer",
              fontWeight: raid.id === selectedRaidId ? "bold" : "normal",
              marginBottom: "4px"
            }}
            onClick={() => onSelectRaid(raid.id)}
          >
            {raid.name} <span style={{ opacity: 0.6 }}>({raid.expansion})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RaidList;
