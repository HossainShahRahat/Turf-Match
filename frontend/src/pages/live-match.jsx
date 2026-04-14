import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Activity, Plus, ShieldAlert, Trophy } from "lucide-react";
import { socketBaseUrl } from "../lib/config.js";
import { useAuth } from "../lib/auth.jsx";
import { apiRequest } from "../lib/api-client.js";

export default function LiveMatch() {
  const { user, getToken } = useAuth();
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [goalMinute, setGoalMinute] = useState("");
  const [cardMinute, setCardMinute] = useState("");
  const [cardType, setCardType] = useState("yellow");
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const resetEventForm = () => {
    setGoalMinute("");
    setCardMinute("");
    setCardType("yellow");
    setSelectedPlayerId("");
    setSelectedTeamIndex(0);
  };

  const syncUpdatedMatch = (updatedMatch) => {
    setSelectedMatch(updatedMatch);
    setLiveMatches((matches) =>
      matches.map((m) => (m._id === updatedMatch._id ? updatedMatch : m)),
    );
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!selectedMatch || !selectedPlayerId) {
      setMessage("Select a player first.");
      setMessageType("error");
      return;
    }

    try {
      const token = getToken();
      const data = await apiRequest(`/matches/${selectedMatch._id}/goals`, {
        method: "POST",
        token,
        body: {
          playerId: selectedPlayerId,
          minute: goalMinute || 0,
        },
      });

      syncUpdatedMatch(data.match);
      setShowAddGoalModal(false);
      resetEventForm();
      setMessage("Goal added.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not add goal: ${error.message}`);
      setMessageType("error");
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!selectedMatch || !selectedPlayerId) {
      setMessage("Select a player first.");
      setMessageType("error");
      return;
    }

    try {
      const token = getToken();
      const data = await apiRequest(`/matches/${selectedMatch._id}/cards`, {
        method: "POST",
        token,
        body: {
          playerId: selectedPlayerId,
          minute: cardMinute || 0,
          type: cardType,
        },
      });

      syncUpdatedMatch(data.match);
      setShowAddCardModal(false);
      resetEventForm();
      setMessage(`${cardType === "yellow" ? "Yellow" : "Red"} card added.`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not add card: ${error.message}`);
      setMessageType("error");
    }
  };

  function renderMatch(matchData) {
    if (!matchData) return null;

    const yellowCount =
      matchData.cards?.filter((card) => card.type === "yellow").length || 0;
    const redCount =
      matchData.cards?.filter((card) => card.type === "red").length || 0;

    return (
      <div className="space-y-6">
        <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10 shadow-sm">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-2xl font-bold">
                  {matchData.teams[0]?.name || "Team A"}
                </h2>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="text-5xl font-mono font-bold">
                  <span className="text-primary">
                    {matchData.score?.teamA || 0}
                  </span>
                  <span className="mx-4 opacity-50">-</span>
                  <span className="text-secondary">
                    {matchData.score?.teamB || 0}
                  </span>
                </div>
                <div
                  className={`badge badge-lg ${
                    matchData.status === "live"
                      ? "badge-success animate-pulse"
                      : "badge-warning"
                  }`}
                >
                  {matchData.status?.toUpperCase() || "PENDING"}
                </div>
              </div>
              <div className="flex-1 text-center lg:text-right">
                <h2 className="text-2xl font-bold">
                  {matchData.teams[1]?.name || "Team B"}
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title text-xl">Goals</h3>
              {user && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    onClick={() => setShowAddCardModal(true)}
                  >
                    <ShieldAlert className="w-4" />
                    Add Card
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowAddGoalModal(true)}
                  >
                    <Plus className="w-4" />
                    Add Goal
                  </button>
                </div>
              )}
            </div>
            {matchData.goals && matchData.goals.length > 0 ? (
              <div className="space-y-3">
                {matchData.goals.map((goal, index) => {
                  const teamName =
                    goal.teamIndex === 0
                      ? matchData.teams[0]?.name || "Team A"
                      : matchData.teams[1]?.name || "Team B";
                  return (
                    <div
                      key={`goal-${index}`}
                      className="flex items-center gap-4 p-3 rounded-lg bg-base-200/50 hover:bg-base-200"
                    >
                      <div className="font-mono text-sm font-bold opacity-70 w-12">
                        {goal.minute}'
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {goal.player?.name || "Unknown Player"}
                        </div>
                        <div className="text-xs opacity-60">{teamName}</div>
                      </div>
                      <div className="text-xs opacity-60">
                        {goal.player?.playerId || "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 opacity-60">
                No goals scored yet
              </div>
            )}
          </div>
        </div>

        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title text-xl">Cards</h3>
              <div className="text-sm opacity-70">
                {matchData.cards?.length || 0} total
              </div>
            </div>
            {matchData.cards && matchData.cards.length > 0 ? (
              <div className="space-y-3">
                {matchData.cards.map((card, index) => {
                  const teamName =
                    card.teamIndex === 0
                      ? matchData.teams[0]?.name || "Team A"
                      : matchData.teams[1]?.name || "Team B";
                  return (
                    <div
                      key={`card-${index}`}
                      className="flex items-center gap-4 p-3 rounded-lg bg-base-200/50 hover:bg-base-200"
                    >
                      <div className="font-mono text-sm font-bold opacity-70 w-12">
                        {card.minute}'
                      </div>
                      <div
                        className={`badge ${
                          card.type === "yellow"
                            ? "badge-warning"
                            : "badge-error"
                        }`}
                      >
                        {card.type.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {card.player?.name || "Unknown Player"}
                        </div>
                        <div className="text-xs opacity-60">{teamName}</div>
                      </div>
                      <div className="text-xs opacity-60">
                        {card.player?.playerId || "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 opacity-60">
                No cards issued yet
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
            <div className="card-body">
              <h4 className="font-semibold mb-2">Match Status</h4>
              <div className="text-2xl font-mono font-bold capitalize">
                {matchData.status || "PENDING"}
              </div>
            </div>
          </div>
          <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
            <div className="card-body">
              <h4 className="font-semibold mb-2">Total Goals</h4>
              <div className="text-2xl font-mono font-bold">
                {matchData.goals?.length || 0}
              </div>
            </div>
          </div>
          <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
            <div className="card-body">
              <h4 className="font-semibold mb-2">Yellow Cards</h4>
              <div className="text-2xl font-mono font-bold text-warning">
                {yellowCount}
              </div>
            </div>
          </div>
          <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
            <div className="card-body">
              <h4 className="font-semibold mb-2">Red Cards</h4>
              <div className="text-2xl font-mono font-bold text-error">
                {redCount}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const loadAllLiveMatches = async () => {
      setLoading(true);
      setMessage("Loading live matches...");
      setMessageType("info");
      try {
        const data = await apiRequest("/matches/schedule/upcoming");

        const live = (data.matches || []).filter((m) => m.status === "live");
        setLiveMatches(live);

        if (live.length === 0) {
          setMessage("No live matches right now. Check again soon.");
          setMessageType("warning");
        } else {
          setMessage(
            `Live now: ${live.length} match${live.length !== 1 ? "es" : ""}.`,
          );
          setMessageType("success");
          setSelectedMatch(live[0]);
        }
      } catch (error) {
        setMessage(`Could not load live matches: ${error.message}`);
        setMessageType("error");
        setLiveMatches([]);
      }
      setLoading(false);
    };

    loadAllLiveMatches();

    const token = getToken();
    const socket = io(socketBaseUrl(), {
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("match:updated", (updatedMatch) => {
      if (selectedMatch?._id === updatedMatch._id) {
        setSelectedMatch(updatedMatch);
      }

      setLiveMatches((matches) => {
        const updated = matches.map((m) =>
          m._id === updatedMatch._id ? updatedMatch : m,
        );
        return updated.filter((m) => m.status === "live");
      });
    });

    socket.on("match:statusChanged", (data) => {
      const { matchId, status } = data;
      setLiveMatches((matches) => matches.filter((m) => m._id !== matchId));

      if (selectedMatch?._id === matchId) {
        setSelectedMatch(null);
        setMessage(`Match status updated to ${status}.`);
        setMessageType("success");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [getToken, selectedMatch?._id]);

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-success animate-pulse" />
          Live Matches
        </h1>
        <p className="text-lg opacity-70">Real-time match updates</p>
      </div>

      <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
        <div className="card-body p-5">
          <h2 className="card-title text-lg">How to use this page</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Select a live match</p>
              <p className="opacity-75">Click a live match card to open match details.</p>
            </div>
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Track events in real time</p>
              <p className="opacity-75">Goals, cards, and score update automatically.</p>
            </div>
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Admin tools</p>
              <p className="opacity-75">Add Goal/Add Card buttons appear only for admin login.</p>
            </div>
          </div>
        </div>
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
            <p className="mt-4 opacity-60">Loading live matches...</p>
          </div>
        </div>
      ) : liveMatches.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveMatches.map((match) => (
              <div
                key={match._id}
                onClick={() => setSelectedMatch(match)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition transform hover:scale-105 ${
                  selectedMatch?._id === match._id
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-base-200/30 hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-success animate-pulse" />
                  <span className="badge badge-success badge-sm">LIVE</span>
                </div>
                <div className="font-bold text-sm mb-2">
                  {match.teams[0]?.name || "Team A"} vs{" "}
                  {match.teams[1]?.name || "Team B"}
                </div>
                <div className="text-2xl font-mono font-bold text-center">
                  <span className="text-primary">
                    {match.score?.teamA || 0}
                  </span>
                  <span className="mx-2 opacity-50">-</span>
                  <span className="text-secondary">
                    {match.score?.teamB || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {selectedMatch && (
            <div className="border-t border-white/10 pt-8">
              <h2 className="text-2xl font-bold mb-6">Live Match Details</h2>
              {renderMatch(selectedMatch)}
            </div>
          )}
        </div>
      ) : (
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body text-center py-16">
            <Trophy className="w-12 h-12 mx-auto opacity-30 mb-4" />
            <p className="text-xl opacity-60 mb-2">No Live Matches</p>
            <p className="text-sm opacity-50">
              Check back soon for upcoming matches
            </p>
          </div>
        </div>
      )}

      {showAddGoalModal && selectedMatch && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddGoalModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form className="modal-box max-w-md space-y-4" onSubmit={handleAddGoal}>
              <h3 className="font-bold text-lg">
                Add Goal to {selectedMatch.teams[selectedTeamIndex]?.name || "Team"}
              </h3>

              <fieldset className="space-y-2">
                <legend className="block text-sm font-semibold">Team</legend>
                <div className="flex gap-2">
                  {selectedMatch.teams.map((team, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedTeamIndex(idx);
                        setSelectedPlayerId("");
                      }}
                      className={`flex-1 btn btn-sm ${
                        selectedTeamIndex === idx ? "btn-primary" : "btn-outline"
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label
                  htmlFor="goal-player"
                  className="block text-sm font-semibold"
                >
                  Player Scorer
                </label>
                <select
                  id="goal-player"
                  name="goalPlayer"
                  className="select select-bordered w-full"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  required
                >
                  <option value="">Select a player...</option>
                  {selectedMatch.teams[selectedTeamIndex]?.players?.map((player) => (
                    <option key={player._id} value={player._id}>
                      {player.name} ({player.playerId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="goal-minute"
                  className="block text-sm font-semibold"
                >
                  Minute (optional)
                </label>
                <input
                  id="goal-minute"
                  name="goalMinute"
                  type="number"
                  min="0"
                  max="120"
                  placeholder="45"
                  className="input input-bordered w-full"
                  value={goalMinute}
                  onChange={(e) => setGoalMinute(e.target.value)}
                />
              </div>

              <div className="modal-action gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddGoalModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus className="w-4" />
                  Add Goal
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}

      {showAddCardModal && selectedMatch && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddCardModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form className="modal-box max-w-md space-y-4" onSubmit={handleAddCard}>
              <h3 className="font-bold text-lg">
                Add Card to {selectedMatch.teams[selectedTeamIndex]?.name || "Team"}
              </h3>

              <fieldset className="space-y-2">
                <legend className="block text-sm font-semibold">Team</legend>
                <div className="flex gap-2">
                  {selectedMatch.teams.map((team, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedTeamIndex(idx);
                        setSelectedPlayerId("");
                      }}
                      className={`flex-1 btn btn-sm ${
                        selectedTeamIndex === idx ? "btn-primary" : "btn-outline"
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label
                  htmlFor="card-type"
                  className="block text-sm font-semibold"
                >
                  Card Type
                </label>
                <select
                  id="card-type"
                  name="cardType"
                  className="select select-bordered w-full"
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                >
                  <option value="yellow">Yellow Card</option>
                  <option value="red">Red Card</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="card-player" className="block text-sm font-semibold">
                  Player
                </label>
                <select
                  id="card-player"
                  name="cardPlayer"
                  className="select select-bordered w-full"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  required
                >
                  <option value="">Select a player...</option>
                  {selectedMatch.teams[selectedTeamIndex]?.players?.map((player) => (
                    <option key={player._id} value={player._id}>
                      {player.name} ({player.playerId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="card-minute"
                  className="block text-sm font-semibold"
                >
                  Minute (optional)
                </label>
                <input
                  id="card-minute"
                  name="cardMinute"
                  type="number"
                  min="0"
                  max="120"
                  placeholder="45"
                  className="input input-bordered w-full"
                  value={cardMinute}
                  onChange={(e) => setCardMinute(e.target.value)}
                />
              </div>

              <div className="modal-action gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddCardModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${cardType === "yellow" ? "btn-warning" : "btn-error"}`}
                >
                  <ShieldAlert className="w-4" />
                  Add Card
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}
    </div>
  );
}
