import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", ".data");
mkdirSync(dataDir, { recursive: true });
const db = new Database(join(dataDir, "data.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export function getAllScores() {
  return db.prepare("SELECT id, name, score FROM persons ORDER BY score DESC, name ASC").all();
}

export function getAllPersons() {
  return db.prepare("SELECT id, name, score, created_at FROM persons ORDER BY name ASC").all();
}

export function getPersonById(id) {
  return db.prepare("SELECT id, name, score FROM persons WHERE id = ?").get(id);
}

export function createPerson(name) {
  const result = db.prepare("INSERT INTO persons (name) VALUES (?)").run(name);
  return { id: result.lastInsertRowid, name, score: 0 };
}

export function deletePerson(id) {
  return db.prepare("DELETE FROM persons WHERE id = ?").run(id);
}

export function incrementScore(id) {
  db.prepare("UPDATE persons SET score = score + 1 WHERE id = ?").run(id);
  return getPersonById(id);
}
