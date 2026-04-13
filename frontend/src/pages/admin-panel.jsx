import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/config.js";
import { useAuth } from "../lib/auth.jsx";
import {
  Plus,
  Trophy,
  Users,
  BarChart3,
  RefreshCw,
  Database,
  Play,
  Square,
  Goal,
} from "lucide-react";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { getToken, user } = useAuth();

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
    playerId: "",
    email: "",
    position: "",
  });
  const [newTournament, setNewTournament] = useState({
    name: "",
    type: "league",
    status: "upcoming",
    pointsMode: "score",
    teams: [],
  });
  const [tournamentStep, setTournamentStep] = useState(1); // Step 1: Basic Info, Step 2: Teams, Step 3: Players
  const [newTeam, setNewTeam] = useState({
    name: "",
    players: [],
  });
  const [tempTeams, setTempTeams] = useState([]);
  const [editingTournament, setEditingTournament] = useState(null);
  const [showEditTeamsModal, setShowEditTeamsModal] = useState(false);
  const [hasSampleData, setHasSampleData] = useState(false);
  const [creatingData, setCreatingData] = useState(false);

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
  });
  const [fixtureScheduleDrafts, setFixtureScheduleDrafts] = useState({});
  const [manualFixtureForm, setManualFixtureForm] = useState({
    teamAName: "",
    teamBName: "",
    phase: "regular",
    scheduledAt: "",
    status: "upcoming",
  });

  const tournamentTeamOptions = (selectedTournamentDetails?.teams || [])
    .map((team) => (typeof team === "string" ? team : team?.name))
    .filter(Boolean);

  useEffect(() => {
    if (!getToken() || !user) {
      navigate("/admin-login");
    }
  }, [getToken, user, navigate]);

  const fetchWithAuth = async (url, options = {}) => {
    const token = getToken();
    if (!token) throw new Error("No auth token");
    const response = await fetch(apiUrl(url), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (response.status === 401) {
      navigate("/admin-login");
      throw new Error("Session expired");
    }
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Request failed");
    }
    return response.json();
  };

  const loadStats = async () => {
    try {
      const data = await fetchWithAuth("/stats/admin/stats");
      setStats(data);
    } catch (error) {
      console.error("Stats error:", error);
    }
  };
  const loadPlayers = async () => {
    try {
      const { players } = await fetchWithAuth("/players");
      setPlayers(players || []);
    } catch (error) {
      console.error("Players error:", error);
    }
  };
  const loadTournaments = async () => {
    try {
      const { tournaments } = await fetchWithAuth("/tournaments");
      setTournaments(tournaments || []);
    } catch (error) {
      console.error("Tournaments error:", error);
    }
  };

  const handleOpenEditTeams = (tournament) => {
    setEditingTournament(tournament);
    // initialize tempTeams from tournament.teams if available
    setTempTeams(
      (tournament.teams || []).map((t) => ({
        name: t.name || t,
        players: t.players || [],
      })),
    );
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
      setMessage("✅ Tournament teams updated");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
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
    } catch (error) {
      console.error("Live matches error:", error);
    }
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
      setNewPlayer({ name: "", playerId: "", email: "", position: "" });
      loadPlayers();
      setMessage(" Player added!");
      setMessageType("success");
    } catch (error) {
      setMessage(` ${error.message}`);
      setMessageType("error");
    }
  };

  const handleAddTournament = async (e) => {
    e.preventDefault();

    if (tournamentStep === 1) {
      // Validate basic info and move to step 2
      if (!newTournament.name.trim()) {
        setMessage("❌ Tournament name is required");
        setMessageType("error");
        return;
      }
      setTournamentStep(2);
      return;
    }

    if (tournamentStep === 2) {
      // Validate teams and move to step 3 (or submit for non-league)
      if (tempTeams.length === 0) {
        setMessage("❌ Add at least one team");
        setMessageType("error");
        return;
      }

      if (newTournament.type === "league") {
        // For league, move to step 3 to configure scoring
        setTournamentStep(3);
        return;
      } else {
        // For other types, submit directly
        await submitTournament();
        return;
      }
    }

    if (tournamentStep === 3) {
      // Submit tournament
      await submitTournament();
    }
  };

  const submitTournament = async () => {
    try {
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
        pointsMode: "score",
        teams: [],
      });
      setTempTeams([]);
      setNewTeam({ name: "", players: [] });
      loadTournaments();
      setMessage("✅ Tournament created successfully!");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      setMessageType("error");
    }
  };

  const addTeamToTournament = () => {
    if (!newTeam.name.trim()) {
      setMessage("❌ Team name is required");
      setMessageType("error");
      return;
    }

    if (newTeam.players.length < 3) {
      setMessage("❌ Team must have at least 3 players");
      setMessageType("error");
      return;
    }

    if (
      tempTeams.some((t) => t.name.toLowerCase() === newTeam.name.toLowerCase())
    ) {
      setMessage("❌ Team already added");
      setMessageType("error");
      return;
    }

    setTempTeams([
      ...tempTeams,
      { ...newTeam, players: newTeam.players || [] },
    ]);
    setNewTeam({ name: "", players: [] });
    setMessage("✅ Team added!");
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

    if (currentTeamPlayers.length >= 11 || otherTeamPlayers.includes(playerId)) {
      return;
    }

    setNewMatch({
      ...newMatch,
      [teamKey]: [...currentTeamPlayers, playerId],
    });
  };

  const samplePlayers = [
    {
      name: "Cristiano Ronaldo",
      playerId: "P001",
      email: "cristiano@mail.com",
      position: "Forward",
    },
    {
      name: "Lionel Messi",
      playerId: "P002",
      email: "messi@mail.com",
      position: "Forward",
    },
    {
      name: "Neymar Jr",
      playerId: "P003",
      email: "neymar@mail.com",
      position: "Winger",
    },
    {
      name: "Kylian Mbappe",
      playerId: "P004",
      email: "mbappe@mail.com",
      position: "Forward",
    },
    {
      name: "Robert Lewandowski",
      playerId: "P005",
      email: "lewy@mail.com",
      position: "Forward",
    },
    {
      name: "Erling Haaland",
      playerId: "P006",
      email: "haaland@mail.com",
      position: "Forward",
    },
    {
      name: "Vinicius Jr",
      playerId: "P007",
      email: "vinicius@mail.com",
      position: "Winger",
    },
    {
      name: "Jude Bellingham",
      playerId: "P008",
      email: "bellingham@mail.com",
      position: "Midfielder",
    },
  ];

  const sampleTournaments = [
    {
      name: "Premier League 2026",
      type: "league",
      status: "live",
      teams: [
        { name: "Falcon FC", players: ["sample-p1", "sample-p2", "sample-p3"] },
        {
          name: "River City",
          players: ["sample-p4", "sample-p5", "sample-p6"],
        },
      ],
    },
    {
      name: "Champions League",
      type: "knockout",
      status: "upcoming",
      teams: [
        {
          name: "Metro Stars",
          players: ["sample-p1", "sample-p4", "sample-p7"],
        },
        {
          name: "North United",
          players: ["sample-p2", "sample-p5", "sample-p8"],
        },
      ],
    },
    {
      name: "Copa America",
      type: "league",
      status: "upcoming",
      teams: [
        {
          name: "Red Tigers",
          players: ["sample-p3", "sample-p6", "sample-p7"],
        },
        {
          name: "Blue Sharks",
          players: ["sample-p1", "sample-p5", "sample-p8"],
        },
      ],
    },
  ];

  const handleCreateSampleData = async () => {
    setCreatingData(true);
    try {
      // Create sample players
      for (const player of samplePlayers) {
        await fetchWithAuth("/players", {
          method: "POST",
          body: JSON.stringify(player),
        });
      }

      const { players: createdPlayers = [] } = await fetchWithAuth("/players");

      // Create sample tournaments
      for (const tournament of sampleTournaments) {
        const withRealPlayerIds = {
          ...tournament,
          teams: tournament.teams.map((team) => ({
            ...team,
            players: team.players
              .map((placeholder) => {
                const playerNumber = placeholder.replace("sample-p", "P00");
                return createdPlayers.find(
                  (player) => player.playerId === playerNumber,
                )?._id;
              })
              .filter(Boolean),
          })),
        };
        await fetchWithAuth("/tournaments", {
          method: "POST",
          body: JSON.stringify(withRealPlayerIds),
        });
      }

      // Reload data
      await Promise.all([loadStats(), loadPlayers(), loadTournaments()]);
      setHasSampleData(true);
      setMessage("✅ Sample data created successfully!");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ Error creating sample data: ${error.message}`);
      setMessageType("error");
    } finally {
      setCreatingData(false);
    }
  };

  const handleDeleteSampleData = async () => {
    if (
      !window.confirm(
        "⚠️ Are you sure you want to delete all sample data? This cannot be undone.",
      )
    ) {
      return;
    }

    setCreatingData(true);
    try {
      const samplePlayerIds = samplePlayers.map((p) => p.playerId);
      const sampleTournamentNames = sampleTournaments.map((t) => t.name);

      // Delete sample players (note: you may need to add a delete endpoint)
      for (const player of players) {
        if (samplePlayerIds.includes(player.playerId)) {
          try {
            await fetchWithAuth(`/players/${player._id}`, { method: "DELETE" });
          } catch (error) {
            console.error(`Could not delete player ${player.name}:`, error);
          }
        }
      }

      // Delete sample tournaments
      for (const tournament of tournaments) {
        if (sampleTournamentNames.includes(tournament.name)) {
          try {
            await fetchWithAuth(`/tournaments/${tournament._id}`, {
              method: "DELETE",
            });
          } catch (error) {
            console.error(
              `Could not delete tournament ${tournament.name}:`,
              error,
            );
          }
        }
      }

      // Reload data
      await Promise.all([loadStats(), loadPlayers(), loadTournaments()]);
      setHasSampleData(false);
      setMessage("✅ Sample data deleted successfully!");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ Error deleting sample data: ${error.message}`);
      setMessageType("error");
    } finally {
      setCreatingData(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!newMatch.teamAName || !newMatch.teamBName) {
      setMessage("❌ Please enter both team names");
      setMessageType("error");
      return;
    }

    if (newMatch.teamAPlayers.length < 3) {
      setMessage("❌ Team A needs at least 3 players");
      setMessageType("error");
      return;
    }

    if (newMatch.teamBPlayers.length < 3) {
      setMessage("❌ Team B needs at least 3 players");
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
      setMessage("✅ Match created and started!");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      setMessageType("error");
    }
  };

  const handleEndMatch = async (matchId) => {
    console.log("End match called with ID:", matchId);
    if (!window.confirm("⚠️ Are you sure you want to end this match?")) {
      return;
    }

    try {
      console.log("Sending PATCH request to end match:", matchId);
      const response = await fetchWithAuth(`/matches/${matchId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "finished" }),
      });
      console.log("Match ended successfully:", response);
      await loadLiveMatches();
      setSelectedLiveMatch(null);
      setMessage("✅ Match ended successfully!");
      setMessageType("success");
    } catch (error) {
      console.error("Error ending match:", error);
      setMessage(`❌ ${error.message}`);
      setMessageType("error");
    }
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
      setMessage(`❌ ${error.message}`);
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
    const tournamentId = selectedTournament?._id || selectedTournament?.id;
    if (!tournamentId) {
      setMessage("❌ Select a tournament first");
      setMessageType("error");
      return;
    }

    try {
      const data = await fetchWithAuth(
        `/tournaments/${tournamentId}/fixtures/generate`,
        {
          method: "POST",
          body: JSON.stringify({
            startDate: fixtureGenerationForm.startDate || undefined,
            intervalHours: Number(fixtureGenerationForm.intervalHours) || 24,
          }),
        },
      );
      await Promise.all([
        loadTournaments(),
        loadTournamentDetails(tournamentId),
        loadLiveMatches(),
      ]);
      setMessage(`✅ ${data.matchCount || 0} tournament fixtures generated`);
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      setMessageType("error");
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
      setMessage("✅ Tournament match started");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
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
      setMessage(`✅ Tournament set to ${tournamentStatusDraft}`);
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
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
      setMessage("✅ Fixture schedule updated");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      setMessageType("error");
    }
  };

  const handleCreateManualFixture = async () => {
    const tournamentId = selectedTournament?._id || selectedTournament?.id;
    if (!tournamentId) return;

    if (!manualFixtureForm.teamAName || !manualFixtureForm.teamBName) {
      setMessage("❌ Select both teams for the fixture");
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
      });
      setMessage("✅ Fixture created manually");
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      setMessageType("error");
    }
  };

  const handleOpenTournamentLiveMatch = async (fixtureId) => {
    if (!fixtureId) return;
    await loadLiveMatches();
    navigate(`/live-match?matchId=${fixtureId}`);
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
        <button
          type="button"
          onClick={
            hasSampleData ? handleDeleteSampleData : handleCreateSampleData
          }
          disabled={creatingData}
          className={`btn btn-sm ${hasSampleData ? "btn-error" : "btn-info"}`}
          data-sample-create-btn={!hasSampleData}
          data-sample-delete-btn={hasSampleData}
        >
          {creatingData ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Processing...
            </>
          ) : hasSampleData ? (
            <>
              <Database className="w-4" />
              Delete Sample Data
            </>
          ) : (
            <>
              <Database className="w-4" />
              Create Sample Data
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType}`}>
          <span>{message}</span>
        </div>
      )}

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
                <p className={`text-3xl font-mono font-bold mt-2 ${s.color}`}>
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
          <div className="overflow-x-auto max-h-64">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {players.slice(0, 8).map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td className="font-mono text-xs">{p.playerId}</td>
                  </tr>
                ))}
                {!players.length && (
                  <tr>
                    <td colSpan="2" className="text-center py-8 opacity-50">
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
          <div className="overflow-x-auto max-h-64">
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
                {tournaments.slice(0, 8).map((t) => (
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
                        {tournament.teamCount || tournament.teams?.length || 0}{" "}
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
                      onChange={(e) => setTournamentStatusDraft(e.target.value)}
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
                      Use this if auto-generate is not working or if you want
                      full control over each matchup.
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

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateManualFixture}
                  >
                    <Plus className="w-4" />
                    Add Fixture
                  </button>
                </div>

                {tournamentFixtures.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 p-6 text-sm opacity-70 space-y-4">
                    <p>
                      This tournament has no fixtures yet. Set the first kickoff
                      time below and generate the tournament schedule.
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
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={handleGenerateTournamentFixtures}
                    >
                      <RefreshCw className="w-4" />
                      Generate Fixtures
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
                                Schedule for {fixture.teamA} vs {fixture.teamB}
                              </label>
                              <input
                                id={`fixture-scheduled-at-${fixture.id}`}
                                name={`fixtureScheduledAt-${fixture.id}`}
                                type="datetime-local"
                                className="input input-bordered input-sm"
                                value={fixtureScheduleDrafts[fixture.id] || ""}
                                onChange={(e) =>
                                  setFixtureScheduleDrafts((current) => ({
                                    ...current,
                                    [fixture.id]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  handleFixtureScheduleUpdate(fixture.id)
                                }
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
                                  <span className="text-sm font-mono">
                                    {fixture.result}
                                  </span>
                                )}
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

      {/* Match Management Section */}
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
                    {match.goals?.filter((g) => g.teamIndex === 0).length || 0}{" "}
                    -{" "}
                    {match.goals?.filter((g) => g.teamIndex === 1).length || 0}{" "}
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
                        navigate(`/live-match?matchId=${selectedLiveMatch._id}`)
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
                        console.log(
                          "End Match button clicked, selected match:",
                          selectedLiveMatch,
                        );
                        if (selectedLiveMatch?._id) {
                          handleEndMatch(selectedLiveMatch._id);
                        } else {
                          alert("No match selected");
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
                <label htmlFor="new-player-id" className="sr-only">
                  Player ID
                </label>
                <input
                  id="new-player-id"
                  name="newPlayerId"
                  type="text"
                  placeholder="ID"
                  className="input input-bordered w-full"
                  value={newPlayer.playerId}
                  onChange={(e) =>
                    setNewPlayer({ ...newPlayer, playerId: e.target.value })
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
                {newTournament.type === "league" ? "3" : "2"}
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

              {/* Step 3: League Configuration */}
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
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-sm ${
                      tournamentStep ===
                      (newTournament.type === "league" ? 3 : 2)
                        ? "btn-primary"
                        : "btn-info"
                    }`}
                  >
                    {tournamentStep ===
                    (newTournament.type === "league" ? 3 : 2)
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
            onClick={() => setShowEditTeamsModal(false)}
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
    </div>
  );
}
