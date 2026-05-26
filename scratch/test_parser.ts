import { parseScopeDocumentText } from '../src/modules/document/document.parser.js';

const sampleText = `
Project Scope for Lebra LMS
Expected Start Date: 2026-06-01

1. Itemized Cost & Budget Table
- UI/UX Mockups & Design Phase: $120,000 - 80 hours
- Backend API Development & Core Infrastructure: $450,000 - 320 hours
- Frontend Dashboard Assembly & Integration: $350,000 - 240 hours
- Testing, Deployment & Documentation: $80,000 - 60 hours

2. Milestones & Payment Schedule
- Milestone 1: UX Sign-off - Jan 15, 2026 - $50,000 - Complete mockup designs
- Milestone 2: DB Schema Setup - Jan 30, 2026 - $40,000 - Database setup on AWS
- Milestone 3: Authentication Module - Feb 15, 2026 - $60,000 - Login and JWT setup
- Milestone 4: Core APIs - Feb 28, 2026 - $100,000 - CRUD operations for courses
- Milestone 5: Frontend Layout - Mar 15, 2026 - $80,000 - Assemble the main dashboard
- Milestone 6: Video Streaming Integration - Mar 30, 2026 - $120,000 - Setup HLS player
- Milestone 7: Quiz Engine - Apr 15, 2026 - $70,000 - Implement interactive quizzes
- Milestone 8: Payments & Credits - Apr 30, 2026 - $90,000 - Stripe checkout setup
- Milestone 9: QA & Bug Fixing - May 15, 2026 - $50,000 - Resolve all critical issues
- Milestone 10: Production Launch - May 30, 2026 - $40,000 - Live release
`;

// Log line regex matches directly
const lines = sampleText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
for (const line of lines) {
  const milestoneMatch = line.match(/(?:milestone|deliverable|m)\s*(\d+)/i);
  console.log(`Line: "${line}" -> milestoneMatch:`, milestoneMatch ? milestoneMatch[0] : null);
}

const result = parseScopeDocumentText(sampleText, new Date('2026-06-01'));
console.log('PARSED RESULT:');
console.log('BUDGET:', JSON.stringify(result.budgetTable, null, 2));
console.log('MILESTONES count:', result.milestones.length);
console.log('MILESTONES:', JSON.stringify(result.milestones, null, 2));
console.log('TOTAL HOURS:', result.totalHours);
console.log('BUFFER HOURS:', result.bufferHours);
console.log('ESTIMATED COMPLETION DATE:', result.estimatedCompletionDate);
