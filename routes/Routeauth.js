const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate, SECRET } = require('../middleware/auth');

/* POST /api/auth/login */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    SECRET,
    { expiresIn: '8h' }
  );

  // HTTP-only cookie (safe) + also return token for JS use
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  });

  // Log activity
  db.prepare(`INSERT INTO activity_log (action, entity, detail, user_id)
              VALUES ('login', 'user', ?, ?)`).run(`${user.name} logged in`, user.id);

  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

/* POST /api/auth/logout */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

/* GET /api/auth/me */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
