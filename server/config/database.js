const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB connesso: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ Errore MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
