import "../styles.css";
import { apiUrl } from "../lib/config.js";

const message = document.getElementById("message");
const scoreboard = document.getElementById("scoreboard");
const qualified = document.getElementById("qualified");
const schedule = document.getElementById("schedule");
const results = document.getElementById("results");

const renderLeagueBoard = (rows) => `
  <div class="overflow-x-auto">
    <table class="table table-zebra">
      <thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>Points</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.team}</td><td>${r.played}</td><td>${r.won}</td><td>${r.draw}</td><td>${r.lost}</td><td>${r.goalsFor}</td><td>${r.goalsAgainst}</td><td>${r.points}</td></tr>`).join("")}</tbody>
    </table>
  </div>`;
const renderKnockoutBoard = (rows) => `
  <div class="overflow-x-auto">
    <table class="table table-zebra">
      <thead><tr><th>Team</th><th>Status</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.team}</td><td>${r.eliminated ? "Eliminated" : "Alive"}</td></tr>`).join("")}</tbody>
    </table>
  </div>`;

function renderScoreboard(type, board) {
  if (type === "league") {
    scoreboard.innerHTML = renderLeagueBoard(board);
    return;
  }
  if (type === "knockout") {
    scoreboard.innerHTML = renderKnockoutBoard(board);
    return;
  }
  scoreboard.innerHTML = board.map((g) => `<h4>${g.group}</h4>${renderLeagueBoard(g.table)}`).join("");
}

function renderFixtures(fixtures) {
  const scheduledRows = fixtures.filter((f) => f.status !== "finished");
  const resultRows = fixtures.filter((f) => f.status === "finished");
  schedule.innerHTML = `<div class="overflow-x-auto"><table class="table table-zebra"><thead><tr><th>Phase</th><th>Match</th><th>Schedule</th><th>Status</th></tr></thead><tbody>${scheduledRows.length ? scheduledRows.map((f) => `<tr><td>${f.phase}</td><td>${f.teamA} vs ${f.teamB}</td><td>${f.scheduledAt ? new Date(f.scheduledAt).toLocaleString() : "-"}</td><td>${f.status}</td></tr>`).join("") : '<tr><td colspan="4">No scheduled matches</td></tr>'}</tbody></table></div>`;
  results.innerHTML = `<div class="overflow-x-auto"><table class="table table-zebra"><thead><tr><th>Phase</th><th>Match</th><th>Result</th></tr></thead><tbody>${resultRows.length ? resultRows.map((f) => `<tr><td>${f.phase}</td><td>${f.teamA} vs ${f.teamB}</td><td>${f.result || "-"}</td></tr>`).join("") : '<tr><td colspan="3">No results yet</td></tr>'}</tbody></table></div>`;
}

async function loadTournament(tournamentId) {
  const loadBtn = document.getElementById("load-tournament-btn");
  loadBtn.disabled = true;
  loadBtn.classList.add("loading");
  message.className = "alert alert-info";
  message.textContent = "Loading tournament...";
  const response = await fetch(apiUrl(`/tournaments/${tournamentId}/progression`));
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to load tournament");
  const { tournament, progression, fixtures } = data;
  document.getElementById("title").textContent = tournament.name;
  document.getElementById("meta").textContent = `Type: ${tournament.type} | Status: ${tournament.status} | Points mode: ${progression.pointsMode}`;
  const image = document.getElementById("image");
  if (tournament.image) {
    image.src = tournament.image;
    image.hidden = false;
  } else image.hidden = true;
  renderScoreboard(tournament.type, progression.scoreboard);
  qualified.innerHTML = "";
  if (!progression.qualifiedTeams.length) qualified.innerHTML = "<li>No teams qualified yet</li>";
  else progression.qualifiedTeams.forEach((team) => {
    const li = document.createElement("li");
    li.textContent = team;
    qualified.appendChild(li);
  });
  document.getElementById("winner").textContent = progression.winner || "TBD";
  renderFixtures(fixtures || []);
  message.className = "alert alert-success";
  message.textContent = "Tournament loaded.";
  loadBtn.disabled = false;
  loadBtn.classList.remove("loading");
}

document.getElementById("load-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const tournamentId = document.getElementById("tournamentId").value.trim();
    await loadTournament(tournamentId);
    const url = new URL(window.location.href);
    url.searchParams.set("tournamentId", tournamentId);
    window.history.replaceState({}, "", url);
  } catch (error) {
    document.getElementById("load-tournament-btn").disabled = false;
    document.getElementById("load-tournament-btn").classList.remove("loading");
    message.className = "alert alert-error";
    message.textContent = error.message;
  }
});

const initialTournamentId = new URLSearchParams(window.location.search).get("tournamentId");
if (initialTournamentId) {
  document.getElementById("tournamentId").value = initialTournamentId;
  loadTournament(initialTournamentId).catch((error) => {
    message.className = "alert alert-error";
    message.textContent = error.message;
  });
}
