import { Database } from "bun:sqlite";
import { type DB } from "./index";

class SQLiteDB implements DB {
  private db: Database;

  constructor() {
    this.db = this.createConnection();
    this.migrate();
  }

  createConnection(): Database {
    const db = new Database("mydb.sqlite", { create: true, strict: true });
    db.run("PRAGMA journal_mode = WAL;PRAGMA foreign_keys = ON;");
    return db;
  }

  migrate() {
    const createUserTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL UNIQUE,
        sub_key TEXT NOT NULL UNIQUE,
        status INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;
    this.db.run(createUserTable);

    const createUserSecretsTable = `
      CREATE TABLE IF NOT EXISTS user_secrets (
        user_id TEXT PRIMARY KEY NOT NULL,
        hysteria2 TEXT NOT NULL,
        vless TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `;
    this.db.run(createUserSecretsTable);

    const createNodeTable = `
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL UNIQUE,
        host TEXT NOT NULL,
        port TEXT NOT NULL,
        type TEXT NOT NULL,
        advanced TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;
    this.db.run(createNodeTable);

    const createUserNodesTable = `
      CREATE TABLE IF NOT EXISTS user_nodes (
        user_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        PRIMARY KEY (user_id, node_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
      );
    `;
    this.db.run(createUserNodesTable);

    const createTrafficReportsTable = `
      CREATE TABLE IF NOT EXISTS traffic_reports (
        id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
        report_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (report_id, node_id),
        FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
      );
    `;
    this.db.run(createTrafficReportsTable);

    const createUserTrafficDailyTable = `
      CREATE TABLE IF NOT EXISTS user_traffic_daily (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        bytes_up INTEGER NOT NULL DEFAULT 0,
        bytes_down INTEGER NOT NULL DEFAULT 0,
        total_bytes INTEGER NOT NULL DEFAULT 0,
        event_count INTEGER NOT NULL DEFAULT 0,
        last_seen_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, date),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `;
    this.db.run(createUserTrafficDailyTable);

    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_user_traffic_daily_date ON user_traffic_daily (date)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_user_traffic_daily_last_seen_at ON user_traffic_daily (last_seen_at)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_traffic_reports_node_occurred_at ON traffic_reports (node_id, occurred_at)",
    );

    const createTrafficStatsTable = `
      CREATE TABLE IF NOT EXISTS traffic_stats (
        date_key TEXT NOT NULL,
        metric TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT '',
        node_id TEXT NOT NULL DEFAULT '',
        count INTEGER NOT NULL DEFAULT 0,
        last_access_at TEXT,
        PRIMARY KEY (date_key, metric, user_id, node_id)
      );
    `;
    this.db.run(createTrafficStatsTable);

    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_traffic_stats_metric_date ON traffic_stats (metric, date_key)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_traffic_stats_user_metric ON traffic_stats (user_id, metric)",
    );
    this.db.run(
      "CREATE INDEX IF NOT EXISTS idx_traffic_stats_node_metric ON traffic_stats (node_id, metric)",
    );

    console.debug("Database migration completed.");
  }
}

export { SQLiteDB };
