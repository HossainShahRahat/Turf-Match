# Live Match Features Implementation TODO

## Backend Schema Changes

- [x] 1. Update `backend/src/models/Match.js` - Add `assist` to goalSchema, add timer fields

- [x] 2. Update `backend/src/models/Player.js` - Add `assists`, `yellowCards`, `redCards` to stats

## Backend Route Changes

- [x] 3. Update `backend/src/routes/matches.js` - Add cancel match endpoint

- [x] 4. Update `backend/src/routes/matches.js` - Add edit goal endpoint

- [x] 5. Update `backend/src/routes/matches.js` - Add edit card endpoint

- [x] 6. Update `backend/src/routes/matches.js` - Add timer start/pause endpoints

- [x] 7. Update `backend/src/routes/matches.js` - Update goal endpoint to support assist

- [x] 8. Update `backend/src/routes/matches.js` - Update `applyFinishedMatchStats` for assists/cards

- [x] 9. Update `backend/src/routes/players.js` - Update `buildPlayerProfile` for assists

## Frontend Changes

- [x] 10. Update `frontend/src/pages/home.jsx` - Fix badge padding in "How to use" section

- [x] 11. Update `frontend/src/pages/players.jsx` - Convert inline details to modal

- [x] 12. Update `frontend/src/pages/player-profile.jsx` - Show assists, yellow/red cards

- [x] 13. Update `frontend/src/pages/live-match.jsx` - Add timer display and controls

- [x] 14. Update `frontend/src/pages/live-match.jsx` - Add assist selection in goal modal

- [x] 15. Update `frontend/src/pages/live-match.jsx` - Add edit mode for goals/cards

- [x] 16. Update `frontend/src/pages/live-match.jsx` - Auto-calculate minute from timer

- [x] 17. Update `frontend/src/pages/live-match.jsx` - Unified events timeline with vertical line

- [x] 18. Update `frontend/src/pages/live-match.jsx` - Overtime handling

## Testing

- [ ] 19. Test match timer start/pause/end
- [ ] 20. Test goal with assist
- [ ] 21. Test card editing
- [ ] 22. Test match cancel/reset
- [ ] 23. Test player modal on players page
- [ ] 24. Test player profile shows assists
