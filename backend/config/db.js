import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in case DNS override is not permitted
}
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const connectDB = async () => {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  } catch {
    // ignore
  }

  let mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ [Database Error] MONGO_URI is missing from .env');
    return;
  }

  // Handle special characters in password automatically
  try {
    const match = mongoUri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      const [, user, pass, rest] = match;
      if (pass.includes('@') || pass.includes('#') || pass.includes('$')) {
        mongoUri = `mongodb+srv://${user}:${encodeURIComponent(pass)}@${rest}`;
      }
    }

    const maskedUri = mongoUri.replace(/:([^@]+)@/, ':*****@');
    console.log(`📡 [Database] Connecting to MongoDB: ${maskedUri}`);

    await mongoose.connect(mongoUri);
    console.log(`✅ [Database] Connected to MongoDB Atlas! Database: "${mongoose.connection.name}" on host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`❌ [Database Connection Failed] ${error.message}`);
    if (error.message.includes('bad auth')) {
      console.error('\n⚠️ [Authentication Failed Diagnosis]');
      console.error('1. In MongoDB Atlas, go to "Security" -> "Database Access".');
      console.error('2. Ensure user "krishnavalleytech_db_user" exists with "Read and write to any database" role.');
      console.error('3. Reset the password in Atlas and put the same password into backend/.env.\n');
    }
  }
};

mongoose.connection.on('connected', () => {
  console.log('✅ [Database Event] Mongoose connected.');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ [Database Event] Mongoose error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ [Database Event] Mongoose disconnected.');
});
