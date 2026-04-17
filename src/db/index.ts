import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { DDL } from "./schema";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec(DDL);
