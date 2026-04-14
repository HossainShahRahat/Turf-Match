import React, { useEffect, useState } from "react";
import { Users, LogIn } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { apiRequest } from "../lib/api-client.js";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetails, setPlayerDetails] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState({
    _id: "",
    name: "",
    email: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const filteredPlayers = players.filter((player) =>
    (player?.name || "").toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

  // Load all players on mount
  useEffect(() => {
    const loadAllPlayers = async () => {
      setLoading(true);
      setMessage("Loading players...");
      setMessageType("info");
      try {
        const data = await apiRequest("/players");
        const playerList = data.players || [];
        setPlayers(playerList);
        if (playerList.length === 0) {
          setMessage("No players are registered yet.");
          setMessageType("warning");
        } else {
          setMessage(
            `Loaded ${playerList.length} player${playerList.length !== 1 ? "s" : ""}.`,
          );
          setMessageType("success");
        }
      } catch (error) {
        setPlayers([]);
        setMessage(`Could not load players: ${error.message}`);
        setMessageType("error");
      }
      setLoading(false);
    };
    loadAllPlayers();
  }, []);

  // Load player details when selected
  const loadPlayerDetails = async (playerId) => {
    try {
      const token = localStorage.getItem("token");
      const data = await apiRequest(`/players/profile/${playerId}`, {
        ...(token ? { token } : {}),
      });
      setPlayerDetails(data.player);
    } catch (error) {
      setPlayerDetails(null);
      setMessage(`Could not load player details: ${error.message}`);
      setMessageType("error");
    }
  };

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player);
    setPlayerDetails(null);
    loadPlayerDetails(player.playerId);
  };

  const openEditPlayer = (player) => {
    if (!user) return;
    setEditingPlayer({
      _id: player?._id || "",
      name: player?.name || "",
      email: player?.email || "",
    });
    setShowEditModal(true);
  };

  const handleAdminEditPlayer = async (e) => {
    e.preventDefault();
    if (!editingPlayer._id) return;
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setMessage("Admin session required to edit player.");
      setMessageType("error");
      return;
    }

    try {
      const data = await apiRequest(`/players/${editingPlayer._id}`, {
        method: "PATCH",
        token,
        body: {
          name: editingPlayer.name,
          email: editingPlayer.email,
        },
      });

      setPlayers((prev) =>
        prev.map((player) =>
          player._id === editingPlayer._id
            ? {
                ...player,
                name: data?.player?.name ?? editingPlayer.name,
                email: data?.player?.email ?? editingPlayer.email,
              }
            : player,
        ),
      );
      if (selectedPlayer?._id === editingPlayer._id) {
        setSelectedPlayer((prev) =>
          prev
            ? {
                ...prev,
                name: data?.player?.name ?? editingPlayer.name,
                email: data?.player?.email ?? editingPlayer.email,
              }
            : prev,
        );
      }
      setPlayerDetails((prev) =>
        prev && prev.playerId === (data?.player?.playerId || prev.playerId)
          ? {
              ...prev,
              name: data?.player?.name ?? prev.name,
              email: data?.player?.email ?? prev.email,
            }
          : prev,
      );
      setShowEditModal(false);
      setMessage("Player profile updated.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not update player: ${error.message}`);
      setMessageType("error");
    }
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
            : "View all registered players (player login required for full profile details)"}
        </p>
      </div>

      <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
        <div className="card-body p-5">
          <h2 className="card-title text-lg">How to use this page</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Search players</p>
              <p className="opacity-75">Use the search box to quickly find a player by name.</p>
            </div>
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Select a player</p>
              <p className="opacity-75">Click any player card to open that player&apos;s profile section.</p>
            </div>
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Login note</p>
              <p className="opacity-75">Full private profile data is visible after player login.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md">
        <label htmlFor="players-search" className="sr-only">
          Search player by name
        </label>
        <input
          id="players-search"
          name="playerSearch"
          type="search"
          autoComplete="off"
          className="input input-bordered w-full"
          placeholder="Search player by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
      ) : filteredPlayers.length > 0 ? (
        <div className="space-y-6">
          {/* Player selection grid */}
          <div>
            <h2 className="text-xl font-bold mb-4">👥 Select a Player</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlayers.map((player) => (
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
                    {user && (
                      <p className="text-sm opacity-70 font-mono">
                        ID: {player.playerId}
                      </p>
                    )}
                    {player.email && (
                      <p className="text-sm opacity-60 truncate">
                        {player.email}
                      </p>
                    )}
                    <div className="pt-2 flex items-center gap-2 text-xs opacity-60">
                      {user ? (
                        <span className="badge badge-sm badge-success">
                          Profile Access Enabled
                        </span>
                      ) : (
                        <span className="badge badge-sm badge-outline">
                          Player Login For Full Details
                        </span>
                      )}
                    </div>
                    {user && (
                      <button
                        type="button"
                        className="btn btn-xs btn-outline mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditPlayer(player);
                        }}
                      >
                        Edit
                      </button>
                    )}
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
                      {user && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline mb-3"
                          onClick={() =>
                            openEditPlayer({
                              _id: selectedPlayer?._id,
                              name: playerDetails.name,
                              email: playerDetails.email,
                            })
                          }
                        >
                          Edit Player
                        </button>
                      )}
                      <div className="space-y-2 text-lg opacity-80">
                        {user && (
                          <p>
                            <span className="font-semibold">Player ID:</span>
                            <span className="font-mono ml-2">
                              {playerDetails.playerId}
                            </span>
                          </p>
                        )}
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
                  Player login is required to view full details
                </p>
                <p className="text-sm opacity-60">
                  Use Player Login with your Player ID to access complete stats
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body text-center py-12">
            <Users className="w-12 h-12 mx-auto opacity-50 mb-4" />
            <p className="text-lg opacity-60">
              {players.length ? "No players match your search" : "No players registered yet"}
            </p>
          </div>
        </div>
      )}

      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowEditModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form className="modal-box max-w-md space-y-4" onSubmit={handleAdminEditPlayer}>
              <h3 className="font-bold text-lg">Edit Player</h3>
              <div className="space-y-2">
                <label htmlFor="edit-player-name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="edit-player-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="input input-bordered w-full"
                  placeholder="Name"
                  value={editingPlayer.name}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-player-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="edit-player-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="input input-bordered w-full"
                  placeholder="Email"
                  value={editingPlayer.email}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, email: e.target.value })
                  }
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-info">
                  Save
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}
    </div>
  );
}
