import React, { useEffect, useState } from "react";
import { apiUrl } from "../lib/config.js";
import { Trophy } from "lucide-react";

export default function Tournament() {
  const [allTournaments, setAllTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [progression, setProgression] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);

  const renderLeagueBoard = (rows) => (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.team}</td>
              <td>{r.played}</td>
              <td>{r.won}</td>
              <td>{r.draw}</td>
              <td>{r.lost}</td>
              <td>{r.goalsFor}</td>
              <td>{r.goalsAgainst}</td>
              <td>{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderKnockoutBoard = (rows) => (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Team</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.team}</td>
              <td>{r.eliminated ? "Eliminated" : "Alive"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderScoreboard = (type, board) => {
    if (type === "league") return renderLeagueBoard(board);
    if (type === "knockout") return renderKnockoutBoard(board);
    return board.map((g) => (
      <div key={g.group}>
        <h4>{g.group}</h4>
        {renderLeagueBoard(g.table)}
      </div>
    ));
  };

  const renderFixtures = (fixturesList) => {
    const scheduledRows = fixturesList.filter((f) => f.status !== "finished");
    const resultRows = fixturesList.filter((f) => f.status === "finished");
    return (
      <>
        <div className="overflow-x-auto mb-8">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Match</th>
                <th>Schedule</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduledRows.length ? (
                scheduledRows.map((f) => (
                  <tr key={f._id}>
                    <td>{f.phase}</td>
                    <td>
                      {f.teamA} vs {f.teamB}
                    </td>
                    <td>
                      {f.scheduledAt
                        ? new Date(f.scheduledAt).toLocaleString()
                        : "-"}
                    </td>
                    <td>{f.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No scheduled matches</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Match</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {resultRows.length ? (
                resultRows.map((f) => (
                  <tr key={f._id}>
                    <td>{f.phase}</td>
                    <td>
                      {f.teamA} vs {f.teamB}
                    </td>
                    <td>{f.result || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">No results yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  useEffect(() => {
    const loadAllTournaments = async () => {
      setLoading(true);
      setMessage("Loading tournaments...");
      setMessageType("info");
      try {
        const response = await fetch(apiUrl("/tournaments"));
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Failed to load tournaments");
        const tournaments = data.tournaments || [];
        setAllTournaments(tournaments);
        if (tournaments.length === 0) {
          setMessage("No tournaments available yet.");
          setMessageType("warning");
        } else {
          setMessage(
            `✅ Loaded ${tournaments.length} tournament${tournaments.length !== 1 ? "s" : ""}`,
          );
          setMessageType("success");
          setSelectedTournament(tournaments[0]);
          loadTournamentDetails(tournaments[0]._id || tournaments[0].id);
        }
      } catch (error) {
        setMessage(error.message);
        setMessageType("error");
        setAllTournaments([]);
      }
      setLoading(false);
    };
    loadAllTournaments();
  }, []);

  const loadTournamentDetails = async (tournamentId) => {
    try {
      const response = await fetch(
        apiUrl(`/tournaments/${tournamentId}/progression`),
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to load tournament");
      const { tournament, progression, fixtures } = data;
      setTournament(tournament);
      setProgression(progression);
      setFixtures(fixtures || []);
    } catch (error) {
      console.error("Tournament details error:", error);
      setMessage(error.message);
      setMessageType("error");
    }
  };

  const handleTournamentSelect = (t) => {
    setSelectedTournament(t);
    loadTournamentDetails(t._id || t.id);
  };

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-warning" />
          All Tournaments
        </h1>
        <p className="text-lg opacity-70">
          Browse upcoming, live, and completed tournaments
        </p>
      </div>

      {message && (
        <div className={`alert alert-${messageType} shadow-lg`}>
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body text-center py-12">
            <span className="loading loading-spinner loading-lg mx-auto"></span>
            <p className="mt-4 opacity-60">Loading tournaments...</p>
          </div>
        </div>
      ) : allTournaments.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTournaments.map((t) => (
              <div
                key={t._id || t.id}
                onClick={() => handleTournamentSelect(t)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition transform hover:scale-105 ${
                  selectedTournament?._id === t._id ||
                  selectedTournament?.id === t.id
                    ? "border-warning bg-warning/10"
                    : "border-white/10 bg-base-200/30 hover:border-warning/50"
                }`}
              >
                {t.image && (
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <h3 className="font-bold text-lg mb-2 line-clamp-2">
                  {t.name}
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="badge badge-outline badge-sm">{t.type}</span>
                  <span
                    className={`badge badge-sm ${t.status === "live" ? "badge-success" : t.status === "finished" ? "badge-secondary" : "badge-warning"}`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="text-xs opacity-70">
                  <div>Teams: {t.teams?.length || 0}</div>
                </div>
              </div>
            ))}
          </div>

          {tournament && (
            <div className="border-t border-white/10 pt-8 space-y-6">
              <h2 className="text-3xl font-bold">Tournament Details</h2>
              <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10 shadow-sm">
                <div className="card-body">
                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {tournament.image && (
                      <img
                        src={tournament.image}
                        alt={tournament.name}
                        className="w-48 h-48 object-cover rounded-lg shadow-md flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <h1 className="text-4xl font-bold mb-3">
                        {tournament.name}
                      </h1>
                      <div className="text-lg opacity-80 space-y-2">
                        <div>
                          <span className="font-semibold">Type:</span>{" "}
                          <span className="badge badge-primary">
                            {tournament.type}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold">Status:</span>{" "}
                          <span
                            className={`badge ${tournament.status === "live" ? "badge-success" : "badge-warning"}`}
                          >
                            {tournament.status}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold">Points Mode:</span>{" "}
                          {progression?.pointsMode || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {progression && (
                <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
                  <div className="card-body p-6">
                    <h2 className="card-title text-2xl mb-6">📊 Scoreboard</h2>
                    <div className="overflow-x-auto">
                      {renderScoreboard(
                        tournament?.type,
                        progression.scoreboard,
                      )}
                    </div>
                  </div>
                </div>
              )}

              {progression && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
                    <div className="card-body">
                      <h3 className="card-title text-xl mb-4">
                        ✅ Qualified Teams
                      </h3>
                      <ul className="space-y-2">
                        {progression.qualifiedTeams.length ? (
                          progression.qualifiedTeams.map((team, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-base-200/50"
                            >
                              <span className="badge badge-sm badge-success">
                                ✓
                              </span>
                              <span className="font-medium">{team}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-center py-4 opacity-60">
                            No teams qualified yet
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
                    <div className="card-body">
                      <h3 className="card-title text-xl mb-4">
                        🏆 Tournament Winner
                      </h3>
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="text-3xl font-black font-mono">
                            {progression.winner || "TBD"}
                          </div>
                          {progression.winner && (
                            <div className="text-sm opacity-60 mt-2">
                              Champion
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {fixtures.length > 0 && (
                <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
                  <div className="card-body p-6">
                    <h2 className="card-title text-2xl mb-6">📅 Fixtures</h2>
                    <div className="space-y-6">{renderFixtures(fixtures)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card bg-base-100/50 backdrop-blur-md border border-white/10 shadow-sm">
          <div className="card-body text-center py-12">
            <p className="text-lg opacity-60">No tournaments available</p>
          </div>
        </div>
      )}
    </div>
  );
}
