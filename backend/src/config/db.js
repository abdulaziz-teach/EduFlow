import mongoose from 'mongoose';

/**
 * Enterprise Production MongoDB Connection Module
 *
 * Features:
 * - Connection retry with exponential backoff
 * - Graceful shutdown and disconnection support
 * - Event logging without credential leakage
 * - Configurable connection pooling
 * - Safe Atlas / Replica Set compatibility
 */

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;

let isConnecting = false;

export const getMongoUri = () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Database connection configuration missing: MONGODB_URI (or MONGO_URI) is required.');
  }
  return uri;
};

export const getDbName = () => {
  return process.env.MONGODB_DB_NAME || 'eduflow';
};

// Safe URI string for logging (redacts username:password)
export const sanitizeMongoUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/[^@]+@/, '//***:***@');
};

const setupConnectionEvents = () => {
  if (mongoose.connection.listenerCount('connected') > 0) return;

  mongoose.connection.on('connected', () => {
    console.log(`MongoDB connected successfully to host: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB connection lost. Reconnection will be handled automatically by driver.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB connection re-established.');
  });
};

export const connectDB = async (retryCount = 0) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (mongoose.connection.readyState === 1) return mongoose.connection;
  }

  isConnecting = true;
  setupConnectionEvents();

  const uri = getMongoUri();
  const dbName = getDbName();

  const options = {
    dbName,
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 50,
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) || 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    isConnecting = false;
    return conn;
  } catch (error) {
    isConnecting = false;
    const sanitized = sanitizeMongoUri(uri);
    console.error(`MongoDB connection attempt ${retryCount + 1}/${MAX_RETRIES} failed (${sanitized}): ${error.message}`);

    if (retryCount < MAX_RETRIES - 1) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Retrying MongoDB connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }

    console.error('All MongoDB connection retries exhausted.');
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed gracefully.');
  }
};

export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export default connectDB;
