import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { apiRequest } from "../lib/api-client.js";

export default function Home() {
  const { user, getToken } = useAuth();
  const isAdmin = !!user;
  const [upcoming, setUpcoming] = useState([]);
  const [finished, setFinished] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [pulseMessage, setPulseMessage] = useState("");
  const [message, setMessage] = useState(
    "Loading latest matches and tournaments...",
  );
  const [messageType, setMessageType] = useState("info");

  function formatWhen(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  function getTimeUntil(iso) {
    if (!iso) return "—";
    const now = new Date();
    const eventTime = new Date(iso);
    const diffMs = eventTime - now;

    if (diffMs < 0) return "Started";

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0)
      return `Starts in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    if (diffHours > 0)
      return `Starts in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
    if (diffMins > 0)
      return `Starts in ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    return "Starting now";
  }

  function renderMatchLine(m) {
    const a = m.teams?.[0]?.name || "?";
    const b = m.teams?.[1]?.name || "?";
    const id = m._id;
    return (
      <li key={id} className="py-2 border-b border-base-300 last:border-0">
        <div className="font-medium">
          {a} <span className="opacity-60">vs</span> {b}
        </div>
        <div className="text-sm opacity-70">
          Score {m.score.teamA}–{m.score.teamB} · {m.status}
          {m.phase ? ` · ${m.phase}` : ""}
        </div>
        <div className="text-xs opacity-60">{formatWhen(m.scheduledAt)}</div>
        <Link
          className="link link-primary text-sm"
          to={`/live-match?matchId=${id}`}
        >
          Live / details
        </Link>
      </li>
    );
  }

  function renderResultLine(m) {
    const a = m.teams?.[0]?.name || "?";
    const b = m.teams?.[1]?.name || "?";
    const id = m._id;
    return (
      <li key={id} className="py-2 border-b border-base-300 last:border-0">
        <div className="font-medium">
          {a} <span className="opacity-60">vs</span> {b}
        </div>
        <div className="text-sm">
          Final{" "}
          <span className="font-semibold">
            {m.score.teamA}–{m.score.teamB}
          </span>
        </div>
        <Link
          className="link link-primary text-sm"
          to={`/live-match?matchId=${id}`}
        >
          View match
        </Link>
      </li>
    );
  }

  useEffect(() => {
    const pulseOptions = [
      "Matchday mood: high energy and clean tackles.",
      "Fans are ready. Keep an eye on live score swings.",
      "Today is perfect for discovering a new top scorer.",
      "Quick tip: check tournament details after each result.",
    ];
    const updatePulse = () => {
      setPulseMessage(
        pulseOptions[Math.floor(Math.random() * pulseOptions.length)],
      );
    };
    updatePulse();
    const pulseInterval = setInterval(updatePulse, 10000);

    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      try {
        const [upcomingData, finishedData, toursData] = await Promise.all([
          apiRequest("/matches/schedule/upcoming", { signal }),
          apiRequest("/matches/schedule/recent-results", { signal }),
          apiRequest("/tournaments", { signal }),
        ]);

        setUpcoming(upcomingData.matches || []);
        setFinished(finishedData.matches || []);
        setTournaments(toursData.tournaments || []);
        setMessage("");
        setMessageType("");
      } catch (err) {
        if (err.name === "AbortError") return;
        setMessage(err.message);
        setMessageType("error");
      }
    };
    load();

    return () => {
      clearInterval(pulseInterval);
      controller.abort();
    };
  }, []);

  const handleDeleteRecentResult = async (matchId) => {
    const token = getToken();
    if (!token) return;
    const ok = window.confirm("Delete this result from recent history?");
    if (!ok) return;
    try {
      await apiRequest(`/matches/${matchId}`, {
        method: "DELETE",
        token,
      });
      setFinished((prev) => prev.filter((match) => match._id !== matchId));
      setMessage("Result removed from recent history.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not delete result: ${error.message}`);
      setMessageType("error");
    }
  };

  return (
    <div className="w-full space-y-8 px-4 sm:px-6 lg:px-8 py-4">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-3">⚽ Matches & Tournaments</h1>
        <p className="text-lg opacity-70">
          Browse live scores, schedules, and tournament standings. No login
          required.
        </p>
      </div>
      <div className="alert alert-info/80 shadow-sm">
        <span>🎉 {pulseMessage}</span>
      </div>

      {/* Quick guide for non-admin users */}
      <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
        <div className="card-body p-5">
          <h2 className="card-title text-lg">How to use Turf Match</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">1) Check match status</p>
              <p className="opacity-75">
                <span className="badge badge-warning badge-sm px-2 py-1 mr-1">
                  upcoming
                </span>
                Not started,
                <span className="badge badge-success badge-sm px-2 py-1 mx-1">
                  live
                </span>
                currently running,
                <span className="badge badge-secondary badge-sm px-2 py-1 ml-1">
                  finished
                </span>
                ended.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">2) Follow live matches</p>
              <p className="opacity-75">
                Open any live/upcoming match to see score updates and events.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-base-200/50">
              <p className="font-semibold mb-1">3) Explore tournaments</p>
              <p className="opacity-75">
                Use the tournament cards to view standings, fixtures, and
                results.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`alert alert-${messageType} shadow-lg`}>
          <span>{message}</span>
        </div>
      )}

      {/* Matches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming & Live Card */}
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm h-fit">
          <div className="card-body p-6">
            <div className="card-title text-xl mb-4">📅 Upcoming & Live</div>
            {upcoming.length ? (
              <ul className="space-y-3">
                {upcoming.map((m) => {
                  const a = m.teams?.[0]?.name || "?";
                  const b = m.teams?.[1]?.name || "?";
                  const id = m._id;
                  return (
                    <li
                      key={id}
                      className="p-4 rounded-lg bg-base-200/50 hover:bg-base-200 transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-lg">
                          {a} vs {b}
                        </div>
                        <span
                          className={`badge ${m.status === "live" ? "badge-success animate-pulse" : "badge-warning"}`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <div className="text-sm opacity-70">
                        <div className="font-mono">
                          Score: {m.score.teamA}–{m.score.teamB}
                        </div>
                        {m.phase && (
                          <div className="text-xs">Phase: {m.phase}</div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-xs font-semibold text-primary">
                          🕐 {getTimeUntil(m.scheduledAt)}
                        </div>
                        <div className="text-xs opacity-60">
                          {formatWhen(m.scheduledAt)}
                        </div>
                      </div>
                      <Link
                        className="btn btn-sm btn-primary mt-2"
                        to={`/live-match?matchId=${id}`}
                      >
                        View Live Match →
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8 opacity-60">
                <p>No upcoming or live matches yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Results Card */}
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm h-fit">
          <div className="card-body p-6">
            <div className="card-title text-xl mb-4">✅ Recent Results</div>
            {finished.length ? (
              <ul className="space-y-3">
                {finished.map((m) => {
                  const a = m.teams?.[0]?.name || "?";
                  const b = m.teams?.[1]?.name || "?";
                  const id = m._id;
                  return (
                    <li
                      key={id}
                      className="p-4 rounded-lg bg-base-200/50 hover:bg-base-200 transition space-y-2"
                    >
                      <div className="font-bold text-lg">
                        {a} vs {b}
                      </div>
                      <div className="text-sm opacity-70">
                        <div className="font-mono text-2xl font-bold">
                          <span className="text-primary">{m.score.teamA}</span>
                          <span className="mx-2 opacity-50">—</span>
                          <span className="text-secondary">
                            {m.score.teamB}
                          </span>
                        </div>
                      </div>
                      <Link
                        className="btn btn-sm btn-ghost"
                        to={`/match/${id}`}
                      >
                        Match Details →
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn btn-sm btn-error btn-outline"
                          onClick={() => handleDeleteRecentResult(id)}
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8 opacity-60">
                <p>No finished matches yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tournaments Card */}
      <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
        <div className="card-body p-6">
          <div className="card-title text-2xl mb-2">🏆 Tournaments</div>
          <p className="text-sm opacity-70 mb-6">
            Click on a tournament to view scoreboard, fixtures, and standings.
          </p>

          {tournaments.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournaments.map((t) => (
                <div
                  key={t._id || t.id}
                  className="p-4 rounded-lg border border-white/5 bg-base-200/50 hover:border-primary/50 hover:bg-base-200 transition space-y-3"
                >
                  {t.image && (
                    <img
                      src={t.image}
                      alt={t.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{t.name}</h3>
                    <div className="flex gap-2 mt-2">
                      <span className="badge badge-sm badge-outline">
                        {t.type}
                      </span>
                      <span
                        className={`badge badge-sm ${t.status === "live" ? "badge-success" : t.status === "finished" ? "badge-secondary" : "badge-warning"}`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>
                  <Link
                    className="btn btn-primary btn-sm w-full"
                    to={`/tournament?tournamentId=${t._id || t.id}`}
                  >
                    Tournament Details →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 opacity-60">
              <p className="text-lg">No tournaments yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
