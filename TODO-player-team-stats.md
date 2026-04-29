# Player Team List Stats Implementation

## Plan

- [x] Understand current codebase (tournament.jsx, tournaments.js, Match/Player models)
- [x] Create edit plan and get approval

## Implementation

- [ ] Step 1: Backend - Add `computePlayerStats` to `backend/src/routes/tournaments.js`
  - [ ] Populate `teams.players` and `goals.assist` in progression endpoint
  - [ ] Add `computePlayerStats(matches, teams)` function
  - [ ] Include `playerStats` in response
- [ ] Step 2: Frontend - Update `frontend/src/pages/tournament.jsx`
  - [ ] Add `playerStats` state
  - [ ] Extract `playerStats` from API response
  - [ ] Rewrite `renderPlayerTeamTable` with stats columns, remove ID
  - [ ] Update JSX call

## Testing

- [ ] Verify backend progression endpoint returns playerStats
- [ ] Verify frontend table shows correct columns
- [ ] Verify ID column is removed
- [ ] Test with tournament data
