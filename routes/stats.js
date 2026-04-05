const router = require('express').Router();
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

/* GET /api/stats — dashboard summary */
router.get('/', authenticate, (req, res) => {
  const vehicles  = db.prepare('SELECT COUNT(*) as c FROM vehicles').get().c;
  const drivers   = db.prepare('SELECT COUNT(*) as c FROM drivers').get().c;
  const routes    = db.prepare('SELECT COUNT(*) as c FROM routes').get().c;
  const issues    = db.prepare("SELECT COUNT(*) as c FROM issues WHERE status = 'open'").get().c;

  const activeV   = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'active'").get().c;
  const idleV     = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'idle'").get().c;
  const offlineV  = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'offline'").get().c;

  const activity  = db.prepare(`
    SELECT l.*, u.name AS user_name
    FROM activity_log l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.created_at DESC LIMIT 15
  `).all();

  res.json({
    counts: { vehicles, drivers, routes, issues },
    fleet:  { active: activeV, idle: idleV, offline: offlineV },
    activity
  });
});

module.exports = router;
