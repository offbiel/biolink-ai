const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem obrigatória' });
    
    const sessionId = session_id || `sess_${Date.now()}_${req.user.id}`;
    db.prepare(`INSERT INTO chat_messages (user_id, session_id, role, content) VALUES (?, ?, 'user', ?)`).run(req.user.id, sessionId, message);
    
    const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(req.user.id);
    let aiResponse = user?.is_premium ? generateGPT4Response(message) : generateFallback(message);
    
    db.prepare(`INSERT INTO chat_messages (user_id, session_id, role, content) VALUES (?, ?, 'assistant', ?)`).run(req.user.id, sessionId, aiResponse);
    
    res.json({ response: aiResponse, session_id: sessionId, model: user?.is_premium ? 'GPT-4' : 'Fallback' });
  } catch (err) {
    res.status(500).json({ error: 'Erro no chat' });
  }
});

function generateGPT4Response(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('comprovante') || lower.includes('pagamento')) {
    return `📤 **Para enviar comprovante:**\n\n1. Após pagar, clique no 📎\n2. Selecione a imagem\n3. Envie!\n\n✅ **Destinatário:** Ana Paula da Silva Sarto\n⚡ **Aprovação automática!**\n\n📧 **Email é apenas para dúvidas e coisas importantes:** contatobiolink.ai@gmail.com`;
  }
  if (lower.includes('plano') || lower.includes('preço')) {
    return `💰 **Planos:**\n\n🔹 Mensal: R$ 19,90 (2x R$ 9,95) - 60% OFF\n🌟 Anual: R$ 99,99 (12x R$ 8,33) - 29% OFF\n\n✅ 7 dias de garantia!\n📧 contatobiolink.ai@gmail.com (apenas dúvidas)`;
  }
  if (lower.includes('afiliado')) {
    return `👥 **Afiliados:** Ganhe R$ 5-10 por indicação! Acesse seu dashboard. 📧 contatobiolink.ai@gmail.com`;
  }
  if (lower.includes('instagram')) {
    return `📸 **Instagrams:**\n• Site: @biolink.ai\n• Gabriel: @off_bielzinkkj\n• Miguel: @dnn.bastos\n• Miguel: @dnbergii`;
  }
  return `Entendi! 🤖 Sou a IA do Biolink.ai!\n\nPosso ajudar com:\n• 📚 Criar página\n• 💰 Planos\n• 📤 Comprovante\n• 👥 Afiliados\n\n📧 Email é apenas para dúvidas e coisas importantes: contatobiolink.ai@gmail.com`;
}

function generateFallback(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('comprovante') || lower.includes('pagamento')) {
    return `📤 **Para enviar comprovante:**\n\n1. Após pagar, clique no 📎\n2. Selecione a imagem\n3. Envie!\n\n✅ **Destinatário:** Ana Paula da Silva Sarto\n⚡ **Aprovação automática!**\n\n⚠️ **Envie NO CHAT, não por email!**\n📧 Email é apenas para dúvidas e coisas importantes: contatobiolink.ai@gmail.com`;
  }
  if (lower.includes('plano') || lower.includes('preço')) {
    return `💰 **Planos:**\n\n🔹 Mensal: R$ 19,90 (2x R$ 9,95)\n🌟 Anual: R$ 99,99 (12x R$ 8,33)\n\n✅ 7 dias de garantia!\n📧 contatobiolink.ai@gmail.com (apenas dúvidas)`;
  }
  if (lower.includes('afiliado')) {
    return `👥 **Afiliados:** Ganhe R$ 5-10 por indicação! 📧 contatobiolink.ai@gmail.com`;
  }
  if (lower.includes('instagram')) {
    return `📸 @biolink.ai | @off_bielzinkkj | @dnn.bastos | @dnbergii`;
  }
  if (lower.includes('oi') || lower.includes('olá')) {
    return `👋 Olá! Como posso te ajudar? 📧 contatobiolink.ai@gmail.com (apenas dúvidas e coisas importantes)`;
  }
  return `Entendi! 🤖 Posso ajudar com:\n• 📚 Criar página\n• 💰 Planos\n• 📤 Comprovante\n• 👥 Afiliados\n\n📧 Email é apenas para dúvidas e coisas importantes: contatobiolink.ai@gmail.com`;
}

router.get('/history/:sessionId', authenticateToken, (req, res) => {
  try {
    const messages = db.prepare(`SELECT role, content, created_at FROM chat_messages WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT 50`).all(req.user.id, req.params.sessionId);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter histórico' });
  }
});

module.exports = router;