const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const userService = require('../services/userService');
const auth = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

// Semplice rate limiter in memoria per endpoint di autenticazione
const authRateLimit = (() => {
  const requests = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minuti
  const MAX_REQUESTS = 20;

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = requests.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + WINDOW_MS;
    }

    entry.count += 1;
    requests.set(ip, entry);

    if (entry.count > MAX_REQUESTS) {
      return res.status(429).json({ error: 'Troppe richieste. Riprova più tardi.' });
    }

    next();
  };
})();

// POST registrazione
router.post('/register', authRateLimit, validateRegister, async (req, res, next) => {
  try {
    const { nome, email, password } = req.body;
    const user = await authService.register({ nome, email, password });
    res.status(201).json({
      message: 'Utente registrato con successo',
      user: { id: user._id, nome: user.nome, email: user.email }
    });
  } catch (err) {
    next(err);
  }
});

// POST login
router.post('/login', authRateLimit, validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.login({ email, password });
    res.json({
      token,
      user: { id: user._id, nome: user.nome, email: user.email }
    });
  } catch (err) {
    next(err);
  }
});

// GET profilo utente
router.get('/:id', auth, async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT aggiorna profilo utente
router.put('/:id', auth, async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questo profilo' });
    }
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
