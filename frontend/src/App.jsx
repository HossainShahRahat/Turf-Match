import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import Home from "./pages/home.jsx";
import Tournament from "./pages/tournament.jsx";
import LiveMatch from "./pages/live-match.jsx";
import MatchResult from "./pages/match-result.jsx";
import Players from "./pages/players.jsx";
import PlayerProfile from "./pages/player-profile.jsx";
import PlayerDashboard from "./pages/player-dashboard.jsx";
import AdminLogin from "./pages/admin-login.jsx";
import AdminPanel from "./pages/admin-panel.jsx";
import AdminSettings from "./pages/admin-settings.jsx";
import MainLayout from "./components/MainLayout.jsx";

// Removed old navbar - using MainLayout now

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  return user ? children : <Navigate to="/admin-login" replace />;
}

function LoginGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  return user ? <Navigate to="/admin-panel" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournament" element={<Tournament />} />
            <Route path="/live-match" element={<LiveMatch />} />
            <Route path="/match/:id" element={<MatchResult />} />
            <Route path="/players" element={<Players />} />
            <Route path="/player-profile" element={<PlayerProfile />} />
            <Route path="/player-dashboard" element={<PlayerDashboard />} />
            <Route
              path="/admin-login"
              element={
                <LoginGuard>
                  <AdminLogin />
                </LoginGuard>
              }
            />
            <Route
              path="/admin-panel"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-settings"
              element={
                <ProtectedRoute>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Home />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}
