import mongoose from 'mongoose';
import { config } from './env.js';

export let isMongoConnected = false;

export async function connectDB(): Promise<typeof mongoose | null> {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    isMongoConnected = true;
    return conn;
  } catch (error: any) {
    console.warn(`[Database] Local MongoDB not reachable (${error?.message || 'connection failed'}). Running in resilient in-memory mode for local prototype.`);
    isMongoConnected = false;
    return null;
  }
}

export async function disconnectDB(): Promise<void> {
  if (isMongoConnected) {
    await mongoose.disconnect();
    isMongoConnected = false;
  }
}

