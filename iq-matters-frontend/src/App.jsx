import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CreateTeam from "./pages/CreateTeam";
import TeamDashboard from "./pages/TeamDashboard";
import Tournaments from "./pages/Tournaments";
import Matches from "./pages/Matches";
import Leaderboard from "./pages/Leaderboard";
import AdminResults from "./pages/AdminResults";
import AdminTournaments from "./pages/AdminTournaments";
import AdminTeams from "./pages/AdminTeams";
import AdminMatches from "./pages/AdminMatches";
import AdminUsers from "./pages/AdminUsers";
import AdminMedia from "./pages/AdminMedia";
import AdminSettings from "./pages/AdminSettings";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="page-frame">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={(
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/create-team"
              element={(
                <ProtectedRoute>
                  <CreateTeam />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/team-dashboard"
              element={(
                <ProtectedRoute>
                  <TeamDashboard />
                </ProtectedRoute>
              )}
            />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route
              path="/admin/dashboard"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/tournaments"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminTournaments />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/teams"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminTeams />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/matches"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminMatches />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/results"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminResults />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/users"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminUsers />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/media"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminMedia />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/settings"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminSettings />
                </ProtectedRoute>
              )}
            />
            <Route path="/admin-results" element={<Navigate to="/admin/results" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
