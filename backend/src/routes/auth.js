import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Player } from "../models/Player.js";
import { syncAdminFromEnv } from "../services/adminSync.js";

const router = express.Router();

router.post("/admin-login", async (req, res) => {
  try {
    const { adminId, password } = req.body;
    if (!adminId || !password) {
      return res
        .status(400)
        .json({ message: "adminId and password are required" });
    }

    const expectedAdminId = (
      process.env.ADMIN_ID ||
      process.env.ADMIN_EMAIL ||
      ""
    ).trim();
    const expectedPassword = process.env.ADMIN_PASSWORD || "";
    if (!expectedAdminId || !expectedPassword) {
      return res.status(500).json({
        message: "Admin credentials are not configured on the server",
      });
    }

    if (adminId.trim() !== expectedAdminId || password !== expectedPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: "env-admin", role: "admin", adminId: expectedAdminId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Sync admin to DB on login
    try {
      const syncResult = await import("../services/adminSync.js").then(
        (module) => module.syncAdminFromEnv(),
      );
      console.log(`Admin sync: ${syncResult.action}`);
    } catch (syncError) {
      console.warn("Admin sync failed (non-blocking):", syncError.message);
    }

    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Secure endpoint to trigger ENV -> DB admin sync.
// Requires X-ADMIN-SECRET header matching ADMIN_PASSWORD (or ADMIN_PASS).
router.put("/sync-env", async (req, res) => {
  try {
    const headerSecret = req.get("X-ADMIN-SECRET") || "";
    const expected = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "";
    if (!expected || headerSecret !== expected) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await syncAdminFromEnv();
    return res.status(200).json({ message: "synced", action: result.action });
  } catch (err) {
    console.error("sync-env error:", err);
    return res.status(500).json({ message: err.message });
  }
});

router.post("/player-login", async (req, res) => {
  try {
    const { playerId, password } = req.body;
    if (!playerId || !password) {
      return res
        .status(400)
        .json({ message: "playerId and password are required" });
    }

    const player = await Player.findOne({ playerId: playerId.trim() });
    if (!player)
      return res.status(401).json({ message: "Invalid credentials" });

    const isValidPassword = await bcrypt.compare(password, player.passwordHash);
    if (!isValidPassword)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { sub: player._id.toString(), role: "player", playerId: player.playerId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      token,
      player: { id: player._id, playerId: player.playerId, name: player.name },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
