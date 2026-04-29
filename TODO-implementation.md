# Implementation TODO - Bidding Feature + Homepage Padding

## Tasks

### Backend

- [x] 1. Update `backend/src/models/Tournament.js` - Add `hasBidding` and `totalMoneyPerTeam` fields
- [x] 2. Update `backend/src/routes/tournaments.js` - Handle bidding fields in POST, accept `playerPrices` array, update player stats

### Frontend

- [ ] 3. Update `frontend/src/pages/home.jsx` - Add responsive padding to root container
- [ ] 4. Update `frontend/src/pages/admin-panel.jsx` - Add bidding UI to Step 1, new Step 4 for player pricing + team assignment, update submit logic

## Testing

- [ ] 5. Test tournament creation without bidding (3 steps)
- [ ] 6. Test tournament creation with bidding (4 steps, prices + team assignments)
- [ ] 7. Verify homepage padding on mobile/desktop
