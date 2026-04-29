# QC Fixes TODO

## Phase 1: Critical Bug Fixes

- [ ] Fix 1: Wrap `getToken` in `useCallback` in `frontend/src/lib/auth.jsx`
- [ ] Fix 2: Refactor socket useEffect in `frontend/src/pages/live-match.jsx` to avoid reconnection on match updates
- [ ] Fix 3: Add `setTimeout` cleanup in `frontend/src/pages/live-match.jsx`
- [ ] Fix 4: Fix `getToken` dependency causing health check re-runs in `frontend/src/components/MainLayout.jsx`

## Phase 2: Code Cleanup & Medium Bug Fixes

- [ ] Fix 5: Replace `<a href>` with `<Link to>` in `frontend/src/pages/home.jsx`
- [ ] Fix 6: Add `AbortController` to API calls in `frontend/src/pages/home.jsx`
- [ ] Fix 7: Remove incorrect DaisyUI CSS import from `frontend/src/main.jsx`
- [ ] Fix 8: Delete old duplicate `.js` files from `frontend/src/pages/`

## Phase 3: Optimizations

- [ ] Fix 9: Use stable IDs for React keys in `frontend/src/pages/live-match.jsx`
- [ ] Fix 10: Remove console.log/error statements from frontend and backend source files
- [ ] Fix 11: Add periodic pulse message rotation in `frontend/src/pages/home.jsx`

## Phase 4: Verification & Startup

- [ ] Fix 12: Build frontend with zero errors (`npm run build`)
- [ ] Fix 13: Start backend dev server
- [ ] Fix 14: Start frontend dev server
- [ ] Fix 15: Verify live match socket stability and navigation
