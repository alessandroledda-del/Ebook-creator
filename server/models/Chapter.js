const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, "L'ID del libro è obbligatorio"]
    },
    title: {
      type: String,
      required: [true, 'Il titolo del capitolo è obbligatorio'],
      trim: true
    },
    content: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      required: [true, "L'ordine del capitolo è obbligatorio"],
      min: [1, "L'ordine deve essere almeno 1"]
    }
  },
  {
    timestamps: true
  }
);

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;
