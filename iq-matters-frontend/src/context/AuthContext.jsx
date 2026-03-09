import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

const STORAGE_KEY = "iq-matters.auth";
export const AuthContext = createContext(null);

function buildPersistedSession(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid authentication response");
  }

  if (!payload.token) {
    throw new Error("Authentication token missing from response");
  }

  if (!payload.user) {
    throw new Error("Authenticated user missing from response");
  }

  return {
    token: payload.token,
    user: payload.user,
    team: payload.team || null,
    joinedTournamentIds: Array.isArray(payload.joinedTournamentIds) ? payload.joinedTournamentIds : []
  };
}

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [joinedTournamentIds, setJoinedTournamentIds] = useState([]);

  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);

    if (!savedSession) {
      setReady(true);
      return;
    }

    try {
      const parsedSession = JSON.parse(savedSession);

      if (!parsedSession.token) {
        localStorage.removeItem(STORAGE_KEY);
        setReady(true);
        return;
      }

      setToken(parsedSession.token);
      setUser(parsedSession.user || null);
      setTeam(parsedSession.team || null);
      setJoinedTournamentIds(parsedSession.joinedTournamentIds || []);

      apiRequest("/me", { token: parsedSession.token })
        .then((session) => {
          persistSession({ token: parsedSession.token, ...session });
        })
        .catch(() => {
          clearSession();
        })
        .finally(() => {
          setReady(true);
        });
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      setReady(true);
    }
  }, []);

  function persistSession(session) {
    setToken(session.token || null);
    setUser(session.user || null);
    setTeam(session.team || null);
    setJoinedTournamentIds(session.joinedTournamentIds || []);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function clearSession() {
    setToken(null);
    setUser(null);
    setTeam(null);
    setJoinedTournamentIds([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  async function login(credentials) {
    const response = await apiRequest("/login", {
      method: "POST",
      body: {
        email: String(credentials.email || "").trim().toLowerCase(),
        password: String(credentials.password || "")
      }
    });

    const session = buildPersistedSession(response);
    persistSession(session);
    return session;
  }

  async function register(payload) {
    return apiRequest("/register", {
      method: "POST",
      body: {
        name: String(payload.name || "").trim(),
        email: String(payload.email || "").trim().toLowerCase(),
        password: String(payload.password || "")
      }
    });
  }

  async function refreshSession(activeToken = token) {
    if (!activeToken) {
      clearSession();
      return null;
    }

    const session = await apiRequest("/me", { token: activeToken });
    persistSession({ token: activeToken, ...session });
    return session;
  }

  function logout() {
    clearSession();
  }

  return (
    <AuthContext.Provider
      value={{
        ready,
        token,
        user,
        team,
        joinedTournamentIds,
        isAuthenticated: Boolean(token),
        login,
        register,
        refreshSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
