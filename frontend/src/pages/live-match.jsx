import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Activity, Plus, ShieldAlert, Trophy, Clock, Play, Pause, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { socketBaseUrl } from "../lib/config.js";
import { useAuth } from "../lib/auth.jsx";
import { apiRequest } from "../lib/api-client.js";

export default function LiveMatch() {
  const { user, getToken } = useAuth();
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [livePulseMessage, setLivePulseMessage] = useState("");
  const [scoreFlash, setScoreFlash] = useState(false);
  const [eventFlash, setEventFlash] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showEditGoalModal, setShowEditGoalModal] = useState(false);
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [goalMinute, setGoalMinute] = useState("");
  const [cardMinute, setCardMinute] = useState("");
  const [cardType, setCardType] = useState("yellow");
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [assistPlayerId, setAssistPlayerId] = useState("");
  const [editingGoalIndex, setEditingGoalIndex] = useState(null);
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState("00:00");
  const [isOvertime, setIsOvertime] = useState(false);
  const socketRef = useRef(null);
  const selectedMatchIdRef = useRef(null);
  const scoreFlashTimeoutRef = useRef(null);
  const eventFlashTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    selectedMatchIdRef.current = selectedMatch?._id || null;
  }, [selectedMatch?._id]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (scoreFlashTimeoutRef.current)
        clearTimeout(scoreFlashTimeoutRef.current);
      if (eventFlashTimeoutRef.current)
        clearTimeout(eventFlashTimeoutRef.current);
      if (timerIntervalRef.current)
        clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Timer calculation
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (!selectedMatch?.timerRunning) {
      // Calculate static display when paused
      updateTimeDisplay(selectedMatch);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      updateTimeDisplay(selectedMatch);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [selectedMatch?.timerRunning, selectedMatch?.timerStartedAt, selectedMatch?.timerOffset, selectedMatch?.matchDuration, selectedMatch?.timerPausedAt]);

  const updateTimeDisplay = (match) => {
    if (!match) {
      setCurrentTimeDisplay("00:00");
      setIsOvertime(false);
      return;
    }

    const offset = match.timerOffset || 0;
    let elapsedSec = offset;

    if (match.timerRunning && match.timerStartedAt) {
      const now = new Date();
      const started = new Date(match.timerStartedAt);
      elapsedSec += Math.floor((now - started) / 1000);
    } else if (match.timerPausedAt && match.timerStartedAt) {
      const paused = new Date(match.timerPausedAt);
      const started = new Date(match.timerStartedAt);
      elapsedSec += Math.floor((paused - started) / 1000);
    }

    const totalMinutes = Math.floor(elapsedSec / 60);
    const seconds = elapsedSec % 60;
    const matchDuration = match.matchDuration || 90;
    const overtime = Math.max(0, totalMinutes - matchDuration);
    const displayMinute = overtime > 0 ? matchDuration : totalMinutes;

    setIsOvertime(overtime > 0);
    setCurrentTimeDisplay(
      `${String(displayMinute).padStart(2, '0')}${overtime > 0 ? `+${overtime}` : ''}:${String(seconds).padStart(2, '0')}`
    );
  };

  const getCurrentMinute = () => {
    if (!selectedMatch) return 0;
    const offset = selectedMatch.timerOffset || 0;
    let elapsedSec = offset;

    if (selectedMatch.timerRunning && selectedMatch.timerStartedAt) {
      const now = new Date();
      const started = new Date(selectedMatch.timerStartedAt);
      elapsedSec += Math.floor((now - started) / 1000);
    } else if (selectedMatch.timerPausedAt && selectedMatch.timerStartedAt) {
      const paused = new Date(selectedMatch.timerPausedAt);
      const started = new Date(selectedMatch.timerStartedAt);
      elapsedSec += Math.floor((paused - started) / 1000);
    }

    return Math.floor(elapsedSec / 60);
  };

  const resetEventForm = () => {
    setGoalMinute("");
    setCardMinute("");
    setCardType("yellow");
    setSelectedPlayerId("");
    setAssistPlayerId("");
    setSelectedTeamIndex(0);
    setEditingGoalIndex(null);
    setEditingCardIndex(null);
  };

  const announceMatchDelta = (previousMatch, updatedMatch) => {
    if (!previousMatch || !updatedMatch) return;
    const prevA = Number(previousMatch.score?.teamA || 0);
    const prevB = Number(previousMatch.score?.teamB || 0);
    const nextA = Number(updatedMatch.score?.teamA || 0);
    const nextB = Number(updatedMatch.score?.teamB || 0);
    if (prevA !== nextA || prevB !== nextB) {
      setScoreFlash(true);
      if (scoreFlashTimeoutRef.current)
        clearTimeout(scoreFlashTimeoutRef.current);
      scoreFlashTimeoutRef.current = setTimeout(
        () => setScoreFlash(false),
        1200,
      );
    }

    const prevGoals = previousMatch.goals?.length || 0;
    const nextGoals = updatedMatch.goals?.length || 0;
    if (nextGoals > prevGoals) {
      const latestGoal = updatedMatch.goals?.[nextGoals - 1];
      const scorer = latestGoal?.player?.name || "A player";
      setEventFlash(`GOAL! ${scorer} (${nextA}-${nextB})`);
      if (eventFlashTimeoutRef.current)
        clearTimeout(eventFlashTimeoutRef.current);
      eventFlashTimeoutRef.current = setTimeout(() => setEventFlash(""), 1800);
      return;
    }

    const prevCards = previousMatch.cards?.length || 0;
    const nextCards = updatedMatch.cards?.length || 0;
    if (nextCards > prevCards) {
      const latestCard = updatedMatch.cards?.[nextCards - 1];
      const cardPlayer = latestCard?.player?.name || "A player";
      const label = latestCard?.type === "red" ? "Red Card" : "Yellow Card";
      setEventFlash(`${label}: ${cardPlayer}`);
      if (eventFlashTimeoutRef.current)
        clearTimeout(eventFlashTimeoutRef.current);
      eventFlashTimeoutRef.current = setTimeout(() => setEventFlash(""), 1800);
    }
  };

  const syncUpdatedMatch = (updatedMatch) => {
    const previous =
      selectedMatch?._id === updatedMatch._id
        ? selectedMatch
        : liveMatches.find((m) => m._id === updatedMatch._id);
    announceMatchDelta(previous, updatedMatch);
    setSelectedMatch(updatedMatch);
    setLiveMatches((matches) =>
      matches.map((m) => (m._id === updatedMatch._id ? updatedMatch : m)),
    );
  };

  const handleStartTimer = async () => {
    if (!selectedMatch) return;
    try {
      const token = getToken();
      const data = await apiRequest(`/matches/${selectedMatch._id}/timer/start`, {
        method: "POST",
        token,
        body: { matchDuration: selectedMatch.matchDuration || 90 },
      });
      syncUpdatedMatch(data.match);
      setMessage("Timer started.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not start timer: ${error.message}`);
      setMessageType("error");
    }
  };

  const handlePauseTimer = async (finishMatch = false) => {
    if (!selectedMatch) return;
    try {
      const token = getToken();
      const data = await apiRequest(`/matches/${selectedMatch._id}/timer/pause`, {
        method: "POST",
        token,
        body: { finishMatch },
      });
      syncUpdatedMatch(data.match);
      setMessage(finishMatch ? "Match finished." : "Timer paused.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not pause timer: ${error.message}`);
      setMessageType("error");
    }
  };

  const handleCancelMatch = async () => {
    if (!selectedMatch) return;
    const ok = window.confirm("Are you sure you want to cancel and reset this match? All goals, cards, and timer will be cleared.");
    if (!ok) return;
    try {
      const token = getToken();
      const data = await apiRequest(`/matches/${selectedMatch._id}/cancel`, {
        method: "POST",
        token,
      });
      syncUpdatedMatch(data.match);
      setMessage("Match cancelled and reset.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not cancel match: ${error.message}`);
      setMessageType("error");
    }
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
          assistPlayerId: assistPlayerId || undefined,
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

  const handleEditGoal = async (e) => {
    e.preventDefault();
    if (!selectedMatch || editingGoalIndex === null || !selectedPlayerId) {
      setMessage("Invalid goal edit request.");
      setMessageType("error");
      return;
    }

    try {
      const token = getToken();
      const data = await apiRequest(`/matches/${selectedMatch._id}/goals/${editingGoalIndex}`, {
        method: "PATCH",
        token,
        body: {
          playerId: selectedPlayerId,
          minute: goalMinute || 0,
          assistPlayerId: assistPlayerId === "" ? null : assistPlayerId,
        },
      });

      syncUpdatedMatch(data.match);
      setShowEditGoalModal(false);
      resetEventForm();
      setMessage("Goal updated.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not update goal: ${error.message}`);
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

  const handleEditCard = async (e) => {
    e.preventDefault();
    if (!selectedMatch || editingCardIndex === null || !selectedPlayerId) {
      setMessage("Invalid card edit request.");
      setMessageType("error");
      return;
    }

    try {
      const token = getToken();
      const data = await apiRequest(`/matches/${selectedMatch._id}/cards/${editingCardIndex}`, {
        method: "PATCH",
        token,
        body: {
          playerId: selectedPlayerId,
          minute: cardMinute || 0,
          type: cardType,
        },
      });

      syncUpdatedMatch(data.match);
      setShowEditCardModal(false);
      resetEventForm();
      setMessage("Card updated.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not update card: ${error.message}`);
      setMessageType("error");
    }
  };

  const openEditGoal = (goal, index) => {
    setEditingGoalIndex(index);
    setSelectedPlayerId(goal.player?._id || goal.player?.toString() || "");
    setAssistPlayerId(goal.assist?._id || goal.assist?.toString() || "");
    setGoalMinute(goal.minute || "");
    setSelectedTeamIndex(goal.teamIndex || 0);
    setShowEditGoalModal(true);
  };

  const openEditCard = (card, index) => {
    setEditingCardIndex(index);
    setSelectedPlayerId(card.player?._id || card.player?.toString() || "");
    setCardType(card.type || "yellow");
    setCardMinute(card.minute || "");
    setSelectedTeamIndex(card.teamIndex || 0);
    setShowEditCardModal(true);
  };

  const openAddGoalModal = () => {
    resetEventForm();
    setGoalMinute(getCurrentMinute());
    setShowAddGoalModal(true);
  };

  const openAddCardModal = () => {
    resetEventForm();
    setCardMinute(getCurrentMinute());
    setShowAddCardModal(true);
  };

  function renderMatch(matchData) {
    if (!matchData) return null;

    const yellowCount =
      matchData.cards?.filter((card) => card.type === "yellow").length || 0;
    const redCount =
      matchData.cards?.filter((card) => card.type === "red").length || 0;

    // Build unified events timeline
    const events = [
      ...(matchData.goals || []).map((goal, idx) => ({
        type: "goal",
        index: idx,
        minute: goal.minute || 0,
        player: goal.player,
        assist: goal.assist,
        teamIndex: goal.teamIndex,
      })),
      ...(matchData.cards || []).map((card, idx) => ({
        type: "card",
        index: idx,
        minute: card.minute || 0,
        player: card.player,
        cardType: card.type,
        teamIndex: card.teamIndex,
      })),
    ].sort((a, b) => (a.minute || 0) - (b.minute || 0));

    return (
      <div className="space-y-6">
        {/* Score & Timer Card */}
        <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10 shadow-sm">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-2xl font-bold">
                  {matchData.teams[0]?.name || "Team A"}
                </h2>
              </div>
              <div className="flex flex-col items-center gap-4">
                {/* Timer Display */}
                <div className={`text-2xl font-mono font-bold flex items-center gap-2 ${isOvertime ? 'text-warning' : 'text-info'}`}>
                  <Clock className="w-5 h-5" />
                  {currentTimeDisplay}
                </div>
                <div
                  className={`text-5xl font-mono font-bold transition-all ${
                    scoreFlash ? "scale-110 text-success" : ""
                  }`}
                >
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
                  {isOvertime ? " · OT" : ""}
                </div>
                {/* Timer Controls */}
                {user && matchData.status !== "finished" && (
                  <div className="flex gap-2">
                    {!matchData.timerRunning ? (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={handleStartTimer}
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={() => handlePauseTimer(false)}
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                    )}
                    {matchData.timerRunning && (
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={() => handlePauseTimer(true)}
                      >
                        <Trophy className="w-4 h-4" />
                        End Match
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleCancelMatch}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center lg:text-right">
                <h2 className="text-2xl font-bold">
                  {matchData.teams[1]?.name || "Team B"}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Events Timeline */}
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body">
            {eventFlash && (
              <div className="alert alert-success mb-4 py-2 text-sm">
                <span>{eventFlash}</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title text-xl">Match Events</h3>
              {user && matchData.status !== "finished" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    onClick={openAddCardModal}
                  >
                    <ShieldAlert className="w-4" />
                    Add Card
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={openAddGoalModal}
                  >
                    <Plus className="w-4" />
                    Add Goal
                  </button>
                </div>
              )}
            </div>

            {events.length > 0 ? (
              <div className="relative pl-6">
                {/* Vertical timeline line */}
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-base-300"></div>
                
                <div className="space-y-4">
                  {events.map((event, idx) => {
                    const teamName =
                      event.teamIndex === 0
                        ? matchData.teams[0]?.name || "Team A"
                        : matchData.teams[1]?.name || "Team B";
                    
                    return (
                      <div key={`${event.type}-${event.index}-${idx}`} className="relative flex items-start gap-4">
                        {/* Timeline dot */}
                        <div className={`absolute -left-4 w-4 h-4 rounded-full border-2 border-base-100 flex items-center justify-center ${
                          event.type === "goal" 
                            ? "bg-success" 
                            : event.cardType === "red"
                            ? "bg-error"
                            : "bg-warning"
                        }`}>
                          {event.type === "goal" ? (
                            <span className="text-white text-xs">⚽</span>
                          ) : (
                            <div className={`w-2 h-3 rounded-sm ${event.cardType === "red" ? "bg-red-600" : "bg-yellow-400"}`}></div>
                          )}
                        </div>

                        <div className="flex-1 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="font-mono text-sm font-bold opacity-70">
                                {event.minute}'
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {event.player?.name || "Unknown Player"}
                                </div>
                                <div className="text-xs opacity-60">{teamName}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {event.type === "goal" && event.assist && (
                                <span className="text-xs opacity-60 bg-base-300 px-2 py-1 rounded">
                                  A: {event.assist?.name || "?"}
                                </span>
                              )}
                              {event.type === "card" && (
                                <span className={`badge ${event.cardType === "red" ? "badge-error" : "badge-warning"}`}>
                                  {event.cardType.toUpperCase()}
                                </span>
                              )}
                              {user && matchData.status !== "finished" && (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-ghost"
                                    onClick={() => 
                                      event.type === "goal" 
                                        ? openEditGoal(matchData.goals[event.index], event.index)
                                        : openEditCard(matchData.cards[event.index], event.index)
                                    }
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 opacity-60">
                No events yet
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
    const pulseOptions = [
      "Live desk ready: every goal updates instantly.",
      "Big-match mode: watch momentum swing minute by minute.",
      "Tip: open one match and track goals + cards in real time.",
    ];
    setLivePulseMessage(
      pulseOptions[Math.floor(Math.random() * pulseOptions.length)],
    );

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
  }, []);

  useEffect(() => {
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
      setSelectedMatch((current) => {
        if (current?._id === updatedMatch._id) {
          return updatedMatch;
        }
        return current;
      });

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

      if (selectedMatchIdRef.current === matchId) {
        setSelectedMatch(null);
        setMessage(`Match status updated to ${status}.`);
        setMessageType("success");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [getToken]);

  // Helper to get available players for assist (excluding scorer)
  const getAssistOptions = () => {
    const team = selectedMatch?.teams?.[selectedTeamIndex];
    if (!team?.players) return [];
    return team.players.filter((p) => {
      const pid = p._id?.toString?.() || p.toString?.();
      return pid !== selectedPlayerId;
    });
  };

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-success animate-pulse" />
          Live Matches
        </h1>
        <p className="text-lg opacity-70">Real-time match updates</p>
      </div>
      <div className="alert alert-info/80 shadow-sm">
        <span>⚡ {livePulseMessage}</span>
      </div>

      <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
        <div className="card-body p-5">
          <h2 className="card-title text-lg">How to use this page</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Select a live match</p>
              <p className="opacity-75">
                Click a live match card to open match details.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Track events in real time</p>
              <p className="opacity-75">
                Goals, cards, and score update automatically.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">Admin tools</p>
              <p className="opacity-75">
                Add Goal/Add Card buttons and timer controls appear only for admin login.
              </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`live-skeleton-${idx}`}
              className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm"
            >
              <div className="card-body space-y-3 animate-pulse">
                <div className="h-4 w-24 rounded bg-base-300"></div>
                <div className="h-5 w-full rounded bg-base-300"></div>
                <div className="h-10 w-28 mx-auto rounded bg-base-300"></div>
              </div>
            </div>
          ))}
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

      {/* Add Goal Modal */}
      {showAddGoalModal && selectedMatch && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddGoalModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-md space-y-4"
              onSubmit={handleAddGoal}
            >
              <h3 className="font-bold text-lg">
                Add Goal to{" "}
                {selectedMatch.teams[selectedTeamIndex]?.name || "Team"}
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
                        setAssistPlayerId("");
                      }}
                      className={`flex-1 btn btn-sm ${
                        selectedTeamIndex === idx
                          ? "btn-primary"
                          : "btn-outline"
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
                  onChange={(e) => {
                    setSelectedPlayerId(e.target.value);
                    setAssistPlayerId("");
                  }}
                  required
                >
                  <option value="">Select a player...</option>
                  {selectedMatch.teams[selectedTeamIndex]?.players?.map(
                    (player) => (
                      <option key={player._id} value={player._id}>
                        {player.name} ({player.playerId})
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="goal-assist"
                  className="block text-sm font-semibold"
                >
                  Assist (optional)
                </label>
                <select
                  id="goal-assist"
                  name="goalAssist"
                  className="select select-bordered w-full"
                  value={assistPlayerId}
                  onChange={(e) => setAssistPlayerId(e.target.value)}
                >
                  <option value="">No assist</option>
                  {getAssistOptions().map((player) => (
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
                  Minute
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
                <p className="text-xs opacity-60">
                  Auto-filled from current match time. Adjust if needed.
                </p>
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

      {/* Edit Goal Modal */}
      {showEditGoalModal && selectedMatch && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowEditGoalModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-md space-y-4"
              onSubmit={handleEditGoal}
            >
              <h3 className="font-bold text-lg">
                Edit Goal
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
                        setAssistPlayerId("");
                      }}
                      className={`flex-1 btn btn-sm ${
                        selectedTeamIndex === idx
                          ? "btn-primary"
                          : "btn-outline"
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label
                  htmlFor="edit-goal-player"
                  className="block text-sm font-semibold"
                >
                  Player Scorer
                </label>
                <select
                  id="edit-goal-player"
                  name="editGoalPlayer"
                  className="select select-bordered w-full"
                  value={selectedPlayerId}
                  onChange={(e) => {
                    setSelectedPlayerId(e.target.value);
                    setAssistPlayerId("");
                  }}
                  required
                >
                  <option value="">Select a player...</option>
                  {selectedMatch.teams[selectedTeamIndex]?.players?.map(
                    (player) => (
                      <option key={player._id} value={player._id}>
                        {player.name} ({player.playerId})
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="edit-goal-assist"
                  className="block text-sm font-semibold"
                >
                  Assist (optional)
                </label>
                <select
                  id="edit-goal-assist"
                  name="editGoalAssist"
                  className="select select-bordered w-full"
                  value={assistPlayerId}
                  onChange={(e) => setAssistPlayerId(e.target.value)}
                >
                  <option value="">No assist</option>
                  {getAssistOptions().map((player) => (
                    <option key={player._id} value={player._id}>
                      {player.name} ({player.playerId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="edit-goal-minute"
                  className="block text-sm font-semibold"
                >
                  Minute
                </label>
                <input
                  id="edit-goal-minute"
                  name="editGoalMinute"
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
                  onClick={() => setShowEditGoalModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Pencil className="w-4" />
                  Update Goal
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}

      {/* Add Card Modal */}
      {showAddCardModal && selectedMatch && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddCardModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-md space-y-4"
              onSubmit={handleAddCard}
            >
              <h3 className="font-bold text-lg">
                Add Card to{" "}
                {selectedMatch.teams[selectedTeamIndex]?.name || "Team"}
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
                        selectedTeamIndex === idx
                          ? "btn-primary"
                          : "btn-outline"
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
                <label
                  htmlFor="card-player"
                  className="block text-sm font-semibold"
                >
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
                  {selectedMatch.teams[selectedTeamIndex]?.players?.map(
                    (player) => (
                      <option key={player._id} value={player._id}>
                        {player.name} ({player.playerId})
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="card-minute"
                  className="block text-sm font-semibold"
                >
                  Minute
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
                <p className="text-xs opacity-60">
                  Auto-filled from current match time. Adjust if needed.
                </p>
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

      {/* Edit Card Modal */}
      {showEditCardModal && selectedMatch && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowEditCardModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-md space-y-4"
              onSubmit={handleEditCard}
            >
              <h3 className="font-bold text-lg">
                Edit Card
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
                        selectedTeamIndex === idx
                          ? "btn-primary"
                          : "btn-outline"
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label
                  htmlFor="edit-card-type"
                  className="block text-sm font-semibold"
                >
                  Card Type
                </label>
                <select
                  id="edit-card-type"
                  name="editCardType"
                  className="select select-bordered w-full"
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                >
                  <option value="yellow">Yellow Card</option>
                  <option value="red">Red Card</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-card-player" className="block text-sm font-semibold">
                  Player
                </label>
                <select
                  id="edit-card-player"
                  name="editCardPlayer"
                  className="select select-bordered w-full"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  required
                >
                  <option value="">Select a player...</option>
                  {selectedMatch.teams[selectedTeamIndex]?.players?.map(
                    (player) => (
                      <option key={player._id} value={player._id}>
                        {player.name} ({player.playerId})
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-card-minute" className="block text-sm font-semibold">
                  Minute
                </label>
                <input
                  id="edit-card-minute"
                  name="editCardMinute"
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
                  onClick={() => setShowEditCardModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={`btn ${cardType === "yellow" ? "btn-warning" : "btn-error"}`}>
                  <Pencil className="w-4" />
                  Update Card
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}
    </div>
  );
}