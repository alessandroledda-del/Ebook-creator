require('dotenv').config();

const validateEnv = require('./config/validateEnv');

try {
  validateEnv();
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const chapterRoutes = require('./routes/chapters');
const userRoutes = require('./routes/users');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean) || ['http://localhost:3000'];

app.use((req, res, next) => {
  const incomingRequestId = req.headers['x-request-id'];
  req.id = typeof incomingRequestId === 'string' && incomingRequestId.trim() ? incomingRequestId : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Middleware globali
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('client'));

// Route di base
app.get('/', (req, res) => {
  res.json({ message: 'Ebook-creator API attiva', version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/books/:bookId/chapters', chapterRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// Error handler
app.use(errorHandler);

// Avvio server solo quando eseguito direttamente (non quando importato dai test)
if (require.main === module) {
  logger.info('🚀 Avvio server...');
  const PORT = process.env.PORT || 3000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        logger.info('Server in ascolto', { port: PORT, environment: process.env.NODE_ENV || 'development' });
      });
    })
    .catch((err) => {
      logger.error('Errore fatale durante l\'avvio', {
        error: err.message,
        stack: err.stack
      });
      process.exit(1);
    });
}

module.exports = app;
