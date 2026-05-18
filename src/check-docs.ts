import { db } from './db/index.js';
import { scopeDocuments } from './db/schema/index.js';

async function checkDocs() {
  const docs = await db.select().from(scopeDocuments);
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
}

checkDocs();
