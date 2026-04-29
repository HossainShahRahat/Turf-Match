# Vite Cache Lock File Fix - Progress

## Tasks

- [ ] Update `.gitignore` - Add `.vite/` entry
- [ ] Update `frontend/vite.config.js` - Set cacheDir to node_modules/.vite
- [ ] Update root `package.json` - Add clean and dev:frontend scripts
- [ ] Run cleanup commands (git rm, rm -rf .vite, npm install)
- [ ] Test frontend dev server starts without RHDA error

## Plan Summary

Fix RHDA error: `package.json requires a lock file` in `.vite/deps/package.json`

### Root Cause

- `.vite/` directory not gitignored
- Vite's auto-generated package.json has no lock file
- RHDA/VS Code extension scans and complains

### Solution

1. Gitignore `.vite/` directory
2. Move Vite cache into `node_modules/.vite` (already gitignored)
3. Add clean scripts for convenience
