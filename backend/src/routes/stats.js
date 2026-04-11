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

// POST /admin/sample-data - Generate sample data
router.post("/admin/sample-data", requireAdminAuth, async (_req, res) => {
  try {
    // Create sample players
    const samplePlayers = await Player.insertMany([
      { name: "Alex Johnson", playerId: "AJ001", stats: { goals: 5, matches: 10, rating: 7.5 } },
      { name: "Sam Wilson", playerId: "SW002", stats: { goals: 3, matches: 8, rating: 6.8 } },
      { name: "Chris Lee", playerId: "CL003", stats: { goals: 8, matches: 12, rating: 8.2 } },
      { name: "Mike Brown", playerId: "MB004", stats: { goals: 2, matches: 6, rating: 6.5 } },
      { name: "James Davis", playerId: "JD005", stats: { goals: 4, matches: 9, rating: 7.0 } },
      { name: "Tom Miller", playerId: "TM006", stats: { goals: 6, matches: 11, rating: 7.8 } },
    ]);

    // Create sample tournament
    const tournament = await Tournament.create({
      name: "Summer Cup 2024",
      description: "Annual summer football tournament",
      maxTeams: 8,
      teamSize: 6,
      status: "registration",
    });

    // Create sample matches
    const teamA = samplePlayers.slice(0, 3).map(p => p._id);
    const teamB = samplePlayers.slice(3, 6).map(p => p._id);

    await Match.create({
      teams: [
        { name: "Team A", players: teamA },
        { name: "Team B", players: teamB },
      ],
      score: { teamA: 2, teamB: 1 },
      status: "finished",
      phase: "final",
      scheduledAt: new Date(),
      tournament: tournament._id,
      goals: [
        { player: samplePlayers[0]._id, minute: 15, teamIndex: 0 },
        { player: samplePlayers[2]._id, minute: 45, teamIndex: 0 },
        { player: samplePlayers[4]._id, minute: 60, teamIndex: 1 },
      ],
    });

    res.json({ message: "Sample data generated successfully", players: 6, tournament: 1, matches: 1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
