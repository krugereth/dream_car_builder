const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "garage.db");

const db = new sqlite3.Database(dbPath);

function initDatabase() {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
      CREATE TABLE IF NOT EXISTS builds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        build_name TEXT NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER,
        goal TEXT,
        budget REAL,
        notes TEXT,
        created_at TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS modifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        build_id INTEGER NOT NULL,
        part_name TEXT NOT NULL,
        category TEXT NOT NULL,
        brand TEXT,
        cost REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Planned',
        notes TEXT,
        created_at TEXT NOT NULL,

        FOREIGN KEY (build_id)
          REFERENCES builds(id)
          ON DELETE CASCADE
      )
    `);
  });
}

module.exports = {
  db,
  initDatabase,
};