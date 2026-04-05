const router = require('express').Router();
const db     = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/* GET /api/issues */
router.get('/', authenticate, (req, res) => {
  const issues = db.prepare(`
    SELECT i.*, v.number AS vehicle_number, u.name AS reporter_name
    FROM issues i
    LEFT JOIN vehicles v ON v.id = i.vehicle_id
    LEFT JOIN users    u ON u.id = i.reported_by
    ORDER BY i.created_at DESC
  `).all();
  res.json(issues);
});

/* POST /api/issues */
router.post('/', authenticate, (req, res) => {
  const { type, vehicle_id, description } = req.body;
  if (!type || !description)
    return res.status(400).json({ error: 'Type and description required' });

  const result = db.prepare(`
    INSERT INTO issues (type, vehicle_id, description, reported_by, status)
    VALUES (?, ?, ?, ?, 'open')
  `).run(type, vehicle_id || null, description, req.user.id);

  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('add', 'issue', ?, ?)`).run(`Issue reported: ${type}`, req.user.id);

  const issue = db.prepare(`
    SELECT i.*, v.number AS vehicle_number, u.name AS reporter_name
    FROM issues i
    LEFT JOIN vehicles v ON v.id = i.vehicle_id
    LEFT JOIN users    u ON u.id = i.reported_by
    WHERE i.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(issue);
});

/* PATCH /api/issues/:id/resolve — admin only */
router.patch('/:id/resolve', authenticate, requireAdmin, (req, res) => {
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  db.prepare(`UPDATE issues SET status = 'resolved' WHERE id = ?`).run(req.params.id);
  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('update', 'issue', ?, ?)`).run(`Issue #${req.params.id} resolved`, req.user.id);

  res.json({ message: 'Issue resolved' });
});

/* DELETE /api/issues/:id — admin only */
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  db.prepare('DELETE FROM issues WHERE id = ?').run(req.params.id);
  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('delete', 'issue', ?, ?)`).run(`Issue #${req.params.id} deleted`, req.user.id);

  res.json({ message: 'Issue deleted' });
});

module.exports = router;
