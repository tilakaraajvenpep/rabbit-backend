/**
 * One-time cleanup script: soft-delete all "Task:" prefixed tickets
 * that were auto-generated from budget items (now replaced by milestone-only generation).
 * 
 * Run with: npx tsx src/scripts/cleanup-task-tickets.ts
 */

import 'dotenv/config';
import { db } from '../db/index.js';
import { tickets } from '../db/schema/index.js';
import { like, eq, and } from 'drizzle-orm';

async function cleanupTaskTickets() {
  console.log('🔍 Looking for "Task:" prefixed tickets to clean up...\n');

  // First — list what we're about to remove
  const taskTickets = await db
    .select({
      ticketId: tickets.ticketId,
      ticketCode: tickets.ticketCode,
      title: tickets.title,
      projectId: tickets.projectId,
      status: tickets.status,
      isDeleted: tickets.isDeleted,
    })
    .from(tickets)
    .where(
      and(
        like(tickets.title, 'Task:%'),
        eq(tickets.isDeleted, false)
      )
    );

  if (taskTickets.length === 0) {
    console.log('✅ No "Task:" tickets found — database is already clean.');
    process.exit(0);
  }

  console.log(`Found ${taskTickets.length} "Task:" ticket(s) to remove:\n`);
  taskTickets.forEach(t => {
    console.log(`  [${t.ticketCode}] Project #${t.projectId} — "${t.title}" (status: ${t.status})`);
  });

  console.log('\n🗑️  Soft-deleting...');

  // Soft-delete all Task: tickets
  const result = await db
    .update(tickets)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(
      and(
        like(tickets.title, 'Task:%'),
        eq(tickets.isDeleted, false)
      )
    )
    .returning({ ticketId: tickets.ticketId, ticketCode: tickets.ticketCode });

  console.log(`\n✅ Successfully removed ${result.length} ticket(s):\n`);
  result.forEach(t => console.log(`  Deleted ticket #${t.ticketId} — ${t.ticketCode}`));

  // Verify milestone tickets are still intact
  const milestoneTickets = await db
    .select({
      ticketId: tickets.ticketId,
      ticketCode: tickets.ticketCode,
      title: tickets.title,
      projectId: tickets.projectId,
    })
    .from(tickets)
    .where(
      and(
        like(tickets.title, 'Milestone:%'),
        eq(tickets.isDeleted, false)
      )
    );

  console.log(`\n📋 Milestone tickets remaining in database: ${milestoneTickets.length}`);
  milestoneTickets.forEach(t => {
    console.log(`  [${t.ticketCode}] Project #${t.projectId} — "${t.title}"`);
  });

  console.log('\n🎉 Cleanup complete!');
  process.exit(0);
}

cleanupTaskTickets().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
