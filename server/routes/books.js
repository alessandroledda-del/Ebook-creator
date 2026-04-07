const express = require('express');
const router = express.Router();
const bookService = require('../services/bookService');
const chapterService = require('../services/chapterService');
const { validateBook, validateBookUpdate } = require('../middleware/validation');

// GET tutti i libri
router.get('/', async (req, res, next) => {
  try {
    const books = await bookService.getAllBooks();
    res.json(books);
  } catch (err) {
    next(err);
  }
});

// GET singolo libro
router.get('/:id', async (req, res, next) => {
  try {
    const book = await bookService.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });
    res.json(book);
  } catch (err) {
    next(err);
  }
});

// POST crea nuovo libro
router.post('/', validateBook, async (req, res, next) => {
  try {
    const book = await bookService.createBook(req.body);
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

// PUT aggiorna libro
router.put('/:id', validateBookUpdate, async (req, res, next) => {
  try {
    const book = await bookService.updateBook(req.params.id, req.body);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });
    res.json(book);
  } catch (err) {
    next(err);
  }
});

// DELETE elimina libro
router.delete('/:id', async (req, res, next) => {
  try {
    const book = await bookService.deleteBook(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro non trovato' });
    res.json({ message: 'Libro eliminato con successo' });
  } catch (err) {
    next(err);
  }
});

// GET capitoli di un libro
router.get('/:bookId/chapters', async (req, res, next) => {
  try {
    const chapters = await chapterService.getChaptersByBook(req.params.bookId);
    res.json(chapters);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
