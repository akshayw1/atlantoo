const mongoose = require('mongoose');
const config = require('../config');
const logger = require('pino')();

module.exports = {
  connect: async () => {
    try {
      await mongoose.connect(config.mongodb.url, config.mongodb.options);
      logger.info('Connected to MongoDB');
    } catch (err) {
      logger.error('MongoDB connection error:', err);
      throw err;
    }
  },
  
  disconnect: async () => {
    try {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    } catch (err) {
      logger.error('MongoDB disconnection error:', err);
      throw err;
    }
  }
};