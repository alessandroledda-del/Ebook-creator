const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    genre: { type: String },
    language: { type: String },
    author: { type: String, required: true },
    content: { type: String },
    coverImageUrl: { type: String },
    pdfUrl: { type: String },
    epubUrl: { type: String },
    price: { type: Number, required: true },
    generationStatus: { type: String },
    createdDate: { type: Date, default: Date.now },
    wordCount: { type: Number }
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;