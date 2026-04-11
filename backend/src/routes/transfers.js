import express from "express";
import mongoose from "mongoose";
import { requireAdminAuth, requirePlayerAuth } from "../middleware/auth.js";
import { TransferRequest } from "../models/TransferRequest.js";
import { Match } from "../models/Match.js";

const router = express.Router();

function findPlayerTeamIndex(match, playerId) {
  const inTeamA = (match.teams[0].players || []).some((id) => id.toString() === playerId);
  if (inTeamA) return 0;
  const inTeamB = (match.teams[1].players || []).some((id) => id.toString() === playerId);
  return inTeamB ? 1 : -1;
}

router.post("/request", requirePlayerAuth, async (req, res) => {
  try {
    const { matchId, reason } = req.body;
    const playerId = req.user.sub;

    if (!mongoose.isValidObjectId(matchId) || !mongoose.isValidObjectId(playerId)) {
      return res.status(400).json({ message: "Invalid match or player ID" });
    }

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.status === "finished") {
      return res.status(400).json({ message: "Cannot request transfer for a finished match" });
    }

    const fromTeamIndex = findPlayerTeamIndex(match, playerId);
    if (fromTeamIndex === -1) {
      return res.status(403).json({ message: "Player is not part of this match" });
    }
    const toTeamIndex = fromTeamIndex === 0 ? 1 : 0;

    const existingPending = await TransferRequest.findOne({ player: playerId, match: matchId, status: "pending" });
    if (existingPending) {
      return res.status(409).json({ message: "You already have a pending transfer request for this match" });
    }

    const transferRequest = await TransferRequest.create({
      player: playerId,
      match: matchId,
      fromTeamIndex,
      toTeamIndex,
      reason: reason?.trim() || ""
    });
    return res.status(201).json({ request: transferRequest });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/requests", requireAdminAuth, async (_req, res) => {
  try {
    const requests = await TransferRequest.find({})
      .populate("player", "name playerId")
      .populate("match", "_id status teams.name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/requests/:requestId", requireAdminAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const requestDoc = await TransferRequest.findById(requestId);
    if (!requestDoc) return res.status(404).json({ message: "Transfer request not found" });
    if (requestDoc.status !== "pending") {
      return res.status(409).json({ message: "Only pending requests can be updated" });
    }

    requestDoc.status = status;
    await requestDoc.save();

    if (status === "approved") {
      const match = await Match.findById(requestDoc.match);
      if (!match) return res.status(404).json({ message: "Match not found while applying transfer" });
      if (match.status === "finished") {
        return res.status(400).json({ message: "Cannot apply transfer to a finished match" });
      }

      const playerId = requestDoc.player.toString();
      const fromTeam = match.teams[requestDoc.fromTeamIndex];
      const toTeam = match.teams[requestDoc.toTeamIndex];
      fromTeam.players = (fromTeam.players || []).filter((id) => id.toString() !== playerId);
      const alreadyInToTeam = (toTeam.players || []).some((id) => id.toString() === playerId);
      if (!alreadyInToTeam) toTeam.players.push(new mongoose.Types.ObjectId(playerId));

      if (fromTeam.captain && fromTeam.captain.toString() === playerId) fromTeam.captain = null;
      if (toTeam.captain && !toTeam.players.some((id) => id.toString() === toTeam.captain.toString())) {
        toTeam.captain = null;
      }
      await match.save();

      const io = req.app.get("io");
      if (io) io.to(match._id.toString()).emit("match:updated", { _id: match._id, status: match.status, teams: match.teams });
    }

    const updated = await TransferRequest.findById(requestDoc._id)
      .populate("player", "name playerId")
      .populate("match", "_id status teams.name");
    return res.status(200).json({ request: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
