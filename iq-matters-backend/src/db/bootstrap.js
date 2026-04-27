const env = require("../config/env");

const baseTableStatements = [
  `
    CREATE TABLE IF NOT EXISTS admin_requests (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      message TEXT,
      status ENUM('pending','approved','rejected') DEFAULT 'pending'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) DEFAULT NULL,
      email VARCHAR(100) DEFAULT NULL,
      password VARCHAR(255) DEFAULT NULL,
      role ENUM('admin','user') DEFAULT 'user',
      team_id INT DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS teams (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) DEFAULT NULL,
      logo_url VARCHAR(255) DEFAULT NULL,
      leader_id INT DEFAULT NULL,
      total_points INT DEFAULT 0,
      total_kills INT DEFAULT 0,
      matches_played INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS players (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      team_id INT DEFAULT NULL,
      player_name VARCHAR(100) DEFAULT NULL,
      player_uid VARCHAR(100) DEFAULT NULL,
      logo_url VARCHAR(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS tournaments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) DEFAULT NULL,
      date DATETIME DEFAULT NULL,
      entry_fee INT DEFAULT NULL,
      prize_pool INT DEFAULT NULL,
      max_teams INT DEFAULT NULL,
      min_players INT NOT NULL DEFAULT 1,
      max_players_per_team INT NOT NULL DEFAULT 4,
      show_contact_email_field TINYINT(1) NOT NULL DEFAULT 1,
      show_contact_discord_field TINYINT(1) NOT NULL DEFAULT 0,
      show_contact_phone_field TINYINT(1) NOT NULL DEFAULT 0,
      allow_team_logo TINYINT(1) NOT NULL DEFAULT 1,
      allow_player_logo TINYINT(1) NOT NULL DEFAULT 1,
      require_admin_approval TINYINT(1) NOT NULL DEFAULT 1,
      points_system_json LONGTEXT,
      status ENUM('upcoming','live','completed') DEFAULT 'upcoming'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS tournament_teams (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tournament_id INT DEFAULT NULL,
      team_id INT DEFAULT NULL,
      disqualified TINYINT(1) NOT NULL DEFAULT 0,
      disqualification_reason VARCHAR(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS matches (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tournament_id INT DEFAULT NULL,
      match_number INT DEFAULT NULL,
      status ENUM('pending','completed') DEFAULT 'pending',
      map_name VARCHAR(50) DEFAULT NULL,
      scheduled_at DATETIME DEFAULT NULL,
      created_at INT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS match_teams (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      match_id INT NOT NULL,
      team_id INT NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_match_team (match_id, team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS results (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      match_id INT DEFAULT NULL,
      team_id INT DEFAULT NULL,
      position INT DEFAULT NULL,
      kills INT DEFAULT NULL,
      points INT DEFAULT NULL,
      report_notes TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS match_results (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tournament_id INT DEFAULT NULL,
      team_id INT DEFAULT NULL,
      placement INT DEFAULT NULL,
      kills INT DEFAULT NULL,
      points INT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS tournament_team_stats (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tournament_id INT DEFAULT NULL,
      team_id INT DEFAULT NULL,
      matches_played INT DEFAULT 0,
      total_kills INT DEFAULT 0,
      total_points INT DEFAULT 0,
      KEY idx_tournament_team_stats_tournament (tournament_id),
      KEY idx_tournament_team_stats_team (team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS points_system (
      position INT NOT NULL PRIMARY KEY,
      points INT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS leaderboard_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      bg_image VARCHAR(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `,
  `
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      kind VARCHAR(80) NOT NULL DEFAULT 'misc',
      stored_name VARCHAR(180) NOT NULL,
      original_name VARCHAR(180) NOT NULL,
      mime_type VARCHAR(120) NOT NULL,
      size INT UNSIGNED NOT NULL,
      content LONGBLOB NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_uploaded_files_kind_created (kind, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `
];

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


async function hasTable(connection, tableName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
      LIMIT 1
    `,
    [env.db.database, tableName]
  );

  return rows.length > 0;
}

async function bootstrapDatabase(pool) {
  const connection = await pool.getConnection();

  try {
    await ensureBaseSchema(connection);

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
      CREATE TABLE IF NOT EXISTS player_match_stats (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        result_id INT NOT NULL,
        match_id INT NOT NULL,
        team_id INT NOT NULL,
        player_id INT NOT NULL,
        kills INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_player_match_stats_result_player (result_id, player_id),
        KEY idx_player_match_stats_result (result_id),
        KEY idx_player_match_stats_match (match_id),
        KEY idx_player_match_stats_team (team_id),
        KEY idx_player_match_stats_player (player_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tournament_registration_requests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tournament_id INT NOT NULL,
        submitted_by_user_id INT NOT NULL,
        submitted_team_id INT NULL,
        approved_team_id INT NULL,
        team_name VARCHAR(120) NOT NULL,
        team_logo_url VARCHAR(255) NULL,
        player_count INT NOT NULL DEFAULT 0,
        players_json LONGTEXT NULL,
        contact_email VARCHAR(255) NULL,
        contact_discord VARCHAR(120) NULL,
        contact_phone VARCHAR(64) NULL,
        status ENUM('pending', 'approved', 'declined') NOT NULL DEFAULT 'pending',
        decision_reason VARCHAR(255) NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL DEFAULT NULL,
        KEY idx_registration_requests_tournament (tournament_id),
        KEY idx_registration_requests_submitter (submitted_by_user_id),
        KEY idx_registration_requests_team (submitted_team_id),
        KEY idx_registration_requests_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tournament_team_stats (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tournament_id INT DEFAULT NULL,
        team_id INT DEFAULT NULL,
        matches_played INT DEFAULT 0,
        total_kills INT DEFAULT 0,
        total_points INT DEFAULT 0,
        KEY idx_tournament_team_stats_tournament (tournament_id),
        KEY idx_tournament_team_stats_team (team_id)
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

    if (await hasTable(connection, "matches") && !(await hasColumn(connection, "matches", "scheduled_at"))) {
      await connection.query("ALTER TABLE matches ADD COLUMN scheduled_at DATETIME NULL AFTER map_name");
    }

    if (await hasTable(connection, "teams") && !(await hasColumn(connection, "teams", "logo_url"))) {
      await connection.query("ALTER TABLE teams ADD COLUMN logo_url VARCHAR(255) NULL AFTER name");
    }

    if (await hasTable(connection, "players") && !(await hasColumn(connection, "players", "logo_url"))) {
      await connection.query("ALTER TABLE players ADD COLUMN logo_url VARCHAR(255) NULL AFTER player_uid");
    }

    if (await hasTable(connection, "tournament_teams") && !(await hasColumn(connection, "tournament_teams", "disqualified"))) {
      await connection.query("ALTER TABLE tournament_teams ADD COLUMN disqualified TINYINT(1) NOT NULL DEFAULT 0 AFTER team_id");
    }

    if (await hasTable(connection, "tournament_teams") && !(await hasColumn(connection, "tournament_teams", "disqualification_reason"))) {
      await connection.query("ALTER TABLE tournament_teams ADD COLUMN disqualification_reason VARCHAR(255) NULL AFTER disqualified");
    }

    if (await hasTable(connection, "results") && !(await hasColumn(connection, "results", "report_notes"))) {
      await connection.query("ALTER TABLE results ADD COLUMN report_notes TEXT NULL AFTER points");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "min_players"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN min_players INT NOT NULL DEFAULT 1 AFTER max_teams");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "max_players_per_team"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN max_players_per_team INT NOT NULL DEFAULT 4 AFTER min_players");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "show_contact_email_field"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN show_contact_email_field TINYINT(1) NOT NULL DEFAULT 1 AFTER max_players_per_team");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "show_contact_discord_field"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN show_contact_discord_field TINYINT(1) NOT NULL DEFAULT 0 AFTER show_contact_email_field");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "show_contact_phone_field"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN show_contact_phone_field TINYINT(1) NOT NULL DEFAULT 0 AFTER show_contact_discord_field");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "allow_team_logo"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN allow_team_logo TINYINT(1) NOT NULL DEFAULT 1 AFTER show_contact_phone_field");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "allow_player_logo"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN allow_player_logo TINYINT(1) NOT NULL DEFAULT 1 AFTER allow_team_logo");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "require_admin_approval"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN require_admin_approval TINYINT(1) NOT NULL DEFAULT 1 AFTER allow_player_logo");
    }

    if (await hasTable(connection, "tournaments") && !(await hasColumn(connection, "tournaments", "points_system_json"))) {
      await connection.query("ALTER TABLE tournaments ADD COLUMN points_system_json LONGTEXT NULL AFTER require_admin_approval");
    }

    const [settingsRows] = await connection.query("SELECT id FROM leaderboard_settings LIMIT 1");

    if (settingsRows.length === 0) {
      await connection.query("INSERT INTO leaderboard_settings (bg_image) VALUES (NULL)");
    }


    const requiredSyncTables = [
      "match_results",
      "results",
      "matches",
      "tournament_teams",
      "teams",
      "tournament_team_stats",
      "match_teams"
    ];
    const requiredTableChecks = await Promise.all(
      requiredSyncTables.map((tableName) => hasTable(connection, tableName))
    );

    if (requiredTableChecks.every(Boolean)) {
      const { syncCompetitionState } = require("../services/competitionStateService");
      await syncCompetitionState(connection);
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
