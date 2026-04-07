const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /api/users/:id  –  protected
router.get('/:id', auth, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID non valido' });
  try {
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id  –  protected (own profile or admin)
router.put('/:id', auth, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID non valido' });
  try {
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const { name, language } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { name, language },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) return res.status(404).json({ error: 'Utente non trovato' });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
