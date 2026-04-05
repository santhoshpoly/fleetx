const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

/* POST /api/gps — driver posts their vehicle position */
router.post('/', authenticate, (req, res) => {
  const { vehicle_id, latitude, longitude, speed = 0 } = req.body;
  if (!vehicle_id || latitude == null || longitude == null)
    return res.status(400).json({ error: 'vehicle_id, latitude and longitude required' });

  const v = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });

  db.prepare(`
    INSERT INTO gps_positions (vehicle_id, latitude, longitude, speed)
    VALUES (?, ?, ?, ?)
  `).run(vehicle_id, latitude, longitude, speed);

  res.json({ ok: true });
});

/* GET /api/gps/latest — latest position per vehicle */
router.get('/latest', authenticate, (req, res) => {
  const positions = db.prepare(`
    SELECT g.vehicle_id, g.latitude, g.longitude, g.speed, g.recorded_at,
           v.number AS vehicle_number, v.type AS vehicle_type, v.status AS vehicle_status
    FROM gps_positions g
    JOIN vehicles v ON v.id = g.vehicle_id
    WHERE g.id IN (
      SELECT MAX(id) FROM gps_positions GROUP BY vehicle_id
    )
    ORDER BY g.recorded_at DESC
  `).all();
  res.json(positions);
});

/* GET /api/gps/history/:vehicleId — last 50 positions for a vehicle */
router.get('/history/:vehicleId', authenticate, (req, res) => {
  const positions = db.prepare(`
    SELECT * FROM gps_positions
    WHERE vehicle_id = ?
    ORDER BY recorded_at DESC
    LIMIT 50
  `).all(req.params.vehicleId);
  res.json(positions);
});

module.exports = router;
