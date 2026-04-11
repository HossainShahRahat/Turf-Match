import React, { useEffect, useState } from "react";
import { apiUrl } from "../lib/config.js";

export default function PlayerDashboard() {
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState("Player dashboard coming soon");
  const [loading, setLoading] = useState(false);

  // Placeholder for authenticated player stats
  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Assume token in localStorage or apiUrl handles auth
      const response = await fetch(apiUrl("/players/me/stats"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to load dashboard");
      setStats(data);
      setMessage("");
    } catch (error) {
      setMessage("Login required for dashboard");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div>
      {loading && <div className="alert alert-info">Loading dashboard...</div>}
      {message && <div className="alert alert-info">{message}</div>}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card bg-base-100 shadow">
            <div className="card-body text-center">
              <h2 className="card-title">Goals</h2>
              <p className="text-3xl font-bold">{stats.goals}</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow">
            <div className="card-body text-center">
              <h2 className="card-title">Assists</h2>
              <p className="text-3xl font-bold">{stats.assists}</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow">
            <div className="card-body text-center">
              <h2 className="card-title">Matches</h2>
              <p className="text-3xl font-bold">{stats.matches}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
