process.env.JWT_SECRET = 'test-secret-key-with-at-least-32-characters';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'development';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue({}),
    connection: { collections: {} },
    isValidObjectId: jest.fn().mockReturnValue(true)
  };
});

jest.mock('../server/config/database', () => jest.fn().mockResolvedValue({}));
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

jest.mock('../server/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));

jest.mock('../server/models/Book', () => ({
  findById: jest.fn()
}));

jest.mock('../server/models/Chapter', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn()
}));

const app = require('../server/index');
const mongoose = require('mongoose');
const Book = require('../server/models/Book');
const Chapter = require('../server/models/Chapter');

const BOOK_ID = '507f1f77bcf86cd799439021';
const CHAPTER_ID = '507f1f77bcf86cd799439031';
const OWNER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439012';

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  jest.clearAllMocks();
  mongoose.isValidObjectId.mockReturnValue(true);
});

describe('GET /api/books/:bookId/chapters', () => {
  it('returns chapter list', async () => {
    const chapters = [{ _id: CHAPTER_ID, title: 'Capitolo 1' }];
    Chapter.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(chapters)
    });

    const res = await request(app).get(`/api/books/${BOOK_ID}/chapters`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(chapters);
  });

  it('returns 400 on invalid book id', async () => {
    mongoose.isValidObjectId.mockReturnValue(false);

    const res = await request(app).get('/api/books/invalid/chapters');

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/books/:bookId/chapters/:chapterId', () => {
  it('returns chapter details', async () => {
    const chapter = { _id: CHAPTER_ID, title: 'Dettagli capitolo' };
    Chapter.findOne.mockResolvedValue(chapter);

    const res = await request(app).get(`/api/books/${BOOK_ID}/chapters/${CHAPTER_ID}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(chapter);
  });

  it('returns 404 when chapter is missing', async () => {
    Chapter.findOne.mockResolvedValue(null);

    const res = await request(app).get(`/api/books/${BOOK_ID}/chapters/${CHAPTER_ID}`);

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/books/:bookId/chapters', () => {
  it('creates chapter for owner', async () => {
    const token = makeToken({ id: OWNER_ID, role: 'user' });
    Book.findById.mockResolvedValue({ _id: BOOK_ID, userId: { toString: () => OWNER_ID } });
    Chapter.create.mockResolvedValue({ _id: CHAPTER_ID, title: 'Nuovo capitolo' });

    const res = await request(app)
      .post(`/api/books/${BOOK_ID}/chapters`)
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Nuovo capitolo', content: 'testo', chapterNumber: 1 });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Nuovo capitolo');
  });

  it('returns 403 for non-owner non-admin', async () => {
    const token = makeToken({ id: OTHER_USER_ID, role: 'user' });
    Book.findById.mockResolvedValue({ _id: BOOK_ID, userId: { toString: () => OWNER_ID } });

    const res = await request(app)
      .post(`/api/books/${BOOK_ID}/chapters`)
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Nuovo capitolo', content: 'testo', chapterNumber: 1 });

    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/books/:bookId/chapters/:chapterId', () => {
  it('updates chapter for owner', async () => {
    const token = makeToken({ id: OWNER_ID, role: 'user' });
    Book.findById.mockResolvedValue({ _id: BOOK_ID, userId: { toString: () => OWNER_ID } });
    Chapter.findOne.mockResolvedValue({ _id: CHAPTER_ID, book: BOOK_ID });
    Chapter.findByIdAndUpdate.mockResolvedValue({ _id: CHAPTER_ID, title: 'Aggiornato' });

    const res = await request(app)
      .put(`/api/books/${BOOK_ID}/chapters/${CHAPTER_ID}`)
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Aggiornato', content: 'testo', chapterNumber: 2 });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Aggiornato');
  });
});

describe('DELETE /api/books/:bookId/chapters/:chapterId', () => {
  it('deletes chapter for owner', async () => {
    const token = makeToken({ id: OWNER_ID, role: 'user' });
    Book.findById.mockResolvedValue({ _id: BOOK_ID, userId: { toString: () => OWNER_ID } });
    Chapter.findOneAndDelete.mockResolvedValue({ _id: CHAPTER_ID });

    const res = await request(app)
      .delete(`/api/books/${BOOK_ID}/chapters/${CHAPTER_ID}`)
      .set('Authorization', 'Bearer ' + token);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Capitolo eliminato con successo');
  });
});
