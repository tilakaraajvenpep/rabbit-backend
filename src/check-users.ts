import { db } from './db/index.js';
import { users } from './db/schema/index.js';

async function checkUsers() {
  const allUsers = await db.select().from(users);
  console.log(JSON.stringify(allUsers, null, 2));
  process.exit(0);
}

checkUsers();
