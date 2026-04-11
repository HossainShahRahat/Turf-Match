import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiUrl } from "../lib/config.js";

export default function MatchResult() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiUrl(`/matches/${id}`));
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || "Failed to load match");
        }
        const data = await res.json();
        setMatch(data.match || null);
      } catch (err) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading)
    return (
      <div className="w-full py-24 text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4">Loading match...</p>
      </div>
    );

  if (error)
    return (
      <div className="p-6">
        <div className="alert alert-error">{error}</div>
        <div className="mt-4">
          <Link to="/" className="btn">
            Back
          </Link>
        </div>
      </div>
    );

  if (!match)
    return (
      <div className="p-6">
        <p className="opacity-70">Match not found.</p>
        <div className="mt-4">
          <Link to="/" className="btn">
            Back
          </Link>
        </div>
      </div>
    );

  const teamA = match.teams?.[0] || { name: "Team A", players: [] };
  const teamB = match.teams?.[1] || { name: "Team B", players: [] };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {teamA.name} vs {teamB.name}
        </h1>
        <div className="text-right">
          <div className="text-sm opacity-70">Status</div>
          <div className="font-mono text-xl">{match.status}</div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-sm opacity-60">{teamA.name}</div>
            <div className="text-4xl font-bold">{match.score?.teamA ?? 0}</div>
          </div>
          <div className="text-center">
            <div className="text-sm opacity-60">{teamB.name}</div>
            <div className="text-4xl font-bold">{match.score?.teamB ?? 0}</div>
          </div>
        </div>
        <div className="mt-3 text-sm opacity-60">
          {match.phase ? `Phase: ${match.phase}` : null}{" "}
          {match.scheduledAt
            ? ` • ${new Date(match.scheduledAt).toLocaleString()}`
            : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-bold mb-2">Goals</h3>
          {match.goals && match.goals.length ? (
            <ul className="space-y-2">
              {match.goals.map((g, idx) => (
                <li key={idx} className="flex justify-between">
                  <div>
                    {g.teamIndex === 0 ? teamA.name : teamB.name} •{" "}
                    {g.player?.name || g.player?.playerId || g.player}
                  </div>
                  <div className="opacity-60">
                    {g.minute ? `${g.minute}'` : "-"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="opacity-60">No goals recorded.</p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-bold mb-2">Cards</h3>
          {match.cards && match.cards.length ? (
            <ul className="space-y-2">
              {match.cards.map((c, idx) => (
                <li key={idx} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${c.type === 'red' ? 'badge-error' : 'badge-warning'}`}>
                      {c.type === 'red' ? '🟥' : '🟨'}
                    </span>
                    <span>
                      {c.teamIndex === 0 ? teamA.name : teamB.name} •{" "}
                      {c.player?.name || c.player?.playerId || c.player}
                    </span>
                  </div>
                  <div className="opacity-60">
                    {c.minute ? `${c.minute}'` : "-"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="opacity-60">No cards recorded.</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link to="/" className="btn">
          Back to home
        </Link>
      </div>
    </div>
  );
}
