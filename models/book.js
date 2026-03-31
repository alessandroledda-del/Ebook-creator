const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    titolo: { type: String, required: true },
    autore: { type: String, required: true },
    descrizione: { type: String, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    statoCreazione: { type: String, enum: ['bozza', 'in-revisione', 'pubblicato'], default: 'bozza' },
    genere: { type: String, default: '' },
    tag: [String],
    dataCrazione: { type: Date, default: Date.now },
    dataModifica: { type: Date, default: Date.now }
});

bookSchema.pre('save', function(next) {
    this.dataModifica = Date.now();
    next();
});

module.exports = mongoose.model('Book', bookSchema);
