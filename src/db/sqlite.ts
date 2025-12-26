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
        sub_key TEXT NOT NULL,
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

    console.debug("Database migration completed.");
  }
}

export { SQLiteDB };
