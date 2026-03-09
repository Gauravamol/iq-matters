async function syncCompetitionState(connection) {
  await connection.query("DELETE FROM match_results");

  await connection.query(
    `
      INSERT INTO match_results (tournament_id, team_id, placement, kills, points)
      SELECT matches.tournament_id, results.team_id, results.position, results.kills, results.points
      FROM results
      JOIN matches ON matches.id = results.match_id
    `
  );

  await connection.query(
    "UPDATE teams SET total_points = 0, total_kills = 0, matches_played = 0"
  );

  await connection.query(
    `
      UPDATE teams
      JOIN (
        SELECT
          team_id,
          COALESCE(SUM(points), 0) AS total_points,
          COALESCE(SUM(kills), 0) AS total_kills,
          COUNT(*) AS matches_played
        FROM match_results
        GROUP BY team_id
      ) aggregates ON aggregates.team_id = teams.id
      SET
        teams.total_points = aggregates.total_points,
        teams.total_kills = aggregates.total_kills,
        teams.matches_played = aggregates.matches_played
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
