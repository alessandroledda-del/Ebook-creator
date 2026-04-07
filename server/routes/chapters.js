const express = require('express');
const mongoose = require('mongoose');
const Chapter = require('../models/Chapter');
const Book = require('../models/Book');
const auth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /api/books/:bookId/chapters  –  public
router.get('/', async (req, res) => {
  if (!isValidId(req.params.bookId)) return res.status(400).json({ error: 'ID libro non valido' });
  try {
    const chapters = await Chapter.find({ book: req.params.bookId }).sort({ order: 1, chapterNumber: 1 });
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero dei capitoli' });
  }
});

// GET /api/books/:bookId/chapters/:chapterId  –  public
router.get('/:chapterId', async (req, res) => {
  if (!isValidId(req.params.bookId) || !isValidId(req.params.chapterId)) {
    return res.status(400).json({ error: 'ID non valido' });
  }
  try {
    const chapter = await Chapter.findOne({ _id: req.params.chapterId, book: req.params.bookId });
    if (!chapter) return res.status(404).json({ error: 'Capitolo non trovato' });
    res.json(chapter);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero del capitolo' });
  }
});

// POST /api/books/:bookId/chapters  –  protected (book owner or admin)
router.post('/', auth, async (req, res) => {
  if (!isValidId(req.params.bookId)) return res.status(400).json({ error: 'ID libro non valido' });
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });

    if (book.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const { title, content, chapterNumber, order, wordCount } = req.body;

    if (!title || !content || chapterNumber === undefined) {
      return res.status(400).json({ error: 'Titolo, contenuto e numero capitolo sono obbligatori' });
    }

    const chapter = await Chapter.create({
      book: req.params.bookId,
      title,
      content,
      chapterNumber,
      order: order ?? chapterNumber,
      wordCount
    });

    res.status(201).json(chapter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/books/:bookId/chapters/:chapterId  –  protected (book owner or admin)
router.put('/:chapterId', auth, async (req, res) => {
  if (!isValidId(req.params.bookId) || !isValidId(req.params.chapterId)) {
    return res.status(400).json({ error: 'ID non valido' });
  }
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });

    if (book.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const chapter = await Chapter.findOne({ _id: req.params.chapterId, book: req.params.bookId });
    if (!chapter) return res.status(404).json({ error: 'Capitolo non trovato' });

    const { title, content, chapterNumber, order, wordCount } = req.body;

    const updated = await Chapter.findByIdAndUpdate(
      req.params.chapterId,
      { title, content, chapterNumber, order, wordCount },
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/books/:bookId/chapters/:chapterId  –  protected (book owner or admin)
router.delete('/:chapterId', auth, async (req, res) => {
  if (!isValidId(req.params.bookId) || !isValidId(req.params.chapterId)) {
    return res.status(400).json({ error: 'ID non valido' });
  }
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });

    if (book.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const chapter = await Chapter.findOneAndDelete({ _id: req.params.chapterId, book: req.params.bookId });
    if (!chapter) return res.status(404).json({ error: 'Capitolo non trovato' });

    res.json({ message: 'Capitolo eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
