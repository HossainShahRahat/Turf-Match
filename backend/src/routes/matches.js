import express from "express";
import mongoose from "mongoose";
import { Match } from "../models/Match.js";
import { Player } from "../models/Player.js";
import { Tournament } from "../models/Tournament.js";
import { requireAdminAuth, requirePlayerAuth } from "../middleware/auth.js";

const router = express.Router();
const oid = (ids = []) => ids.map((id) => new mongoose.Types.ObjectId(id));
const uniq = (items) => [...new Set(items.map((item) => item.toString()))];

async function applyFinishedMatchStats(match) {
  if (match.statsProcessed) return;
  const allPlayerIds = uniq([...(match.teams[0].players || []), ...(match.teams[1].players || [])]);
  if (allPlayerIds.length) await Player.updateMany({ _id: { $in: allPlayerIds } }, { $inc: { "stats.matches": 1 } });

  const goalsPerPlayer = {};
  for (const goal of match.goals || []) {
    const pid = goal.player.toString();
    goalsPerPlayer[pid] = (goalsPerPlayer[pid] || 0) + 1;
  }
  await Promise.all(Object.entries(goalsPerPlayer).map(([playerId, c]) => Player.updateOne({ _id: playerId }, { $inc: { "stats.goals": c } })));

  if ((match.ratings || []).length > 0) {
    const roll = {};
    for (const r of match.ratings) {
      const key = r.target.toString();
      if (!roll[key]) roll[key] = { total: 0, count: 0 };
      roll[key].total += r.score;
      roll[key].count += 1;
    }
    await Promise.all(Object.entries(roll).map(([playerId, v]) => Player.updateOne({ _id: playerId }, { $inc: { "stats.ratingTotal": v.total, "stats.ratingCount": v.count } })));
  }

  const players = await Player.find({ _id: { $in: allPlayerIds } });
  await Promise.all(players.map((p) => {
    const rating = p.stats.ratingCount > 0 ? Number((p.stats.ratingTotal / p.stats.ratingCount).toFixed(2)) : 0;
    return Player.updateOne({ _id: p._id }, { $set: { "stats.rating": rating } });
  }));
  match.statsProcessed = true;
  await match.save();
}

function getStoredMatchScore(match) {
  const hasManualScore =
    match.score?.teamA !== null &&
    match.score?.teamA !== undefined &&
    match.score?.teamB !== null &&
    match.score?.teamB !== undefined;
  const manualTeamA = Number(match.score?.teamA);
  const manualTeamB = Number(match.score?.teamB);
  if (
    hasManualScore &&
    Number.isFinite(manualTeamA) &&
    Number.isFinite(manualTeamB)
  ) {
    return { teamA: manualTeamA, teamB: manualTeamB };
  }

  const teamASet = new Set(
    (match.teams[0].players || []).map((p) => p._id?.toString?.() || p.toString()),
  );
  let teamA = 0;
  let teamB = 0;
  for (const goal of match.goals || []) {
    let teamIndex;
    if (Number.isInteger(goal.teamIndex)) teamIndex = goal.teamIndex;
    else {
      const pid = goal.player?._id?.toString() || goal.player?.toString();
      teamIndex = pid && teamASet.has(pid) ? 0 : 1;
    }
    if (teamIndex === 0) teamA += 1;
    else teamB += 1;
  }
  return { teamA, teamB };
}

function mapMatchResponse(match) {
  const teamASet = new Set((match.teams[0].players || []).map((p) => p._id?.toString?.() || p.toString()));
  const resolvedScore = getStoredMatchScore(match);
  const goals = (match.goals || []).map((goal) => {
    let teamIndex;
    if (Number.isInteger(goal.teamIndex)) teamIndex = goal.teamIndex;
    else {
      const pid = goal.player?._id?.toString() || goal.player?.toString();
      teamIndex = pid && teamASet.has(pid) ? 0 : 1;
    }
    return { player: goal.player, minute: goal.minute, teamIndex };
  });
  const cards = (match.cards || []).map((card) => {
    let teamIndex;
    if (Number.isInteger(card.teamIndex)) teamIndex = card.teamIndex;
    else {
      const pid = card.player?._id?.toString() || card.player?.toString();
      teamIndex = pid && teamASet.has(pid) ? 0 : 1;
    }
    return {
      player: card.player,
      minute: card.minute,
      teamIndex,
      type: card.type
    };
  });
  return {
    _id: match._id,
    status: match.status,
    teams: match.teams,
    goals,
    cards,
    score: resolvedScore,
    scheduledAt: match.scheduledAt || null,
    phase: match.phase || "regular"
  };
}

router.get("/schedule/upcoming", async (_req, res) => {
  try {
    const matches = await Match.find({ status: { $in: ["upcoming", "live"] } })
      .sort({ scheduledAt: 1, createdAt: 1 })
      .limit(100)
      .populate("teams.players", "name playerId")
      .populate("teams.captain", "name playerId")
      .populate("goals.player", "name playerId")
      .populate("cards.player", "name playerId");
    return res.status(200).json({ matches: matches.map((m) => mapMatchResponse(m)) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/schedule/recent-results", async (_req, res) => {
  try {
    const matches = await Match.find({ status: "finished" })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate("teams.players", "name playerId")
      .populate("teams.captain", "name playerId")
      .populate("goals.player", "name playerId")
      .populate("cards.player", "name playerId");
    return res.status(200).json({ matches: matches.map((m) => mapMatchResponse(m)) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  try {
    const { teamA, teamB, status } = req.body;
    if (!teamA?.name || !teamB?.name) return res.status(400).json({ message: "Both team names are required" });
    const rawIds = [...(teamA.players || []), ...(teamB.players || []), teamA.captain, teamB.captain].filter(Boolean);
    if (rawIds.some((id) => !mongoose.isValidObjectId(id))) return res.status(400).json({ message: "One or more IDs are not valid ObjectIds" });
    const aPlayers = oid(teamA.players || []);
    const bPlayers = oid(teamB.players || []);
    const all = uniq([...aPlayers, ...bPlayers]);
    if (all.length) {
      const count = await Player.countDocuments({ _id: { $in: all } });
      if (count !== all.length) return res.status(400).json({ message: "One or more player IDs are invalid" });
    }
    if (teamA.captain && !aPlayers.some((id) => id.toString() === teamA.captain)) return res.status(400).json({ message: "Team A captain must be part of Team A players" });
    if (teamB.captain && !bPlayers.some((id) => id.toString() === teamB.captain)) return res.status(400).json({ message: "Team B captain must be part of Team B players" });

    const match = await Match.create({
      teams: [{ name: teamA.name.trim(), players: aPlayers, captain: teamA.captain || null }, { name: teamB.name.trim(), players: bPlayers, captain: teamB.captain || null }],
      status: status || "upcoming"
    });
    const populated = await Match.findById(match._id).populate("teams.players", "name playerId").populate("teams.captain", "name playerId");
    return res.status(201).json({ match: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    if (!mongoose.isValidObjectId(matchId)) return res.status(400).json({ message: "Invalid match ID" });
    const match = await Match.findById(matchId).populate("teams.players", "name playerId").populate("teams.captain", "name playerId").populate("goals.player", "name playerId").populate("cards.player", "name playerId");
    if (!match) return res.status(404).json({ message: "Match not found" });
    return res.status(200).json({ match: mapMatchResponse(match) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/:matchId/goals", requireAdminAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { playerId, minute } = req.body;
    if (!mongoose.isValidObjectId(matchId) || !mongoose.isValidObjectId(playerId)) return res.status(400).json({ message: "Invalid match or player ID" });
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.status === "finished") return res.status(400).json({ message: "Cannot add goals to a finished match" });

    const all = [...(match.teams[0].players || []), ...(match.teams[1].players || [])].map((id) => id.toString());
    if (!all.includes(playerId)) return res.status(400).json({ message: "Player is not assigned to this match" });
    const scorerTeamIndex = (match.teams[0].players || []).some((id) => id.toString() === playerId) ? 0 : 1;

    match.goals.push({ player: playerId, minute: Number.isFinite(Number(minute)) ? Number(minute) : 0, teamIndex: scorerTeamIndex });
    if (match.status === "upcoming") match.status = "live";
    await match.save();

    const populated = await Match.findById(match._id)
      .populate("teams.players", "name playerId")
      .populate("teams.captain", "name playerId")
      .populate("goals.player", "name playerId")
      .populate("cards.player", "name playerId");
    const payload = mapMatchResponse(populated);
    const io = req.app.get("io");
    io.emit("match:updated", payload);
    io.to(match._id.toString()).emit("match:updated", payload);
    return res.status(201).json({ match: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:matchId/status", requireAdminAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { status } = req.body;
    if (!mongoose.isValidObjectId(matchId)) return res.status(400).json({ message: "Invalid match ID" });
    if (!["upcoming", "live", "finished"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.status === "finished" && status !== "finished") {
      return res.status(400).json({ message: "Finished matches cannot be reverted" });
    }
    match.status = status;
    await match.save();
    if (status === "finished") await applyFinishedMatchStats(match);

    const populated = await Match.findById(match._id)
      .populate("teams.players", "name playerId")
      .populate("teams.captain", "name playerId")
      .populate("goals.player", "name playerId")
      .populate("cards.player", "name playerId");
    const payload = mapMatchResponse(populated);
    const io = req.app.get("io");
    io.emit("match:updated", payload);
    io.to(match._id.toString()).emit("match:updated", payload);
    if (status === "finished") {
      io.emit("match:statusChanged", { matchId: match._id.toString(), status });
      io.to(match._id.toString()).emit("match:statusChanged", {
        matchId: match._id.toString(),
        status,
      });
    }
    return res.status(200).json({ match: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/:matchId/cards", requireAdminAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { playerId, minute, type } = req.body;
    if (!mongoose.isValidObjectId(matchId) || !mongoose.isValidObjectId(playerId)) {
      return res.status(400).json({ message: "Invalid match or player ID" });
    }
    if (!["yellow", "red"].includes(type)) {
      return res.status(400).json({ message: "Card type must be yellow or red" });
    }
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.status === "finished") {
      return res.status(400).json({ message: "Cannot add cards to a finished match" });
    }

    const all = [...(match.teams[0].players || []), ...(match.teams[1].players || [])].map((id) => id.toString());
    if (!all.includes(playerId)) {
      return res.status(400).json({ message: "Player is not assigned to this match" });
    }
    const teamIndex = (match.teams[0].players || []).some((id) => id.toString() === playerId) ? 0 : 1;

    match.cards.push({
      player: playerId,
      minute: Number.isFinite(Number(minute)) ? Number(minute) : 0,
      teamIndex,
      type
    });
    if (match.status === "upcoming") match.status = "live";
    await match.save();

    const populated = await Match.findById(match._id)
      .populate("teams.players", "name playerId")
      .populate("teams.captain", "name playerId")
      .populate("goals.player", "name playerId")
      .populate("cards.player", "name playerId");
    const payload = mapMatchResponse(populated);
    const io = req.app.get("io");
    io.emit("match:updated", payload);
    io.to(match._id.toString()).emit("match:updated", payload);
    return res.status(201).json({ match: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:matchId/schedule", requireAdminAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { scheduledAt } = req.body;
    if (!mongoose.isValidObjectId(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!scheduledAt) {
      match.scheduledAt = null;
    } else {
      const parsedDate = new Date(scheduledAt);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid scheduledAt value" });
      }
      match.scheduledAt = parsedDate;
    }

    await match.save();

    const populated = await Match.findById(match._id)
      .populate("teams.players", "name playerId")
      .populate("teams.captain", "name playerId")
      .populate("goals.player", "name playerId")
      .populate("cards.player", "name playerId");

    const payload = mapMatchResponse(populated);
    const io = req.app.get("io");
    io.emit("match:updated", payload);
    io.to(match._id.toString()).emit("match:updated", payload);

    return res.status(200).json({ match: payload });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/:matchId/ratings", requirePlayerAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { targetPlayerId, score } = req.body;
    const numericScore = Number(score);
    if (!mongoose.isValidObjectId(matchId) || !mongoose.isValidObjectId(targetPlayerId)) return res.status(400).json({ message: "Invalid match or target player ID" });
    if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 10) return res.status(400).json({ message: "Score must be an integer between 1 and 10" });
    const raterId = req.user.sub;
    if (!mongoose.isValidObjectId(raterId)) return res.status(401).json({ message: "Invalid player token" });
    if (raterId === targetPlayerId) return res.status(400).json({ message: "You can only rate another player" });

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.status !== "finished") return res.status(400).json({ message: "Ratings are only allowed after match is finished" });
    const all = uniq([...(match.teams[0].players || []), ...(match.teams[1].players || [])]);
    if (!all.includes(raterId) || !all.includes(targetPlayerId)) return res.status(403).json({ message: "Rater and target must belong to this match" });
    const alreadyRated = (match.ratings || []).some((entry) => entry.rater.toString() === raterId);
    if (alreadyRated) return res.status(409).json({ message: "You have already submitted a rating for this match" });

    match.ratings.push({ rater: raterId, target: targetPlayerId, score: numericScore });
    await match.save();

    const target = await Player.findById(targetPlayerId);
    if (target) {
      target.stats.ratingTotal += numericScore;
      target.stats.ratingCount += 1;
      target.stats.rating = Number((target.stats.ratingTotal / target.stats.ratingCount).toFixed(2));
      await target.save();
    }

    const targetRatings = match.ratings.filter((entry) => entry.target.toString() === targetPlayerId);
    const total = targetRatings.reduce((sum, entry) => sum + entry.score, 0);
    const average = Number((total / targetRatings.length).toFixed(2));
    return res.status(201).json({ message: "Rating submitted", targetPlayerId, averageRatingForThisMatch: average, totalRatingsForThisMatch: targetRatings.length });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:matchId", requireAdminAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    if (!mongoose.isValidObjectId(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    await Promise.all([
      Match.deleteOne({ _id: match._id }),
      Tournament.updateMany({ matches: match._id }, { $pull: { matches: match._id } }),
    ]);

    return res.status(200).json({ message: "Match deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
