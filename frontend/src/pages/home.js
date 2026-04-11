import "../styles.css";
import { apiUrl } from "../lib/config.js";

const message = document.getElementById("home-message");
const upcomingEl = document.getElementById("upcoming-matches");
const resultsEl = document.getElementById("recent-results");
const tournamentsEl = document.getElementById("tournaments-list");

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function renderMatchLine(m) {
  const a = m.teams?.[0]?.name || "?";
  const b = m.teams?.[1]?.name || "?";
  const id = m._id;
  return `<li class="py-2 border-b border-base-300 last:border-0">
    <div class="font-medium">${a} <span class="opacity-60">vs</span> ${b}</div>
    <div class="text-sm opacity-70">Score ${m.score.teamA}–${m.score.teamB} · ${m.status}${m.phase ? ` · ${m.phase}` : ""}</div>
    <div class="text-xs opacity-60">${formatWhen(m.scheduledAt)}</div>
    <a class="link link-primary text-sm" href="/live-match.html?matchId=${id}">Live / details</a>
  </li>`;
}

function renderResultLine(m) {
  const a = m.teams?.[0]?.name || "?";
  const b = m.teams?.[1]?.name || "?";
  const id = m._id;
  return `<li class="py-2 border-b border-base-300 last:border-0">
    <div class="font-medium">${a} <span class="opacity-60">vs</span> ${b}</div>
    <div class="text-sm">Final <span class="font-semibold">${m.score.teamA}–${m.score.teamB}</span></div>
    <a class="link link-primary text-sm" href="/live-match.html?matchId=${id}">View match</a>
  </li>`;
}

async function load() {
  message.className = "alert alert-info";
  message.textContent = "Loading schedule…";
  message.classList.remove("hidden");

  const [upRes, finRes, tourRes] = await Promise.all([
    fetch(apiUrl("/matches/schedule/upcoming")),
    fetch(apiUrl("/matches/schedule/recent-results")),
    fetch(apiUrl("/tournaments"))
  ]);

  const upcoming = await upRes.json();
  const finished = await finRes.json();
  const tours = await tourRes.json();

  if (!upRes.ok) throw new Error(upcoming.message || "Failed to load upcoming matches");
  if (!finRes.ok) throw new Error(finished.message || "Failed to load results");
  if (!tourRes.ok) throw new Error(tours.message || "Failed to load tournaments");

  const upList = upcoming.matches || [];
  upcomingEl.innerHTML = upList.length
    ? `<ul class="list-none p-0 m-0">${upList.map(renderMatchLine).join("")}</ul>`
    : "<p class=\"opacity-70 text-sm\">No upcoming or live matches yet.</p>";

  const finList = finished.matches || [];
  resultsEl.innerHTML = finList.length
    ? `<ul class="list-none p-0 m-0">${finList.map(renderResultLine).join("")}</ul>`
    : "<p class=\"opacity-70 text-sm\">No finished matches yet.</p>";

  const tList = tours.tournaments || [];
  tournamentsEl.innerHTML = tList.length
    ? `<ul class="list-none p-0 m-0">${tList.map((t) => `<li class="py-2 border-b border-base-300 last:border-0 flex flex-wrap items-center justify-between gap-2">
        <span><span class="font-medium">${t.name}</span> <span class="text-xs opacity-60">${t.type} · ${t.status}</span></span>
        <a class="btn btn-sm btn-ghost" href="/tournament.html?tournamentId=${t.id}">Open</a>
      </li>`).join("")}</ul>`
    : "<p class=\"opacity-70 text-sm\">No tournaments yet.</p>";

  message.className = "alert alert-success hidden";
  message.textContent = "";
}

load().catch((err) => {
  message.className = "alert alert-error";
  message.textContent = err.message;
  message.classList.remove("hidden");
});
