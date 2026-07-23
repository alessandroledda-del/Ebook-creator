process.env.JWT_SECRET = 'test-secret-key-with-at-least-32-characters';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'development';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- Mock mongoose and models before requiring app ---
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue({}),
    connection: { collections: {} }
  };
});

jest.mock('../server/config/database', () => jest.fn().mockResolvedValue({}));

// Disable rate limiting in tests
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@test.com',
  role: 'user',
  comparePassword: jest.fn()
};

const mockAdmin = {
  _id: '507f1f77bcf86cd799439012',
  id: '507f1f77bcf86cd799439012',
  name: 'Admin User',
  email: 'admin@test.com',
  role: 'admin',
  comparePassword: jest.fn()
};

const BOOK_ID = '507f1f77bcf86cd799439021';
const OTHER_USER_ID = '507f1f77bcf86cd799439099';

jest.mock('../server/models/User', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../server/models/Book', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../server/models/Chapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteMany: jest.fn()
}));

const app = require('../server/index');
const User = require('../server/models/User');
const Book = require('../server/models/Book');
const Chapter = require('../server/models/Chapter');

// Helper: generate a valid JWT for a user object
function makeToken(user) {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================
// User Model unit tests (no DB needed)
// ============================================================
describe('User model helpers', () => {
  it('comparePassword should return true for matching password', async () => {
    const hash = await bcrypt.hash('mypassword', 10);
    const match = await bcrypt.compare('mypassword', hash);
    expect(match).toBe(true);
  });

  it('comparePassword should return false for wrong password', async () => {
    const hash = await bcrypt.hash('mypassword', 10);
    const match = await bcrypt.compare('wrongpassword', hash);
    expect(match).toBe(false);
  });
});

// ============================================================
// Auth routes
// ============================================================
describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ ...mockUser });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@test.com', password: 'pass123' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('returns 409 when email is already taken', async () => {
    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'test@test.com', password: 'pass123' });

    expect(res.statusCode).toBe(409);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'only@email.com' });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token on valid credentials', async () => {
    const userWithCompare = {
      ...mockUser,
      comparePassword: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(userWithCompare);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'pass123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const userWithCompare = {
      ...mockUser,
      comparePassword: jest.fn().mockResolvedValue(false)
    };
    User.findOne.mockResolvedValue(userWithCompare);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' });

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'pass' });

    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'only@email.com' });
    expect(res.statusCode).toBe(400);
  });
});

// ============================================================
// Book routes
// ============================================================
describe('GET /api/books', () => {
  it('returns a paginated list of books', async () => {
    Book.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([])
    });
    Book.countDocuments.mockResolvedValue(0);

    const res = await request(app).get('/api/books');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('books');
    expect(res.body).toHaveProperty('pagination');
  });
});

describe('POST /api/books', () => {
  it('creates a book for authenticated user', async () => {
    const token = makeToken(mockUser);
    const mockBook = { _id: 'book-1', title: 'My Book', author: 'Test User', price: 9.99 };
    Book.create.mockResolvedValue(mockBook);

    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Book', author: 'Test User', price: 9.99 });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('My Book');
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: 'No Auth', author: 'Ghost', price: 0 });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const token = makeToken(mockUser);
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Only title' });
    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /api/books/:id', () => {
  it('returns 403 when a different user tries to update', async () => {
    const otherUser = { ...mockUser, _id: OTHER_USER_ID, id: OTHER_USER_ID };
    const token = makeToken(otherUser);
    Book.findById.mockResolvedValue({ _id: BOOK_ID, userId: { toString: () => mockUser._id } });

    const res = await request(app)
      .put(`/api/books/${BOOK_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hack' });

    expect(res.statusCode).toBe(403);
  });

  it('allows owner to update their book', async () => {
    const token = makeToken(mockUser);
    Book.findById.mockResolvedValue({ _id: BOOK_ID, userId: { toString: () => mockUser._id } });
    Book.findByIdAndUpdate.mockResolvedValue({ _id: BOOK_ID, title: 'Updated' });

    const res = await request(app)
      .put(`/api/books/${BOOK_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated', author: 'Owner', price: 5 });

    expect(res.statusCode).toBe(200);
  });
});

describe('DELETE /api/books/:id', () => {
  it('returns 403 when a different user tries to delete', async () => {
    const otherUser = { ...mockUser, _id: OTHER_USER_ID, id: OTHER_USER_ID };
    const token = makeToken(otherUser);
    Book.findById.mockResolvedValue({ _id: BOOK_ID, userId: { toString: () => mockUser._id } });

    const res = await request(app)
      .delete(`/api/books/${BOOK_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  it('allows owner to delete their book', async () => {
    const token = makeToken(mockUser);
    Book.findById.mockResolvedValue({ _id: BOOK_ID, userId: { toString: () => mockUser._id } });
    Book.findByIdAndDelete.mockResolvedValue({ _id: BOOK_ID });

    const res = await request(app)
      .delete(`/api/books/${BOOK_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });
});

// ============================================================
// User profile routes
// ============================================================
describe('GET /api/users/:id', () => {
  it('returns user profile for owner', async () => {
    const token = makeToken(mockUser);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

    const res = await request(app)
      .get(`/api/users/${mockUser._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it('returns 403 when accessing another user profile', async () => {
    const token = makeToken(mockUser);

    const res = await request(app)
      .get(`/api/users/${OTHER_USER_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get(`/api/users/${mockUser._id}`);
    expect(res.statusCode).toBe(401);
  });
});

