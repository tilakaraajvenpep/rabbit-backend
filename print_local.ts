import pg from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './src/db/schema/index.js';

async function checkLocal() {
  const localUrl = "postgresql://postgres:password@localhost:5432/rabbit40";
  console.log('Connecting to local database...');
  
  const client = pg(localUrl);
  const db = drizzle(client, { schema });

  try {
    const localTenants = await db.query.tenants.findMany();
    const localUsers = await db.query.users.findMany();

    console.log('=== LOCAL DATABASE TENANTS ===');
    console.log(localTenants);

    console.log('\n=== LOCAL DATABASE USERS ===');
    console.log(localUsers.map(u => ({
      userId: u.userId,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      tenantId: u.tenantId
    })));

  } catch (error) {
    console.error('Failed to read local database:', error);
  } finally {
    await client.end();
  }
}

checkLocal();
