require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const path         = require('path');

// Initialise DB first (creates tables + seeds admin)
require('./db');

const app = express();

/* ── Middleware ── */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ── Serve static frontend ── */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ── API Routes ── */
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/drivers',  require('./routes/drivers'));
app.use('/api/routes',   require('./routes/routes'));
app.use('/api/issues',   require('./routes/issues'));
app.use('/api/gps',      require('./routes/gps'));
app.use('/api/stats',    require('./routes/stats'));

/* ── Health check ── */
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

/* ── SPA fallback — serve index.html for all non-API routes ── */
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api'))
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  else
    res.status(404).json({ error: 'Not found' });
});

/* ── Start ── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚚 FleetXpress running on http://localhost:${PORT}`);
  console.log(`   Admin login: admin / admin1234`);
  console.log(`   Driver login: driver1 / driver123\n`);
});
