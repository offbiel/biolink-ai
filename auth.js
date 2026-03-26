const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

const checkPremium = (req, res, next) => {
  const user = db.prepare('SELECT is_premium, premium_expires_at FROM users WHERE id = ?').get(req.user.id);
  
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  
  if (user.premium_expires_at) {
    const expiresAt = new Date(user.premium_expires_at);
    if (expiresAt < new Date()) {
      db.prepare('UPDATE users SET is_premium = 0 WHERE id = ?').run(req.user.id);
      return res.status(403).json({ error: 'Premium expirado' });
    }
  }
  
  if (user.is_premium) return next();
  res.status(403).json({ error: 'Acesso premium necessário' });
};

const isAdmin = (req, res, next) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
  
  if (user && adminEmails.includes(user.email)) return next();
  res.status(403).json({ error: 'Acesso restrito a administradores' });
};

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    if (!requests.has(userId)) requests.set(userId, []);
    const userRequests = requests.get(userId).filter(time => now - time < windowMs);
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Muitas requisições' });
    }
    userRequests.push(now);
    requests.set(userId, userRequests);
    next();
  };
};

module.exports = { authenticateToken, checkPremium, isAdmin, rateLimit };