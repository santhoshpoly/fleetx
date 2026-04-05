const router = require('express').Router();
const db     = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/* GET /api/vehicles */
router.get('/', authenticate, (req, res) => {
  const vehicles = db.prepare(`
    SELECT v.*, d.name AS driver_name
    FROM vehicles v
    LEFT JOIN drivers d ON d.vehicle_id = v.id
    ORDER BY v.created_at DESC
  `).all();
  res.json(vehicles);
});

/* GET /api/vehicles/:id */
router.get('/:id', authenticate, (req, res) => {
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(v);
});

/* POST /api/vehicles */
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { number, type, capacity, status = 'active' } = req.body;
  if (!number || !type) return res.status(400).json({ error: 'Number and type required' });

  const existing = db.prepare('SELECT id FROM vehicles WHERE number = ?').get(number);
  if (existing) return res.status(409).json({ error: 'Vehicle number already exists' });

  const result = db.prepare(`
    INSERT INTO vehicles (number, type, capacity, status)
    VALUES (?, ?, ?, ?)
  `).run(number, type, capacity || null, status);

  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('add', 'vehicle', ?, ?)`).run(`Vehicle ${number} (${type}) added`, req.user.id);

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(vehicle);
});

/* PATCH /api/vehicles/:id */
router.patch('/:id', authenticate, requireAdmin, (req, res) => {
  const { number, type, capacity, status } = req.body;
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });

  db.prepare(`
    UPDATE vehicles SET
      number   = COALESCE(?, number),
      type     = COALESCE(?, type),
      capacity = COALESCE(?, capacity),
      status   = COALESCE(?, status)
    WHERE id = ?
  `).run(number || null, type || null, capacity ?? null, status || null, req.params.id);

  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('update', 'vehicle', ?, ?)`).run(`Vehicle ${v.number} updated`, req.user.id);

  res.json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id));
});

/* DELETE /api/vehicles/:id */
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const v = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });

  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('delete', 'vehicle', ?, ?)`).run(`Vehicle ${v.number} removed`, req.user.id);

  res.json({ message: 'Vehicle deleted' });
});

module.exports = router;
