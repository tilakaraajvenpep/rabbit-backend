import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined in .env');
}

const connectionString = process.env.DATABASE_URL;

export const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(client, {
  schema
});

export async function connectDB() {
  try {
    await client`SELECT 1`;
    console.log('✅ PostgreSQL Connected');
  } catch (error) {
    console.error('❌ Database Connection Failed:', error);
    process.exit(1);
  }
}