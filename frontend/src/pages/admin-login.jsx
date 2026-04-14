import React, { useState } from "react";
import { apiUrl } from "../lib/config.js";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(apiUrl("/auth/admin-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: credentials.email,
          password: credentials.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("adminToken", data.token);
      window.location.href = "/admin-panel";
    } catch (error) {
      setMessage(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto card bg-base-100 shadow">
      <div className="card-body">
        <h1 className="card-title text-2xl mb-6 text-center">Admin Login</h1>
        {message && <div className="alert alert-error mb-4">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label" htmlFor="admin-login-email">
              <span className="label-text">Email</span>
            </label>
            <input
              id="admin-login-email"
              name="email"
              type="email"
              autoComplete="username"
              className="input input-bordered"
              placeholder="admin@example.com"
              value={credentials.email}
              onChange={(e) =>
                setCredentials({ ...credentials, email: e.target.value })
              }
              required
            />
          </div>
          <div className="form-control mb-6">
            <label className="label" htmlFor="admin-login-password">
              <span className="label-text">Password</span>
            </label>
            <label className="input input-bordered flex items-center gap-2">
              <input
                id="admin-login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="grow"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </label>
          </div>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
