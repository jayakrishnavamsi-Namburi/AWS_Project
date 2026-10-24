import http from 'http';
import app from './app.js';
import { config, validateEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { initSocketIO } from './sockets/socketManager.js';
import { logger } from './config/logger.js';

const startServer = async () => {
  try {
    validateEnv();

    // Connect to database
    await connectDatabase();

    const server = http.createServer(app);

    // Initialize Socket.IO with signaling
    initSocketIO(server);

    server.listen(config.port, () => {
      logger.info(`================================================`);
      logger.info(` SecureProctor Server v1.0.0 Running`);
      logger.info(` Environment: ${config.env}`);
      logger.info(` REST API:    http://localhost:${config.port}/api/v1`);
      logger.info(` Health:      http://localhost:${config.port}/health`);
      logger.info(` Client URL:  ${config.clientUrl}`);
      logger.info(`================================================`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason?.message || reason}`);
    });

    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      if (err?.name === 'MongoNetworkError' || err?.code === 'ECONNRESET') {
        logger.warn('Transient MongoNetworkError caught. Keeping server alive and reconnecting...');
        connectDatabase().catch(() => {});
        return;
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error(`Fatal server startup error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
