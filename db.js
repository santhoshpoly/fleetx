const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

// Store DB in /data on Render (persistent disk) or local ./data
const dataDir = process.env.RENDER ? '/data' : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'fleetxpress.db'));

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ═══════════════════════════════════════════
   SCHEMA
═══════════════════════════════════════════ */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'driver',  -- 'admin' | 'driver'
    name       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    number     TEXT    NOT NULL UNIQUE,
    type       TEXT    NOT NULL,
    capacity   INTEGER,
    status     TEXT    NOT NULL DEFAULT 'active',  -- active | idle | offline
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    license    TEXT    NOT NULL UNIQUE,
    phone      TEXT    NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    user_id    INTEGER REFERENCES users(id)    ON DELETE SET NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS routes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    start_loc  TEXT    NOT NULL,
    end_loc    TEXT    NOT NULL,
    distance   REAL,
    driver_id  INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    status     TEXT    NOT NULL DEFAULT 'active',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS issues (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL,
    vehicle_id  INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    description TEXT    NOT NULL,
    reported_by INTEGER REFERENCES users(id)    ON DELETE SET NULL,
    status      TEXT    NOT NULL DEFAULT 'open', -- open | resolved
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT    NOT NULL,
    entity     TEXT,
    detail     TEXT,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gps_positions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    latitude    REAL    NOT NULL,
    longitude   REAL    NOT NULL,
    speed       REAL    DEFAULT 0,
    recorded_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

/* ═══════════════════════════════════════════
   SEED DEFAULT ADMIN (only if users table empty)
═══════════════════════════════════════════ */
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const hash = bcrypt.hashSync('admin1234', 10);
  db.prepare(`INSERT INTO users (username, password, role, name)
              VALUES (?, ?, 'admin', 'Administrator')`).run('admin', hash);

  // Seed a driver user
  const dHash = bcrypt.hashSync('driver123', 10);
  db.prepare(`INSERT INTO users (username, password, role, name)
              VALUES (?, ?, 'driver', 'Demo Driver')`).run('driver1', dHash);

  console.log('[DB] Default users seeded — admin:admin1234 | driver1:driver123');
}

module.exports = db;
