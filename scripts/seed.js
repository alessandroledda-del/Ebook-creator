const mongoose = require('mongoose');
const User = require('../models/user');
const Book = require('../models/book');

async function seedDB() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const user = await User.create({
        nome: 'Admin',
        email: 'admin@test.com',
        password: 'admin123'
    });
    
    const book = await Book.create({
        titolo: 'Libro di Test',
        autore: 'Autore Test',
        author: user._id
    });
    
    console.log('✅ Database seeded!');
    await mongoose.connection.close();
}

seedDB().catch(console.error);
