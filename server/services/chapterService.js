const Chapter = require('../models/Chapter');
const Book = require('../models/Book');

const getChaptersByBook = async (bookId) => {
  return Chapter.find({ bookId }).sort({ order: 1 });
};

const createChapter = async (data) => {
  const book = await Book.findById(data.bookId);
  if (!book) {
    const err = new Error('Libro non trovato');
    err.status = 404;
    throw err;
  }
  const chapter = new Chapter(data);
  return chapter.save();
};

const updateChapter = async (id, data) => {
  const { bookId, ...safeData } = data;
  return Chapter.findByIdAndUpdate(id, safeData, { new: true, runValidators: true });
};

const deleteChapter = async (id) => {
  return Chapter.findByIdAndDelete(id);
};

module.exports = { getChaptersByBook, createChapter, updateChapter, deleteChapter };
