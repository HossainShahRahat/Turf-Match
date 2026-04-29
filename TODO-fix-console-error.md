# Fix Console Error: `ReferenceError: applyFinishedMatchStats is not defined`

## Root Cause

`applyFinishedMatchStats` is defined locally in `backend/src/routes/matches.js` but called in `backend/src/routes/tournaments.js` without being imported.

## Steps

- [x] Export `applyFinishedMatchStats` from `matches.js`
- [x] Import `applyFinishedMatchStats` in `tournaments.js`
- [x] Verify backend starts without error
