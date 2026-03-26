const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/proofs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/upload-proof', authenticateToken, upload.single('proof'), (req, res) => {
  try {
    const { plan_type, amount, installments, affiliate_code } = req.body;
    
    if (!plan_type || !amount || !req.file) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    const proofPath = `/uploads/proofs/${req.file.filename}`;
    const result = db.prepare(`INSERT INTO payments (user_id, plan_type, amount, installments, proof_image, status, recipient, approved_at) VALUES (?, ?, ?, ?, ?, 'approved', 'Ana Paula da Silva Sarto', CURRENT_TIMESTAMP)`).run(req.user.id, plan_type, parseFloat(amount), installments || 1, proofPath);
    
    const months = plan_type === 'annual' ? 13 : 1;
    db.prepare(`UPDATE users SET is_premium = 1, premium_plan = ?, premium_expires_at = datetime('now', '+' || ? || ' months'), free_uses = 999 WHERE id = ?`).run(plan_type, months, req.user.id);
    
    if (affiliate_code) {
      const referrer = db.prepare('SELECT id FROM users WHERE affiliate_code = ?').get(affiliate_code);
      if (referrer) {
        const commission = plan_type === 'annual' ? 10 : 5;
        db.prepare(`INSERT INTO affiliates (user_id, referred_user_id, commission, status) VALUES (?, ?, ?, 'pending')`).run(referrer.id, req.user.id, commission);
        db.prepare('UPDATE users SET affiliate_earnings = affiliate_earnings + ? WHERE id = ?').run(commission, referrer.id);
      }
    }
    
    console.log(`✅ PREMIUM ATIVADO! User: ${req.user.id}, Plano: ${plan_type}`);
    console.log(`📧 Contato: contatobiolink.ai@gmail.com (apenas dúvidas e coisas importantes)`);
    console.log(`💬 Comprovante: enviado NO CHAT!`);
    
    res.json({
      message: '✅ Comprovante recebido! Premium ativado automaticamente!',
      payment_id: result.lastInsertRowid,
      premium_activated: true,
      recipient: 'Ana Paula da Silva Sarto',
      devs: 'Gabriel da Silva Sarto & Miguel de Bastos Oliveira',
      contact: 'contatobiolink.ai@gmail.com (apenas dúvidas e coisas importantes)',
      plan_type,
      expires_in_months: months
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar', contact: 'contatobiolink.ai@gmail.com' });
  }
});

router.get('/status', authenticateToken, (req, res) => {
  try {
    const payments = db.prepare(`SELECT id, plan_type, amount, installments, status, created_at, approved_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`).all(req.user.id);
    const user = db.prepare('SELECT is_premium, premium_plan, premium_expires_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ payments, premium: { is_premium: !!user.is_premium, plan: user.premium_plan, expires: user.premium_expires_at } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

router.get('/all', authenticateToken, isAdmin, (req, res) => {
  try {
    const payments = db.prepare(`SELECT p.*, u.email, u.name FROM payments p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`).all();
    const stats = db.prepare(`SELECT COUNT(*) as total, SUM(amount) as total_value, SUM(CASE WHEN plan_type = 'monthly' THEN 1 ELSE 0 END) as monthly, SUM(CASE WHEN plan_type = 'annual' THEN 1 ELSE 0 END) as annual FROM payments`).get();
    res.json({ payments, stats });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter dados' });
  }
});

router.post('/reverse/:userId', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare(`UPDATE users SET is_premium = 0, premium_plan = NULL, premium_expires_at = NULL, free_uses = 0 WHERE id = ?`).run(req.params.userId);
    res.json({ message: 'Premium revertido!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reverter' });
  }
});

module.exports = router;