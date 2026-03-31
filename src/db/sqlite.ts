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
        monthly_limit_bytes INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;
    this.db.run(createUserTable);

    const userColumns = this.db
      .query("PRAGMA table_info(users)")
      .all() as { name: string }[];
    const hasMonthlyLimitBytes = userColumns.some(
      (column) => column.name === "monthly_limit_bytes",
    );
    if (!hasMonthlyLimitBytes) {
      this.db.run("ALTER TABLE users ADD COLUMN monthly_limit_bytes INTEGER;");
    }

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

    const createTrafficUsageMonthlyTable = `
      CREATE TABLE IF NOT EXISTS traffic_usage_monthly (
        user_id TEXT NOT NULL,
        month_key TEXT NOT NULL,
        uplink_bytes INTEGER NOT NULL DEFAULT 0,
        downlink_bytes INTEGER NOT NULL DEFAULT 0,
        unclassified_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, month_key),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `;
    this.db.run(createTrafficUsageMonthlyTable);

    const createTrafficSourceStateTable = `
      CREATE TABLE IF NOT EXISTS traffic_source_state (
        source_type TEXT NOT NULL,
        source_key TEXT NOT NULL,
        metric TEXT NOT NULL,
        user_id TEXT NOT NULL,
        last_value INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (source_type, source_key, metric),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `;
    this.db.run(createTrafficSourceStateTable);

    const createTrafficRuntimeBlocksTable = `
      CREATE TABLE IF NOT EXISTS traffic_runtime_blocks (
        user_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        blocked INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL DEFAULT 'traffic_limit',
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, node_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
      );
    `;
    this.db.run(createTrafficRuntimeBlocksTable);

    console.debug("Database migration completed.");
  }
}

export { SQLiteDB };
