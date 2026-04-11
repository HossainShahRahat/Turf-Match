import React, { useEffect, useState } from "react";
import { apiUrl } from "../lib/config.js";
import { Users, LogIn } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load all players on mount
  useEffect(() => {
    const loadAllPlayers = async () => {
      setLoading(true);
      setMessage("Loading players...");
      setMessageType("info");
      try {
        const response = await fetch(apiUrl("/players"));
        const data = await response.json();
        if (!response.ok) {
          // If admin endpoint fails, just show empty list
          setPlayers([]);
          setMessage("Player list not available");
          setMessageType("warning");
        } else {
          const playerList = data.players || [];
          setPlayers(playerList);
          if (playerList.length === 0) {
            setMessage("No players registered yet");
            setMessageType("warning");
          } else {
            setMessage(
              `✅ Loaded ${playerList.length} player${playerList.length !== 1 ? "s" : ""}`,
            );
            setMessageType("success");
          }
        }
      } catch (error) {
        setPlayers([]);
        setMessage(error.message);
        setMessageType("error");
      }
      setLoading(false);
    };
    loadAllPlayers();
  }, []);

  // Load player details when selected
  const loadPlayerDetails = async (playerId) => {
    try {
      const headers = {};
      const token = localStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(apiUrl(`/players/profile/${playerId}`), {
        headers,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to load player details");
      setPlayerDetails(data.player);
    } catch (error) {
      setPlayerDetails(null);
      setMessage(error.message);
      setMessageType("error");
    }
  };

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player);
    setPlayerDetails(null);
    loadPlayerDetails(player.playerId);
  };

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-info" />
          All Players
        </h1>
        <p className="text-lg opacity-70">
          {user
            ? "View player profiles and stats"
            : "View all registered players (login to see full details)"}
        </p>
      </div>

      {message && (
        <div className={`alert alert-${messageType} shadow-lg`}>
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body text-center py-12">
            <span className="loading loading-spinner loading-lg mx-auto"></span>
            <p className="mt-4 opacity-60">Loading players...</p>
          </div>
        </div>
      ) : players.length > 0 ? (
        <div className="space-y-6">
          {/* Player selection grid */}
          <div>
            <h2 className="text-xl font-bold mb-4">👥 Select a Player</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player._id}
                  onClick={() => handlePlayerSelect(player)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition transform hover:scale-105 ${
                    selectedPlayer?._id === player._id
                      ? "border-info bg-info/10"
                      : "border-white/10 bg-base-200/30 hover:border-info/50"
                  }`}
                >
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">{player.name}</h3>
                    <p className="text-sm opacity-70 font-mono">
                      ID: {player.playerId}
                    </p>
                    {player.email && (
                      <p className="text-sm opacity-60 truncate">
                        {player.email}
                      </p>
                    )}
                    <div className="pt-2 flex items-center gap-2 text-xs opacity-60">
                      {user ? (
                        <span className="badge badge-sm badge-success">
                          Public Data Available
                        </span>
                      ) : (
                        <span className="badge badge-sm badge-outline">
                          Login to View Details
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player details section */}
          {selectedPlayer && playerDetails && (
            <div className="border-t border-white/10 pt-8 space-y-6">
              <h2 className="text-3xl font-bold">Player Profile</h2>

              {/* Hero card */}
              <div className="card bg-gradient-to-br from-info/10 to-success/10 border border-white/10 shadow-sm">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                    <div className="flex-1">
                      <h1 className="text-4xl font-bold mb-3">
                        {playerDetails.name}
                      </h1>
                      <div className="space-y-2 text-lg opacity-80">
                        <p>
                          <span className="font-semibold">Player ID:</span>
                          <span className="font-mono ml-2">
                            {playerDetails.playerId}
                          </span>
                        </p>
                        {playerDetails.email && (
                          <p>
                            <span className="font-semibold">Email:</span>
                            <span className="ml-2">{playerDetails.email}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats cards */}
              {playerDetails.stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
                    <div className="card-body text-center p-4">
                      <h3 className="text-sm opacity-70 font-semibold mb-2">
                        Matches Played
                      </h3>
                      <p className="text-3xl font-mono font-bold text-success">
                        {playerDetails.stats.matches || 0}
                      </p>
                    </div>
                  </div>
                  <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
                    <div className="card-body text-center p-4">
                      <h3 className="text-sm opacity-70 font-semibold mb-2">
                        Goals
                      </h3>
                      <p className="text-3xl font-mono font-bold text-primary">
                        {playerDetails.stats.goals || 0}
                      </p>
                    </div>
                  </div>
                  <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
                    <div className="card-body text-center p-4">
                      <h3 className="text-sm opacity-70 font-semibold mb-2">
                        Assists
                      </h3>
                      <p className="text-3xl font-mono font-bold text-warning">
                        {playerDetails.stats.assists || 0}
                      </p>
                    </div>
                  </div>
                  <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
                    <div className="card-body text-center p-4">
                      <h3 className="text-sm opacity-70 font-semibold mb-2">
                        Market Value
                      </h3>
                      <p className="text-3xl font-mono font-bold text-secondary">
                        ৳{playerDetails.stats.value || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedPlayer && !playerDetails && !loading && (
            <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
              <div className="card-body text-center py-12">
                <LogIn className="w-12 h-12 mx-auto opacity-50 mb-4" />
                <p className="text-lg opacity-70 mb-4">
                  Login as a player to view full details
                </p>
                <p className="text-sm opacity-60">
                  Use your Player ID to login and see complete stats
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body text-center py-12">
            <Users className="w-12 h-12 mx-auto opacity-50 mb-4" />
            <p className="text-lg opacity-60">No players registered yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
