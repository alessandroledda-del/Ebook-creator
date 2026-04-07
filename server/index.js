require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const booksRouter = require('./routes/books');
const usersRouter = require('./routes/users');
const chaptersRouter = require('./routes/chapters');

const app = express();

// Middleware globali
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('client'));

// Connessione a MongoDB
connectDB();

// Route di base
app.get('/', (req, res) => {
  res.json({ message: 'Ebook-creator API attiva', version: '1.0.0' });
});

// Route modulari
app.use('/api/books', booksRouter);
app.use('/api/users', usersRouter);
app.use('/api/chapters', chaptersRouter);

// Gestione errori centralizzata
app.use(errorHandler);

// Avvio server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
