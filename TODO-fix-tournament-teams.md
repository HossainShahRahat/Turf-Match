# Fix Tournament Teams Disappearing Issue

## Root Cause

- `teams` field uses `mongoose.Schema.Types.Mixed` → Mongoose doesn't track nested changes
- `PATCH /:tournamentId/teams` route missing `tournament.markModified('teams')` before save

## Steps

- [x] 1. Identify root cause (Mixed schema type + missing markModified)
- [x] 2. Fix Tournament model - replace Mixed with proper subdocument schema
- [x] 3. Fix PATCH /teams route - add markModified('teams')
- [x] 4. Fix player ID normalization in normalizeTournamentTeams
- [x] 5. Add debug logging
- [x] 6. Verify fixes - code reviewed, no frontend changes needed

## Files to Edit

1. `backend/src/models/Tournament.js`
2. `backend/src/routes/tournaments.js`
