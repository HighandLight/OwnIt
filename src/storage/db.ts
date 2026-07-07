import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { applySchema } from "./schema.js";

export const OWNIT_DIR = join(homedir(), ".ownit");
export const OWNIT_DB_PATH = join(OWNIT_DIR, "ownit.db");

export function openDb(dbPath: string = OWNIT_DB_PATH): Database.Database {
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  applySchema(db);
  return db;
}
