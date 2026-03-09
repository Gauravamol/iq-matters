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

async function getPlacementPointsMap(connection) {
  const [rows] = await connection.query(
    "SELECT position, points FROM points_system ORDER BY position ASC"
  );

  if (!rows.length) {
    return DEFAULT_POINTS;
  }

  return rows.reduce((map, row) => {
    map[row.position] = Number(row.points || 0);
    return map;
  }, {});
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
