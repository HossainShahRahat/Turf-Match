import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { RefreshCw, LogOut, Menu, LogIn } from "lucide-react";
import io from "socket.io-client";
import { apiUrl, socketBaseUrl } from "../lib/config.js";

const MainLayout = ({ children }) => {
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();
  const isAdmin = !!user;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mongoUp, setMongoUp] = useState(false);
  const [socketUp, setSocketUp] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/admin-login", { replace: true });
  };

  useEffect(() => {
    // Quick health check for backend (mongo) and socket.io
    let mounted = true;
    fetch(apiUrl("/health"))
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setMongoUp(!!d.status);
      })
      .catch(() => setMongoUp(false));

    const token = getToken();
    const socket = io(socketBaseUrl(), {
      autoConnect: false,
      reconnection: false,
    });
    if (token) socket.io.opts.auth = { token };
    const timeout = setTimeout(() => {
      socketUp || socket.close();
    }, 2000);
    socket.connect();
    socket.on("connect", () => {
      if (!mounted) return;
      setSocketUp(true);
      clearTimeout(timeout);
    });
    socket.on("connect_error", () => {
      if (!mounted) return;
      setSocketUp(false);
    });

    return () => {
      mounted = false;
      socket.close();
    };
  }, [getToken]);

  return (
    <div className="min-h-screen bg-base-200 font-sans text-base-content">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 flex-col w-64 h-screen p-6 bg-base-100/60 backdrop-blur-md border-r border-white/5">
        <div className="mb-6">
          <Link to="/" className="text-xl font-black tracking-tight uppercase">
            Turf<span className="text-primary">Match</span>
          </Link>
          <div className="text-xs opacity-60 mt-1">v2.1.0</div>
        </div>

        <nav className="flex-1 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Dashboard
          </Link>
          <Link
            to="/live-match"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-warning/10 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zM4 7a1 1 0 100 2H3a1 1 0 100-2h1zM9 11a1 1 0 100-2H7a1 1 0 100 2h2zM11 13a1 1 0 112 0v5a1 1 0 11-2 0v-5zM15 12a1 1 0 110 2h-1a1 1 0 110-2h1z" />
            </svg>
            Live Scoreboard
          </Link>
          <Link
            to="/tournament"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-success/10 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
            </svg>
            Tournaments
          </Link>
          <Link
            to="/players"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-info/10 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            Players
          </Link>
        </nav>

        {isAdmin && (
          <div className="mt-6 space-y-3">
            <div className="p-1 rounded-2xl bg-gradient-to-r from-primary to-secondary">
              <Link
                to="/admin-panel"
                className="block px-4 py-3 bg-base-100 rounded-xl font-bold text-center"
              >
                Admin Dashboard
              </Link>
            </div>
            {/* Sample Data Button - Will be controlled from admin-panel */}
            <button
              onClick={() => {
                // This will be handled by context or localStorage
                const hasSampleData =
                  localStorage.getItem("hasSampleData") === "true";
                if (hasSampleData) {
                  const adminPanel = document.querySelector(
                    "[data-sample-delete-btn]",
                  );
                  adminPanel?.click();
                } else {
                  const adminPanel = document.querySelector(
                    "[data-sample-create-btn]",
                  );
                  adminPanel?.click();
                }
              }}
              className="w-full btn btn-sm btn-outline"
              title="Create or delete sample data"
            >
              📊 Sample Data
            </button>
          </div>
        )}

        <div className="mt-auto">
          <div className="flex items-center justify-between gap-3 p-3 bg-base-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${mongoUp ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}
              ></div>
              <div className="text-xs">MongoDB</div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${socketUp ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}
              ></div>
              <div className="text-xs">Socket.io</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay when open) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed lg:hidden top-0 left-0 h-screen w-64 bg-base-100/95 backdrop-blur-md border-r border-white/5 flex flex-col p-6 transition-transform duration-300 z-40 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-black tracking-tight uppercase"
            onClick={() => setMobileOpen(false)}
          >
            Turf<span className="text-primary">Match</span>
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="close menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition"
            onClick={() => setMobileOpen(false)}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Dashboard
          </Link>
          <Link
            to="/live-match"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-warning/10 transition"
            onClick={() => setMobileOpen(false)}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zM4 7a1 1 0 100 2H3a1 1 0 100-2h1zM9 11a1 1 0 100-2H7a1 1 0 100 2h2zM11 13a1 1 0 112 0v5a1 1 0 11-2 0v-5zM15 12a1 1 0 110 2h-1a1 1 0 110-2h1z" />
            </svg>
            Live Scoreboard
          </Link>
          <Link
            to="/tournament"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-success/10 transition"
            onClick={() => setMobileOpen(false)}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
            </svg>
            Tournaments
          </Link>
          <Link
            to="/players"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-info/10 transition"
            onClick={() => setMobileOpen(false)}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            Players
          </Link>
        </nav>

        {isAdmin && (
          <div className="mt-6">
            <div className="p-1 rounded-2xl bg-gradient-to-r from-primary to-secondary">
              <Link
                to="/admin-panel"
                className="block px-4 py-3 bg-base-100 rounded-xl font-bold text-center"
                onClick={() => setMobileOpen(false)}
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <div className="flex items-center justify-between gap-3 p-3 bg-base-200 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${mongoUp ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}
              ></div>
              <span>MongoDB</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${socketUp ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}
              ></div>
              <span>Socket.io</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="fixed top-0 left-0 right-0 lg:left-64 z-30 bg-base-100/70 backdrop-blur-sm border-b border-white/5">
          <div className="px-4 py-3 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:!hidden btn btn-ghost btn-sm h-10 w-10"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link
                to="/"
                className="text-lg font-black uppercase tracking-tight"
              >
                TurfMatch Pro
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => window.location.reload()}
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <Link
                  to="/admin-login"
                  className="btn btn-primary btn-sm"
                  title="Login"
                >
                  <LogIn className="w-5 h-5" />
                  Login
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 pt-24 p-6 lg:p-10 lg:pt-24 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
