const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// ============================================
// CRIAR PÁGINA
// ============================================
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, bio, theme, accent_color, links } = req.body;
    const user = db.prepare('SELECT free_uses, is_premium FROM users WHERE id = ?').get(req.user.id);
    
    if (!user.is_premium && user.free_uses <= 0) {
      return res.status(403).json({ error: 'Usos gratuitos esgotados! Faça upgrade!' });
    }
    
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const result = db.prepare(`INSERT INTO pages (user_id, name, bio, theme, accent_color, links, slug) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.user.id, name, bio, theme, accent_color, JSON.stringify(links), slug);
    
    if (!user.is_premium) db.prepare('UPDATE users SET free_uses = free_uses - 1 WHERE id = ?').run(req.user.id);
    
    res.status(201).json({ message: 'Página criada!', page: { id: result.lastInsertRowid, slug, url: `/p/${slug}` } });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar página', contact: 'contatobiolink.ai@gmail.com' });
  }
});

// ============================================
// LISTAR PÁGINAS
// ============================================
router.get('/', authenticateToken, (req, res) => {
  const pages = db.prepare('SELECT * FROM pages WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ pages });
});

// ============================================
// PÁGINA PÚBLICA
// ============================================
router.get('/public/:slug', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Página não encontrada' });
  db.prepare('UPDATE pages SET views = views + 1 WHERE slug = ?').run(req.params.slug);
  res.json({ page: { ...page, links: JSON.parse(page.links) } });
});

// ============================================
// ATUALIZAR PÁGINA
// ============================================
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, bio, theme, accent_color, links } = req.body;
    db.prepare(`UPDATE pages SET name = ?, bio = ?, theme = ?, accent_color = ?, links = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(name, bio, theme, accent_color, JSON.stringify(links), req.params.id, req.user.id);
    res.json({ message: 'Página atualizada!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar', contact: 'contatobiolink.ai@gmail.com' });
  }
});

// ============================================
// DELETAR PÁGINA
// ============================================
router.delete('/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM pages WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Página deletada!' });
});

// ============================================
// AVALIAR PÁGINA ESPECÍFICA
// ============================================
router.post('/:id/rate', authenticateToken, (req, res) => {
  try {
    const { rating, comment } = req.body;
    db.prepare(`INSERT INTO reviews (user_id, page_id, rating, comment) VALUES (?, ?, ?, ?)`).run(req.user.id, req.params.id, rating, comment || null);
    
    const avg = db.prepare(`SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE page_id = ?`).get(req.params.id);
    db.prepare('UPDATE pages SET rating = ?, rating_count = ? WHERE id = ?').run(avg.avg, avg.count, req.params.id);
    
    res.json({ message: 'Avaliação enviada!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao avaliar', contact: 'contatobiolink.ai@gmail.com' });
  }
});

// ============================================
// ⭐ AVALIAÇÃO GERAL DO SITE/APP (NOVO!)
// ============================================
router.post('/review', authenticateToken, (req, res) => {
  try {
    const { rating, text, email } = req.body;
    
    if (!rating || !text) {
      return res.status(400).json({ error: 'Avaliação e texto obrigatórios' });
    }
    
    // Salvar no banco (page_id = NULL é avaliação geral do site)
    db.prepare(`
      INSERT INTO reviews (user_id, page_id, rating, comment, created_at)
      VALUES (?, NULL, ?, ?, CURRENT_TIMESTAMP)
    `).run(req.user.id, rating, text);
    
    res.json({ message: 'Avaliação enviada com sucesso! Obrigado! 🎉' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar avaliação', contact: 'contatobiolink.ai@gmail.com' });
  }
});

// ============================================
// LISTAR AVALIAÇÕES GERAIS
// ============================================
router.get('/reviews', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.rating, r.comment, r.created_at, u.email, u.is_premium
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.page_id IS NULL
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all();
    
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter avaliações', contact: 'contatobiolink.ai@gmail.com' });
  }
});

// ============================================
// EXPORTAR
// ============================================
module.exports = router;