import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function run() {
  try {
    await db.execute(sql`ALTER TABLE tickets ADD COLUMN progress_state VARCHAR(50) DEFAULT 'InProgress';`);
    await db.execute(sql`ALTER TABLE tickets ADD COLUMN status_notes TEXT;`);
    console.log('Columns added successfully');
  } catch (error: any) {
    // If it says column already exists, that's fine too.
    if (error.message.includes('already exists')) {
      console.log('Columns already exist');
    } else {
      console.error('Error adding columns:', error);
    }
  }
  process.exit(0);
}
run();
