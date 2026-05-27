import { db } from '../src/db/index.js';
import { projects } from '../src/db/schema/projects.js';

async function check() {
  try {
    console.log('Querying table structure or a project...');
    const result = await db.select().from(projects).limit(1);
    console.log('Success! Result:', result);
  } catch (e: any) {
    console.error('Error querying projects:', e.message);
  }
}

check();
