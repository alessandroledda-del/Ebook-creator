require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET non configurato. Imposta JWT_SECRET nel file .env');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const chapterRoutes = require('./routes/chapters');
const userRoutes = require('./routes/users');

const app = express();

// Middleware
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
app.use('/api/books', bookRoutes);
app.use('/api/books/:bookId/chapters', chapterRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// Avvio server solo quando eseguito direttamente (non quando importato dai test)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server in ascolto sulla porta ${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  });
}

module.exports = app;


