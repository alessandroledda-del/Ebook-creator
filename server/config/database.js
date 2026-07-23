const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connesso', { host: conn.connection.host });
    return conn;
  } catch (error) {
    logger.error('Errore MongoDB', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

module.exports = connectDB;
