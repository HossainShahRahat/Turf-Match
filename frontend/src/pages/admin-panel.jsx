﻿import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/config.js";
import { useAuth } from "../lib/auth.jsx";
import { pushNotification, pushToast } from "../lib/ui-feedback.js";
import { createAuthedClient } from "../lib/api-client.js";
import {
  Plus,
  Trophy,
  Users,
  BarChart3,
  RefreshCw,
  Play,
  Square,
  Goal,
  Pencil,
} from "lucide-react";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { getToken, user, logout } = useAuth();

  const [stats, setStats] = useState({});
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showAddTournamentModal, setShowAddTournamentModal] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    email: "",
    position: "",
  });
  const [newTournament, setNewTournament] = useState({
    name: "",
    type: "league",
    status: "upcoming",
    transferMarketEnabled: false,
    livePlayersPerTeam: 7,
    subPlayersPerTeam: 4,
    allowSwapPlayers: true,
    pointsMode: "score",
    knockoutStageMode: "auto",
    knockoutRound: "semi",
    groupQualifiedCount: 2,
    includeThirdPlaceMatch: false,
    hasBidding: false,
    totalMoneyPerTeam: 0,
    teams: [],
  });
  const [tournamentStep, setTournamentStep] = useState(1); // Step 1: Basic Info, Step 2: Teams, Step 3: Config, Step 4: Bidding
  const [playerPricesDraft, setPlayerPricesDraft] = useState([]);

  const [newTeam, setNewTeam] = useState({
    name: "",
    players: [],
  });
  const [tempTeams, setTempTeams] = useState([]);
  const [editingTournament, setEditingTournament] = useState(null);
  const [showEditTeamsModal, setShowEditTeamsModal] = useState(false);
  const [confirmBox, setConfirmBox] = useState({
    open: false,
    title: "",
    text: "",
    onConfirm: null,
  });

  // Match Management States
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedLiveMatch, setSelectedLiveMatch] = useState(null);
  const [newMatch, setNewMatch] = useState({
    teamAName: "",
    teamBName: "",
    teamAPlayers: [],
    teamBPlayers: [],
  });

  // Tournament Matches States
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedTournamentDetails, setSelectedTournamentDetails] =
    useState(null);
  const [tournamentFixtures, setTournamentFixtures] = useState([]);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentStatusDraft, setTournamentStatusDraft] =
    useState("upcoming");
  const [fixtureGenerationForm, setFixtureGenerationForm] = useState({
    startDate: "",
    intervalHours: 24,
    generationMode: "rounds",
  });
  const [isGeneratingFixtures, setIsGeneratingFixtures] = useState(false);
  const [fixtureScheduleDrafts, setFixtureScheduleDrafts] = useState({});
  const [manualFixtureForm, setManualFixtureForm] = useState({
    teamAName: "",
    teamBName: "",
    phase: "regular",
    scheduledAt: "",
    status: "upcoming",
    scoreTeamA: "",
    scoreTeamB: "",
  });
  const [showAddPlayerToTeamModal, setShowAddPlayerToTeamModal] =
    useState(false);
  const [selectedTeamForAddPlayer, setSelectedTeamForAddPlayer] =
    useState(null);
  const [selectedPlayersToAdd, setSelectedPlayersToAdd] = useState([]);
  const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState({
    _id: "",
    name: "",
    email: "",
  });
  const [activeAdminTab, setActiveAdminTab] = useState("all");
  const [transferForm, setTransferForm] = useState({
    playerId: "",
    fromTeamName: "",
    toTeamName: "",
  });
  const selectedFromTeam = (selectedTournamentDetails?.teams || []).find(
    (team) => {
      const teamName = typeof team === "string" ? team : team?.name;
      return (
        String(teamName || "")
          .trim()
          .toLowerCase() ===
        String(transferForm.fromTeamName || "")
          .trim()
          .toLowerCase()
      );
    },
  );
  const transferPlayerOptions = (() => {
    if (!selectedFromTeam || typeof selectedFromTeam === "string") return [];
    const teamPlayers = Array.isArray(selectedFromTeam.players)
      ? selectedFromTeam.players
      : [];
    return teamPlayers
      .map((playerRef) => {
        const playerId =
          typeof playerRef === "string"
            ? playerRef
            : playerRef?._id || playerRef?.id || "";
        const player = players.find(
          (item) => String(item._id) === String(playerId),
        );
        if (!player) return null;
        return {
          _id: player._id,
          label: `${player.name} (${player.playerId})`,
        };
      })
      .filter(Boolean);
  })();

  const tournamentTeamOptions = useMemo(() => {
    const teams =
      selectedTournamentDetails?.teams || selectedTournament?.teams || [];
    return teams
      .map((team) => (typeof team === "string" ? team : team?.name || ""))
      .filter(Boolean);
  }, [selectedTournamentDetails, selectedTournament]);

  useEffect(() => {
    if (!getToken() || !user) {
      navigate("/admin-login");
    }
  }, [getToken, user, navigate]);

  const authClient = useMemo(
    () =>
      createAuthedClient({
        getToken,
        onUnauthorized: () => {
          logout();
          navigate("/admin-login");
        },
      }),
    [getToken, logout, navigate],
  );

  const fetchWithAuth = async (url, options = {}) => {
    return authClient.request(url, options);
  };

  const notify = (text, type = "info") => {
    setMessage(text);
    setMessageType(
      type === "error" ? "error" : type === "success" ? "success" : "info",
    );
    pushToast({ text, type });
    pushNotification(text, type);
  };

  const openConfirm = (title, text, onConfirm) => {
    setConfirmBox({ open: true, title, text, onConfirm });
  };

  const loadStats = async () => {
    try {
      const data = await fetchWithAuth("/stats/admin/stats");
      setStats(data);
    } catch (error) {}
  };
  const loadPlayers = async () => {
    try {
      const { players } = await fetchWithAuth("/players");
      setPlayers(players || []);
    } catch (error) {}
  };
  const loadTournaments = async () => {
    try {
      const { tournaments } = await fetchWithAuth("/tournaments");
      setTournaments(tournaments || []);
    } catch (error) {}
  };

  const normalizeTeamPlayerIds = (team) => {
    if (!team) return [];
    if (Array.isArray(team.players)) {
      return team.players
        .map((player) => {
          if (typeof player === "string") return player;
          if (player && typeof player === "object") {
            return player._id || player.id || "";
          }
          return "";
        })
        .filter(Boolean);
    }
    return [];
  };

  const handleOpenEditTeams = async (tournament) => {
    const tournamentId = tournament?._id || tournament?.id;
    let teamsForEdit = [];
    if (tournamentId) {
      try {
        const data = await fetchWithAuth(
          `/tournaments/${tournamentId}/progression`,
        );
        teamsForEdit = (data?.tournament?.teams || []).map((team) => ({
          name: team?.name || "",
          players: normalizeTeamPlayerIds(team),
        }));
      } catch (_error) {
        teamsForEdit = [];
      }
    }
    if (!teamsForEdit.length) {
      teamsForEdit = (tournament?.teams || []).map((team) => ({
        name: typeof team === "string" ? team : team?.name || "",
        players: normalizeTeamPlayerIds(team),
      }));
    }
    setEditingTournament(tournament);
    setTempTeams(teamsForEdit);
    setShowEditTeamsModal(true);
  };

  const submitTournamentTeamsUpdate = async () => {
    if (!editingTournament) return;
    try {
      await fetchWithAuth(
        `/tournaments/${editingTournament._id || editingTournament.id}/teams`,
        {
          method: "PATCH",
          body: JSON.stringify({ teams: tempTeams }),
        },
      );
      await loadTournaments();
      setShowEditTeamsModal(false);
      setEditingTournament(null);
      setTempTeams([]);
      setMessage("Tournament teams updated.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not update tournament teams: ${error.message}`);
      setMessageType("error");
    }
  };

  const loadLiveMatches = async () => {
    try {
      const response = await fetch(apiUrl("/matches/schedule/upcoming"));
      const data = await response.json();
      const live = (data.matches || []).filter(
        (m) => m.status === "live" || m.status === "upcoming",
      );
      setLiveMatches(live);
    } catch (error) {}
  };

  useEffect(() => {
    if (!getToken()) return;
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadStats(),
          loadPlayers(),
          loadTournaments(),
          loadLiveMatches(),
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      await fetchWithAuth("/players", {
        method: "POST",
        body: JSON.stringify(newPlayer),
      });
      setShowAddPlayerModal(false);
      setNewPlayer({ name: "", email: "", position: "" });
      loadPlayers();
      setMessage("Player added.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not add player: ${error.message}`);
      setMessageType("error");
    }
  };

  const handleAddTournament = async (e) => {
    e.preventDefault();

    if (tournamentStep === 1) {
      // Validate basic info and move to step 2
      if (!newTournament.name.trim()) {
        setMessage("Tournament name is required.");
        setMessageType("error");
        return;
      }
      setTournamentStep(2);
      return;
    }

    if (tournamentStep === 2) {
      // Validate teams and move to step 3
      if (tempTeams.length === 0) {
        setMessage("Add at least one team.");
        setMessageType("error");
        return;
      }

      // Initialize player prices draft from tempTeams
      const initialPrices = [];
      tempTeams.forEach((team) => {
        (team.players || []).forEach((playerId) => {
          initialPrices.push({
            playerId,
            price: 0,
            teamName: team.name,
          });
        });
      });
      setPlayerPricesDraft(initialPrices);

      setTournamentStep(3);
      return;
    }

    if (tournamentStep === 3) {
      // If bidding enabled, move to step 4. Otherwise submit.
      if (newTournament.hasBidding) {
        setTournamentStep(4);
        return;
      }
      await submitTournament();
      return;
    }

    if (tournamentStep === 4) {
      // Submit tournament with bidding
      await submitTournament();
    }
  };

  const submitTournament = async () => {
    try {
      // Build player prices array from draft
      const playerPrices = playerPricesDraft
        .filter((item) => item.price > 0)
        .map((item) => ({
          playerId: item.playerId,
          price: item.price,
        }));

      const tournamentData = {
        ...newTournament,
        scoreWinPoints: 3,
        scoreDrawPoints: 1,
        scoreLossPoints: 0,
        teams: tempTeams.map((team) => ({
          name: team.name,
          players: team.players,
          captain: team.players[0] || null,
        })),
        playerPrices,
      };

      await fetchWithAuth("/tournaments", {
        method: "POST",
        body: JSON.stringify(tournamentData),
      });

      setShowAddTournamentModal(false);
      setTournamentStep(1);
      setNewTournament({
        name: "",
        type: "league",
        status: "upcoming",
        transferMarketEnabled: false,
        livePlayersPerTeam: 7,
        subPlayersPerTeam: 4,
        allowSwapPlayers: true,
        pointsMode: "score",
        knockoutStageMode: "auto",
        knockoutRound: "semi",
        groupQualifiedCount: 2,
        includeThirdPlaceMatch: false,
        hasBidding: false,
        totalMoneyPerTeam: 0,
        teams: [],
      });
      setPlayerPricesDraft([]);

      setTempTeams([]);
      setNewTeam({ name: "", players: [] });
      loadTournaments();
      notify("Tournament created successfully", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const addTeamToTournament = () => {
    if (!newTeam.name.trim()) {
      setMessage("Team name is required.");
      setMessageType("error");
      return;
    }

    if (newTeam.players.length < 3) {
      setMessage("Team must have at least 3 players.");
      setMessageType("error");
      return;
    }

    if (
      tempTeams.some((t) => t.name.toLowerCase() === newTeam.name.toLowerCase())
    ) {
      setMessage("Team already exists.");
      setMessageType("error");
      return;
    }

    setTempTeams([
      ...tempTeams,
      { ...newTeam, players: newTeam.players || [] },
    ]);
    setNewTeam({ name: "", players: [] });
    setMessage("Team added.");
    setMessageType("success");
  };

  const removeTeamFromTournament = (index) => {
    setTempTeams(tempTeams.filter((_, i) => i !== index));
  };

  const addPlayerToTeam = (playerId) => {
    if (newTeam.players.includes(playerId)) {
      // Remove player if already selected
      setNewTeam({
        ...newTeam,
        players: newTeam.players.filter((p) => p !== playerId),
      });
    } else {
      // Add player only if less than 11 players already selected
      if (newTeam.players.length >= 11) {
        return; // Button is disabled, this shouldn't happen
      }
      setNewTeam({
        ...newTeam,
        players: [...newTeam.players, playerId],
      });
    }
  };

  const toggleMatchPlayer = (teamKey, playerId) => {
    const oppositeKey =
      teamKey === "teamAPlayers" ? "teamBPlayers" : "teamAPlayers";
    const currentTeamPlayers = newMatch[teamKey] || [];
    const otherTeamPlayers = newMatch[oppositeKey] || [];

    if (currentTeamPlayers.includes(playerId)) {
      setNewMatch({
        ...newMatch,
        [teamKey]: currentTeamPlayers.filter((id) => id !== playerId),
      });
      return;
    }

    if (
      currentTeamPlayers.length >= 11 ||
      otherTeamPlayers.includes(playerId)
    ) {
      return;
    }

    setNewMatch({
      ...newMatch,
      [teamKey]: [...currentTeamPlayers, playerId],
    });
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!newMatch.teamAName || !newMatch.teamBName) {
      setMessage("Please enter both team names.");
      setMessageType("error");
      return;
    }

    if (newMatch.teamAPlayers.length < 3) {
      setMessage("Team A needs at least 3 players.");
      setMessageType("error");
      return;
    }

    if (newMatch.teamBPlayers.length < 3) {
      setMessage("Team B needs at least 3 players.");
      setMessageType("error");
      return;
    }

    try {
      const response = await fetchWithAuth("/matches", {
        method: "POST",
        body: JSON.stringify({
          teamA: {
            name: newMatch.teamAName,
            players: newMatch.teamAPlayers,
          },
          teamB: {
            name: newMatch.teamBName,
            players: newMatch.teamBPlayers,
          },
          status: "live",
        }),
      });

      setShowCreateMatchModal(false);
      setNewMatch({
        teamAName: "",
        teamBName: "",
        teamAPlayers: [],
        teamBPlayers: [],
      });
      await loadLiveMatches();
      setMessage("Match created and started.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not create match: ${error.message}`);
      setMessageType("error");
    }
  };

  const handleEndMatch = async (matchId) => {
    openConfirm(
      "Finish match",
      "Are you sure you want to end this match?",
      async () => {
        try {
          await fetchWithAuth(`/matches/${matchId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "finished" }),
          });
          await loadLiveMatches();
          setSelectedLiveMatch(null);
          notify("Match ended successfully", "success");
        } catch (error) {
          notify(error.message, "error");
        }
      },
    );
  };

  const loadTournamentDetails = async (tournamentId) => {
    if (!tournamentId) return;
    setTournamentLoading(true);
    try {
      const data = await fetchWithAuth(
        `/tournaments/${tournamentId}/progression`,
      );
      setSelectedTournamentDetails(data.tournament || null);
      setTournamentFixtures(data.fixtures || []);
      setTournamentStatusDraft(data.tournament?.status || "upcoming");
      setFixtureScheduleDrafts(
        Object.fromEntries(
          (data.fixtures || []).map((fixture) => [
            fixture.id,
            fixture.scheduledAt
              ? new Date(
                  new Date(fixture.scheduledAt).getTime() -
                    new Date(fixture.scheduledAt).getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)
              : "",
          ]),
        ),
      );
    } catch (error) {
      setMessage(`Could not load tournament details: ${error.message}`);
      setMessageType("error");
      setSelectedTournamentDetails(null);
      setTournamentFixtures([]);
    } finally {
      setTournamentLoading(false);
    }
  };

  const handleTournamentSelect = async (tournament) => {
    setSelectedTournament(tournament);
    await loadTournamentDetails(tournament._id || tournament.id);
  };

  const handleGenerateTournamentFixtures = async () => {
    if (isGeneratingFixtures) return;
    const tournamentId = selectedTournament?._id || selectedTournament?.id;
    if (!tournamentId) {
      setMessage("Select a tournament first.");
      setMessageType("error");
      return;
    }

    setIsGeneratingFixtures(true);
    try {
      const data = await fetchWithAuth(
        `/tournaments/${tournamentId}/fixtures/generate`,
        {
          method: "POST",
          body: JSON.stringify({
            startDate: fixtureGenerationForm.startDate || undefined,
            intervalHours: Number(fixtureGenerationForm.intervalHours) || 24,
            generationMode: fixtureGenerationForm.generationMode || "rounds",
          }),
        },
      );
      await Promise.all([
        loadTournaments(),
        loadTournamentDetails(tournamentId),
        loadLiveMatches(),
      ]);
      setMessage(`${data.matchCount || 0} tournament fixtures generated.`);
      setMessageType("success");
    } catch (error) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("already has assigned matches")) {
        setMessage(
          "Fixtures are already generated for this tournament. Delete existing fixtures first if you need to regenerate.",
        );
      } else {
        setMessage(`Could not generate fixtures: ${error.message}`);
      }
      setMessageType("error");
    } finally {
      setIsGeneratingFixtures(false);
    }
  };

  const handleStartTournamentFixture = async (fixtureId) => {
    if (!fixtureId) return;
    try {
      await fetchWithAuth(`/matches/${fixtureId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "live" }),
      });
      await Promise.all([
        loadTournamentDetails(
          selectedTournament?._id || selectedTournament?.id,
        ),
        loadLiveMatches(),
      ]);
      setMessage("Tournament match started.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not start tournament match: ${error.message}`);
      setMessageType("error");
    }
  };

  const handleTournamentStatusUpdate = async () => {
    const tournamentId = selectedTournament?._id || selectedTournament?.id;
    if (!tournamentId) return;
    try {
      await fetchWithAuth(`/tournaments/${tournamentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: tournamentStatusDraft }),
      });
      await Promise.all([
        loadTournaments(),
        loadTournamentDetails(tournamentId),
      ]);
      setMessage(`Tournament status set to ${tournamentStatusDraft}.`);
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not update tournament status: ${error.message}`);
      setMessageType("error");
    }
  };

  const handleFixtureScheduleUpdate = async (fixtureId) => {
    try {
      await fetchWithAuth(`/matches/${fixtureId}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({
          scheduledAt: fixtureScheduleDrafts[fixtureId] || null,
        }),
      });
      await loadTournamentDetails(
        selectedTournament?._id || selectedTournament?.id,
      );
      setMessage("Fixture schedule updated.");
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not update fixture schedule: ${error.message}`);
      setMessageType("error");
    }
  };

  const handleCreateManualFixture = async () => {
    const tournamentId = selectedTournament?._id || selectedTournament?.id;
    if (!tournamentId) return;

    if (!manualFixtureForm.teamAName || !manualFixtureForm.teamBName) {
      setMessage("Select both teams for the fixture.");
      setMessageType("error");
      return;
    }
    if (
      manualFixtureForm.status === "finished" &&
      (manualFixtureForm.scoreTeamA === "" ||
        manualFixtureForm.scoreTeamB === "")
    ) {
      setMessage("Enter the final score for an old match record.");
      setMessageType("error");
      return;
    }

    try {
      await fetchWithAuth(`/tournaments/${tournamentId}/fixtures`, {
        method: "POST",
        body: JSON.stringify(manualFixtureForm),
      });
      await Promise.all([
        loadTournaments(),
        loadTournamentDetails(tournamentId),
        loadLiveMatches(),
      ]);
      setManualFixtureForm({
        teamAName: "",
        teamBName: "",
        phase: "regular",
        scheduledAt: "",
        status: "upcoming",
        scoreTeamA: "",
        scoreTeamB: "",
      });
      setMessage(
        manualFixtureForm.status === "finished"
          ? "✅ Old match record added"
          : "✅ Fixture created manually",
      );
      setMessageType("success");
    } catch (error) {
      setMessage(`Could not create fixture: ${error.message}`);
      setMessageType("error");
    }
  };

  const handleDeleteTournamentFixture = async (fixtureId, fixtureStatus) => {
    const tournamentId = selectedTournament?._id || selectedTournament?.id;
    if (!tournamentId || !fixtureId) return;
    const isLive = String(fixtureStatus || "").toLowerCase() === "live";
    openConfirm(
      "Delete fixture",
      isLive
        ? "This fixture is live right now. Delete it permanently?"
        : "Delete this fixture permanently?",
      async () => {
        try {
          await fetchWithAuth(
            `/tournaments/${tournamentId}/fixtures/${fixtureId}`,
            {
              method: "DELETE",
            },
          );
          await Promise.all([
            loadTournamentDetails(tournamentId),
            loadTournaments(),
            loadLiveMatches(),
          ]);
          notify("Tournament fixture deleted", "success");
        } catch (error) {
          notify(error.message, "error");
        }
      },
    );
  };

  const handleTransferLeaguePlayer = async () => {
    const tournamentId = selectedTournament?._id || selectedTournament?.id;
    if (!tournamentId) return;
    if (!transferForm.playerId) {
      notify("Select a player to transfer.", "error");
      return;
    }
    if (!transferForm.fromTeamName || !transferForm.toTeamName) {
      notify("Select both source and destination teams.", "error");
      return;
    }
    if (
      String(transferForm.fromTeamName).trim().toLowerCase() ===
      String(transferForm.toTeamName).trim().toLowerCase()
    ) {
      notify("Source and destination teams must be different.", "error");
      return;
    }
    try {
      await fetchWithAuth(`/tournaments/${tournamentId}/transfer-player`, {
        method: "POST",
        body: JSON.stringify(transferForm),
      });
      await loadTournamentDetails(tournamentId);
      setTransferForm({ playerId: "", fromTeamName: "", toTeamName: "" });
      notify("Player transferred to new team", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const openPlayerEdit = (player) => {
    setEditingPlayer({
      _id: player?._id || "",
      name: player?.name || "",
      email: player?.email || "",
    });
    setShowEditPlayerModal(true);
  };

  const handleEditPlayer = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!editingPlayer._id) return;
    try {
      await fetchWithAuth(`/players/${editingPlayer._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingPlayer.name,
          email: editingPlayer.email,
        }),
      });
      await loadPlayers();
      setShowEditPlayerModal(false);
      setEditingPlayer({ _id: "", name: "", email: "" });
      notify("Player updated", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const handleOpenTournamentLiveMatch = async (fixtureId) => {
    if (!fixtureId) return;
    await loadLiveMatches();
    navigate(`/live-match?matchId=${fixtureId}`);
  };

  // Fix for time setting issue - proper ISO conversion and API call
  const handleFixtureTimeChange = async (fixtureId, localDateTimeValue) => {
    try {
      if (!localDateTimeValue) {
        // If cleared, send null
        await fetchWithAuth(`/matches/${fixtureId}/schedule`, {
          method: "PATCH",
          body: JSON.stringify({ scheduledAt: null }),
        });
        await loadTournamentDetails(
          selectedTournament?._id || selectedTournament?.id,
        );
        return;
      }

      // Convert datetime-local value (e.g., "2026-04-11T15:30") to ISO string
      // datetime-local is always in local timezone, so we need to convert properly
      const localDate = new Date(localDateTimeValue);
      const isoString = localDate.toISOString();

      console.log("Fixture time update:", {
        fixtureId,
        localInput: localDateTimeValue,
        convertedISO: isoString,
      });

      await fetchWithAuth(`/matches/${fixtureId}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledAt: isoString }),
      });

      // Reload tournament details to confirm the change
      await loadTournamentDetails(
        selectedTournament?._id || selectedTournament?.id,
      );
      notify("Fixture time updated successfully", "success");
    } catch (error) {
      console.error("Error updating fixture time:", error);
      notify(`Could not update fixture time: ${error.message}`, "error");
    }
  };

  // Handle adding players to existing team
  const handleOpenAddPlayersToTeamModal = (team) => {
    setSelectedTeamForAddPlayer(team);
    setSelectedPlayersToAdd([]);
    setShowAddPlayerToTeamModal(true);
  };

  const handleAddPlayersToTeam = async () => {
    if (!selectedTournament || !selectedTeamForAddPlayer) {
      notify("No tournament or team selected", "error");
      return;
    }

    if (selectedPlayersToAdd.length === 0) {
      notify("Select at least one player to add", "error");
      return;
    }

    try {
      // Get current team data
      const currentTeam = selectedTournamentDetails?.teams?.find(
        (t) =>
          (typeof t === "string" ? t : t?.name) ===
          (typeof selectedTeamForAddPlayer === "string"
            ? selectedTeamForAddPlayer
            : selectedTeamForAddPlayer?.name),
      );

      // Get current players in the team
      const currentPlayerIds = Array.isArray(currentTeam?.players)
        ? currentTeam.players.map((p) =>
            typeof p === "string" ? p : p?._id || p?.id || "",
          )
        : [];

      // Combine current players with new players (no duplicates)
      const updatedPlayerIds = [
        ...new Set([...currentPlayerIds, ...selectedPlayersToAdd]),
      ];

      // Prepare updated teams array
      const updatedTeams = selectedTournamentDetails.teams.map((team) => {
        const teamName = typeof team === "string" ? team : team?.name;
        const selectedTeamName =
          typeof selectedTeamForAddPlayer === "string"
            ? selectedTeamForAddPlayer
            : selectedTeamForAddPlayer?.name;

        if (teamName === selectedTeamName) {
          return {
            name: teamName,
            players: updatedPlayerIds,
            captain: updatedPlayerIds[0] || null,
          };
        }
        return {
          name: teamName,
          players: Array.isArray(team?.players)
            ? team.players.map((p) =>
                typeof p === "string" ? p : p?._id || p?.id || "",
              )
            : [],
          captain: team?.captain || null,
        };
      });

      // Update tournament with new team composition
      await fetchWithAuth(
        `/tournaments/${selectedTournament._id || selectedTournament.id}/teams`,
        {
          method: "PATCH",
          body: JSON.stringify({ teams: updatedTeams }),
        },
      );

      // Reload data
      await loadTournamentDetails(
        selectedTournament._id || selectedTournament.id,
      );
      await loadTournaments();

      notify(
        `Added ${selectedPlayersToAdd.length} player(s) to ${selectedTeamForAddPlayer?.name || "team"}`,
        "success",
      );
      setShowAddPlayerToTeamModal(false);
      setSelectedTeamForAddPlayer(null);
      setSelectedPlayersToAdd([]);
    } catch (error) {
      notify(`Could not add players to team: ${error.message}`, "error");
    }
  };

  const upcomingTournamentFixtures = tournamentFixtures.filter(
    (fixture) => fixture.status === "upcoming",
  );
  const liveTournamentFixtures = tournamentFixtures.filter(
    (fixture) => fixture.status === "live",
  );
  const finishedTournamentFixtures = tournamentFixtures.filter(
    (fixture) => fixture.status === "finished",
  );

  if (loading)
    return (
      <div className="w-full py-24">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black flex gap-3">
            <BarChart3 className="w-10" />
            Admin Dashboard
          </h1>
          <p className="opacity-70">Manage players & tournaments</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
        </div>
      )}

      <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Quick Actions</p>
            <p className="text-xs opacity-60">
              Jump to common admin tasks faster.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => setShowAddPlayerModal(true)}
            >
              Add Player
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={() => setShowAddTournamentModal(true)}
            >
              Create Tournament
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setActiveAdminTab("live")}
            >
              Go Live Matches
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setActiveAdminTab("tournaments")}
            >
              Go Tournament Control
            </button>
          </div>
        </div>
      </div>

      <div className="tabs tabs-boxed w-fit">
        <button
          type="button"
          className={`tab ${activeAdminTab === "all" ? "tab-active" : ""}`}
          onClick={() => setActiveAdminTab("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`tab ${activeAdminTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setActiveAdminTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={`tab ${activeAdminTab === "tournaments" ? "tab-active" : ""}`}
          onClick={() => setActiveAdminTab("tournaments")}
        >
          Tournament Control
        </button>
        <button
          type="button"
          className={`tab ${activeAdminTab === "live" ? "tab-active" : ""}`}
          onClick={() => setActiveAdminTab("live")}
        >
          Live Matches
        </button>
      </div>
      <p className="text-sm opacity-70 -mt-4">
        {activeAdminTab === "all" &&
          "All sections in one view for full control."}
        {activeAdminTab === "overview" &&
          "Manage players and tournaments quickly from summary tables."}
        {activeAdminTab === "tournaments" &&
          "Generate fixtures, manage tournament status, history, and transfers."}
        {activeAdminTab === "live" &&
          "Monitor active matches and control live match operations."}
      </p>

      {(activeAdminTab === "all" || activeAdminTab === "overview") && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Matches",
                value: stats.totalMatches || 0,
                icon: "",
                color: "text-primary",
              },
              {
                title: "Players",
                value: players.length,
                icon: "",
                color: "text-success",
              },
              {
                title: "Live",
                value: tournaments.filter((t) => t.status === "live").length,
                icon: "",
                color: "text-warning",
              },
              {
                title: "Teams",
                value: stats.totalTeams || 0,
                icon: "",
                color: "text-info",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="card bg-base-100/50 backdrop-blur-md border border-white/10 p-5"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs opacity-60">{s.title}</p>
                    <p
                      className={`text-3xl font-mono font-bold mt-2 ${s.color}`}
                    >
                      {s.value}
                    </p>
                  </div>
                  <span className="text-3xl">{s.icon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 p-6">
              <h2 className="text-2xl font-bold mb-4">
                Players ({players.length})
              </h2>
              <button
                className="btn btn-success btn-sm mb-4"
                onClick={() => setShowAddPlayerModal(true)}
              >
                <Plus className="w-4" />
                Add
              </button>
              <div className="overflow-auto max-h-80 rounded-lg border border-white/10">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>ID</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p._id}>
                        <td>{p.name}</td>
                        <td className="font-mono text-xs">{p.playerId}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => openPlayerEdit(p)}
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!players.length && (
                      <tr>
                        <td colSpan="3" className="text-center py-8 opacity-50">
                          No players
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 p-6">
              <h2 className="text-2xl font-bold mb-4">
                Tournaments ({tournaments.length})
              </h2>
              <button
                className="btn btn-warning btn-sm mb-4"
                onClick={() => setShowAddTournamentModal(true)}
              >
                <Plus className="w-4" />
                Create
              </button>
              <div className="overflow-auto max-h-80 rounded-lg border border-white/10">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map((t) => (
                      <tr key={t._id || t.id || t.name}>
                        <td>{t.name}</td>
                        <td className="text-xs capitalize">{t.type}</td>
                        <td>
                          <span className="badge badge-xs">{t.status}</span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => handleOpenEditTeams(t)}
                          >
                            Edit Teams
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!tournaments.length && (
                      <tr>
                        <td colSpan="3" className="text-center py-8 opacity-50">
                          No tournaments
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {(activeAdminTab === "all" || activeAdminTab === "tournaments") && (
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-warning" />
                Tournament Match Control
              </h2>
              <p className="text-sm opacity-70 mt-1">
                Generate fixtures, set tournament live status, and schedule each
                tournament match from here.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                selectedTournament
                  ? loadTournamentDetails(
                      selectedTournament._id || selectedTournament.id,
                    )
                  : loadTournaments()
              }
            >
              <RefreshCw className="w-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[320px,1fr] gap-6">
            <div className="space-y-3">
              {tournaments.length > 0 ? (
                tournaments.map((tournament) => {
                  const isActive =
                    (selectedTournament?._id || selectedTournament?.id) ===
                    (tournament._id || tournament.id);
                  return (
                    <button
                      key={tournament._id || tournament.id}
                      type="button"
                      onClick={() => handleTournamentSelect(tournament)}
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        isActive
                          ? "border-warning bg-warning/10"
                          : "border-white/10 bg-base-200/30 hover:border-warning/40"
                      }`}
                    >
                      <div className="font-semibold">{tournament.name}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="badge badge-outline">
                          {tournament.type}
                        </span>
                        <span className="badge badge-ghost">
                          {tournament.teamCount ||
                            tournament.teams?.length ||
                            0}{" "}
                          teams
                        </span>
                        <span className="badge badge-ghost">
                          {tournament.matchCount || 0} fixtures
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 p-6 text-sm opacity-60">
                  No tournaments available yet.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-base-200/20 p-5">
              {!selectedTournament ? (
                <div className="py-12 text-center opacity-60">
                  Select a tournament to manage its fixtures.
                </div>
              ) : tournamentLoading ? (
                <div className="py-12 text-center">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">
                        {selectedTournamentDetails?.name ||
                          selectedTournament.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="badge badge-outline">
                          {selectedTournamentDetails?.type ||
                            selectedTournament.type}
                        </span>
                        <span className="badge badge-ghost">
                          {selectedTournamentDetails?.teams?.length ||
                            selectedTournament.teamCount ||
                            0}{" "}
                          teams
                        </span>
                        <span className="badge badge-ghost">
                          {tournamentFixtures.length} fixtures
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label htmlFor="tournament-status" className="sr-only">
                        Tournament status
                      </label>
                      <select
                        id="tournament-status"
                        name="tournamentStatus"
                        className="select select-bordered select-sm"
                        value={tournamentStatusDraft}
                        onChange={(e) =>
                          setTournamentStatusDraft(e.target.value)
                        }
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live</option>
                        <option value="finished">Finished</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={handleTournamentStatusUpdate}
                      >
                        Save Status
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-base-100/40 p-4 space-y-4">
                    <div>
                      <h4 className="font-semibold">Add Fixture Manually</h4>
                      <p className="text-xs opacity-60 mt-1">
                        Use this for future fixtures or to add an old match
                        record that was already played before you started using
                        this project.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                      <div>
                        <label
                          htmlFor="manual-fixture-team-a"
                          className="text-xs opacity-70 block mb-1"
                        >
                          Team A
                        </label>
                        <select
                          id="manual-fixture-team-a"
                          name="manualFixtureTeamA"
                          className="select select-bordered w-full"
                          value={manualFixtureForm.teamAName}
                          onChange={(e) =>
                            setManualFixtureForm((current) => ({
                              ...current,
                              teamAName: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select Team A</option>
                          {tournamentTeamOptions.map((teamName) => (
                            <option key={`a-${teamName}`} value={teamName}>
                              {teamName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="manual-fixture-team-b"
                          className="text-xs opacity-70 block mb-1"
                        >
                          Team B
                        </label>
                        <select
                          id="manual-fixture-team-b"
                          name="manualFixtureTeamB"
                          className="select select-bordered w-full"
                          value={manualFixtureForm.teamBName}
                          onChange={(e) =>
                            setManualFixtureForm((current) => ({
                              ...current,
                              teamBName: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select Team B</option>
                          {tournamentTeamOptions.map((teamName) => (
                            <option key={`b-${teamName}`} value={teamName}>
                              {teamName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="manual-fixture-phase"
                          className="text-xs opacity-70 block mb-1"
                        >
                          Phase
                        </label>
                        <input
                          id="manual-fixture-phase"
                          name="manualFixturePhase"
                          type="text"
                          className="input input-bordered w-full"
                          placeholder="Phase"
                          value={manualFixtureForm.phase}
                          onChange={(e) =>
                            setManualFixtureForm((current) => ({
                              ...current,
                              phase: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="manual-fixture-scheduled-at"
                          className="text-xs opacity-70 block mb-1"
                        >
                          Kickoff time
                        </label>
                        <input
                          id="manual-fixture-scheduled-at"
                          name="manualFixtureScheduledAt"
                          type="datetime-local"
                          className="input input-bordered w-full"
                          value={manualFixtureForm.scheduledAt}
                          onChange={(e) =>
                            setManualFixtureForm((current) => ({
                              ...current,
                              scheduledAt: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="manual-fixture-status"
                          className="text-xs opacity-70 block mb-1"
                        >
                          Status
                        </label>
                        <select
                          id="manual-fixture-status"
                          name="manualFixtureStatus"
                          className="select select-bordered w-full"
                          value={manualFixtureForm.status}
                          onChange={(e) =>
                            setManualFixtureForm((current) => ({
                              ...current,
                              status: e.target.value,
                            }))
                          }
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="live">Live</option>
                          <option value="finished">Finished</option>
                        </select>
                      </div>
                    </div>

                    {manualFixtureForm.status === "finished" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="manual-fixture-score-team-a"
                            className="text-xs opacity-70 block mb-1"
                          >
                            {manualFixtureForm.teamAName || "Team A"} score
                          </label>
                          <input
                            id="manual-fixture-score-team-a"
                            type="number"
                            min="0"
                            className="input input-bordered w-full"
                            value={manualFixtureForm.scoreTeamA}
                            onChange={(e) =>
                              setManualFixtureForm((current) => ({
                                ...current,
                                scoreTeamA: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="manual-fixture-score-team-b"
                            className="text-xs opacity-70 block mb-1"
                          >
                            {manualFixtureForm.teamBName || "Team B"} score
                          </label>
                          <input
                            id="manual-fixture-score-team-b"
                            type="number"
                            min="0"
                            className="input input-bordered w-full"
                            value={manualFixtureForm.scoreTeamB}
                            onChange={(e) =>
                              setManualFixtureForm((current) => ({
                                ...current,
                                scoreTeamB: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleCreateManualFixture}
                    >
                      <Plus className="w-4" />
                      {manualFixtureForm.status === "finished"
                        ? "Add Old Match Record"
                        : "Add Fixture"}
                    </button>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-base-100/40 p-4 space-y-3">
                    <h4 className="font-semibold">League Player Transfer</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <select
                        className="select select-bordered select-sm"
                        value={transferForm.playerId}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            playerId: e.target.value,
                          })
                        }
                        disabled={!transferForm.fromTeamName}
                      >
                        <option value="">
                          {transferForm.fromTeamName
                            ? "Select player"
                            : "Select from team first"}
                        </option>
                        {transferPlayerOptions.map((player) => (
                          <option
                            key={`transfer-player-${player._id}`}
                            value={player._id}
                          >
                            {player.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="select select-bordered select-sm"
                        value={transferForm.fromTeamName}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            fromTeamName: e.target.value,
                            playerId: "",
                          })
                        }
                      >
                        <option value="">From team</option>
                        {tournamentTeamOptions.map((teamName) => (
                          <option key={`from-${teamName}`} value={teamName}>
                            {teamName}
                          </option>
                        ))}
                      </select>
                      <select
                        className="select select-bordered select-sm"
                        value={transferForm.toTeamName}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            toTeamName: e.target.value,
                          })
                        }
                      >
                        <option value="">To team</option>
                        {tournamentTeamOptions.map((teamName) => (
                          <option key={`to-${teamName}`} value={teamName}>
                            {teamName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={handleTransferLeaguePlayer}
                      >
                        Transfer
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-base-100/40 p-4 space-y-3">
                    <h4 className="font-semibold">Add Players to Teams</h4>
                    <p className="text-xs opacity-60">
                      Expand an existing team and add new players to it.
                    </p>
                    <div className="space-y-2">
                      {(selectedTournamentDetails?.teams || []).map((team) => {
                        const teamName =
                          typeof team === "string" ? team : team?.name || "";
                        const playerCount = Array.isArray(team?.players)
                          ? team.players.length
                          : 0;
                        return (
                          <div
                            key={teamName}
                            className="flex items-center justify-between p-2 bg-base-200 rounded"
                          >
                            <div>
                              <p className="font-semibold text-sm">
                                {teamName}
                              </p>
                              <p className="text-xs opacity-60">
                                {playerCount} players
                              </p>
                            </div>
                            <button
                              type="button"
                              className="btn btn-info btn-sm"
                              onClick={() =>
                                handleOpenAddPlayersToTeamModal(team)
                              }
                            >
                              <Plus className="w-4" />
                              Add Players
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {tournamentFixtures.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 p-6 text-sm opacity-70 space-y-4">
                      <p>
                        This tournament has no fixtures yet. Set the first
                        kickoff time below and generate the tournament schedule.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label
                            htmlFor="fixture-generation-start-date"
                            className="text-xs opacity-70 block mb-1"
                          >
                            First fixture kickoff
                          </label>
                          <input
                            id="fixture-generation-start-date"
                            name="fixtureGenerationStartDate"
                            type="datetime-local"
                            className="input input-bordered w-full"
                            value={fixtureGenerationForm.startDate}
                            onChange={(e) =>
                              setFixtureGenerationForm((current) => ({
                                ...current,
                                startDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="fixture-generation-interval-hours"
                            className="text-xs opacity-70 block mb-1"
                          >
                            Gap in hours
                          </label>
                          <input
                            id="fixture-generation-interval-hours"
                            name="fixtureGenerationIntervalHours"
                            type="number"
                            min="1"
                            className="input input-bordered w-full"
                            value={fixtureGenerationForm.intervalHours}
                            onChange={(e) =>
                              setFixtureGenerationForm((current) => ({
                                ...current,
                                intervalHours: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      {(selectedTournamentDetails?.type ||
                        selectedTournament?.type) === "league" && (
                        <div>
                          <label
                            htmlFor="fixture-generation-mode"
                            className="text-xs opacity-70 block mb-1"
                          >
                            Fixture order
                          </label>
                          <select
                            id="fixture-generation-mode"
                            className="select select-bordered w-full"
                            value={fixtureGenerationForm.generationMode}
                            onChange={(e) =>
                              setFixtureGenerationForm((current) => ({
                                ...current,
                                generationMode: e.target.value,
                              }))
                            }
                          >
                            <option value="rounds">Round by round</option>
                            <option value="sequential">
                              Sequential pairs (A-B, A-C, B-C)
                            </option>
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={handleGenerateTournamentFixtures}
                        disabled={isGeneratingFixtures}
                      >
                        <RefreshCw className="w-4" />
                        {isGeneratingFixtures
                          ? "Generating fixtures..."
                          : "Generate Fixtures"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-lg bg-base-100/50 p-4">
                          <div className="text-xs opacity-60">Upcoming</div>
                          <div className="text-2xl font-bold">
                            {upcomingTournamentFixtures.length}
                          </div>
                        </div>
                        <div className="rounded-lg bg-base-100/50 p-4">
                          <div className="text-xs opacity-60">Live</div>
                          <div className="text-2xl font-bold text-success">
                            {liveTournamentFixtures.length}
                          </div>
                        </div>
                        <div className="rounded-lg bg-base-100/50 p-4">
                          <div className="text-xs opacity-60">Finished</div>
                          <div className="text-2xl font-bold">
                            {finishedTournamentFixtures.length}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {tournamentFixtures.map((fixture) => (
                          <div
                            key={fixture.id}
                            className="rounded-lg border border-white/10 bg-base-100/40 p-4"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                              <div>
                                <div className="font-semibold">
                                  {fixture.teamA} vs {fixture.teamB}
                                </div>
                                <div className="text-xs opacity-60 mt-1">
                                  {fixture.phase}
                                  {" • "}
                                  {fixture.scheduledAt
                                    ? new Date(
                                        fixture.scheduledAt,
                                      ).toLocaleString()
                                    : "No schedule set"}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <label
                                  htmlFor={`fixture-scheduled-at-${fixture.id}`}
                                  className="sr-only"
                                >
                                  Schedule for {fixture.teamA} vs{" "}
                                  {fixture.teamB}
                                </label>
                                <input
                                  id={`fixture-scheduled-at-${fixture.id}`}
                                  name={`fixtureScheduledAt-${fixture.id}`}
                                  type="datetime-local"
                                  className="input input-bordered input-sm"
                                  value={
                                    fixtureScheduleDrafts[fixture.id] || ""
                                  }
                                  onChange={(e) => {
                                    setFixtureScheduleDrafts((current) => ({
                                      ...current,
                                      [fixture.id]: e.target.value,
                                    }));
                                    // Auto-save when time is changed (with proper ISO conversion)
                                    if (e.target.value) {
                                      handleFixtureTimeChange(
                                        fixture.id,
                                        e.target.value,
                                      );
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() =>
                                    handleFixtureScheduleUpdate(fixture.id)
                                  }
                                  title="Legacy save button - time auto-saves on change"
                                >
                                  Set Fixture
                                </button>
                                <span
                                  className={`badge ${
                                    fixture.status === "live"
                                      ? "badge-success"
                                      : fixture.status === "finished"
                                        ? "badge-secondary"
                                        : "badge-warning"
                                  }`}
                                >
                                  {fixture.status}
                                </span>

                                {fixture.status === "upcoming" && (
                                  <button
                                    type="button"
                                    className="btn btn-success btn-sm"
                                    onClick={() =>
                                      handleStartTournamentFixture(fixture.id)
                                    }
                                  >
                                    <Play className="w-4" />
                                    Start Match
                                  </button>
                                )}

                                {fixture.status === "live" && (
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() =>
                                      handleOpenTournamentLiveMatch(fixture.id)
                                    }
                                  >
                                    View Live Match
                                  </button>
                                )}

                                {fixture.status === "finished" &&
                                  fixture.result && (
                                    <>
                                      <span className="text-sm font-mono">
                                        {fixture.result}
                                      </span>
                                    </>
                                  )}
                                <button
                                  type="button"
                                  className="btn btn-error btn-xs"
                                  onClick={() =>
                                    handleDeleteTournamentFixture(
                                      fixture.id,
                                      fixture.status,
                                    )
                                  }
                                >
                                  Delete Fixture
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(activeAdminTab === "all" || activeAdminTab === "live") && (
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Goal className="w-6 h-6 text-success" />
              Live Matches
            </h2>
            <button
              className="btn btn-success btn-sm"
              onClick={() => setShowCreateMatchModal(true)}
            >
              <Play className="w-4" />
              Start Match
            </button>
          </div>

          {liveMatches.length > 0 ? (
            <div className="space-y-4">
              {/* Match Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveMatches.map((match) => (
                  <button
                    key={match._id}
                    type="button"
                    onClick={() => setSelectedLiveMatch(match)}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      selectedLiveMatch?._id === match._id
                        ? "border-success bg-success/10"
                        : "border-white/10 bg-base-200/30 hover:border-success/50"
                    }`}
                  >
                    <div className="text-sm font-bold">
                      {match.teams[0]?.name} vs {match.teams[1]?.name}
                    </div>
                    <div className="text-lg font-mono font-bold mt-2">
                      <span className="text-primary">
                        {match.score?.teamA || 0}
                      </span>
                      <span className="mx-2 opacity-50">-</span>
                      <span className="text-secondary">
                        {match.score?.teamB || 0}
                      </span>
                    </div>
                    <div className="text-xs opacity-60 mt-2">
                      {match.goals?.filter((g) => g.teamIndex === 0).length ||
                        0}{" "}
                      -{" "}
                      {match.goals?.filter((g) => g.teamIndex === 1).length ||
                        0}{" "}
                      goals • {match.status}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Match Details */}
              {selectedLiveMatch && (
                <div className="border-t border-white/10 pt-4 space-y-4">
                  <div className="bg-base-200/50 rounded-lg p-4">
                    <h3 className="font-bold mb-3">
                      Match: {selectedLiveMatch.teams[0]?.name} vs{" "}
                      {selectedLiveMatch.teams[1]?.name}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-base-100/50 rounded">
                        <div className="text-sm opacity-60">
                          {selectedLiveMatch.teams[0]?.name}
                        </div>
                        <div className="text-4xl font-mono font-bold text-primary">
                          {selectedLiveMatch.score?.teamA || 0}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-base-100/50 rounded">
                        <div className="text-sm opacity-60">
                          {selectedLiveMatch.teams[1]?.name}
                        </div>
                        <div className="text-4xl font-mono font-bold text-secondary">
                          {selectedLiveMatch.score?.teamB || 0}
                        </div>
                      </div>
                    </div>

                    {/* Goals List */}
                    {selectedLiveMatch.goals &&
                      selectedLiveMatch.goals.length > 0 && (
                        <div className="mb-4 p-3 bg-base-100/50 rounded">
                          <h4 className="font-semibold text-sm mb-2">
                            ⚽ Goals:
                          </h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedLiveMatch.goals.map((goal, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-mono opacity-70">
                                  {goal.minute}'
                                </span>
                                {" - "}
                                <span className="font-semibold">
                                  {goal.player?.name}
                                </span>{" "}
                                <span className="text-primary font-semibold">
                                  (
                                  {goal.teamIndex === 0
                                    ? selectedLiveMatch.teams[0]?.name
                                    : selectedLiveMatch.teams[1]?.name}
                                  )
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/live-match?matchId=${selectedLiveMatch._id}`,
                          )
                        }
                        className="btn btn-primary btn-sm flex-1"
                      >
                        View & Add Goals
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectedLiveMatch?._id) {
                            handleEndMatch(selectedLiveMatch._id);
                          } else {
                            notify("No match selected", "error");
                          }
                        }}
                        className="btn btn-error btn-sm"
                      >
                        <Square className="w-4" />
                        End Match
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 opacity-60">
              <Trophy className="w-12 h-12 mx-auto opacity-30 mb-2" />
              <p>No live matches. Start one to begin!</p>
            </div>
          )}
        </div>
      )}

      {/* Create Match Modal */}
      {showCreateMatchModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCreateMatchModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-2xl space-y-4"
              onSubmit={handleCreateMatch}
            >
              <h3 className="font-bold text-lg">⚽ Start New Match</h3>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="new-match-team-a-name"
                    className="text-sm font-semibold block mb-1"
                  >
                    Team A Name
                  </label>
                  <input
                    id="new-match-team-a-name"
                    name="newMatchTeamAName"
                    type="text"
                    placeholder="e.g., Manchester United"
                    className="input input-bordered w-full"
                    value={newMatch.teamAName}
                    onChange={(e) =>
                      setNewMatch({
                        ...newMatch,
                        teamAName: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-match-team-b-name"
                    className="text-sm font-semibold block mb-1"
                  >
                    Team B Name
                  </label>
                  <input
                    id="new-match-team-b-name"
                    name="newMatchTeamBName"
                    type="text"
                    placeholder="e.g., Liverpool"
                    className="input input-bordered w-full"
                    value={newMatch.teamBName}
                    onChange={(e) =>
                      setNewMatch({
                        ...newMatch,
                        teamBName: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold block mb-1">
                    Team A Players
                  </p>
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded p-2 bg-base-100">
                    {players.map((p) => {
                      const isSelected = newMatch.teamAPlayers.includes(p._id);
                      const isUsedByOtherTeam = newMatch.teamBPlayers.includes(
                        p._id,
                      );
                      return (
                        <div
                          key={`team-a-${p._id}`}
                          className={`flex items-center justify-between gap-2 p-2 rounded text-sm ${
                            isSelected
                              ? "bg-primary/20 border border-primary"
                              : "hover:bg-base-200"
                          } ${isUsedByOtherTeam && !isSelected ? "opacity-50" : ""}`}
                        >
                          <span
                            className={`flex-1 ${
                              isUsedByOtherTeam && !isSelected
                                ? "line-through opacity-60"
                                : ""
                            }`}
                          >
                            {p.name}{" "}
                            <span className="text-xs opacity-60">
                              ({p.playerId})
                            </span>
                          </span>
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              isSelected
                                ? "btn-error btn-outline"
                                : "btn-success btn-outline"
                            }`}
                            disabled={
                              !isSelected &&
                              (newMatch.teamAPlayers.length >= 11 ||
                                isUsedByOtherTeam)
                            }
                            onClick={() =>
                              toggleMatchPlayer("teamAPlayers", p._id)
                            }
                          >
                            {isSelected ? "−" : "+"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs opacity-60 mt-1">
                    Selected: {newMatch.teamAPlayers.length}/11 players
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold block mb-1">
                    Team B Players
                  </p>
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded p-2 bg-base-100">
                    {players.map((p) => {
                      const isSelected = newMatch.teamBPlayers.includes(p._id);
                      const isUsedByOtherTeam = newMatch.teamAPlayers.includes(
                        p._id,
                      );
                      return (
                        <div
                          key={`team-b-${p._id}`}
                          className={`flex items-center justify-between gap-2 p-2 rounded text-sm ${
                            isSelected
                              ? "bg-primary/20 border border-primary"
                              : "hover:bg-base-200"
                          } ${isUsedByOtherTeam && !isSelected ? "opacity-50" : ""}`}
                        >
                          <span
                            className={`flex-1 ${
                              isUsedByOtherTeam && !isSelected
                                ? "line-through opacity-60"
                                : ""
                            }`}
                          >
                            {p.name}{" "}
                            <span className="text-xs opacity-60">
                              ({p.playerId})
                            </span>
                          </span>
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              isSelected
                                ? "btn-error btn-outline"
                                : "btn-success btn-outline"
                            }`}
                            disabled={
                              !isSelected &&
                              (newMatch.teamBPlayers.length >= 11 ||
                                isUsedByOtherTeam)
                            }
                            onClick={() =>
                              toggleMatchPlayer("teamBPlayers", p._id)
                            }
                          >
                            {isSelected ? "−" : "+"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs opacity-60 mt-1">
                    Selected: {newMatch.teamBPlayers.length}/11 players
                  </p>
                </div>
              </div>

              <div className="modal-action gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateMatchModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  <Play className="w-4" />
                  Start Match
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}

      {showAddPlayerModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddPlayerModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-md space-y-4"
              onSubmit={handleAddPlayer}
            >
              <h3 className="font-bold text-lg">Add Player</h3>
              <div>
                <label htmlFor="new-player-name" className="sr-only">
                  Player name
                </label>
                <input
                  id="new-player-name"
                  name="newPlayerName"
                  type="text"
                  placeholder="Name"
                  className="input input-bordered w-full"
                  value={newPlayer.name}
                  onChange={(e) =>
                    setNewPlayer({ ...newPlayer, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label htmlFor="new-player-email" className="sr-only">
                  Player email
                </label>
                <input
                  id="new-player-email"
                  name="newPlayerEmail"
                  type="email"
                  placeholder="Email"
                  className="input input-bordered w-full"
                  value={newPlayer.email}
                  onChange={(e) =>
                    setNewPlayer({ ...newPlayer, email: e.target.value })
                  }
                />
              </div>
              <div className="modal-action gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddPlayerModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Add
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}

      {showEditPlayerModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowEditPlayerModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-md space-y-4"
              onSubmit={handleEditPlayer}
            >
              <h3 className="font-bold text-lg">Edit Player</h3>
              <div>
                <label htmlFor="edit-player-name" className="sr-only">
                  Player name
                </label>
                <input
                  id="edit-player-name"
                  type="text"
                  placeholder="Name"
                  className="input input-bordered w-full"
                  value={editingPlayer.name}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="edit-player-email" className="sr-only">
                  Player email
                </label>
                <input
                  id="edit-player-email"
                  type="email"
                  placeholder="Email"
                  className="input input-bordered w-full"
                  value={editingPlayer.email}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="modal-action gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEditPlayerModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-info">
                  Save
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}

      {showAddTournamentModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              setShowAddTournamentModal(false);
              setTournamentStep(1);
              setTempTeams([]);
              setNewTeam({ name: "", players: [] });
            }}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-2xl space-y-4 max-h-96 overflow-y-auto"
              onSubmit={handleAddTournament}
            >
              <h3 className="font-bold text-lg">
                🏆 Create Tournament - Step {tournamentStep}/
                {newTournament.hasBidding ? 4 : 3}
              </h3>

              {/* Step 1: Basic Information */}
              {tournamentStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="new-tournament-name"
                      className="text-sm font-semibold block mb-1"
                    >
                      Tournament Name
                    </label>
                    <input
                      id="new-tournament-name"
                      name="newTournamentName"
                      type="text"
                      placeholder="e.g., Premier League 2026"
                      className="input input-bordered w-full"
                      value={newTournament.name}
                      onChange={(e) =>
                        setNewTournament({
                          ...newTournament,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-tournament-type"
                      className="text-sm font-semibold block mb-1"
                    >
                      Tournament Type
                    </label>
                    <select
                      id="new-tournament-type"
                      name="newTournamentType"
                      className="select select-bordered w-full"
                      value={newTournament.type}
                      onChange={(e) =>
                        setNewTournament({
                          ...newTournament,
                          type: e.target.value,
                        })
                      }
                    >
                      <option value="league">⚽ League</option>
                      <option value="knockout">🥊 Knockout</option>
                      <option value="group-knockout">
                        🏆 Group Stage + Knockout
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="new-tournament-status"
                      className="text-sm font-semibold block mb-1"
                    >
                      Status
                    </label>
                    <select
                      id="new-tournament-status"
                      name="newTournamentStatus"
                      className="select select-bordered w-full"
                      value={newTournament.status}
                      onChange={(e) =>
                        setNewTournament({
                          ...newTournament,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                    </select>
                  </div>

                  <div className="divider text-sm font-semibold">
                    Player Bidding
                  </div>
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={newTournament.hasBidding}
                      onChange={(e) =>
                        setNewTournament({
                          ...newTournament,
                          hasBidding: e.target.checked,
                        })
                      }
                    />
                    <span className="label-text font-medium">
                      Enable player bidding for this tournament
                    </span>
                  </label>
                  {newTournament.hasBidding && (
                    <div>
                      <label
                        htmlFor="new-tournament-budget"
                        className="text-sm font-semibold block mb-1"
                      >
                        Total money per team
                      </label>
                      <input
                        id="new-tournament-budget"
                        type="number"
                        min="0"
                        placeholder="e.g., 1000000"
                        className="input input-bordered w-full"
                        value={newTournament.totalMoneyPerTeam}
                        onChange={(e) =>
                          setNewTournament({
                            ...newTournament,
                            totalMoneyPerTeam: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Team Management */}
              {tournamentStep === 2 && (
                <div className="space-y-3">
                  <div className="bg-base-200 p-3 rounded">
                    <h4 className="font-bold mb-2">Add Teams</h4>

                    <div className="space-y-2 mb-3">
                      <div>
                        <label
                          htmlFor="new-team-name"
                          className="text-xs opacity-70 block mb-1"
                        >
                          Team Name
                        </label>
                        <input
                          id="new-team-name"
                          name="newTeamName"
                          type="text"
                          placeholder="Team Name (e.g., Manchester United)"
                          className="input input-bordered w-full text-sm"
                          value={newTeam.name}
                          onChange={(e) =>
                            setNewTeam({ ...newTeam, name: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <p className="text-xs opacity-70 block mb-1">
                          Select Players for this team (min 3, max 11):
                        </p>
                        <div className="max-h-40 overflow-y-auto border border-white/10 rounded p-2 bg-base-100">
                          {players.length > 0 ? (
                            <div className="space-y-1">
                              {players.map((player) => {
                                const isSelected = newTeam.players.includes(
                                  player._id,
                                );
                                const isDuplicateInOtherTeams = tempTeams.some(
                                  (team) => team.players.includes(player._id),
                                );
                                return (
                                  <div
                                    key={player._id}
                                    className={`flex items-center justify-between gap-2 p-2 rounded text-sm ${
                                      isSelected
                                        ? "bg-primary/20 border border-primary"
                                        : "hover:bg-base-200"
                                    } ${isDuplicateInOtherTeams && !isSelected ? "opacity-50" : ""}`}
                                  >
                                    <span
                                      className={`flex-1 ${
                                        isDuplicateInOtherTeams && !isSelected
                                          ? "line-through opacity-60"
                                          : ""
                                      }`}
                                    >
                                      {player.name}
                                      <span className="text-xs opacity-60">
                                        {" "}
                                        ({player.playerId})
                                      </span>
                                      {isDuplicateInOtherTeams &&
                                        !isSelected && (
                                          <span className="text-xs text-warning">
                                            {" "}
                                            (in other team)
                                          </span>
                                        )}
                                    </span>
                                    <div className="flex gap-1">
                                      {isSelected ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            addPlayerToTeam(player._id)
                                          }
                                          className="btn btn-sm btn-error btn-outline"
                                        >
                                          −
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            addPlayerToTeam(player._id)
                                          }
                                          disabled={
                                            newTeam.players.length >= 11 ||
                                            isDuplicateInOtherTeams
                                          }
                                          className="btn btn-sm btn-success btn-outline"
                                        >
                                          +
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs opacity-60">
                              No players available
                            </p>
                          )}
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            newTeam.players.length < 3
                              ? "opacity-70"
                              : "text-success font-semibold"
                          }`}
                        >
                          Selected: {newTeam.players.length}/11 players
                          {newTeam.players.length >= 3 && " ✅"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addTeamToTournament}
                        disabled={newTeam.players.length < 3}
                        className="btn btn-success btn-sm w-full"
                      >
                        <Plus className="w-4" />
                        Add Team ({newTeam.players.length}/3)
                      </button>
                    </div>
                  </div>

                  {/* Teams List */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm">Added Teams:</h4>
                    {tempTeams.length > 0 ? (
                      <div className="space-y-2">
                        {tempTeams.map((team, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-base-200 rounded flex justify-between items-start"
                          >
                            <div className="text-sm">
                              <p className="font-semibold">{team.name}</p>
                              <p className="text-xs opacity-70">
                                {team.players?.length || 0} players
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTeamFromTournament(idx)}
                              className="btn btn-ghost btn-xs text-error"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs opacity-60">No teams added yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Tournament Configuration */}
              {tournamentStep === 3 && newTournament.type === "league" && (
                <div className="space-y-3">
                  <div className="bg-base-200 p-3 rounded">
                    <h4 className="font-bold mb-2">⚙️ League Scoring Mode</h4>
                    <p className="text-xs opacity-70 mb-3">
                      Choose how points are calculated in your league:
                    </p>

                    <div className="space-y-2">
                      <label
                        className={`flex items-center gap-3 p-2 border-2 rounded cursor-pointer ${
                          newTournament.pointsMode === "goals"
                            ? "border-primary bg-primary/10"
                            : "border-white/10"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pointsMode"
                          value="goals"
                          checked={newTournament.pointsMode === "goals"}
                          onChange={(e) =>
                            setNewTournament({
                              ...newTournament,
                              pointsMode: e.target.value,
                            })
                          }
                          className="radio"
                        />
                        <div>
                          <p className="font-semibold text-sm">Goals Mode ⚽</p>
                          <p className="text-xs opacity-70">
                            Points = Goals Scored
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-2 border-2 rounded cursor-pointer ${
                          newTournament.pointsMode === "score"
                            ? "border-primary bg-primary/10"
                            : "border-white/10"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pointsMode"
                          value="score"
                          checked={newTournament.pointsMode === "score"}
                          onChange={(e) =>
                            setNewTournament({
                              ...newTournament,
                              pointsMode: e.target.value,
                            })
                          }
                          className="radio"
                        />
                        <div>
                          <p className="font-semibold text-sm">
                            Points Mode 🏆
                          </p>
                          <p className="text-xs opacity-70">
                            Win: 3pts, Draw: 1pt, Loss: 0pts
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-base-300/50 p-2 rounded text-xs">
                    <p className="font-semibold mb-1">Tournament Summary:</p>
                    <p>📝 Name: {newTournament.name}</p>
                    <p>🏀 Teams: {tempTeams.length}</p>
                    <p>
                      📊 Scoring:{" "}
                      {newTournament.pointsMode === "goals"
                        ? "Goals-based"
                        : "Win-based"}
                    </p>
                  </div>
                </div>
              )}

              {tournamentStep === 3 && newTournament.type === "knockout" && (
                <div className="space-y-3">
                  <div className="bg-base-200 p-3 rounded space-y-3">
                    <h4 className="font-bold mb-2">Knockout Setup</h4>
                    <p className="text-xs opacity-70">
                      Choose the first knockout round for this tournament.
                    </p>
                    <select
                      className="select select-bordered w-full"
                      value={newTournament.knockoutRound}
                      onChange={(e) =>
                        setNewTournament({
                          ...newTournament,
                          knockoutRound: e.target.value,
                        })
                      }
                    >
                      <option value="final">Direct Final</option>
                      <option value="semi">Semi Final + Final</option>
                      <option value="quarter">
                        Quarter Final + Semi + Final
                      </option>
                    </select>
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={newTournament.includeThirdPlaceMatch}
                        onChange={(e) =>
                          setNewTournament({
                            ...newTournament,
                            includeThirdPlaceMatch: e.target.checked,
                          })
                        }
                      />
                      <span className="label-text">
                        Include 3rd place match
                      </span>
                    </label>

                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={newTournament.transferMarketEnabled}
                        onChange={(e) =>
                          setNewTournament({
                            ...newTournament,
                            transferMarketEnabled: e.target.checked,
                          })
                        }
                      />
                      <span className="label-text">
                        Enable transfer market for this tournament
                      </span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs opacity-70 block mb-1">
                          Live players per team
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="input input-bordered w-full"
                          value={newTournament.livePlayersPerTeam}
                          onChange={(e) =>
                            setNewTournament({
                              ...newTournament,
                              livePlayersPerTeam: Number(e.target.value) || 7,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs opacity-70 block mb-1">
                          Sub players per team
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="input input-bordered w-full"
                          value={newTournament.subPlayersPerTeam}
                          onChange={(e) =>
                            setNewTournament({
                              ...newTournament,
                              subPlayersPerTeam: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs opacity-70 block mb-1">
                          Swap players
                        </label>
                        <select
                          className="select select-bordered w-full"
                          value={newTournament.allowSwapPlayers ? "yes" : "no"}
                          onChange={(e) =>
                            setNewTournament({
                              ...newTournament,
                              allowSwapPlayers: e.target.value === "yes",
                            })
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-base-300/50 p-2 rounded text-xs">
                    <p className="font-semibold mb-1">Tournament Summary:</p>
                    <p>📝 Name: {newTournament.name}</p>
                    <p>🏀 Teams: {tempTeams.length}</p>
                    <p>🥊 Starts from: {newTournament.knockoutRound}</p>
                  </div>
                </div>
              )}

              {tournamentStep === 3 &&
                newTournament.type === "group-knockout" && (
                  <div className="space-y-3">
                    <div className="bg-base-200 p-3 rounded space-y-3">
                      <h4 className="font-bold mb-2">
                        Group Stage + Knockout Setup
                      </h4>
                      <p className="text-xs opacity-70">
                        Use automatic bracket generation based on team count, or
                        choose the knockout round manually.
                      </p>

                      <div className="join w-full">
                        <button
                          type="button"
                          className={`btn join-item flex-1 ${
                            newTournament.knockoutStageMode === "auto"
                              ? "btn-primary"
                              : "btn-outline"
                          }`}
                          onClick={() =>
                            setNewTournament({
                              ...newTournament,
                              knockoutStageMode: "auto",
                            })
                          }
                        >
                          Auto by team count
                        </button>
                        <button
                          type="button"
                          className={`btn join-item flex-1 ${
                            newTournament.knockoutStageMode === "custom"
                              ? "btn-primary"
                              : "btn-outline"
                          }`}
                          onClick={() =>
                            setNewTournament({
                              ...newTournament,
                              knockoutStageMode: "custom",
                            })
                          }
                        >
                          Custom stages
                        </button>
                      </div>

                      <div>
                        <label className="text-xs opacity-70 block mb-1">
                          Teams qualifying from each group
                        </label>
                        <select
                          className="select select-bordered w-full"
                          value={newTournament.groupQualifiedCount}
                          onChange={(e) =>
                            setNewTournament({
                              ...newTournament,
                              groupQualifiedCount: Number(e.target.value),
                            })
                          }
                        >
                          <option value={1}>Top 1</option>
                          <option value={2}>Top 2</option>
                          <option value={4}>Top 4</option>
                        </select>
                      </div>

                      {newTournament.knockoutStageMode === "custom" && (
                        <div>
                          <label className="text-xs opacity-70 block mb-1">
                            Knockout starts from
                          </label>
                          <select
                            className="select select-bordered w-full"
                            value={newTournament.knockoutRound}
                            onChange={(e) =>
                              setNewTournament({
                                ...newTournament,
                                knockoutRound: e.target.value,
                              })
                            }
                          >
                            <option value="final">Final</option>
                            <option value="semi">Semi Final</option>
                            <option value="quarter">Quarter Final</option>
                          </select>
                        </div>
                      )}

                      <label className="label cursor-pointer justify-start gap-3">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={newTournament.includeThirdPlaceMatch}
                          onChange={(e) =>
                            setNewTournament({
                              ...newTournament,
                              includeThirdPlaceMatch: e.target.checked,
                            })
                          }
                        />
                        <span className="label-text">
                          Include 3rd place match
                        </span>
                      </label>
                    </div>

                    <div className="bg-base-300/50 p-2 rounded text-xs">
                      <p className="font-semibold mb-1">Tournament Summary:</p>
                      <p>📝 Name: {newTournament.name}</p>
                      <p>🏀 Teams: {tempTeams.length}</p>
                      <p>
                        🧮 Mode:{" "}
                        {newTournament.knockoutStageMode === "auto"
                          ? "Auto by team count"
                          : `Custom ${newTournament.knockoutRound}`}
                      </p>
                      <p>
                        ✅ Qualified per group:{" "}
                        {newTournament.groupQualifiedCount}
                      </p>
                    </div>
                  </div>
                )}

              {/* Step 4: Player Bidding Setup */}
              {tournamentStep === 4 && newTournament.hasBidding && (
                <div className="space-y-3">
                  <div className="bg-base-200 p-3 rounded">
                    <h4 className="font-bold mb-2">
                      Player Pricing & Team Assignment
                    </h4>
                    <p className="text-xs opacity-70 mb-3">
                      Set a price for each player and assign them to a team.
                      Budget per team: {newTournament.totalMoneyPerTeam}
                    </p>

                    <div className="overflow-auto max-h-64 rounded-lg border border-white/10">
                      <table className="table table-sm w-full">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Team</th>
                            <th>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerPricesDraft.map((item, idx) => {
                            const player = players.find(
                              (p) => String(p._id) === String(item.playerId),
                            );
                            return (
                              <tr key={item.playerId}>
                                <td>
                                  {player?.name || "Unknown"}
                                  <span className="text-xs opacity-60 ml-1">
                                    ({player?.playerId || ""})
                                  </span>
                                </td>
                                <td>
                                  <select
                                    className="select select-bordered select-sm w-full"
                                    value={item.teamName}
                                    onChange={(e) => {
                                      const newTeamName = e.target.value;
                                      setPlayerPricesDraft((prev) => {
                                        const next = [...prev];
                                        next[idx] = {
                                          ...next[idx],
                                          teamName: newTeamName,
                                        };
                                        return next;
                                      });
                                      // Also update tempTeams to reflect team assignment
                                      setTempTeams((prevTeams) => {
                                        return prevTeams.map((team) => {
                                          if (team.name === newTeamName) {
                                            if (
                                              !team.players.includes(
                                                item.playerId,
                                              )
                                            ) {
                                              return {
                                                ...team,
                                                players: [
                                                  ...team.players,
                                                  item.playerId,
                                                ],
                                              };
                                            }
                                          } else if (
                                            team.players.includes(item.playerId)
                                          ) {
                                            return {
                                              ...team,
                                              players: team.players.filter(
                                                (p) => p !== item.playerId,
                                              ),
                                            };
                                          }
                                          return team;
                                        });
                                      });
                                    }}
                                  >
                                    {tempTeams.map((team) => (
                                      <option key={team.name} value={team.name}>
                                        {team.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    className="input input-bordered input-sm w-full"
                                    value={item.price}
                                    onChange={(e) => {
                                      const newPrice = Math.max(
                                        0,
                                        Number(e.target.value) || 0,
                                      );
                                      setPlayerPricesDraft((prev) => {
                                        const next = [...prev];
                                        next[idx] = {
                                          ...next[idx],
                                          price: newPrice,
                                        };
                                        return next;
                                      });
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-base-300/50 p-2 rounded text-xs">
                    <p className="font-semibold mb-1">Tournament Summary:</p>
                    <p>📝 Name: {newTournament.name}</p>
                    <p>🏀 Teams: {tempTeams.length}</p>
                    <p>
                      💰 Bidding enabled: Budget{" "}
                      {newTournament.totalMoneyPerTeam} per team
                    </p>
                    <p>
                      👤 Players with prices:{" "}
                      {playerPricesDraft.filter((p) => p.price > 0).length}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-action gap-2 justify-between">
                {tournamentStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setTournamentStep(tournamentStep - 1)}
                  >
                    ← Back
                  </button>
                )}
                <div className="gap-2 flex">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowAddTournamentModal(false);
                      setTournamentStep(1);
                      setTempTeams([]);
                      setNewTeam({ name: "", players: [] });
                      setPlayerPricesDraft([]);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-sm ${
                      tournamentStep === (newTournament.hasBidding ? 4 : 3)
                        ? "btn-primary"
                        : "btn-info"
                    }`}
                  >
                    {tournamentStep === (newTournament.hasBidding ? 4 : 3)
                      ? "✅ Create Tournament"
                      : "Next →"}
                  </button>
                </div>
              </div>
            </form>
          </dialog>
        </>
      )}

      {showEditTeamsModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              setShowAddTournamentModal(false);
              setTournamentStep(1);
              setTempTeams([]);
              setNewTeam({ name: "", players: [] });
              setPlayerPricesDraft([]);
            }}
          ></div>

          <dialog open className="modal modal-open z-50">
            <div className="modal-box max-w-2xl space-y-4">
              <h3 className="font-bold">
                Edit Teams - {editingTournament?.name}
              </h3>
              <div className="space-y-2">
                <div className="bg-base-200 p-3 rounded">
                  <h4 className="font-bold mb-2">Add Team</h4>
                  <input
                    type="text"
                    placeholder="Team name"
                    className="input input-bordered w-full mb-2"
                    value={newTeam.name}
                    onChange={(e) =>
                      setNewTeam({ ...newTeam, name: e.target.value })
                    }
                  />
                  <div className="max-h-40 overflow-y-auto border border-white/10 rounded p-2 bg-base-100 mb-2">
                    {players.map((p) => {
                      const selected = newTeam.players.includes(p._id);
                      return (
                        <div
                          key={p._id}
                          className="flex items-center justify-between p-1"
                        >
                          <div>
                            {p.name}{" "}
                            <span className="text-xs opacity-60">
                              ({p.playerId})
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`btn btn-sm ${selected ? "btn-error" : "btn-success"}`}
                            onClick={() => addPlayerToTeam(p._id)}
                          >
                            {selected ? "−" : "+"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={addTeamToTournament}
                      disabled={newTeam.players.length < 3}
                    >
                      Add Team ({newTeam.players.length}/3)
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setNewTeam({ name: "", players: [] });
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm">Existing Teams</h4>
                  {tempTeams.length > 0 ? (
                    tempTeams.map((team, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-base-200 rounded flex justify-between items-start mt-2"
                      >
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-xs opacity-70">
                            {(team.players || []).length} players
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => removeTeamFromTournament(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs opacity-60">No teams</p>
                  )}
                </div>
              </div>
              <div className="modal-action">
                <button
                  className="btn"
                  onClick={() => setShowEditTeamsModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitTournamentTeamsUpdate}
                >
                  Save Teams
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}

      {confirmBox.open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40"></div>
          <dialog open className="modal modal-open z-50">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-lg">
                {confirmBox.title || "Confirm action"}
              </h3>
              <p className="py-3 text-sm opacity-80">{confirmBox.text}</p>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setConfirmBox({
                      open: false,
                      title: "",
                      text: "",
                      onConfirm: null,
                    })
                  }
                >
                  No
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    const action = confirmBox.onConfirm;
                    setConfirmBox({
                      open: false,
                      title: "",
                      text: "",
                      onConfirm: null,
                    });
                    if (typeof action === "function") {
                      await action();
                    }
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}

      {showAddPlayerToTeamModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddPlayerToTeamModal(false)}
          ></div>
          <dialog open className="modal modal-open z-50">
            <form
              className="modal-box max-w-md space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddPlayersToTeam();
              }}
            >
              <h3 className="font-bold text-lg">
                Add Players to{" "}
                {typeof selectedTeamForAddPlayer === "string"
                  ? selectedTeamForAddPlayer
                  : selectedTeamForAddPlayer?.name || "Team"}
              </h3>

              <div>
                <p className="text-sm font-semibold mb-2">
                  Select players to add:
                </p>
                <div className="max-h-64 overflow-y-auto border border-white/10 rounded p-2 bg-base-100 space-y-2">
                  {players.map((player) => {
                    const isSelected = selectedPlayersToAdd.includes(
                      player._id,
                    );
                    // Check if player is already in the team
                    const isAlreadyInTeam = (
                      selectedTeamForAddPlayer?.players || []
                    ).some((p) => {
                      const pId = typeof p === "string" ? p : p?._id || p?.id;
                      return String(pId) === String(player._id);
                    });

                    return (
                      <label
                        key={player._id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={isSelected}
                          disabled={isAlreadyInTeam}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlayersToAdd([
                                ...selectedPlayersToAdd,
                                player._id,
                              ]);
                            } else {
                              setSelectedPlayersToAdd(
                                selectedPlayersToAdd.filter(
                                  (id) => id !== player._id,
                                ),
                              );
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              isAlreadyInTeam ? "opacity-50 line-through" : ""
                            }`}
                          >
                            {player.name}
                          </p>
                          <p className="text-xs opacity-60">
                            {player.playerId}
                          </p>
                        </div>
                        {isAlreadyInTeam && (
                          <span className="text-xs badge badge-sm">
                            In team
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs opacity-60 mt-2">
                  Selected: {selectedPlayersToAdd.length} player(s)
                </p>
              </div>

              <div className="modal-action gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowAddPlayerToTeamModal(false);
                    setSelectedTeamForAddPlayer(null);
                    setSelectedPlayersToAdd([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-info"
                  disabled={selectedPlayersToAdd.length === 0}
                >
                  <Plus className="w-4" />
                  Add {selectedPlayersToAdd.length} Player(s)
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}
    </div>
  );
}
