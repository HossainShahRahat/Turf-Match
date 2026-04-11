import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Player } from "../models/Player.js";
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

router.get("/profile/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    const trimmed = playerId.trim();
    const payload = optionalPlayerProfileAuth(req);
    const player = await Player.findOne(
      { playerId: trimmed },
      "name playerId stats email",
    );
    if (!player) return res.status(404).json({ message: "Player not found" });

    if (payload?.role === "admin") {
      return res
        .status(200)
        .json({
          player: {
            name: player.name,
            playerId: player.playerId,
            stats: player.stats,
            email: player.email,
          },
        });
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
          stats: player.stats,
        },
      });
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
