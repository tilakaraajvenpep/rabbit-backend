import { db } from './db/index.js';
import { projects } from './db/schema/index.js';

async function checkProjects() {
  const all = await db.select().from(projects);
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}

checkProjects();
