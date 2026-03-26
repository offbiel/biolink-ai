require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const pageRoutes = require('./routes/pages');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.SITE_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Biolink.ai API', version: '1.0.0', contact: 'contatobiolink.ai@gmail.com (apenas dúvidas e coisas importantes)' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(errorHandler);

['./uploads', './uploads/proofs', './database'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.listen(PORT, () => {
  console.log('\n============================================');
  console.log('🚀 BIOLINK.AI API INICIADA!');
  console.log('============================================');
  console.log(`🌐 Servidor: http://localhost:${PORT}`);
  console.log(`👨‍💻 Devs: Gabriel da Silva Sarto & Miguel de Bastos Oliveira`);
  console.log(`👩 Atendimento: Ana Paula da Silva Sarto`);
  console.log(`📧 Email: contatobiolink.ai@gmail.com (APENAS DÚVIDAS E COISAS IMPORTANTES!)`);
  console.log(`💬 Comprovante: enviar NO CHAT do site!`);
  console.log(`📸 Instagrams: @biolink.ai | @off_bielzinkkj | @dnn.bastos | @dnbergii`);
  console.log(`💰 Aprovação automática de pagamentos`);
  console.log('============================================\n');
});