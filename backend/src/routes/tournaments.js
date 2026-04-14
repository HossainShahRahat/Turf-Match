import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { Tournament } from "../models/Tournament.js";
import { Player } from "../models/Player.js";
import { Match } from "../models/Match.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { uploadTournamentImageBuffer } from "../services/cloudinary.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    return cb(null, true);
  },
});

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map((v) => String(v).trim()).filter(Boolean);
  const text = String(value).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed))
        return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch (_error) {
      return [];
    }
  }
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "no") return false;
  }
  return fallback;
};

const parseGroups = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const text = String(value).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const normalizeTournamentTeams = (value) => {
  if (!value) return [];
  let rawTeams = value;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    try {
      rawTeams = JSON.parse(text);
    } catch (_error) {
      rawTeams = text.split(",").map((name) => ({ name: name.trim() }));
    }
  }
  if (!Array.isArray(rawTeams)) return [];
  return rawTeams
    .map((team) => {
      if (typeof team === "string") {
        return { name: team.trim(), players: [], captain: null };
      }
      if (!team || typeof team !== "object") return null;
      const name = String(team.name || "").trim();
      const players = parseList(team.players);
      const captain = team.captain ? String(team.captain).trim() : null;
      return { name, players, captain: captain || null };
    })
    .filter((team) => team?.name);
};

const getTournamentTeamNames = (teams = []) =>
  teams
    .map((team) => (typeof team === "string" ? team : team?.name))
    .map((name) => String(name || "").trim())
    .filter(Boolean);

const normalizeTournamentTeamForResponse = (team) => {
  if (typeof team === "string") {
    return {
      name: team,
      players: [],
      captain: null,
    };
  }
  return {
    name: team?.name || "",
    players: team?.players || [],
    captain: team?.captain || null,
  };
};

const normalizeTournamentTeamForMatch = (team) => {
  if (typeof team === "string") {
    return {
      name: team,
      players: [],
      captain: null,
    };
  }
  return {
    name: team?.name || "",
    players: team?.players || [],
    captain: team?.captain || null,
  };
};

const findTournamentTeam = (teams = [], name = "") =>
  teams.find(
    (team) =>
      String(typeof team === "string" ? team : team?.name || "")
        .trim()
        .toLowerCase() ===
      String(name || "")
        .trim()
        .toLowerCase(),
  );

const collectTournamentPlayerIds = (teams = []) =>
  teams.flatMap((team) => (team.players || []).map((id) => id.toString()));

const validateTournamentTeamsPlayers = async (teams, res) => {
  const allPlayerIds = collectTournamentPlayerIds(teams);

  if (allPlayerIds.some((id) => !mongoose.isValidObjectId(id))) {
    res.status(400).json({
      message: "Team players and captains must be valid player IDs",
    });
    return false;
  }

  const uniquePlayerIds = [...new Set(allPlayerIds)];
  if (uniquePlayerIds.length !== allPlayerIds.length) {
    res
      .status(400)
      .json({ message: "A player can only belong to one tournament team" });
    return false;
  }

  if (uniquePlayerIds.length > 0) {
    const foundPlayers = await Player.countDocuments({
      _id: { $in: uniquePlayerIds },
    });
    if (foundPlayers !== uniquePlayerIds.length) {
      res.status(400).json({
        message: "One or more tournament team players do not exist",
      });
      return false;
    }
  }

  for (const team of teams) {
    const playerIds = new Set((team.players || []).map((id) => id.toString()));
    if (playerIds.size !== (team.players || []).length) {
      res
        .status(400)
        .json({ message: `Duplicate players found in team ${team.name}` });
      return false;
    }
    if (team.captain && !mongoose.isValidObjectId(team.captain)) {
      res.status(400).json({
        message: "Team players and captains must be valid player IDs",
      });
      return false;
    }
    if (team.captain && !playerIds.has(team.captain.toString())) {
      res.status(400).json({
        message: `Captain for ${team.name} must also be selected as a team player`,
      });
      return false;
    }
  }

  return true;
};

const logTournamentRouteError = (scope, error, meta = {}) => {
  console.error(`[tournaments] ${scope} failed`, {
    message: error?.message,
    stack: error?.stack,
    ...meta,
  });
};

function getMatchScore(match) {
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
    return { teamAScore: manualTeamA, teamBScore: manualTeamB };
  }
  const teamAIds = new Set(
    (match.teams?.[0]?.players || []).map((id) => id.toString()),
  );
  let teamAScore = 0;
  let teamBScore = 0;
  for (const goal of match.goals || []) {
    if (goal.teamIndex === 0) teamAScore += 1;
    else if (goal.teamIndex === 1) teamBScore += 1;
    else {
      const scorerId = goal.player?.toString?.();
      if (scorerId && teamAIds.has(scorerId)) teamAScore += 1;
      else teamBScore += 1;
    }
  }
  return { teamAScore, teamBScore };
}

const initTable = (teams) =>
  Object.fromEntries(
    teams.map((name) => [
      name,
      {
        team: name,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
    ]),
  );
const sortBoard = (table) =>
  Object.values(table).sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team),
  );

function applyLeaguePoints(home, away, homeScore, awayScore, config) {
  if (config.pointsMode === "goals") {
    home.points += homeScore;
    away.points += awayScore;
    return;
  }
  if (homeScore > awayScore) {
    home.points += config.scorePoints.win;
    away.points += config.scorePoints.loss;
    home.won += 1;
    away.lost += 1;
  } else if (awayScore > homeScore) {
    away.points += config.scorePoints.win;
    home.points += config.scorePoints.loss;
    away.won += 1;
    home.lost += 1;
  } else {
    home.points += config.scorePoints.draw;
    away.points += config.scorePoints.draw;
    home.draw += 1;
    away.draw += 1;
  }
}

function computeProgression(tournament, matches) {
  const config = tournament.progressionConfig || {};
  const pointsMode = config.pointsMode || "score";
  const scorePoints = {
    win: Number(config.scorePoints?.win ?? 3),
    draw: Number(config.scorePoints?.draw ?? 1),
    loss: Number(config.scorePoints?.loss ?? 0),
  };
  const qualifiedCount = Math.max(1, Number(config.groupQualifiedCount || 2));
  const teams = getTournamentTeamNames(tournament.teams || []);
  const finished = matches.filter((m) => m.status === "finished");
  let scoreboard = [];
  let qualifiedTeams = [];
  let winner = "";

  if (tournament.type === "league") {
    const table = initTable(teams);
    for (const m of finished) {
      const a = m.teams?.[0]?.name;
      const b = m.teams?.[1]?.name;
      if (!table[a] || !table[b]) continue;
      const { teamAScore, teamBScore } = getMatchScore(m);
      const home = table[a];
      const away = table[b];
      home.played += 1;
      away.played += 1;
      home.goalsFor += teamAScore;
      home.goalsAgainst += teamBScore;
      away.goalsFor += teamBScore;
      away.goalsAgainst += teamAScore;
      applyLeaguePoints(home, away, teamAScore, teamBScore, {
        pointsMode,
        scorePoints,
      });
    }
    scoreboard = sortBoard(table);
    winner = tournament.status === "finished" ? scoreboard[0]?.team || "" : "";
  } else if (tournament.type === "knockout") {
    const eliminated = Object.fromEntries(teams.map((t) => [t, false]));
    for (const m of finished) {
      const a = m.teams?.[0]?.name;
      const b = m.teams?.[1]?.name;
      if (!a || !b) continue;
      const { teamAScore, teamBScore } = getMatchScore(m);
      if (teamAScore > teamBScore) eliminated[b] = true;
      else if (teamBScore > teamAScore) eliminated[a] = true;
    }
    scoreboard = teams.map((t) => ({
      team: t,
      eliminated: Boolean(eliminated[t]),
    }));
    const alive = teams.filter((t) => !eliminated[t]);
    winner =
      tournament.status === "finished" && alive.length === 1 ? alive[0] : "";
  } else {
    const groups = (config.groups || []).length
      ? (config.groups || []).reduce(
          (acc, g) => ({ ...acc, [g.name]: g.teams || [] }),
          {},
        )
      : Object.fromEntries(
          buildDefaultGroups(teams).map((group) => [group.name, group.teams]),
        );
    const groupBoards = [];
    for (const [groupName, groupTeams] of Object.entries(groups)) {
      const table = initTable(groupTeams);
      for (const m of finished) {
        const a = m.teams?.[0]?.name;
        const b = m.teams?.[1]?.name;
        if (!table[a] || !table[b]) continue;
        const { teamAScore, teamBScore } = getMatchScore(m);
        const home = table[a];
        const away = table[b];
        home.played += 1;
        away.played += 1;
        home.goalsFor += teamAScore;
        home.goalsAgainst += teamBScore;
        away.goalsFor += teamBScore;
        away.goalsAgainst += teamAScore;
        applyLeaguePoints(home, away, teamAScore, teamBScore, {
          pointsMode,
          scorePoints,
        });
      }
      const board = sortBoard(table);
      groupBoards.push({ group: groupName, table: board });
      qualifiedTeams.push(...board.slice(0, qualifiedCount).map((e) => e.team));
    }
    scoreboard = groupBoards;
    const eliminated = Object.fromEntries(
      qualifiedTeams.map((t) => [t, false]),
    );
    for (const m of finished) {
      const a = m.teams?.[0]?.name;
      const b = m.teams?.[1]?.name;
      if (!(a in eliminated) || !(b in eliminated)) continue;
      const { teamAScore, teamBScore } = getMatchScore(m);
      if (teamAScore > teamBScore) eliminated[b] = true;
      else if (teamBScore > teamAScore) eliminated[a] = true;
    }
    const alive = qualifiedTeams.filter((t) => !eliminated[t]);
    winner =
      tournament.status === "finished" && alive.length === 1 ? alive[0] : "";
  }
  return { pointsMode, scoreboard, qualifiedTeams, winner };
}

function computeTopScorers(matches) {
  const scorers = new Map();

  for (const match of matches) {
    for (const goal of match.goals || []) {
      const player = goal.player;
      const playerId = player?._id?.toString?.() || player?.toString?.();
      if (!playerId) continue;

      const current = scorers.get(playerId) || {
        playerId,
        name: player?.name || "Unknown Player",
        playerCode: player?.playerId || "",
        goals: 0,
      };
      current.goals += 1;
      if (player?.name) current.name = player.name;
      if (player?.playerId) current.playerCode = player.playerId;
      scorers.set(playerId, current);
    }
  }

  return [...scorers.values()]
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        a.name.localeCompare(b.name) ||
        a.playerCode.localeCompare(b.playerCode),
    )
    .slice(0, 10);
}

const buildRoundRobinPairs = (teams) => {
  const list = [...teams];
  if (list.length % 2 !== 0) list.push("BYE");
  const rounds = [];
  for (let r = 0; r < list.length - 1; r += 1) {
    const pairs = [];
    for (let i = 0; i < list.length / 2; i += 1) {
      const a = list[i];
      const b = list[list.length - 1 - i];
      if (a !== "BYE" && b !== "BYE") pairs.push([a, b]);
    }
    rounds.push(pairs);
    const fixed = list[0];
    const moving = list.slice(1);
    moving.unshift(moving.pop());
    list.splice(0, list.length, fixed, ...moving);
  }
  return rounds;
};
const buildKnockoutPairs = (teams) => {
  const pairs = [];
  for (let i = 0; i < teams.length; i += 2)
    if (teams[i + 1]) pairs.push([teams[i], teams[i + 1]]);
  return pairs;
};

const buildSequentialPairs = (teams) => {
  const pairs = [];
  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      pairs.push([teams[i], teams[j]]);
    }
  }
  return pairs;
};

const buildDefaultGroups = (teams) => {
  if (teams.length <= 4) {
    return [{ name: "Group A", teams }];
  }
  return [
    {
      name: "Group A",
      teams: teams.filter((_, idx) => idx % 2 === 0),
    },
    {
      name: "Group B",
      teams: teams.filter((_, idx) => idx % 2 === 1),
    },
  ].filter((group) => group.teams.length > 0);
};

const makePlaceholderTeam = (name) => ({
  name,
  players: [],
  captain: null,
});

function resolveKnockoutPlan(tournament, groups) {
  const config = tournament.progressionConfig || {};
  const stageMode = config.knockoutStageMode || "auto";
  const explicitRound = config.knockoutRound || "semi";
  const qualifiedCount = Math.max(1, Number(config.groupQualifiedCount || 2));
  const totalQualified = groups.reduce(
    (sum, group) => sum + Math.min(group.teams.length, qualifiedCount),
    0,
  );

  let round = explicitRound;
  let includeThirdPlace = Boolean(config.includeThirdPlaceMatch);

  if (stageMode === "auto") {
    if (totalQualified >= 8) round = "quarter";
    else if (totalQualified >= 4) round = "semi";
    else round = "final";

    includeThirdPlace =
      totalQualified >= 4 ||
      (groups.length === 1 && groups[0].teams.length === 4 && totalQualified === 2);
  }

  return { round, includeThirdPlace, qualifiedCount, totalQualified };
}

function buildGroupKnockoutFixtures(groups, tournament) {
  const { round, includeThirdPlace, qualifiedCount } = resolveKnockoutPlan(
    tournament,
    groups,
  );
  const fixtures = [];
  const hasSingleGroup = groups.length === 1;

  if (round === "quarter") {
    if (hasSingleGroup) {
      fixtures.push(
        { teamA: "1st Group A", teamB: "8th Group A", phase: "quarter-final-1" },
        { teamA: "4th Group A", teamB: "5th Group A", phase: "quarter-final-2" },
        { teamA: "2nd Group A", teamB: "7th Group A", phase: "quarter-final-3" },
        { teamA: "3rd Group A", teamB: "6th Group A", phase: "quarter-final-4" },
      );
    } else {
      const first = groups[0]?.name || "Group A";
      const second = groups[1]?.name || "Group B";
      fixtures.push(
        { teamA: `1st ${first}`, teamB: `4th ${second}`, phase: "quarter-final-1" },
        { teamA: `2nd ${first}`, teamB: `3rd ${second}`, phase: "quarter-final-2" },
        { teamA: `1st ${second}`, teamB: `4th ${first}`, phase: "quarter-final-3" },
        { teamA: `2nd ${second}`, teamB: `3rd ${first}`, phase: "quarter-final-4" },
      );
    }
    fixtures.push(
      { teamA: "Winner Quarter 1", teamB: "Winner Quarter 2", phase: "semi-final-1" },
      { teamA: "Winner Quarter 3", teamB: "Winner Quarter 4", phase: "semi-final-2" },
      { teamA: "Winner Semi 1", teamB: "Winner Semi 2", phase: "final" },
    );
    if (includeThirdPlace) {
      fixtures.push({
        teamA: "Loser Semi 1",
        teamB: "Loser Semi 2",
        phase: "third-place",
      });
    }
    return fixtures;
  }

  if (round === "semi") {
    if (hasSingleGroup) {
      fixtures.push(
        { teamA: "1st Group A", teamB: "4th Group A", phase: "semi-final-1" },
        { teamA: "2nd Group A", teamB: "3rd Group A", phase: "semi-final-2" },
      );
    } else {
      const first = groups[0]?.name || "Group A";
      const second = groups[1]?.name || "Group B";
      fixtures.push(
        { teamA: `1st ${first}`, teamB: `2nd ${second}`, phase: "semi-final-1" },
        { teamA: `1st ${second}`, teamB: `2nd ${first}`, phase: "semi-final-2" },
      );
    }
    fixtures.push({
      teamA: "Winner Semi 1",
      teamB: "Winner Semi 2",
      phase: "final",
    });
    if (includeThirdPlace) {
      fixtures.push({
        teamA: "Loser Semi 1",
        teamB: "Loser Semi 2",
        phase: "third-place",
      });
    }
    return fixtures;
  }

  if (hasSingleGroup && groups[0].teams.length === 4 && qualifiedCount === 2) {
    fixtures.push(
      { teamA: "1st Group A", teamB: "2nd Group A", phase: "final" },
      { teamA: "3rd Group A", teamB: "4th Group A", phase: "third-place" },
    );
    return fixtures;
  }

  const first = groups[0]?.name || "Group A";
  const second = groups[1]?.name || "Group B";
  fixtures.push({
    teamA: groups.length > 1 ? `1st ${first}` : "1st Group A",
    teamB: groups.length > 1 ? `1st ${second}` : "2nd Group A",
    phase: "final",
  });
  if (includeThirdPlace && groups.length > 1) {
    fixtures.push({
      teamA: `2nd ${first}`,
      teamB: `2nd ${second}`,
      phase: "third-place",
    });
  }
  return fixtures;
}

router.get("/", async (_req, res) => {
  try {
    const tournaments = await Tournament.find(
      {},
      "name type status image createdAt teams matches",
    )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.status(200).json({
      tournaments: tournaments.map((t) => ({
        id: t._id,
        name: t.name,
        type: t.type,
        status: t.status,
        image: t.image || "",
        createdAt: t.createdAt,
        teams: getTournamentTeamNames(t.teams || []),
        teamCount: getTournamentTeamNames(t.teams || []).length,
        matchCount: Array.isArray(t.matches) ? t.matches.length : 0,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", requireAdminAuth, upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      type,
      status,
      transferMarketEnabled,
      livePlayersPerTeam,
      subPlayersPerTeam,
      allowSwapPlayers,
      pointsMode,
      scoreWinPoints,
      scoreDrawPoints,
      scoreLossPoints,
      groupQualifiedCount,
      knockoutStageMode,
      knockoutRound,
      includeThirdPlaceMatch,
    } = req.body;
    if (!name || !type)
      return res.status(400).json({ message: "name and type are required" });
    if (!["league", "knockout", "group-knockout"].includes(type))
      return res.status(400).json({ message: "Invalid tournament type" });
    const teams = normalizeTournamentTeams(req.body.teams);
    const validPlayers = await validateTournamentTeamsPlayers(teams, res);
    if (!validPlayers) return;
    const duplicateNames = new Set();
    for (const team of teams) {
      const key = team.name.toLowerCase();
      if (duplicateNames.has(key)) {
        return res
          .status(400)
          .json({ message: "Tournament team names must be unique" });
      }
      duplicateNames.add(key);
    }
    const groups = parseGroups(req.body.groups)
      .map((g) => ({
        name: String(g.name || "").trim(),
        teams: parseList(g.teams),
      }))
      .filter((g) => g.name && g.teams.length > 0);
    const matchIds = parseList(req.body.matches);
    if (!matchIds.every((id) => mongoose.isValidObjectId(id)))
      return res
        .status(400)
        .json({ message: "matches must contain valid match ObjectIds" });
    if (new Set(matchIds).size !== matchIds.length)
      return res
        .status(400)
        .json({ message: "matches cannot contain duplicates" });

    let imageUrl = "";
    if (req.file?.buffer) {
      imageUrl = await uploadTournamentImageBuffer(
        req.file.buffer,
        req.file.originalname || "tournament-image",
      );
    }

    const tournament = await Tournament.create({
      name: name.trim(),
      type,
      teams,
      matches: matchIds,
      status:
        status && ["upcoming", "live", "finished"].includes(status)
          ? status
          : "upcoming",
      image: imageUrl,
      progressionConfig: {
        pointsMode: ["score", "goals"].includes(pointsMode)
          ? pointsMode
          : "score",
        scorePoints: {
          win: Number.isFinite(Number(scoreWinPoints))
            ? Number(scoreWinPoints)
            : 3,
          draw: Number.isFinite(Number(scoreDrawPoints))
            ? Number(scoreDrawPoints)
            : 1,
          loss: Number.isFinite(Number(scoreLossPoints))
            ? Number(scoreLossPoints)
            : 0,
        },
        groupQualifiedCount: Number.isFinite(Number(groupQualifiedCount))
          ? Number(groupQualifiedCount)
          : 2,
        knockoutStageMode:
          knockoutStageMode === "custom" ? "custom" : "auto",
        knockoutRound: ["final", "semi", "quarter"].includes(knockoutRound)
          ? knockoutRound
          : "semi",
        includeThirdPlaceMatch:
          includeThirdPlaceMatch === true ||
          includeThirdPlaceMatch === "true",
        groups,
      },
      transferMarketEnabled: parseBoolean(transferMarketEnabled, false),
      squadRules: {
        livePlayersPerTeam: Number.isFinite(Number(livePlayersPerTeam))
          ? Number(livePlayersPerTeam)
          : 7,
        subPlayersPerTeam: Number.isFinite(Number(subPlayersPerTeam))
          ? Number(subPlayersPerTeam)
          : 4,
        allowSwapPlayers: parseBoolean(allowSwapPlayers, true),
      },
    });
    return res.status(201).json({ tournament });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:tournamentId/progression", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    if (!mongoose.isValidObjectId(tournamentId))
      return res.status(400).json({ message: "Invalid tournament ID" });
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });
    const matches = await Match.find({
      _id: { $in: tournament.matches || [] },
    })
      .populate("goals.player", "name playerId")
      .populate("cards.player", "name playerId");
    const progression = computeProgression(tournament, matches);
    const topScorers = computeTopScorers(matches);
    const fixtures = matches
      .sort(
        (a, b) =>
          (a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0) -
          (b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0),
      )
      .map((m) => {
        const { teamAScore, teamBScore } = getMatchScore(m);
        return {
          id: m._id,
          phase: m.phase || "regular",
          scheduledAt: m.scheduledAt,
          status: m.status,
          teamA: m.teams?.[0]?.name || "-",
          teamB: m.teams?.[1]?.name || "-",
          result: m.status === "finished" ? `${teamAScore}-${teamBScore}` : "",
          goalEvents: (m.goals || []).map((goal) => ({
            playerName: goal.player?.name || "Unknown",
            playerCode: goal.player?.playerId || "",
            minute: Number(goal.minute || 0),
            teamIndex: Number.isInteger(goal.teamIndex) ? goal.teamIndex : null,
          })),
          cardEvents: (m.cards || []).map((card) => ({
            playerName: card.player?.name || "Unknown",
            playerCode: card.player?.playerId || "",
            minute: Number(card.minute || 0),
            type: card.type,
            teamIndex: Number.isInteger(card.teamIndex) ? card.teamIndex : null,
          })),
        };
      });
    return res.status(200).json({
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        type: tournament.type,
        status: tournament.status,
        image: tournament.image,
        transferMarketEnabled: Boolean(tournament.transferMarketEnabled),
        squadRules: tournament.squadRules || {
          livePlayersPerTeam: 7,
          subPlayersPerTeam: 4,
          allowSwapPlayers: true,
        },
        teams: (tournament.teams || []).map(normalizeTournamentTeamForResponse),
      },
      progression,
      topScorers,
      fixtures,
    });
  } catch (error) {
    logTournamentRouteError("GET /", error);
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/:tournamentId/status", requireAdminAuth, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { status } = req.body;
    if (!mongoose.isValidObjectId(tournamentId)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }
    if (!["upcoming", "live", "finished"].includes(status)) {
      return res.status(400).json({ message: "Invalid tournament status" });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    tournament.status = status;
    await tournament.save();

    return res.status(200).json({
      message: "Tournament status updated",
      tournament: {
        id: tournament._id,
        status: tournament.status,
      },
    });
  } catch (error) {
    logTournamentRouteError("PATCH /:tournamentId/status", error, {
      tournamentId: req.params.tournamentId,
      body: req.body,
    });
    return res.status(500).json({ message: error.message });
  }
});

// Update tournament teams (admin)
router.patch("/:tournamentId/teams", requireAdminAuth, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    if (!mongoose.isValidObjectId(tournamentId))
      return res.status(400).json({ message: "Invalid tournament ID" });

    const teams = normalizeTournamentTeams(req.body.teams);
    if (!teams.length)
      return res.status(400).json({ message: "Teams are required" });

    const validPlayers = await validateTournamentTeamsPlayers(teams, res);
    if (!validPlayers) return;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    // Ensure unique team names
    const duplicateNames = new Set();
    for (const team of teams) {
      const key = (team.name || "").toLowerCase();
      if (duplicateNames.has(key))
        return res
          .status(400)
          .json({ message: "Tournament team names must be unique" });
      duplicateNames.add(key);
    }

    tournament.teams = teams;
    await tournament.save();
    return res
      .status(200)
      .json({ message: "Tournament teams updated", teams: tournament.teams });
  } catch (error) {
    logTournamentRouteError("PATCH /:tournamentId/teams", error, {
      tournamentId: req.params.tournamentId,
      body: req.body,
    });
    return res.status(500).json({ message: error.message });
  }
});

router.post("/:tournamentId/fixtures", requireAdminAuth, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const {
      teamAName,
      teamBName,
      phase,
      scheduledAt,
      status,
      scoreTeamA,
      scoreTeamB,
    } = req.body;
    if (!mongoose.isValidObjectId(tournamentId)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    const normalizedTeamA = String(teamAName || "").trim();
    const normalizedTeamB = String(teamBName || "").trim();
    if (!normalizedTeamA || !normalizedTeamB) {
      return res.status(400).json({ message: "Both teams are required" });
    }
    if (normalizedTeamA.toLowerCase() === normalizedTeamB.toLowerCase()) {
      return res
        .status(400)
        .json({ message: "A fixture needs two different teams" });
    }

    const rawTeamA = findTournamentTeam(
      tournament.teams || [],
      normalizedTeamA,
    );
    const rawTeamB = findTournamentTeam(
      tournament.teams || [],
      normalizedTeamB,
    );
    const teamA = rawTeamA ? normalizeTournamentTeamForMatch(rawTeamA) : null;
    const teamB = rawTeamB ? normalizeTournamentTeamForMatch(rawTeamB) : null;
    if (!teamA || !teamB) {
      return res
        .status(400)
        .json({ message: "Both teams must belong to the selected tournament" });
    }

    let parsedSchedule = null;
    if (scheduledAt) {
      parsedSchedule = new Date(scheduledAt);
      if (Number.isNaN(parsedSchedule.getTime())) {
        return res.status(400).json({ message: "Invalid scheduledAt value" });
      }
    }

    let score = { teamA: null, teamB: null };
    if (status === "finished") {
      const teamAScore = Number(scoreTeamA);
      const teamBScore = Number(scoreTeamB);
      if (
        !Number.isInteger(teamAScore) ||
        !Number.isInteger(teamBScore) ||
        teamAScore < 0 ||
        teamBScore < 0
      ) {
        return res.status(400).json({
          message: "Finished fixtures require valid team scores",
        });
      }
      score = { teamA: teamAScore, teamB: teamBScore };
    }

    const fixture = await Match.create({
      teams: [
        {
          name: teamA.name,
          players: teamA.players || [],
          captain: teamA.captain || null,
        },
        {
          name: teamB.name,
          players: teamB.players || [],
          captain: teamB.captain || null,
        },
      ],
      tournament: tournament._id,
      phase: String(phase || "regular").trim() || "regular",
      scheduledAt: parsedSchedule,
      score,
      status: ["upcoming", "live", "finished"].includes(status)
        ? status
        : "upcoming",
    });

    if (fixture.status === "finished") {
      await applyFinishedMatchStats(fixture);
    }

    tournament.matches = [...(tournament.matches || []), fixture._id];
    await tournament.save();

    return res.status(201).json({
      message: "Fixture created",
      fixtureId: fixture._id,
    });
  } catch (error) {
    logTournamentRouteError("POST /:tournamentId/fixtures", error, {
      tournamentId: req.params.tournamentId,
      body: req.body,
    });
    return res.status(500).json({ message: error.message });
  }
});

router.post(
  "/:tournamentId/fixtures/generate",
  requireAdminAuth,
  async (req, res) => {
    const created = [];
    try {
      const { tournamentId } = req.params;
      const { startDate, intervalHours, generationMode } = req.body;
      if (!mongoose.isValidObjectId(tournamentId))
        return res.status(400).json({ message: "Invalid tournament ID" });
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament)
        return res.status(404).json({ message: "Tournament not found" });
      if ((tournament.matches || []).length > 0)
        return res
          .status(409)
          .json({ message: "Tournament already has assigned matches" });
      const teams = (tournament.teams || [])
        .map((team) => {
          if (typeof team === "string") {
            return {
              name: team,
              players: [],
              captain: null,
            };
          }
          return {
            name: team?.name || "",
            players: team?.players || [],
            captain: team?.captain || null,
          };
        })
        .filter((team) => team.name);
      if (teams.length < 2)
        return res
          .status(400)
          .json({ message: "At least 2 teams required to generate fixtures" });

      const kickoff = startDate ? new Date(startDate) : new Date();
      const hours = Number.isFinite(Number(intervalHours))
        ? Number(intervalHours)
        : 24;
      if (Number.isNaN(kickoff.getTime()))
        return res.status(400).json({ message: "Invalid startDate" });
      if (hours <= 0)
        return res
          .status(400)
          .json({ message: "intervalHours must be greater than 0" });

      let index = 0;
      const createMatchDoc = async (teamA, teamB, phase) => {
        const scheduledAt = new Date(
          kickoff.getTime() + index * hours * 60 * 60 * 1000,
        );
        index += 1;
        const match = await Match.create({
          teams: [
            {
              name: teamA.name,
              players: teamA.players || [],
              captain: teamA.captain || null,
            },
            {
              name: teamB.name,
              players: teamB.players || [],
              captain: teamB.captain || null,
            },
          ],
          status: "upcoming",
          tournament: tournament._id,
          phase,
          scheduledAt,
        });
        created.push(match._id);
      };

      if (tournament.type === "league") {
        if (generationMode === "sequential") {
          const pairs = buildSequentialPairs(teams);
          for (let matchNumber = 0; matchNumber < pairs.length; matchNumber += 1) {
            const pair = pairs[matchNumber];
            await createMatchDoc(
              pair[0],
              pair[1],
              `league-match-${matchNumber + 1}`,
            );
          }
        } else {
          const rounds = buildRoundRobinPairs(teams);
          for (let round = 0; round < rounds.length; round += 1)
            for (const pair of rounds[round])
              await createMatchDoc(pair[0], pair[1], `league-round-${round + 1}`);
        }
      } else if (tournament.type === "knockout") {
        const pairs = buildKnockoutPairs(teams);
        for (const pair of pairs)
          await createMatchDoc(pair[0], pair[1], "knockout-round-1");
      } else {
        const teamsByName = new Map(teams.map((team) => [team.name, team]));
        const groups = tournament.progressionConfig?.groups?.length
          ? tournament.progressionConfig.groups.map((group) => ({
              name: group.name,
              teams: (group.teams || [])
                .map((teamName) => teamsByName.get(teamName))
                .filter(Boolean),
            }))
          : buildDefaultGroups(teams);
        for (const group of groups) {
          const rounds = buildRoundRobinPairs(group.teams || []);
          for (let round = 0; round < rounds.length; round += 1)
            for (const pair of rounds[round])
              await createMatchDoc(
                pair[0],
                pair[1],
                `${group.name}-round-${round + 1}`,
              );
        }
        const knockoutFixtures = buildGroupKnockoutFixtures(groups, tournament);
        for (const fixture of knockoutFixtures) {
          await createMatchDoc(
            makePlaceholderTeam(fixture.teamA),
            makePlaceholderTeam(fixture.teamB),
            fixture.phase,
          );
        }
      }
      tournament.matches = created;
      await tournament.save();
      return res
        .status(201)
        .json({
          message: "Fixtures generated",
          matchCount: created.length,
          matchIds: created,
        });
    } catch (error) {
      if (created.length) {
        await Match.deleteMany({ _id: { $in: created } }).catch(() => {});
      }
      logTournamentRouteError("POST /:tournamentId/fixtures/generate", error, {
        tournamentId: req.params.tournamentId,
        body: req.body,
      });
      return res.status(500).json({ message: error.message });
    }
  },
);

router.patch(
  "/:tournamentId/matches/assign",
  requireAdminAuth,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { matchIds } = req.body;
      const ids = Array.isArray(matchIds) ? matchIds : [];
      if (!mongoose.isValidObjectId(tournamentId))
        return res.status(400).json({ message: "Invalid tournament ID" });
      if (!ids.length || !ids.every((id) => mongoose.isValidObjectId(id)))
        return res
          .status(400)
          .json({ message: "matchIds must be a non-empty array of ObjectIds" });
      if (new Set(ids).size !== ids.length)
        return res
          .status(400)
          .json({ message: "matchIds cannot contain duplicates" });
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament)
        return res.status(404).json({ message: "Tournament not found" });
      const found = await Match.countDocuments({ _id: { $in: ids } });
      if (found !== ids.length)
        return res
          .status(400)
          .json({ message: "One or more matches do not exist" });
      await Match.updateMany(
        { _id: { $in: ids } },
        { $set: { tournament: tournament._id } },
      );
      tournament.matches = ids;
      await tournament.save();
      return res
        .status(200)
        .json({
          message: "Matches assigned to tournament",
          matchCount: ids.length,
        });
    } catch (error) {
      logTournamentRouteError("PATCH /:tournamentId/matches/assign", error, {
        tournamentId: req.params.tournamentId,
        body: req.body,
      });
      return res.status(500).json({ message: error.message });
    }
  },
);

router.patch(
  "/:tournamentId/player-prices",
  requireAdminAuth,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { playerId, price } = req.body;
      const numericPrice = Number(price);
      if (
        !mongoose.isValidObjectId(tournamentId) ||
        !mongoose.isValidObjectId(playerId)
      )
        return res
          .status(400)
          .json({ message: "Invalid tournament or player ID" });
      if (!Number.isFinite(numericPrice) || numericPrice < 0)
        return res
          .status(400)
          .json({ message: "price must be a non-negative number" });
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament)
        return res.status(404).json({ message: "Tournament not found" });
      const player = await Player.findById(playerId);
      if (!player) return res.status(404).json({ message: "Player not found" });

      const existing = (tournament.playerPrices || []).find(
        (item) => item.player.toString() === playerId,
      );
      if (!existing) {
        tournament.playerPrices.push({ player: playerId, price: numericPrice });
        player.stats.tournamentsPlayed += 1;
        player.stats.totalValue += numericPrice;
      } else {
        const old = Number(existing.price || 0);
        existing.price = numericPrice;
        player.stats.totalValue += numericPrice - old;
      }
      player.stats.value =
        player.stats.tournamentsPlayed > 0
          ? Number(
              (
                player.stats.totalValue / player.stats.tournamentsPlayed
              ).toFixed(2),
            )
          : 0;
      await tournament.save();
      await player.save();
      return res
        .status(200)
        .json({
          message: "Player price updated for tournament",
          player: {
            id: player._id,
            playerId: player.playerId,
            name: player.name,
            tournamentsPlayed: player.stats.tournamentsPlayed,
            totalValue: player.stats.totalValue,
            value: player.stats.value,
          },
        });
    } catch (error) {
      logTournamentRouteError("PATCH /:tournamentId/player-prices", error, {
        tournamentId: req.params.tournamentId,
        body: req.body,
      });
      return res.status(500).json({ message: error.message });
    }
  },
);

router.delete(
  "/:tournamentId/fixtures/:fixtureId",
  requireAdminAuth,
  async (req, res) => {
    try {
      const { tournamentId, fixtureId } = req.params;
      if (
        !mongoose.isValidObjectId(tournamentId) ||
        !mongoose.isValidObjectId(fixtureId)
      ) {
        return res.status(400).json({ message: "Invalid tournament or fixture ID" });
      }
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament)
        return res.status(404).json({ message: "Tournament not found" });
      const existsInTournament = (tournament.matches || []).some(
        (id) => id.toString() === fixtureId,
      );
      if (!existsInTournament) {
        return res
          .status(404)
          .json({ message: "Fixture does not belong to this tournament" });
      }

      await Match.deleteOne({ _id: fixtureId, tournament: tournament._id });
      tournament.matches = (tournament.matches || []).filter(
        (id) => id.toString() !== fixtureId,
      );
      await tournament.save();
      return res.status(200).json({ message: "Tournament history item deleted" });
    } catch (error) {
      logTournamentRouteError("DELETE /:tournamentId/fixtures/:fixtureId", error, {
        params: req.params,
      });
      return res.status(500).json({ message: error.message });
    }
  },
);

router.post(
  "/:tournamentId/transfer-player",
  requireAdminAuth,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { playerId, fromTeamName, toTeamName } = req.body;
      if (!mongoose.isValidObjectId(tournamentId) || !mongoose.isValidObjectId(playerId)) {
        return res.status(400).json({ message: "Invalid tournament or player ID" });
      }
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (tournament.type !== "league") {
        return res
          .status(400)
          .json({ message: "Player transfer is only available for league tournaments" });
      }

      const fromTeam = (tournament.teams || []).find(
        (team) => String(team?.name || "").trim().toLowerCase() === String(fromTeamName || "").trim().toLowerCase(),
      );
      const toTeam = (tournament.teams || []).find(
        (team) => String(team?.name || "").trim().toLowerCase() === String(toTeamName || "").trim().toLowerCase(),
      );
      if (!fromTeam || !toTeam) {
        return res.status(400).json({ message: "Both source and destination teams are required" });
      }

      const pid = playerId.toString();
      fromTeam.players = (fromTeam.players || []).filter((id) => id.toString() !== pid);
      if (!(toTeam.players || []).some((id) => id.toString() === pid)) {
        toTeam.players = [...(toTeam.players || []), new mongoose.Types.ObjectId(pid)];
      }
      if (fromTeam.captain && fromTeam.captain.toString() === pid) fromTeam.captain = null;
      await tournament.save();

      await Match.updateMany(
        {
          _id: { $in: tournament.matches || [] },
          status: { $in: ["upcoming", "live"] },
          "teams.name": { $in: [fromTeam.name, toTeam.name] },
        },
        [
          {
            $set: {
              teams: {
                $map: {
                  input: "$teams",
                  as: "team",
                  in: {
                    $cond: [
                      { $eq: ["$$team.name", fromTeam.name] },
                      {
                        $mergeObjects: [
                          "$$team",
                          {
                            players: {
                              $filter: {
                                input: "$$team.players",
                                as: "p",
                                cond: { $ne: ["$$p", new mongoose.Types.ObjectId(pid)] },
                              },
                            },
                          },
                        ],
                      },
                      {
                        $cond: [
                          { $eq: ["$$team.name", toTeam.name] },
                          {
                            $mergeObjects: [
                              "$$team",
                              {
                                players: {
                                  $setUnion: [
                                    "$$team.players",
                                    [new mongoose.Types.ObjectId(pid)],
                                  ],
                                },
                              },
                            ],
                          },
                          "$$team",
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      );

      return res.status(200).json({ message: "Player transferred between teams" });
    } catch (error) {
      logTournamentRouteError("POST /:tournamentId/transfer-player", error, {
        params: req.params,
        body: req.body,
      });
      return res.status(500).json({ message: error.message });
    }
  },
);

router.delete("/:tournamentId", requireAdminAuth, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    if (!mongoose.isValidObjectId(tournamentId)) {
      return res.status(400).json({ message: "Invalid tournament ID" });
    }
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    await Match.deleteMany({ tournament: tournament._id });
    await Tournament.deleteOne({ _id: tournament._id });
    return res.status(200).json({ message: "Tournament deleted" });
  } catch (error) {
    logTournamentRouteError("DELETE /:tournamentId", error, { params: req.params });
    return res.status(500).json({ message: error.message });
  }
});

export default router;
