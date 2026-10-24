import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from './logger.js';

let isConnected = false;

export const connectDatabase = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 20,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
      autoIndex: true
    });

    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnection...');
      isConnected = false;
      setTimeout(() => {
        if (!isConnected) {
          connectDatabase().catch((e) => logger.error(`Reconnection attempt failed: ${e.message}`));
        }
      }, 3000);
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB initial connection failure: ${error.message}`);
    if (config.isProd) {
      process.exit(1);
    }
    return null;
  }
};

export const disconnectDatabase = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly');
  }
};
