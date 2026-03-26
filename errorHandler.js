const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Erro de validação', message: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Arquivo muito grande (máx 5MB)' });
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Tente novamente mais tarde',
    contact: 'contatobiolink.ai@gmail.com (apenas dúvidas e coisas importantes)'
  });
};

module.exports = errorHandler;