const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Il titolo è obbligatorio'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    genre: {
      type: String,
      trim: true
    },
    language: {
      type: String,
      default: 'it',
      trim: true
    },
    author: {
      type: String,
      required: [true, "L'autore è obbligatorio"],
      trim: true
    },
    content: {
      type: String
    },
    coverImageUrl: {
      type: String,
      trim: true
    },
    pdfUrl: {
      type: String,
      trim: true
    },
    epubUrl: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Il prezzo è obbligatorio'],
      min: [0, 'Il prezzo non può essere negativo']
    },
    generationStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'error'],
      default: 'pending'
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
