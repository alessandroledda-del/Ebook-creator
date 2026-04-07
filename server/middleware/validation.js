const validateBook = (req, res, next) => {
  const { title, author, price } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.push('Il titolo è obbligatorio');
  }

  if (!author || typeof author !== 'string' || author.trim() === '') {
    errors.push("L'autore è obbligatorio");
  }

  if (price === undefined || price === null) {
    errors.push('Il prezzo è obbligatorio');
  } else if (typeof price !== 'number' || isNaN(price) || price < 0) {
    errors.push('Il prezzo deve essere un numero non negativo');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateBookUpdate = (req, res, next) => {
  const { price } = req.body;
  const errors = [];

  if (price !== undefined && (typeof price !== 'number' || isNaN(price) || price < 0)) {
    errors.push('Il prezzo deve essere un numero non negativo');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const validateRegister = (req, res, next) => {
  const { nome, email, password } = req.body;
  const errors = [];

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    errors.push('Il nome è obbligatorio');
  }

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    errors.push("L'email non è valida");
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('La password deve avere almeno 6 caratteri');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    errors.push("L'email non è valida");
  }

  if (!password || typeof password !== 'string' || password.trim() === '') {
    errors.push('La password è obbligatoria');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateChapter = (req, res, next) => {
  const { bookId, title, order } = req.body;
  const errors = [];

  if (!bookId || typeof bookId !== 'string' || bookId.trim() === '') {
    errors.push("L'ID del libro è obbligatorio");
  }

  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.push('Il titolo del capitolo è obbligatorio');
  }

  if (order === undefined || order === null) {
    errors.push("L'ordine del capitolo è obbligatorio");
  } else if (!Number.isInteger(order) || order < 1) {
    errors.push("L'ordine deve essere un intero positivo");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateChapterUpdate = (req, res, next) => {
  const { order } = req.body;
  const errors = [];

  if (order !== undefined && (!Number.isInteger(order) || order < 1)) {
    errors.push("L'ordine deve essere un intero positivo");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = {
  validateBook,
  validateBookUpdate,
  validateRegister,
  validateLogin,
  validateChapter,
  validateChapterUpdate
};
