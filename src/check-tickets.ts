import { db } from './db/index.js';
import { tickets } from './db/schema/index.js';

async function checkTickets() {
  const allTickets = await db.select().from(tickets);
  console.log(JSON.stringify(allTickets, null, 2));
  process.exit(0);
}

checkTickets();
