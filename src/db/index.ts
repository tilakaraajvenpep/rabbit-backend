import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { tenants } from './schema/index.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { seedDB } from '../seed.js';
import path from 'path';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined');
}

const isProduction = process.env.NODE_ENV === 'production';

export const client = postgres(process.env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,

  /* -----------------------
     IMPORTANT FIX FOR RENDER / CLOUD DB
  ------------------------ */
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

export const db = drizzle(client, {
  schema,
});

export async function connectDB() {
  try {
    await client`SELECT 1`;
    console.log('✅ PostgreSQL Connected');

    // Run programmatic migrations
    console.log('🔄 Running database migrations...');
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    console.log('✅ Database migrations applied successfully!');

    // Check if auto-seeding is needed
    const existingTenants = await db.select().from(tenants).limit(1);
    if (existingTenants.length === 0) {
      console.log('🌱 Database is empty. Running auto-seeding...');
      await seedDB();
      console.log('✅ Auto-seeding completed successfully!');
    }
  } catch (error) {
    console.error('❌ Database Sync / Connection Failed:', error);
    if (isProduction) {
      process.exit(1);
    }
  }
}