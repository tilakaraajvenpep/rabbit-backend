import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in .env');
}

const connectionString = process.env.DATABASE_URL;

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });
