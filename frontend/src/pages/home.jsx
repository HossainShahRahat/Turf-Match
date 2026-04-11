import React, { useEffect, useState } from "react";
import { apiUrl } from "../lib/config.js";

export default function Home() {
  const [upcoming, setUpcoming] = useState([]);
  const [finished, setFinished] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [message, setMessage] = useState("Loading schedule…");
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
        <a
          className="link link-primary text-sm"
          href={`/live-match?matchId=${id}`}
        >
          Live / details
        </a>
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
        <a
          className="link link-primary text-sm"
          href={`/live-match?matchId=${id}`}
        >
          View match
        </a>
      </li>
    );
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [upRes, finRes, tourRes] = await Promise.all([
          fetch(apiUrl("/matches/schedule/upcoming")),
          fetch(apiUrl("/matches/schedule/recent-results")),
          fetch(apiUrl("/tournaments")),
        ]);

        const upcomingData = await upRes.json();
        const finishedData = await finRes.json();
        const toursData = await tourRes.json();

        if (!upRes.ok)
          throw new Error(
            upcomingData.message || "Failed to load upcoming matches",
          );
        if (!finRes.ok)
          throw new Error(finishedData.message || "Failed to load results");
        if (!tourRes.ok)
          throw new Error(toursData.message || "Failed to load tournaments");

        setUpcoming(upcomingData.matches || []);
        setFinished(finishedData.matches || []);
        setTournaments(toursData.tournaments || []);
        setMessage("");
        setMessageType("");
      } catch (err) {
        setMessage(err.message);
        setMessageType("error");
      }
    };
    load();
  }, []);

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-3">⚽ Matches & Tournaments</h1>
        <p className="text-lg opacity-70">
          Browse live scores, schedules, and tournament standings. No login
          required.
        </p>
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
                      <a
                        className="btn btn-sm btn-primary mt-2"
                        href={`/live-match?matchId=${id}`}
                      >
                        View Live Score →
                      </a>
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
                      <a className="btn btn-sm btn-ghost" href={`/match/${id}`}>
                        View Match Details →
                      </a>
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
                  <a
                    className="btn btn-primary btn-sm w-full"
                    href={`/tournament?tournamentId=${t._id || t.id}`}
                  >
                    View Tournament →
                  </a>
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
