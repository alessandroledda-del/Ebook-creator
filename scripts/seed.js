require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const Book = require('../models/book');
const Chapter = require('../models/chapter');

async function seedDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ebook-creator');
        console.log('✅ Connesso a MongoDB per seed...');

        // Pulisci i dati precedenti
        await User.deleteMany({});
        await Book.deleteMany({});
        await Chapter.deleteMany({});
        console.log('🗑️  Database pulito');

        // Crea admin user
        const admin = await User.create({
            nome: 'Admin User',
            email: 'admin@ebook.com',
            password: 'admin123',
            ruolo: 'admin'
        });
        console.log('✅ Admin creato:', admin.email);

        // Crea utente normale
        const user = await User.create({
            nome: 'John Doe',
            email: 'john@ebook.com',
            password: 'user123',
            ruolo: 'user'
        });
        console.log('✅ Utente creato:', user.email);

        // Crea libri di test
        const book1 = await Book.create({
            titolo: 'Il Signore degli Anelli',
            autore: 'J.R.R. Tolkien',
            descrizione: 'Un epico fantasy classico',
            author: admin._id,
            genere: 'Fantasy',
            statoCreazione: 'pubblicato',
            tag: ['fantasy', 'avventura', 'classico']
        });
        console.log('✅ Libro 1 creato:', book1.titolo);

        const book2 = await Book.create({
            titolo: 'Harry Potter e la Pietra Filosofale',
            autore: 'J.K. Rowling',
            descrizione: 'La storia del giovane mago',
            author: user._id,
            genere: 'Fantasy',
            statoCreazione: 'bozza',
            tag: ['fantasy', 'magia', 'giovani']
        });
        console.log('✅ Libro 2 creato:', book2.titolo);

        // Crea capitoli di test
        const chapter1 = await Chapter.create({
            titolo: 'Il Viaggio Inizia',
            contenuto: 'In una volta c\'era uno hobbit...',
            libro: book1._id,
            numeroCapitolo: 1,
            ordine: 1
        });
        console.log('✅ Capitolo 1 creato:', chapter1.titolo);

        const chapter2 = await Chapter.create({
            titolo: 'Arrivo a Rivendell',
            contenuto: 'Dopo molti giorni di viaggio...',
            libro: book1._id,
            numeroCapitolo: 2,
            ordine: 2
        });
        console.log('✅ Capitolo 2 creato:', chapter2.titolo);

        console.log('\n✅ Database seeded con successo!');
        console.log('📊 Statistiche:');
        console.log(`   - Utenti: 2`);
        console.log(`   - Libri: 2`);
        console.log(`   - Capitoli: 2`);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore seed:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

seedDB();
