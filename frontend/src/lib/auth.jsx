import { createContext, useCallback, useContext, useEffect, useState } from "react";


const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(() => localStorage.getItem("adminToken"), []);

  const checkAuth = useCallback(() => {

    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (typeof payload?.exp === "number" && payload.exp <= nowInSeconds) {
          localStorage.removeItem("adminToken");
          setUser(null);
          return;
        }
        setUser(payload);
      } catch {
        localStorage.removeItem("adminToken");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [getToken]);

  useEffect(() => {
    checkAuth();
    setLoading(false);
  }, [checkAuth]);

  const logout = useCallback(() => {

    localStorage.removeItem("adminToken");
    setUser(null);
  }, []);


  return (
    <AuthContext.Provider
      value={{ user, logout, loading, getToken, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
