import { client } from './db/index.js';
import 'dotenv/config';

async function clearDb() {
  console.log('Clearing database...');
  try {
    await client`DROP SCHEMA public CASCADE`;
    await client`CREATE SCHEMA public`;
    console.log('Database cleared.');
  } catch (error) {
    console.error('Failed to clear database:', error);
  } finally {
    await client.end();
  }
}

clearDb();
