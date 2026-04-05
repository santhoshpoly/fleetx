const router = require('express').Router();
const db     = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/* GET /api/routes */
router.get('/', authenticate, (req, res) => {
  const routes = db.prepare(`
    SELECT r.*, d.name AS driver_name
    FROM routes r
    LEFT JOIN drivers d ON d.id = r.driver_id
    ORDER BY r.created_at DESC
  `).all();
  res.json(routes);
});

/* GET /api/routes/:id */
router.get('/:id', authenticate, (req, res) => {
  const r = db.prepare(`
    SELECT r.*, d.name AS driver_name FROM routes r
    LEFT JOIN drivers d ON d.id = r.driver_id WHERE r.id = ?
  `).get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Route not found' });
  res.json(r);
});

/* POST /api/routes */
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { start_loc, end_loc, distance, driver_id, status = 'active' } = req.body;
  if (!start_loc || !end_loc)
    return res.status(400).json({ error: 'Start and end locations required' });

  const result = db.prepare(`
    INSERT INTO routes (start_loc, end_loc, distance, driver_id, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(start_loc, end_loc, distance || null, driver_id || null, status);

  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('add', 'route', ?, ?)`).run(`Route ${start_loc} → ${end_loc} added`, req.user.id);

  const route = db.prepare(`
    SELECT r.*, d.name AS driver_name FROM routes r
    LEFT JOIN drivers d ON d.id = r.driver_id WHERE r.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(route);
});

/* PATCH /api/routes/:id */
router.patch('/:id', authenticate, requireAdmin, (req, res) => {
  const { start_loc, end_loc, distance, driver_id, status } = req.body;
  const r = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Route not found' });

  const newDriverId = driver_id === null ? null :
                      driver_id !== undefined ? driver_id : r.driver_id;

  db.prepare(`
    UPDATE routes SET
      start_loc = COALESCE(?, start_loc),
      end_loc   = COALESCE(?, end_loc),
      distance  = COALESCE(?, distance),
      driver_id = ?,
      status    = COALESCE(?, status)
    WHERE id = ?
  `).run(start_loc||null, end_loc||null, distance??null, newDriverId, status||null, req.params.id);

  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('update', 'route', ?, ?)`).run(`Route ${r.start_loc}→${r.end_loc} updated`, req.user.id);

  res.json(db.prepare(`
    SELECT r.*, d.name AS driver_name FROM routes r
    LEFT JOIN drivers d ON d.id = r.driver_id WHERE r.id = ?
  `).get(req.params.id));
});

/* DELETE /api/routes/:id */
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const r = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Route not found' });

  db.prepare('DELETE FROM routes WHERE id = ?').run(req.params.id);
  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('delete', 'route', ?, ?)`).run(`Route ${r.start_loc}→${r.end_loc} removed`, req.user.id);

  res.json({ message: 'Route deleted' });
});

module.exports = router;
