import { db } from '../src/db/index.js';
import { projects } from '../src/db/schema/index.js';
import { isNotNull, or } from 'drizzle-orm';

async function main() {
  const nonNullProjects = await db.select()
    .from(projects)
    .where(or(isNotNull(projects.budgetTable), isNotNull(projects.milestones)));
    
  console.log(`Found ${nonNullProjects.length} projects with budgetTable or milestones`);
  for (const p of nonNullProjects) {
    console.log(`Project: ${p.projectName} (ID: ${p.projectId}, Code: ${p.projectCode})`);
    console.log(`- Status: ${p.status}`);
    console.log(`- budgetTable:`, JSON.stringify(p.budgetTable, null, 2));
    console.log(`- milestones:`, JSON.stringify(p.milestones, null, 2));
  }
  process.exit(0);
}

main();
