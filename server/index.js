require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connessione a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ebook-creator';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch((err) => {
    console.error('Errore connessione MongoDB:', err.message);
    process.exit(1);
  });

// Route di base
app.get('/', (req, res) => {
  res.json({ message: 'Ebook-creator API attiva', version: '1.0.0' });
});

// Route libri
const Book = require('./models/Book');

// GET tutti i libri
app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdDate: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero dei libri' });
  }
});

// GET singolo libro
app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero del libro' });
  }
});

// POST crea nuovo libro
app.post('/api/books', async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT aggiorna libro
app.put('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });
    res.json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE elimina libro
app.delete('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });
    res.json({ message: 'Libro eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Avvio server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
