import { db } from '../src/db/index.js';
import { projects, scopeDocuments } from '../src/db/schema/index.js';

async function main() {
  const allProjects = await db.select().from(projects);
  console.log("PROJECTS:");
  console.log(JSON.stringify(allProjects, null, 2));

  const allDocs = await db.select().from(scopeDocuments);
  console.log("DOCUMENTS:");
  console.log(JSON.stringify(allDocs, null, 2));
  
  process.exit(0);
}

main();
