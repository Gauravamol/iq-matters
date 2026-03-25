const env = require("../config/env");

async function hasColumn(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ? AND column_name = ?
      LIMIT 1
    `,
    [env.db.database, tableName, columnName]
  );

  return rows.length > 0;
}

async function bootstrapDatabase(pool) {
  const connection = await pool.getConnection();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        page_name VARCHAR(50) NOT NULL,
        media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
        url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_media_assets_page_created (page_name, created_at)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS platform_features (
        feature_key VARCHAR(80) NOT NULL PRIMARY KEY,
        label VARCHAR(120) NOT NULL,
        description VARCHAR(255) NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS match_teams (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        match_id INT NOT NULL,
        team_id INT NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_match_team (match_id, team_id)
      )
    `);

    await connection.query(
      `
        INSERT INTO platform_features (feature_key, label, description, enabled)
        VALUES
          ('ui_animations', 'UI Animations', 'Enable page motion, hover transitions, and row animations.', 1),
          ('video_sections', 'Video Sections', 'Show official esports video panels on Home and Tournaments.', 1),
          ('external_api_integration', 'External API Integration', 'Show external esports match, team, and tournament data.', 1),
          ('leaderboard_background', 'Leaderboard Background', 'Allow the leaderboard background image setting to render.', 1),
          ('media_sections', 'Media Sections', 'Render hero banners and managed page media assets.', 1),
          ('esports_resources', 'Esports Resources', 'Show curated esports resource links on the platform.', 1)
        ON DUPLICATE KEY UPDATE
          label = VALUES(label),
          description = VALUES(description)
      `
    );

    if (!(await hasColumn(connection, "matches", "scheduled_at"))) {
      await connection.query("ALTER TABLE matches ADD COLUMN scheduled_at DATETIME NULL AFTER map_name");
    }

    const [settingsRows] = await connection.query("SELECT id FROM leaderboard_settings LIMIT 1");

    if (settingsRows.length === 0) {
      await connection.query("INSERT INTO leaderboard_settings (bg_image) VALUES (NULL)");
    }

    if (env.adminBootstrapEmail) {
      await connection.query(
        "UPDATE users SET role = 'admin' WHERE email = ?",
        [env.adminBootstrapEmail]
      );
    }
  } finally {
    connection.release();
  }
}

module.exports = {
  bootstrapDatabase
};
