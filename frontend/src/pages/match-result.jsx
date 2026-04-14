import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiUrl } from "../lib/config.js";
import { useAuth } from "../lib/auth.jsx";

export default function MatchResult() {
  const { user, getToken } = useAuth();
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [reactions, setReactions] = useState({ fire: 0, clap: 0, wow: 0 });
  const [posterUrl, setPosterUrl] = useState("");
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterNote, setPosterNote] = useState("");
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

  useEffect(() => {
    if (!id) return;
    try {
      const saved = localStorage.getItem(`tm_reaction_${id}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setReactions({
        fire: Number(parsed.fire || 0),
        clap: Number(parsed.clap || 0),
        wow: Number(parsed.wow || 0),
      });
    } catch {
      setReactions({ fire: 0, clap: 0, wow: 0 });
    }
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
  const goals = match.goals || [];
  const cards = match.cards || [];

  const goalsByTeam = goals.reduce(
    (acc, goal) => {
      const key = goal.teamIndex === 1 ? "teamB" : "teamA";
      acc[key] += 1;
      return acc;
    },
    { teamA: 0, teamB: 0 },
  );

  const cardsByTeam = cards.reduce(
    (acc, card) => {
      const key = card.teamIndex === 1 ? "teamB" : "teamA";
      if (card.type === "red") acc[key].red += 1;
      else acc[key].yellow += 1;
      return acc;
    },
    {
      teamA: { yellow: 0, red: 0 },
      teamB: { yellow: 0, red: 0 },
    },
  );

  const playerImpact = new Map();
  for (const goal of goals) {
    const name =
      goal.player?.name || (user ? goal.player?.playerId : null) || "Unknown Player";
    const current = playerImpact.get(name) || { goals: 0, yellow: 0, red: 0 };
    current.goals += 1;
    playerImpact.set(name, current);
  }
  for (const card of cards) {
    const name =
      card.player?.name || (user ? card.player?.playerId : null) || "Unknown Player";
    const current = playerImpact.get(name) || { goals: 0, yellow: 0, red: 0 };
    if (card.type === "red") current.red += 1;
    else current.yellow += 1;
    playerImpact.set(name, current);
  }

  const mvp = [...playerImpact.entries()]
    .map(([name, stats]) => ({
      name,
      ...stats,
      score: stats.goals * 3 - stats.red * 2 - stats.yellow,
    }))
    .sort((a, b) => b.score - a.score || b.goals - a.goals || a.red - b.red)[0];

  const timeline = [
    ...goals.map((goal, idx) => ({
      key: `g-${idx}`,
      minute: Number(goal.minute || 0),
      type: "goal",
      teamName: goal.teamIndex === 0 ? teamA.name : teamB.name,
      playerName:
        goal.player?.name || (user ? goal.player?.playerId : null) || "Unknown Player",
    })),
    ...cards.map((card, idx) => ({
      key: `c-${idx}`,
      minute: Number(card.minute || 0),
      type: card.type === "red" ? "red-card" : "yellow-card",
      teamName: card.teamIndex === 0 ? teamA.name : teamB.name,
      playerName:
        card.player?.name || (user ? card.player?.playerId : null) || "Unknown Player",
    })),
  ].sort((a, b) => a.minute - b.minute);

  const voteReaction = (key) => {
    const next = {
      ...reactions,
      [key]: Number(reactions[key] || 0) + 1,
    };
    setReactions(next);
    if (id) {
      localStorage.setItem(`tm_reaction_${id}`, JSON.stringify(next));
    }
  };

  const handleShare = async () => {
    const scoreA = Number(match.score?.teamA || 0);
    const scoreB = Number(match.score?.teamB || 0);
    const text = `${teamA.name} ${scoreA}-${scoreB} ${teamB.name}${mvp ? ` | MVP: ${mvp.name}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Turf Match Result",
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // user cancelled share
      }
    }
    await navigator.clipboard.writeText(`${text} | ${window.location.href}`);
  };

  const buildPosterBlob = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not render poster canvas");

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#1d4ed8");
    grad.addColorStop(1, "#7c3aed");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px Arial";
    ctx.fillText("Turf Match - Full Time", 70, 120);

    ctx.font = "bold 58px Arial";
    ctx.fillText(teamA.name, 70, 250);
    ctx.fillText(teamB.name, 720, 250);

    ctx.font = "bold 140px Arial";
    ctx.fillText(String(match.score?.teamA ?? 0), 360, 320);
    ctx.fillText(String(match.score?.teamB ?? 0), 760, 320);

    ctx.font = "bold 80px Arial";
    ctx.fillText(":", 620, 315);

    ctx.font = "28px Arial";
    ctx.fillText(`Status: ${String(match.status || "").toUpperCase()}`, 70, 400);
    ctx.fillText(
      `Phase: ${match.phase || "Regular"}`,
      70,
      440,
    );
    ctx.fillText(
      `MVP: ${mvp?.name || "N/A"}${mvp ? ` (${mvp.goals}G)` : ""}`,
      70,
      480,
    );
    ctx.fillText(
      `Generated: ${new Date().toLocaleString()}`,
      70,
      540,
    );

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("Could not export poster image");
    return blob;
  };

  const handleUploadPosterToCloudinary = async () => {
    const token = getToken?.();
    if (!token) {
      setPosterNote("Sign in as admin to prepare poster download.");
      return;
    }
    try {
      setPosterBusy(true);
      setPosterNote("Preparing poster...");
      const blob = await buildPosterBlob();
      const form = new FormData();
      form.append("image", blob, `match-${id}-poster.png`);
      const response = await fetch(apiUrl(`/matches/${id}/poster`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not prepare poster");
      }
      setPosterUrl(data.posterUrl || "");
      setPosterNote("Poster is ready to download.");
    } catch (uploadError) {
      setPosterNote(uploadError.message);
    } finally {
      setPosterBusy(false);
    }
  };

  const handleDownloadPoster = async () => {
    if (!posterUrl) return;
    try {
      setPosterBusy(true);
      const response = await fetch(posterUrl);
      if (!response.ok) throw new Error("Could not download poster");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${teamA.name}-vs-${teamB.name}-poster.png`
        .replace(/\s+/g, "-")
        .toLowerCase();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setPosterNote(downloadError.message);
    } finally {
      setPosterBusy(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      <div className="card bg-gradient-to-br from-primary/15 via-secondary/10 to-base-100 border border-white/10 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black">
                {teamA.name} <span className="opacity-50">vs</span> {teamB.name}
              </h1>
              <p className="text-sm opacity-70 mt-1">
                {match.phase ? `Phase: ${match.phase}` : "Regular fixture"}
                {match.scheduledAt
                  ? ` • ${new Date(match.scheduledAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-lg capitalize">{match.status}</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={handleShare}>
                Share
              </button>
              {user && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={posterBusy}
                  onClick={handleUploadPosterToCloudinary}
                >
                  {posterBusy ? "Preparing..." : "Prepare Poster"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 md:gap-10">
            <div className="text-center">
              <p className="text-xs opacity-60">{teamA.name}</p>
              <p className="text-5xl font-black text-primary">{match.score?.teamA ?? 0}</p>
            </div>
            <p className="text-3xl font-black opacity-50">:</p>
            <div className="text-center">
              <p className="text-xs opacity-60">{teamB.name}</p>
              <p className="text-5xl font-black text-secondary">{match.score?.teamB ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-base-100/50 border border-white/10 shadow-sm">
          <div className="card-body p-4">
            <p className="text-xs opacity-60">Total Goals</p>
            <p className="text-2xl font-black">{goals.length}</p>
          </div>
        </div>
        <div className="card bg-base-100/50 border border-white/10 shadow-sm">
          <div className="card-body p-4">
            <p className="text-xs opacity-60">Cards</p>
            <p className="text-2xl font-black">
              <span className="text-warning">{cards.filter((c) => c.type !== "red").length}</span>
              <span className="mx-2 opacity-50">/</span>
              <span className="text-error">{cards.filter((c) => c.type === "red").length}</span>
            </p>
          </div>
        </div>
        <div className="card bg-base-100/50 border border-white/10 shadow-sm">
          <div className="card-body p-4">
            <p className="text-xs opacity-60">MVP</p>
            <p className="text-lg font-black truncate">{mvp?.name || "N/A"}</p>
            <p className="text-xs opacity-60">
              {mvp ? `${mvp.goals}G • ${mvp.yellow}Y • ${mvp.red}R` : "No decisive events"}
            </p>
          </div>
        </div>
        <div className="card bg-base-100/50 border border-white/10 shadow-sm">
          <div className="card-body p-4">
            <p className="text-xs opacity-60">Fan Reactions</p>
            <div className="flex items-center gap-2 mt-1">
              <button type="button" className="btn btn-xs" onClick={() => voteReaction("fire")}>
                🔥 {reactions.fire}
              </button>
              <button type="button" className="btn btn-xs" onClick={() => voteReaction("clap")}>
                👏 {reactions.clap}
              </button>
              <button type="button" className="btn btn-xs" onClick={() => voteReaction("wow")}>
                😮 {reactions.wow}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 bg-base-100/50 border border-white/10 shadow-sm">
          <h3 className="font-bold mb-2">{teamA.name} Summary</h3>
          <p className="text-sm opacity-70 mb-3">
            {goalsByTeam.teamA} goals • {cardsByTeam.teamA.yellow} yellow • {cardsByTeam.teamA.red} red
          </p>
          {goals.filter((goal) => goal.teamIndex === 0).length ? (
            <ul className="space-y-2">
              {goals
                .filter((goal) => goal.teamIndex === 0)
                .map((g, idx) => (
                <li key={idx} className="flex justify-between">
                  <div>{g.player?.name || (user ? g.player?.playerId : null) || "Unknown Player"}</div>
                  <div className="opacity-60">
                    {g.minute ? `${g.minute}'` : "-"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="opacity-60">No goals from this team.</p>
          )}
        </div>

        <div className="card p-4 bg-base-100/50 border border-white/10 shadow-sm">
          <h3 className="font-bold mb-2">{teamB.name} Summary</h3>
          <p className="text-sm opacity-70 mb-3">
            {goalsByTeam.teamB} goals • {cardsByTeam.teamB.yellow} yellow • {cardsByTeam.teamB.red} red
          </p>
          {goals.filter((goal) => goal.teamIndex === 1).length ? (
            <ul className="space-y-2">
              {goals
                .filter((goal) => goal.teamIndex === 1)
                .map((g, idx) => (
                <li key={idx} className="flex justify-between">
                  <div>{g.player?.name || (user ? g.player?.playerId : null) || "Unknown Player"}</div>
                  <div className="opacity-60">
                    {g.minute ? `${g.minute}'` : "-"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="opacity-60">No goals from this team.</p>
          )}
        </div>
      </div>

      <div className="card p-4 bg-base-100/50 border border-white/10 shadow-sm">
        <h3 className="font-bold mb-3">Match Timeline</h3>
        {timeline.length ? (
          <ul className="space-y-2">
            {timeline.map((event) => (
              <li key={event.key} className="flex items-center justify-between rounded-lg bg-base-200/50 p-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs opacity-70">{event.minute}'</span>
                  <span className={`badge badge-sm ${
                    event.type === "goal"
                      ? "badge-success"
                      : event.type === "red-card"
                        ? "badge-error"
                        : "badge-warning"
                  }`}>
                    {event.type === "goal" ? "GOAL" : event.type === "red-card" ? "RED" : "YELLOW"}
                  </span>
                  <span className="text-sm">
                    {event.playerName} • {event.teamName}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="opacity-60">No timeline events available.</p>
        )}
      </div>

      {(posterNote || posterUrl) && (
        <div className="card p-4 bg-base-100/50 border border-white/10 shadow-sm">
          <h3 className="font-bold mb-2">Match Poster</h3>
          {posterNote && <p className="text-sm opacity-80 mb-2">{posterNote}</p>}
          {posterUrl && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDownloadPoster}
              disabled={posterBusy}
            >
              {posterBusy ? "Downloading..." : "Download Poster"}
            </button>
          )}
        </div>
      )}

      <div className="mt-6">
        <Link to="/" className="btn">
          Back to home
        </Link>
      </div>
    </div>
  );
}
