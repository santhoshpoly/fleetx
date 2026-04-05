const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

/* ═══════════════════════════════════════════
   DATABASE CONNECTION
═══════════════════════════════════════════ */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/* ═══════════════════════════════════════════
   INIT DATABASE
═══════════════════════════════════════════ */
async function initDB() {
  try {
    /* ── USERS ── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'driver',
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ── VEHICLES ── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        number TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        capacity INTEGER,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ── DRIVERS ── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        license TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ── ROUTES ── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        start_loc TEXT NOT NULL,
        end_loc TEXT NOT NULL,
        distance REAL,
        driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ── ISSUES ── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ── ACTIVITY LOG ── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        entity TEXT,
        detail TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ── GPS ── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_positions (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        speed REAL DEFAULT 0,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ═══════════════════════════════════════════
       SEED USERS (ONLY IF EMPTY)
    ═══════════════════════════════════════════ */
    const result = await pool.query(`SELECT COUNT(*) FROM users`);
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      const adminHash = await bcrypt.hash('admin1234', 10);
      const driverHash = await bcrypt.hash('driver123', 10);

      await pool.query(
        `INSERT INTO users (username, password, role, name)
         VALUES ($1, $2, 'admin', 'Administrator')`,
        ['admin', adminHash]
      );

      await pool.query(
        `INSERT INTO users (username, password, role, name)
         VALUES ($1, $2, 'driver', 'Demo Driver')`,
        ['driver1', driverHash]
      );

      console.log("✅ Default users created");
      console.log("   admin / admin1234");
      console.log("   driver1 / driver123");
    }

    console.log("✅ PostgreSQL Database Ready");
  } catch (err) {
    console.error("❌ DB INIT ERROR:", err);
  }
}

/* RUN INIT */
initDB();

module.exports = pool;
