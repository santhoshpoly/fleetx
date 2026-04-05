const router = require('express').Router();
const db     = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/* GET /api/drivers */
router.get('/', authenticate, (req, res) => {
  const drivers = db.prepare(`
    SELECT d.*, v.number AS vehicle_number, v.type AS vehicle_type
    FROM drivers d
    LEFT JOIN vehicles v ON v.id = d.vehicle_id
    ORDER BY d.created_at DESC
  `).all();
  res.json(drivers);
});

/* GET /api/drivers/:id */
router.get('/:id', authenticate, (req, res) => {
  const d = db.prepare(`
    SELECT d.*, v.number AS vehicle_number
    FROM drivers d LEFT JOIN vehicles v ON v.id = d.vehicle_id
    WHERE d.id = ?
  `).get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Driver not found' });
  res.json(d);
});

/* POST /api/drivers */
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, license, phone, vehicle_id } = req.body;
  if (!name || !license || !phone)
    return res.status(400).json({ error: 'Name, license and phone required' });

  const existing = db.prepare('SELECT id FROM drivers WHERE license = ?').get(license);
  if (existing) return res.status(409).json({ error: 'License number already exists' });

  if (vehicle_id) {
    const v = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(vehicle_id);
    if (!v) return res.status(400).json({ error: 'Vehicle not found' });
  }

  const result = db.prepare(`
    INSERT INTO drivers (name, license, phone, vehicle_id)
    VALUES (?, ?, ?, ?)
  `).run(name, license, phone, vehicle_id || null);

  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('add', 'driver', ?, ?)`).run(`Driver ${name} added`, req.user.id);

  const driver = db.prepare(`
    SELECT d.*, v.number AS vehicle_number FROM drivers d
    LEFT JOIN vehicles v ON v.id = d.vehicle_id WHERE d.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(driver);
});

/* PATCH /api/drivers/:id */
router.patch('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, license, phone, vehicle_id } = req.body;
  const d = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Driver not found' });

  // vehicle_id can be null (unassign) or a valid id
  const newVehicleId = vehicle_id === null ? null :
                       vehicle_id !== undefined ? vehicle_id : d.vehicle_id;

  db.prepare(`
    UPDATE drivers SET
      name       = COALESCE(?, name),
      license    = COALESCE(?, license),
      phone      = COALESCE(?, phone),
      vehicle_id = ?
    WHERE id = ?
  `).run(name || null, license || null, phone || null, newVehicleId, req.params.id);

  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('update', 'driver', ?, ?)`).run(`Driver ${d.name} updated`, req.user.id);

  res.json(db.prepare(`
    SELECT d.*, v.number AS vehicle_number FROM drivers d
    LEFT JOIN vehicles v ON v.id = d.vehicle_id WHERE d.id = ?
  `).get(req.params.id));
});

/* DELETE /api/drivers/:id */
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const d = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Driver not found' });

  db.prepare('DELETE FROM drivers WHERE id = ?').run(req.params.id);
  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('delete', 'driver', ?, ?)`).run(`Driver ${d.name} removed`, req.user.id);

  res.json({ message: 'Driver deleted' });
});

module.exports = router;
