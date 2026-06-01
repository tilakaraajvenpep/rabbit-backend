import { db } from '../src/db/index.js';
import { projects } from '../src/db/schema/index.js';

async function main() {
  const allProjects = await db.select().from(projects);
  console.log(`Total projects in DB: ${allProjects.length}`);
  for (const p of allProjects) {
    console.log(`ID: ${p.projectId} | Name: ${p.projectName} | Status: ${p.status}`);
    console.log(`- budgetTable: ${typeof p.budgetTable} | ${JSON.stringify(p.budgetTable)}`);
    console.log(`- milestones: ${typeof p.milestones} | ${JSON.stringify(p.milestones)}`);
  }
  process.exit(0);
}

main();
