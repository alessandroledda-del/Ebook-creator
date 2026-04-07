const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET non configurato. Impostare la variabile d\'ambiente JWT_SECRET.');
  }
  return secret;
};

const register = async ({ nome, email, password }) => {
  const existing = await User.findOne({ email: String(email) });
  if (existing) {
    const err = new Error("Email già in uso");
    err.status = 409;
    throw err;
  }
  const user = new User({ nome, email, password });
  await user.save();
  return user;
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: String(email) });
  if (!user) {
    const err = new Error('Credenziali non valide');
    err.status = 401;
    throw err;
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error('Credenziali non valide');
    err.status = 401;
    throw err;
  }
  const token = jwt.sign(
    { id: user._id, email: user.email },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
  return { token, user };
};

module.exports = { register, login };
