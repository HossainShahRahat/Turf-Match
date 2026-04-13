import React, { useState } from "react";
import { apiUrl } from "../lib/config.js";

export default function PlayerProfile() {
  const [player, setPlayer] = useState(null);
  const [message, setMessage] = useState("Enter player ID to load profile");
  const [loading, setLoading] = useState(false);

  const loadProfile = async (playerId) => {
    setLoading(true);
    setMessage("Loading player profile...");
    try {
      const response = await fetch(apiUrl(`/players/profile/${playerId}`));
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Player not found");
      setPlayer(data.player);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
      setPlayer(null);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const playerId = e.target.playerId.value.trim();
    loadProfile(playerId);
  };

  return (
    <div>
      <form className="mb-8" onSubmit={handleSubmit}>
        <div className="flex gap-4">
          <input
            id="playerId"
            type="text"
            className="input input-bordered flex-1 max-w-xs"
            placeholder="Player ID"
          />
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Loading..." : "Load Profile"}
          </button>
        </div>
      </form>

      {message && !player && <div className="alert alert-info">{message}</div>}

      {player && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h1 className="card-title text-2xl">{player.name}</h1>
            <p className="opacity-70">ID: {player.playerId}</p>
            <p>Position: {player.position || "-"}</p>
            <p>Team: {player.team || "-"}</p>
            <p>Goals: {player.stats?.goals || 0}</p>
            <p>Matches: {player.stats?.matches || 0}</p>
            <p>Yellow Cards: {player.stats?.yellowCards || 0}</p>
            <p>Red Cards: {player.stats?.redCards || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
