const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    reqId: req.id,
    userId: req.user?.id,
    userRole: req.user?.role,
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: err.stack
  });

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ errors });
  }

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: 'ID non valido' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ error: `Il valore del campo '${field}' è già in uso` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token non valido' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token scaduto' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Errore interno del server';

  return res.status(status).json({ error: message });
};

module.exports = errorHandler;
