import "../styles.css";

const result = document.getElementById("result");
const token = localStorage.getItem("adminToken");
if (!token) window.location.href = "/admin-login.html";
const playersList = document.getElementById("players-list");
const requestsList = document.getElementById("requests-list");
const playersCount = document.getElementById("players-count");
const requestsCount = document.getElementById("requests-count");

function setLoading(form, isLoading) {
  const btn = form.querySelector("[data-loading-btn]");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle("loading", isLoading);
}
function showResult(text, type = "success") {
  result.className = `alert ${type === "error" ? "alert-error" : "alert-success"} fade-in`;
  result.textContent = text;
}

async function loadPlayers() {
  playersList.textContent = "Loading players...";
  try {
    const response = await fetch(apiUrl("/players"), { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to load players");
    playersCount.textContent = String(data.players.length);
    playersList.textContent = data.players.map((p) => `${p._id} | ${p.playerId} | ${p.name}`).join("\n");
  } catch (error) {
    playersList.textContent = error.message;
  }
}
async function loadRequests() {
  requestsList.textContent = "Loading transfer requests...";
  try {
    const response = await fetch(apiUrl("/transfers/requests"), { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to load transfer requests");
    requestsCount.textContent = String(data.requests.length);
    requestsList.textContent = data.requests.map((r) => `${r._id} | ${r.status} | ${r.player?.playerId || "-"} | match:${r.match?._id || "-"} | ${r.fromTeamIndex}->${r.toTeamIndex}`).join("\n") || "No transfer requests yet.";
  } catch (error) {
    requestsList.textContent = error.message;
  }
}

const createPlayerForm = document.getElementById("create-player-form");
createPlayerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(createPlayerForm, true);
  const payload = {
    name: document.getElementById("name").value,
    playerId: document.getElementById("playerId").value,
    email: document.getElementById("email").value || undefined,
    password: document.getElementById("password").value || undefined
  };
  try {
    const response = await fetch(apiUrl("/players"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to create player");
    showResult(`Player created: ${data.player.playerId}\n${data.generatedPassword ? `Generated password: ${data.generatedPassword}` : "Custom password set."}`);
    createPlayerForm.reset();
    loadPlayers();
  } catch (error) {
    showResult(error.message, "error");
  } finally {
    setLoading(createPlayerForm, false);
  }
});

const matchForm = document.getElementById("create-match-form");
matchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(matchForm, true);
  const teamAPlayers = document.getElementById("teamAPlayers").value.split(",").map((v) => v.trim()).filter(Boolean);
  const teamBPlayers = document.getElementById("teamBPlayers").value.split(",").map((v) => v.trim()).filter(Boolean);
  const payload = {
    teamA: { name: document.getElementById("teamAName").value, players: teamAPlayers, captain: document.getElementById("teamACaptain").value.trim() || undefined },
    teamB: { name: document.getElementById("teamBName").value, players: teamBPlayers, captain: document.getElementById("teamBCaptain").value.trim() || undefined },
    status: document.getElementById("status").value
  };
  try {
    const response = await fetch(apiUrl("/matches"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to create match");
    showResult(`Match created: ${data.match._id}\nStatus: ${data.match.status}`);
    matchForm.reset();
    window.match_modal.close();
  } catch (error) {
    showResult(error.message, "error");
  } finally {
    setLoading(matchForm, false);
  }
});

const goalForm = document.getElementById("add-goal-form");
goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(goalForm, true);
  const matchId = document.getElementById("goalMatchId").value.trim();
  const payload = { playerId: document.getElementById("goalPlayerId").value.trim(), minute: document.getElementById("goalMinute").value === "" ? undefined : Number(document.getElementById("goalMinute").value) };
  try {
    const response = await fetch(apiUrl(`/matches/${matchId}/goals`), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to add goal");
    showResult(`Goal added.\nScore: ${data.match.score.teamA} - ${data.match.score.teamB}`);
    goalForm.reset();
    window.goal_modal.close();
  } catch (error) {
    showResult(error.message, "error");
  } finally {
    setLoading(goalForm, false);
  }
});

const statusForm = document.getElementById("status-form");
statusForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(statusForm, true);
  const matchId = document.getElementById("statusMatchId").value.trim();
  const status = document.getElementById("newStatus").value;
  try {
    const response = await fetch(apiUrl(`/matches/${matchId}/status`), { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to update status");
    showResult(`Match status updated: ${data.match.status}`);
    statusForm.reset();
    window.status_modal.close();
  } catch (error) {
    showResult(error.message, "error");
  } finally {
    setLoading(statusForm, false);
  }
});

const updateRequestForm = document.getElementById("update-request-form");
updateRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(updateRequestForm, true);
  const requestId = document.getElementById("requestId").value.trim();
  const status = document.getElementById("requestStatus").value;
  try {
    const response = await fetch(apiUrl(`/transfers/requests/${requestId}`), { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to update transfer request");
    showResult(`Transfer request updated: ${data.request.status}`);
    updateRequestForm.reset();
    window.transfer_modal.close();
    loadRequests();
  } catch (error) {
    showResult(error.message, "error");
  } finally {
    setLoading(updateRequestForm, false);
  }
});

document.getElementById("generate-fixtures-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formEl = event.target;
  setLoading(formEl, true);
  try {
    const tournamentId = document.getElementById("fixtureTournamentId").value.trim();
    const startDate = document.getElementById("fixtureStartDate").value;
    const intervalHours = document.getElementById("fixtureIntervalHours").value;
    const response = await fetch(apiUrl(`/tournaments/${tournamentId}/fixtures/generate`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ startDate: startDate || undefined, intervalHours: intervalHours ? Number(intervalHours) : undefined })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to generate fixtures");
    showResult(`Fixtures generated: ${data.matchCount}`);
    formEl.reset();
    window.fixture_modal.close();
  } catch (error) {
    showResult(error.message, "error");
  } finally {
    setLoading(formEl, false);
  }
});

document.getElementById("assign-matches-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formEl = event.target;
  setLoading(formEl, true);
  try {
    const tournamentId = document.getElementById("assignTournamentId").value.trim();
    const matchIds = document.getElementById("assignMatchIds").value.split(",").map((v) => v.trim()).filter(Boolean);
    const response = await fetch(apiUrl(`/tournaments/${tournamentId}/matches/assign`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchIds })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to assign matches");
    showResult(`Assigned matches: ${data.matchCount}`);
    formEl.reset();
    window.assign_modal.close();
  } catch (error) {
    showResult(error.message, "error");
  } finally {
    setLoading(formEl, false);
  }
});

document.getElementById("refresh-players").addEventListener("click", loadPlayers);
document.getElementById("refresh-requests").addEventListener("click", loadRequests);
loadPlayers();
loadRequests();
