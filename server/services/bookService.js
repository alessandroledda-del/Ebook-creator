const Book = require('../models/Book');

const getAllBooks = async () => {
  return Book.find().sort({ createdAt: -1 });
};

const getBookById = async (id) => {
  return Book.findById(id);
};

const createBook = async (data) => {
  const book = new Book(data);
  return book.save();
};

const updateBook = async (id, data) => {
  return Book.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

const deleteBook = async (id) => {
  return Book.findByIdAndDelete(id);
};

module.exports = { getAllBooks, getBookById, createBook, updateBook, deleteBook };
