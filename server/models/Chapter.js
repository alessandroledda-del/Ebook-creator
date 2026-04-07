const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Il riferimento al libro è obbligatorio']
    },
    title: {
      type: String,
      required: [true, 'Il titolo del capitolo è obbligatorio'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Il contenuto del capitolo è obbligatorio']
    },
    chapterNumber: {
      type: Number,
      required: [true, 'Il numero del capitolo è obbligatorio'],
      min: [1, 'Il numero del capitolo deve essere almeno 1']
    },
    order: {
      type: Number,
      default: 0
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

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;
