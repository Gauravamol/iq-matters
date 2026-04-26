async function syncCompetitionState(connection) {
  await connection.query("DELETE FROM match_results");

  await connection.query(
    `
      INSERT INTO match_results (tournament_id, team_id, placement, kills, points)
      SELECT matches.tournament_id, results.team_id, results.position, results.kills, results.points
      FROM results
      JOIN matches ON matches.id = results.match_id
      LEFT JOIN tournament_teams
        ON tournament_teams.tournament_id = matches.tournament_id
        AND tournament_teams.team_id = results.team_id
      WHERE COALESCE(tournament_teams.disqualified, 0) = 0
    `
  );

  await connection.query("DELETE FROM tournament_team_stats");

  await connection.query(
    `
      INSERT INTO tournament_team_stats (tournament_id, team_id, matches_played, total_kills, total_points)
      SELECT
        registrations.tournament_id,
        registrations.team_id,
        COUNT(match_results.id) AS matches_played,
        COALESCE(SUM(match_results.kills), 0) AS total_kills,
        COALESCE(SUM(match_results.points), 0) AS total_points
      FROM (
        SELECT DISTINCT tournament_id, team_id
        FROM tournament_teams
        WHERE COALESCE(disqualified, 0) = 0
      ) registrations
      LEFT JOIN match_results
        ON match_results.tournament_id = registrations.tournament_id
        AND match_results.team_id = registrations.team_id
      GROUP BY registrations.tournament_id, registrations.team_id
    `
  );

  await connection.query(
    "UPDATE teams SET total_points = 0, total_kills = 0, matches_played = 0"
  );

  await connection.query(
    `
      UPDATE teams
      LEFT JOIN (
        SELECT
          team_id,
          COALESCE(SUM(total_points), 0) AS total_points,
          COALESCE(SUM(total_kills), 0) AS total_kills,
          COALESCE(SUM(matches_played), 0) AS matches_played
        FROM tournament_team_stats
        GROUP BY team_id
      ) aggregates ON aggregates.team_id = teams.id
      SET
        teams.total_points = COALESCE(aggregates.total_points, 0),
        teams.total_kills = COALESCE(aggregates.total_kills, 0),
        teams.matches_played = COALESCE(aggregates.matches_played, 0)
    `
  );

  await connection.query(
    `
      UPDATE matches
      LEFT JOIN (
        SELECT match_id, COUNT(*) AS result_count
        FROM results
        GROUP BY match_id
      ) result_totals ON result_totals.match_id = matches.id
      LEFT JOIN (
        SELECT match_id, COUNT(*) AS assigned_count
        FROM match_teams
        GROUP BY match_id
      ) assignment_totals ON assignment_totals.match_id = matches.id
      SET matches.status = CASE
        WHEN COALESCE(result_totals.result_count, 0) > 0
          AND (
            COALESCE(assignment_totals.assigned_count, 0) = 0
            OR COALESCE(result_totals.result_count, 0) >= COALESCE(assignment_totals.assigned_count, 0)
          )
        THEN 'completed'
        ELSE 'pending'
      END
    `
  );
}

module.exports = {
  syncCompetitionState
};
