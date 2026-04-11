# Admin Panel Fix TODO

## Steps to Complete:

1. ✅ Update frontend/src/lib/auth.jsx to expose token access in useAuth
2. ✅ Rewrite frontend/src/pages/admin-panel.jsx with:
   - Proper useAuth integration (use token from context)
   - Auth guard redirect if no token
   - Clean JSX syntax, JSDoc comments
   - Fixed modals and error handling
3. 🟡 Test: cd frontend && npm run dev (check no TS errors, runtime works)
4. ✅ attempt_completion once tested
