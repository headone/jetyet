import { Database } from "bun:sqlite";
import { SQLiteDB } from "./sqlite";

interface DB {
  createConnection: () => Database;
}

function getConnection(type: "sqlite"): Database {
  if (type === "sqlite") {
    return new SQLiteDB().createConnection();
  }

  throw new Error(`Unsupported database type: ${type}`);
}

const db = getConnection("sqlite");

export { type DB, db, getConnection };
