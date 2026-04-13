import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Player } from "../models/Player.js";
import { Match } from "../models/Match.js";
import { requireAdminAuth } from "../middleware/auth.js";

const router = express.Router();

function generatePassword() {
  return Math.random().toString(36).slice(-10);
}

router.get("/", async (_req, res) => {
  try {
    const players = await Player.find({}, "name playerId email stats").sort({
      createdAt: -1,
    });
    return res.status(200).json({ players });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

function optionalPlayerProfileAuth(req) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function buildPlayerProfile(playerId) {
  const player = await Player.findOne(
    { playerId },
    "name playerId stats email position",
  );
  if (!player) return null;

  const matches = await Match.find({
    $or: [
      { "teams.players": player._id },
      { "goals.player": player._id },
      { "cards.player": player._id },
    ],
  }).select("tournament cards");

  let yellowCards = 0;
  let redCards = 0;
  const tournamentIds = new Set();

  for (const match of matches) {
    for (const card of match.cards || []) {
      if (card.player?.toString() !== player._id.toString()) continue;
      if (card.type === "yellow") yellowCards += 1;
      if (card.type === "red") redCards += 1;
    }
    if (match.tournament) tournamentIds.add(match.tournament.toString());
  }

  return {
    name: player.name,
    playerId: player.playerId,
    email: player.email,
    position: player.position || "",
    stats: {
      ...(player.stats?.toObject?.() || player.stats || {}),
      yellowCards,
      redCards,
      tournamentsPlayed:
        Number(player.stats?.tournamentsPlayed || 0) || tournamentIds.size,
    },
  };
}

router.get("/profile/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    const trimmed = playerId.trim();
    const payload = optionalPlayerProfileAuth(req);
    const player = await buildPlayerProfile(trimmed);
    if (!player) return res.status(404).json({ message: "Player not found" });

    if (payload?.role === "admin") {
      return res.status(200).json({ player });
    }
    if (payload?.role === "player") {
      if (payload.playerId !== trimmed) {
        return res
          .status(403)
          .json({ message: "Players can only view their own profile" });
      }
      return res
        .status(200)
        .json({
          player: {
            name: player.name,
            playerId: player.playerId,
            position: player.position,
            stats: player.stats,
          },
        });
    }

    return res
      .status(200)
      .json({
        player: {
          name: player.name,
          playerId: player.playerId,
          position: player.position,
          stats: player.stats,
        },
      });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:playerId", async (req, res) => {
  try {
    const player = await buildPlayerProfile(req.params.playerId.trim());
    if (!player) return res.status(404).json({ message: "Player not found" });
    return res.status(200).json({ player });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", requireAdminAuth, async (req, res) => {
  try {
    const { name, playerId, email, password } = req.body;
    if (!name || !playerId) {
      return res
        .status(400)
        .json({ message: "name and playerId are required" });
    }

    const existing = await Player.findOne({
      $or: [
        { playerId: playerId.trim() },
        ...(email ? [{ email: email.trim().toLowerCase() }] : []),
      ],
    });
    if (existing)
      return res
        .status(409)
        .json({ message: "Player with same id/email already exists" });

    const rawPassword = password?.trim() || generatePassword();
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const player = await Player.create({
      name: name.trim(),
      playerId: playerId.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      passwordHash,
    });

    return res.status(201).json({
      player: {
        id: player._id,
        name: player.name,
        playerId: player.playerId,
        email: player.email,
        stats: player.stats,
      },
      generatedPassword: password ? undefined : rawPassword,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
