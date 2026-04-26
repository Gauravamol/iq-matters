import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Coins, Crosshair, Flame, ShieldCheck, Swords, Trophy, Users, Wallet } from "lucide-react";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import TeamIdentity from "../components/TeamIdentity";
import { getIcon } from "../lib/icons";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const MotionLink = motion.create(Link);

const adminCards = [
  {
    title: "Create Tournament",
    description: "Create, edit, and remove tournaments through the admin control panel.",
    to: "/admin/tournaments",
    iconName: "tournaments"
  },
  {
    title: "Manage Teams",
    description: "Update team details, leader assignments, and team membership data.",
    to: "/admin/teams",
    iconName: "teams"
  },
  {
    title: "Manage Matches",
    description: "Schedule matches, update maps, and remove stale match records.",
    to: "/admin/matches",
    iconName: "matches"
  },
  {
    title: "Submit Results",
    description: "Correct placements and kills with full result edit and delete access.",
    to: "/admin/results",
    iconName: "results"
  },
  {
    title: "Manage Users",
    description: "Create users, update roles, and remove old platform accounts.",
    to: "/admin/users",
    iconName: "admin"
  },
  {
    title: "Leaderboard Settings",
    description: "Control feature flags and leaderboard display settings from one page.",
    to: "/admin/settings",
    iconName: "settings"
  }
];

function formatAverage(value) {
  return Number(value || 0).toFixed(2);
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function buildPrizeDistribution(tournament) {
  if (!tournament) {
    return [];
  }

  const prizePool = Number(tournament.prize_pool || 0);
  const rules = Array.isArray(tournament.points_system)
    ? tournament.points_system
        .map((rule) => ({
          position: Number(rule.position),
          points: Number(rule.points)
        }))
        .filter((rule) => Number.isFinite(rule.position) && rule.position > 0 && Number.isFinite(rule.points) && rule.points > 0)
        .sort((left, right) => left.position - right.position)
    : [];

  if (!prizePool || !rules.length) {
    return [];
  }

  const totalWeight = rules.reduce((sum, rule) => sum + rule.points, 0);

  if (!totalWeight) {
    return [];
  }

  return rules.map((rule) => {
    const share = rule.points / totalWeight;

    return {
      position: rule.position,
      weight: rule.points,
      percentage: Number((share * 100).toFixed(2)),
      amount: Math.round(prizePool * share)
    };
  });
}

function buildTeamLifecycle(profile, selectedTournamentId) {
  const history = Array.isArray(profile?.tournament_history) ? profile.tournament_history : [];
  const previousEntries = history.filter((entry) => String(entry.tournament_id) !== String(selectedTournamentId));

  if (!previousEntries.length) {
    return {
      label: "New team",
      joinedTournaments: history.length || 1,
      previousTournaments: "Tournament debut"
    };
  }

  if (previousEntries.length === 1) {
    return {
      label: "Returning team",
      joinedTournaments: history.length,
      previousTournaments: `${previousEntries[0].tournament_name} (#${previousEntries[0].rank})`
    };
  }

  return {
    label: "Experienced team",
    joinedTournaments: history.length,
    previousTournaments: previousEntries
      .slice(0, 3)
      .map((entry) => `${entry.tournament_name} (#${entry.rank})`)
      .join(" • ")
  };
}

function PlayerIdentity({ player }) {
  return <TeamIdentity name={player.player_name} logoUrl={player.logo_url} subtitle={player.team_name} />;
}

function AdminDashboard() {
  const { token } = useAuth();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [analytics, setAnalytics] = useState({
    stats: null,
    registrations: [],
    teamProfiles: {}
  });
  const [error, setError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboardOverview() {
      setError("");

      try {
        const [dashboardData, tournamentData] = await Promise.all([
          apiRequest("/admin/dashboard", { token }),
          apiRequest("/admin/tournaments", { token })
        ]);

        if (!active) {
          return;
        }

        const nextTournaments = tournamentData || [];
        setDashboardStats(dashboardData || null);
        setTournaments(nextTournaments);
        setSelectedTournamentId((current) => {
          if (current && nextTournaments.some((tournament) => String(tournament.id) === String(current))) {
            return current;
          }

          return String(nextTournaments[0]?.id || "");
        });
      } catch (requestError) {
        if (!active) {
          return;
        }

        setDashboardStats(null);
        setTournaments([]);
        setError(requestError.message);
      }
    }

    loadDashboardOverview();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;

    async function loadTournamentAnalytics() {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      try {
        const query = selectedTournamentId ? `?tournament_id=${selectedTournamentId}` : "";
        const [statsData, registrationsData] = await Promise.all([
          apiRequest(`/stats${query}`, { token }),
          selectedTournamentId
            ? apiRequest(`/admin/tournaments/${selectedTournamentId}/registrations`, { token })
            : Promise.resolve([])
        ]);

        const profileEntries = selectedTournamentId && registrationsData?.length
          ? await Promise.all(
              registrationsData.map(async (registration) => {
                try {
                  const profile = await apiRequest(`/team-profile/${registration.id}`, { token });
                  return [String(registration.id), profile];
                } catch (profileError) {
                  return [String(registration.id), null];
                }
              })
            )
          : [];

        if (!active) {
          return;
        }

        setAnalytics({
          stats: statsData || null,
          registrations: registrationsData || [],
          teamProfiles: Object.fromEntries(profileEntries)
        });
      } catch (requestError) {
        if (!active) {
          return;
        }

        setAnalytics({
          stats: null,
          registrations: [],
          teamProfiles: {}
        });
        setAnalyticsError(requestError.message);
      } finally {
        if (active) {
          setAnalyticsLoading(false);
        }
      }
    }

    loadTournamentAnalytics();

    return () => {
      active = false;
    };
  }, [selectedTournamentId, token]);

  const selectedTournament = tournaments.find((tournament) => String(tournament.id) === String(selectedTournamentId)) || null;

  const platformCards = useMemo(() => {
    if (!dashboardStats) {
      return [];
    }

    return [
      { label: "Total Teams", value: dashboardStats.total_teams, icon: Users },
      { label: "Total Tournaments", value: dashboardStats.total_tournaments ?? dashboardStats.active_tournaments, icon: Trophy },
      { label: "Total Matches", value: dashboardStats.total_matches ?? dashboardStats.matches_today, icon: Swords },
      { label: "Total Users", value: dashboardStats.total_users, icon: ShieldCheck },
      { label: "Prize Pool", value: formatCurrency(dashboardStats.total_prize_pool || 0), icon: Wallet }
    ];
  }, [dashboardStats]);

  const tournamentSummaryCards = useMemo(() => {
    const summary = analytics.stats?.summary || {};

    return [
      { label: "Tracked Teams", value: summary.total_teams ?? 0, icon: Users },
      { label: "Tracked Players", value: summary.total_players ?? 0, icon: ShieldCheck },
      { label: "Matches Logged", value: summary.total_matches ?? 0, icon: Swords },
      { label: "Kills Recorded", value: summary.total_kills ?? 0, icon: Crosshair }
    ];
  }, [analytics.stats]);

  const prizeDistribution = useMemo(() => buildPrizeDistribution(selectedTournament), [selectedTournament]);

  const teamRankMap = useMemo(() => {
    return Object.fromEntries(
      (analytics.stats?.teamStats || []).map((team, index) => [String(team.id), index + 1])
    );
  }, [analytics.stats]);

  const participationRows = useMemo(() => {
    return (analytics.registrations || []).map((registration) => {
      const profile = analytics.teamProfiles[String(registration.id)] || null;
      const lifecycle = buildTeamLifecycle(profile, selectedTournamentId);
      const currentRank = teamRankMap[String(registration.id)] || "-";

      return {
        ...registration,
        lifecycle,
        currentRank
      };
    });
  }, [analytics.registrations, analytics.teamProfiles, selectedTournamentId, teamRankMap]);

  const topTeam = analytics.stats?.topTeams?.[0] || null;
  const topFragger = analytics.stats?.topFraggers?.[0] || null;

  const tournamentOpsMetrics = selectedTournament ? [
    { label: "Prize Pool", value: formatCurrency(selectedTournament.prize_pool || 0) },
    {
      label: "Entry Fee Collection",
      value: formatCurrency(Number(selectedTournament.entry_fee || 0) * Number(selectedTournament.joined_teams || 0))
    },
    {
      label: "Approved Teams",
      value: `${Number(selectedTournament.joined_teams || 0)}/${Number(selectedTournament.max_teams || 0)}`
    },
    {
      label: "Pending Requests",
      value: Number(selectedTournament.pending_requests || 0)
    }
  ] : [];

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="dashboard"
        eyebrow="Admin Control"
        title="Admin Dashboard"
        description="Tournament-wise stats, prize planning, team history, and the core admin modules from one operational dashboard."
      />

      <AdminPanelNav />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Platform Overview</span>
            <h2>Admin Snapshot</h2>
          </div>
          <p>Review current platform activity and jump directly into the core admin modules.</p>
        </div>
        {error ? <div className="form-message form-message--error">{error}</div> : null}
        <div className="stats-grid">
          {platformCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="page-card stat-card">
              <div className="card-heading-row">
                <span className="eyebrow">{label}</span>
                <Icon className="card-icon" size={20} />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Tournament Analytics</span>
            <h2>{selectedTournament?.name ? `${selectedTournament.name} Operations` : "Tournament Stats"}</h2>
          </div>
          <div className="toolbar-row">
            <select
              className="form-input toolbar-select"
              value={selectedTournamentId}
              onChange={(event) => setSelectedTournamentId(event.target.value)}
            >
              <option value="">All tournaments</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
              ))}
            </select>
            {selectedTournament ? (
              <Link className="nav-button nav-button--ghost" to={`/tournaments/${selectedTournament.id}/points-table`}>
                Open Points Table
              </Link>
            ) : null}
            <Link className="nav-button nav-button--ghost" to="/admin/tournaments">
              Open Tournament Ops
            </Link>
          </div>
        </div>

        {analyticsError ? <div className="form-message form-message--error">{analyticsError}</div> : null}
        {analyticsLoading ? <p>Loading tournament analytics...</p> : null}

        <div className="stats-grid">
          {tournamentSummaryCards.map(({ label, value, icon: Icon }) => (
            <article key={label} className="page-card stat-card">
              <div className="card-heading-row">
                <span className="eyebrow">{label}</span>
                <Icon className="card-icon" size={20} />
              </div>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      </motion.section>

      <section className="entity-grid">
        <article className="page-card entity-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Top Team</span>
              <h3>Current Leader</h3>
            </div>
            <Trophy className="card-icon" size={24} />
          </div>
          {topTeam ? (
            <>
              <TeamIdentity name={topTeam.name} logoUrl={topTeam.logo_url} subtitle={`${topTeam.player_count} players`} />
              <p>Points: {topTeam.points}</p>
              <p>Kills: {topTeam.kills}</p>
              <p>Matches: {topTeam.matches_played}</p>
            </>
          ) : (
            <p>No team performance data available yet.</p>
          )}
        </article>

        <article className="page-card entity-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Top Fragger</span>
              <h3>Killboard Leader</h3>
            </div>
            <Flame className="card-icon" size={24} />
          </div>
          {topFragger ? (
            <>
              <PlayerIdentity player={topFragger} />
              <p>Total kills: {topFragger.kills}</p>
              <p>Average kills: {formatAverage(topFragger.average_kills)}</p>
              <p>Best match: {topFragger.best_match_kills}</p>
            </>
          ) : (
            <p>No player kill data has been entered yet.</p>
          )}
        </article>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Prize Ops</span>
            <h2>Prize Pool Planner</h2>
          </div>
          <p>Use the current points table as a payout-weight reference so distribution planning stays tied to tournament performance.</p>
        </div>

        {selectedTournament ? (
          <>
            <div className="metric-row">
              {tournamentOpsMetrics.map((metric) => (
                <div key={metric.label} className="metric-pill">
                  <Coins size={16} />
                  <span>{metric.label}: {metric.value}</span>
                </div>
              ))}
            </div>

            {prizeDistribution.length ? (
              <div className="table-wrap">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Point Weight</th>
                      <th>Share</th>
                      <th>Suggested Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizeDistribution.map((row) => (
                      <tr key={row.position} className="leaderboard-row">
                        <td>#{row.position}</td>
                        <td>{row.weight}</td>
                        <td>{row.percentage}%</td>
                        <td>{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Add prize pool and positive points rules on the tournament to generate a payout suggestion.</p>
            )}
          </>
        ) : (
          <p>Select a specific tournament to review prize pool distribution.</p>
        )}
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Team Journey</span>
            <h2>Who Played What</h2>
          </div>
          <p>See which teams are new, which are returning, and which other tournaments they have already played before this event.</p>
        </div>

        {selectedTournament ? (
          participationRows.length ? (
            <div className="table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Lifecycle</th>
                    <th>Tournaments Played</th>
                    <th>Previous Tournaments</th>
                    <th>Current Tournament</th>
                  </tr>
                </thead>
                <tbody>
                  {participationRows.map((registration) => (
                    <tr key={registration.id} className="leaderboard-row">
                      <td>
                        <TeamIdentity
                          name={registration.name}
                          logoUrl={registration.logo_url}
                          subtitle={registration.leader_name || "Unassigned leader"}
                        />
                      </td>
                      <td>
                        <div>{registration.lifecycle.label}</div>
                        <div className="table-subcopy">
                          {registration.disqualified ? (registration.disqualification_reason || "Disqualified") : "Eligible"}
                        </div>
                      </td>
                      <td>{registration.lifecycle.joinedTournaments}</td>
                      <td>{registration.lifecycle.previousTournaments}</td>
                      <td>
                        <div>Rank: {registration.currentRank}</div>
                        <div className="table-subcopy">
                          {registration.matches_played} matches • {registration.tournament_kills} kills • {registration.tournament_points} pts
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No approved teams have been registered for this tournament yet.</p>
          )
        ) : (
          <p>Select a specific tournament to review team history and participation.</p>
        )}
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Team Standings</span>
            <h3>Points Table</h3>
          </div>
          <p>Same tournament-wise team stats that users see, now available directly in the admin dashboard.</p>
        </div>
        {analytics.stats?.teamStats?.length ? (
          <div className="table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Players</th>
                  <th>Matches</th>
                  <th>Kills</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {analytics.stats.teamStats.map((team) => (
                  <tr key={team.id} className="leaderboard-row">
                    <td><TeamIdentity name={team.name} logoUrl={team.logo_url} /></td>
                    <td>{team.player_count}</td>
                    <td>{team.matches_played}</td>
                    <td>{team.kills}</td>
                    <td>{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No team stats available yet.</p>
        )}
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Player Killboard</span>
            <h3>Top Fraggers</h3>
          </div>
          <p>Player standings are built from the same per-match kill breakdown used on the user-facing stats page.</p>
        </div>
        {analytics.stats?.playerStats?.length ? (
          <div className="table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Matches</th>
                  <th>Kills</th>
                  <th>Avg Kills</th>
                  <th>Best Match</th>
                </tr>
              </thead>
              <tbody>
                {analytics.stats.playerStats.map((player) => (
                  <tr key={player.id} className="leaderboard-row">
                    <td><PlayerIdentity player={player} /></td>
                    <td>{player.matches_played}</td>
                    <td>{player.kills}</td>
                    <td>{formatAverage(player.average_kills)}</td>
                    <td>{player.best_match_kills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No player stats available yet.</p>
        )}
      </section>

      <section className="dashboard-grid">
        {adminCards.map((card) => {
          const Icon = getIcon(card.iconName);

          return (
            <MotionLink key={card.to} to={card.to} className="page-card dashboard-card" {...cardMotionProps}>
              <div className="card-heading-row">
                <span className="dashboard-card__eyebrow">Admin Module</span>
                <Icon className="card-icon" size={22} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <span className="dashboard-card__cta">Open module</span>
            </MotionLink>
          );
        })}
      </section>
    </PageWrapper>
  );
}

export default AdminDashboard;
