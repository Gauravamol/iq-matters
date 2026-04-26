import React, { lazy, Suspense } from "react";
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CreateTeam = lazy(() => import("./pages/CreateTeam"));
const TeamDashboard = lazy(() => import("./pages/TeamDashboard"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentRegistration = lazy(() => import("./pages/TournamentRegistration"));
const TournamentPointsTable = lazy(() => import("./pages/TournamentPointsTable"));
const Matches = lazy(() => import("./pages/Matches"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Stats = lazy(() => import("./pages/Stats"));
const AdminResults = lazy(() => import("./pages/AdminResults"));
const AdminTournaments = lazy(() => import("./pages/AdminTournaments"));
const AdminTeams = lazy(() => import("./pages/AdminTeams"));
const AdminMatches = lazy(() => import("./pages/AdminMatches"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminMedia = lazy(() => import("./pages/AdminMedia"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));

function RouteLoader() {
  return (
    <div className="route-loader" role="status" aria-live="polite">
      Loading
    </div>
  );
}

function App() {
  const Router = typeof window !== "undefined" && window.location.protocol === "file:" ? HashRouter : BrowserRouter;

  return (
    <Router>
      <div className="app-shell">
        <Navbar />
        <main className="page-frame">
          <Suspense fallback={<RouteLoader />}>
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
              <Route
                path="/tournaments/:id/register"
                element={(
                  <ProtectedRoute>
                    <TournamentRegistration />
                  </ProtectedRoute>
                )}
              />
              <Route path="/tournaments/:id/points-table" element={<TournamentPointsTable />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/stats" element={<Stats />} />
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
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
