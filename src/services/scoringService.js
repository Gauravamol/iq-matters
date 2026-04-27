const DEFAULT_POINTS = {
  1: 15,
  2: 12,
  3: 10,
  4: 8,
  5: 6,
  6: 4,
  7: 2,
  8: 1
};

function normalizePointsSystem(pointsSystem) {
  if (!Array.isArray(pointsSystem) || !pointsSystem.length) {
    return null;
  }

  const normalizedRules = pointsSystem
    .map((rule) => ({
      position: Number(rule?.position),
      points: Number(rule?.points)
    }))
    .filter((rule) => Number.isFinite(rule.position) && rule.position > 0 && Number.isFinite(rule.points) && rule.points >= 0);

  if (!normalizedRules.length) {
    return null;
  }

  return normalizedRules.reduce((map, rule) => {
    map[rule.position] = rule.points;
    return map;
  }, {});
}

async function getPlacementPointsMap(connection, tournamentId = null) {
  if (tournamentId) {
    const [tournamentRows] = await connection.query(
      "SELECT points_system_json FROM tournaments WHERE id = ? LIMIT 1",
      [Number(tournamentId)]
    );
    const rawPointsSystem = tournamentRows[0]?.points_system_json;

    if (rawPointsSystem) {
      try {
        const parsedPointsSystem = JSON.parse(rawPointsSystem);
        const normalizedPointsSystem = normalizePointsSystem(parsedPointsSystem);

        if (normalizedPointsSystem) {
          return normalizedPointsSystem;
        }
      } catch (error) {
        // Fall back to the global points system when tournament-specific JSON is invalid.
      }
    }
  }

  const [rows] = await connection.query(
    "SELECT position, points FROM points_system ORDER BY position ASC"
  );

  if (!rows.length) {
    return DEFAULT_POINTS;
  }

  return normalizePointsSystem(rows) || DEFAULT_POINTS;
}

function calculateMatchPoints({ placement, kills }, placementPointsMap) {
  const normalizedPlacement = Number(placement);
  const normalizedKills = Number(kills);
  const placementPoints = placementPointsMap[normalizedPlacement] || 0;

  return placementPoints + normalizedKills;
}

module.exports = {
  DEFAULT_POINTS,
  getPlacementPointsMap,
  calculateMatchPoints
};
