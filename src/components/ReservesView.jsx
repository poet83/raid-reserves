// src/components/ReservesView.jsx
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

function ReservesView() {
  const [reserves, setReserves] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "reserves"),
      orderBy("raidName"),
      orderBy("bossName")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setReserves(data);
    });
    return () => unsub();
  }, []);

  return (
    <div style={{ marginTop: "24px" }}>
      <h2>All Reserves</h2>
      {reserves.length === 0 ? (
        <p>No reserves yet.</p>
      ) : (
        <table border="1" cellPadding="4" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Raid</th>
              <th>Boss</th>
              <th>Item</th>
              <th>Player</th>
            </tr>
          </thead>
          <tbody>
            {reserves.map((r) => (
              <tr key={r.id}>
                <td>{r.raidName}</td>
                <td>{r.bossName}</td>
                <td>
                  [{r.itemID}] {r.itemName}
                </td>
                <td>{r.player}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ReservesView;
