const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/page/:id', authenticateToken, (req, res) => {
  const page = db.prepare(`SELECT views, clicks, rating, rating_count, created_at FROM pages WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!page) return res.status(404).json({ error: 'Página não encontrada' });
  res.json({ analytics: page });
});

router.post('/track', (req, res) => {
  const { page_id } = req.body;
  db.prepare('UPDATE pages SET clicks = clicks + 1 WHERE id = ?').run(page_id);
  res.json({ tracked: true });
});

router.get('/user', authenticateToken, (req, res) => {
  const stats = db.prepare(`SELECT COUNT(*) as total_pages, SUM(views) as total_views, SUM(clicks) as total_clicks, AVG(rating) as avg_rating FROM pages WHERE user_id = ?`).get(req.user.id);
  res.json({ stats });
});

module.exports = router;