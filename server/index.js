require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET non configurato. Imposta JWT_SECRET nel file .env');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI non configurato. Imposta MONGO_URI nel file .env');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const booksRouter = require('./routes/books');
const usersRouter = require('./routes/users');
const chaptersRouter = require('./routes/chapters');

const app = express();

// Middleware globali
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('client'));

// Route di base
app.get('/', (req, res) => {
  res.json({ message: 'Ebook-creator API attiva', version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRouter);
app.use('/api/books/:bookId/chapters', chaptersRouter);
app.use('/api/users', usersRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// Error handler
app.use(errorHandler);

// Avvio server solo quando eseguito direttamente (non quando importato dai test)
if (require.main === module) {
  console.log('🚀 Avvio server...');
  const PORT = process.env.PORT || 3000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server in ascolto sulla porta ${PORT}`);
        console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
      });
    })
    .catch((err) => {
      console.error('❌ Errore fatale durante l\'avvio:', err.message);
      process.exit(1);
    });
}

module.exports = app;


