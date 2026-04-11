# Feature Completion TODO

**Approved Plan Steps:**

### 1. Admin DB sync on first login ✅ (auth.js calls syncAdminFromEnv)

- Edit backend/src/routes/auth.js → after login success, call adminSync.syncAdmin()
- Test first login creates Admin doc.

### 2. Expand admin-panel.jsx CRUD forms (matches/players/tournaments) ✅ TODO

- DaisyUI modals for create/edit.
- Players list + add form.
- Tournaments create/image.
- Matches create/fixture/goals.

### 3. Live goals Socket.IO

- matches.js POST /:id/goals emit 'match:goal'.
- live-match.jsx listen.

### 4. Player ratings post-match

- Match model ratings array.
- Endpoint rate post-match.

### 5. Transfers/player dashboard

- Expand player-dashboard.jsx transfer form.

### 6. Tournament bidding/value calc

- tournaments.js playerPrice endpoint update stats.value.

**Current progress:** Backend nodemon running, frontend Vite dev needed (`cd frontend && npm run dev`).
