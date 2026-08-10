import mongoose from 'mongoose';

/**
 * Global cache maintains warm database connection pool across API routes and HMR
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.warn('MONGODB_URI environment variable is missing.');
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 20, // Maintain up to 20 warm socket connections
      minPoolSize: 5,  // Keep 5 warm connections open for 0ms handshake latency
      socketTimeoutMS: 30000,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      m.set('autoIndex', false); // Disable auto-indexing in production for maximum throughput
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
