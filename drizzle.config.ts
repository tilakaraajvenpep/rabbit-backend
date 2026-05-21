/// <reference types="node" />
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './dist/db/schema/index.js',
  out: './drizzle',
  dialect: 'postgresql',

  dbCredentials: {
    url: process.env.DATABASE_URL!, // ✅ correct key
  },
});