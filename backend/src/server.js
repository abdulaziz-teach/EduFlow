import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables FIRST — before anything else reads them
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { validateEnv } from './config/envValidation.js';
import connectDB, { disconnectDB } from './config/db.js';
import app from './app.js';
import notificationSchedulerService from './services/notificationSchedulerService.js';

// Validate environment configurations
validateEnv();

const PORT = process.env.PORT || 5000;

let server;
let isShuttingDown = false;

/**
 * Graceful shutdown handler for SIGTERM and SIGINT
 */
const handleGracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);

  // Stop background worker schedulers immediately
  try {
    notificationSchedulerService.stopScheduler();
    console.log('Background schedulers halted.');
  } catch (err) {
    console.error('Error stopping background schedulers:', err.message);
  }

  if (server) {
    // Terminate idle keep-alive connections to allow active requests to finish draining
    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }

    server.close(async () => {
      console.log('HTTP server closed. Draining completed.');
      try {
        await disconnectDB();
      } catch (err) {
        console.error('Error during MongoDB connection closure:', err.message);
      } finally {
        console.log('Graceful shutdown completed. Exiting process.');
        process.exit(0);
      }
    });

    // Force shutdown after 10s if connections fail to close in time
    setTimeout(() => {
      console.error('Forcefully terminating process due to shutdown timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err.message);
  handleGracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('CRITICAL UNHANDLED REJECTION:', reason instanceof Error ? reason.message : reason);
  handleGracefulShutdown('unhandledRejection');
});

/**
 * Startup flow:
 *   1. Load env  (done above)
 *   2. Connect to MongoDB
 *   3. Start Express server ONLY after a successful DB connection
 */
const start = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`EduFlow API running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

