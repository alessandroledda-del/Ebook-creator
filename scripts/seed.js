require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../server/models/User');
const Book = require('../server/models/Book');
const Chapter = require('../server/models/Chapter');

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
            name: 'Admin User',
            email: 'admin@ebook.com',
            password: 'admin123',
            role: 'admin'
        });
        console.log('✅ Admin creato:', admin.email);

        // Crea utente normale
        const user = await User.create({
            name: 'John Doe',
            email: 'john@ebook.com',
            password: 'user123',
            role: 'user'
        });
        console.log('✅ Utente creato:', user.email);

        // Crea libri di test
        const book1 = await Book.create({
            userId: admin._id,
            title: 'Il Signore degli Anelli',
            author: 'J.R.R. Tolkien',
            description: 'Un epico fantasy classico',
            genre: 'Fantasy',
            price: 9.99,
            status: 'published',
            tags: ['fantasy', 'avventura', 'classico']
        });
        console.log('✅ Libro 1 creato:', book1.title);

        const book2 = await Book.create({
            userId: user._id,
            title: 'Harry Potter e la Pietra Filosofale',
            author: 'J.K. Rowling',
            description: 'La storia del giovane mago',
            genre: 'Fantasy',
            price: 7.99,
            status: 'draft',
            tags: ['fantasy', 'magia', 'giovani']
        });
        console.log('✅ Libro 2 creato:', book2.title);

        // Crea capitoli di test
        const chapter1 = await Chapter.create({
            book: book1._id,
            title: 'Il Viaggio Inizia',
            content: "In una volta c'era uno hobbit...",
            chapterNumber: 1,
            order: 1
        });
        console.log('✅ Capitolo 1 creato:', chapter1.title);

        const chapter2 = await Chapter.create({
            book: book1._id,
            title: 'Arrivo a Rivendell',
            content: 'Dopo molti giorni di viaggio...',
            chapterNumber: 2,
            order: 2
        });
        console.log('✅ Capitolo 2 creato:', chapter2.title);

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
