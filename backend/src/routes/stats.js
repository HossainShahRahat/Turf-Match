import express from "express";
import { Match } from "../models/Match.js";
import { Player } from "../models/Player.js";
import { Tournament } from "../models/Tournament.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { syncAdminFromEnv } from "../services/adminSync.js";

const router = express.Router();

router.get("/admin/stats", requireAdminAuth, async (_req, res) => {
  try {
    const [matchesCount, playersCount, tournamentsCount] = await Promise.all([
      Match.countDocuments(),
      Player.countDocuments(),
      Tournament.countDocuments({ status: { $ne: "finished" } }),
    ]);

    res.json({
      players: playersCount,
      tournaments: tournamentsCount,
      matches: matchesCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /admin/reset-all - Reset all data
router.delete("/admin/reset-all", requireAdminAuth, async (_req, res) => {
  try {
    await Promise.all([
      Player.deleteMany({}),
      Match.deleteMany({}),
      Tournament.deleteMany({}),
    ]);
    res.json({ message: "All data reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /admin/sync-env - Sync admin from env
router.post("/admin/sync-env", requireAdminAuth, async (_req, res) => {
  try {
    const result = await syncAdminFromEnv();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
