const express = require('express');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /api/books  –  public, with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      Book.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      Book.countDocuments()
    ]);

    return res.json({
      books,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    logger.error('Errore nel recupero dei libri', {
      reqId: req.id,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack
    });
    return res.status(500).json({ error: 'Errore nel recupero dei libri' });
  }
});

// GET /api/books/:id  –  public
router.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID non valido' });
  try {
    const book = await Book.findById(req.params.id).populate('userId', 'name email');
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });
    return res.json(book);
  } catch (err) {
    logger.error('Errore nel recupero del libro', {
      reqId: req.id,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack
    });
    return res.status(500).json({ error: 'Errore nel recupero del libro' });
  }
});

// POST /api/books  –  protected
router.post('/', auth, async (req, res) => {
  try {
    const { title, author, description, genre, language, price, tags } = req.body;

    if (!title || !author || price === undefined) {
      return res.status(400).json({ error: 'Titolo, autore e prezzo sono obbligatori' });
    }

    const book = await Book.create({
      userId: req.user.id,
      title,
      author,
      description,
      genre,
      language,
      price,
      tags
    });

    return res.status(201).json(book);
  } catch (err) {
    logger.error('Errore creazione libro', {
      reqId: req.id,
      userId: req.user?.id,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack
    });
    return res.status(400).json({ error: err.message });
  }
});

// PUT /api/books/:id  –  protected (only the owner or admin)
router.put('/:id', auth, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID non valido' });
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });

    if (book.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const { title, author, description, genre, language, price, tags, status } = req.body;

    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, description, genre, language, price, tags, status },
      { new: true, runValidators: true }
    );

    return res.json(updated);
  } catch (err) {
    logger.error('Errore aggiornamento libro', {
      reqId: req.id,
      userId: req.user?.id,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack
    });
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /api/books/:id  –  protected (only the owner or admin)
router.delete('/:id', auth, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID non valido' });
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });

    if (book.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    await Book.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Libro eliminato con successo' });
  } catch (err) {
    logger.error('Errore eliminazione libro', {
      reqId: req.id,
      userId: req.user?.id,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack
    });
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
