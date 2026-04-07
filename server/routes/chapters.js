const express = require('express');
const router = express.Router();
const chapterService = require('../services/chapterService');
const { validateChapter, validateChapterUpdate } = require('../middleware/validation');

// POST crea capitolo
router.post('/', validateChapter, async (req, res, next) => {
  try {
    const chapter = await chapterService.createChapter(req.body);
    res.status(201).json(chapter);
  } catch (err) {
    next(err);
  }
});

// PUT aggiorna capitolo
router.put('/:id', validateChapterUpdate, async (req, res, next) => {
  try {
    const chapter = await chapterService.updateChapter(req.params.id, req.body);
    if (!chapter) return res.status(404).json({ error: 'Capitolo non trovato' });
    res.json(chapter);
  } catch (err) {
    next(err);
  }
});

// DELETE elimina capitolo
router.delete('/:id', async (req, res, next) => {
  try {
    const chapter = await chapterService.deleteChapter(req.params.id);
    if (!chapter) return res.status(404).json({ error: 'Capitolo non trovato' });
    res.json({ message: 'Capitolo eliminato con successo' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
