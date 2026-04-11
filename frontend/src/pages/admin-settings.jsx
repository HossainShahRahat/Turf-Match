import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/auth.jsx";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../lib/config.js";
import {
  Database,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
} from "lucide-react";

/** Admin Settings & Data Reset Page */
export default function AdminSettings() {
  const { getToken, user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [stats, setStats] = useState({
    players: 0,
    tournaments: 0,
    matches: 0,
  });
  const [resetting, setResetting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!getToken() || !user) {
      navigate("/admin-login");
    }
  }, [getToken, user, navigate]);

  const fetchWithAuth = async (url, options = {}) => {
    const token = getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(apiUrl(url), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      logout();
      navigate("/admin-login");
      throw new Error("Session expired");
    }

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Request failed");
    }

    return response.json();
  };

  const loadStats = async () => {
    try {
      const data = await fetchWithAuth("/stats/admin/stats");
      setStats(data);
    } catch (error) {
      console.error("Stats error:", error);
    }
  };

  const handleFullReset = async () => {
    if (
      !window.confirm(
        "⚠️ Are you SURE? This will DELETE ALL data: players, tournaments, matches. Cannot be undone.",
      )
    ) {
      return;
    }

    setResetting(true);
    try {
      await fetchWithAuth("/stats/admin/reset-all", { method: "DELETE" });
      setMessage("✅ ALL DATA RESET. Database is now empty.");
      setMessageType("success");
      await loadStats();
    } catch (error) {
      setMessage(`❌ Reset failed: ${error.message}`);
      setMessageType("error");
    } finally {
      setResetting(false);
    }
  };

  const handleAdminSync = async () => {
    setSyncing(true);
    try {
      const data = await fetchWithAuth("/stats/admin/sync-env", { method: "POST" });
      setMessage(`✅ Admin synced: ${data.message}`);
      setMessageType("success");
    } catch (error) {
      setMessage(`❌ Sync failed: ${error.message}`);
      setMessageType("error");
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateSampleData = async () => {
    try {
      await fetchWithAuth("/stats/admin/sample-data", { method: "POST" });
      setMessage("✅ Sample data generated!");
      setMessageType("success");
      await loadStats();
    } catch (error) {
      setMessage(`❌ Sample data failed: ${error.message}`);
      setMessageType("error");
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Server className="w-8" />
            Admin Settings
          </h1>
          <p className="text-lg opacity-70 mt-1">
            Database management & reset tools
          </p>
        </div>
        <div className="text-right">
          <Link to="/admin-panel" className="btn btn-ghost btn-lg">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stats shadow bg-base-100 border border-primary/20">
          <div className="stat place-items-center">
            <div className="stat-title">Players</div>
            <div className="stat-value text-primary">{stats.players}</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-warning/20">
          <div className="stat place-items-center">
            <div className="stat-title">Tournaments</div>
            <div className="stat-value text-warning">{stats.tournaments}</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-success/20">
          <div className="stat place-items-center">
            <div className="stat-title">Matches</div>
            <div className="stat-value text-success">{stats.matches}</div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert alert-${messageType} shadow-lg`}>
          <span>{message}</span>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card bg-base-100 border-t-4 border-error shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 text-error" />
            <h2 className="text-2xl font-black">⚠️ Danger Zone</h2>
          </div>
          <div className="space-y-4">
            <div className="alert alert-warning shadow-lg">
              <div>
                <span>
                  <strong>RESET ALL DATA</strong> will permanently delete
                  players, tournaments, and matches from MongoDB.
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                className="btn btn-error btn-lg flex-1"
                onClick={handleFullReset}
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5" />
                    Reset All Data
                  </>
                )}
              </button>
              <button
                className="btn btn-success btn-lg flex-1"
                onClick={handleGenerateSampleData}
                disabled={loading}
              >
                <RefreshCw className="w-5" />
                Generate Sample
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Sync */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            <Database className="w-6" />
            Admin Sync (Env → DB)
          </h2>
          <p className="opacity-70 mb-4">
            Syncs .env ADMIN credentials with MongoDB admin record.
          </p>
          <div className="flex gap-3">
            <button
              className="btn btn-info flex-1"
              onClick={handleAdminSync}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5" />
                  Sync Admin
                </>
              )}
            </button>
            <button className="btn btn-ghost" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card bg-base-100/50 backdrop-blur p-6">
          <div className="card-title justify-start gap-2">
            <CheckCircle className="w-5 text-success" />
            Export Data
          </div>
          <p className="opacity-70 mb-4 text-sm">Download JSON backup</p>
          <button className="btn btn-outline btn-sm">Download Backup</button>
        </div>
        <div className="card bg-base-100/50 backdrop-blur p-6">
          <div className="card-title justify-start gap-2">
            <RefreshCw className="w-5" />
            Cache Refresh
          </div>
          <p className="opacity-70 mb-4 text-sm">Clear Redis/memcache</p>
          <button className="btn btn-outline btn-sm">Refresh Cache</button>
        </div>
        <div className="card bg-base-100/50 backdrop-blur p-6">
          <div className="card-title justify-start gap-2">
            <Server className="w-5" />
            System Health
          </div>
          <p className="opacity-70 mb-4 text-sm">MongoDB, Redis, Socket.io</p>
          <div className="flex gap-2">
            <span className="badge badge-success badge-sm">MongoDB</span>
            <span className="badge badge-success badge-sm">Socket.io</span>
          </div>
        </div>
      </div>
    </div>
  );
}
