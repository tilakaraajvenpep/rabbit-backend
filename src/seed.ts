import { db, client } from './db/index.js';
import { tenants, users } from './db/schema/index.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  try {
    // 1. Create Tenant
    const [tenant] = await db.insert(tenants).values({
      tenantCode: 'dev',
      tenantName: 'Dev Tenant',
    }).returning();

    const passwordHash = await bcrypt.hash('rabbit123', 10);

    // 2. Create Users
    const roles = [
      { email: 'superadmin@dev.com', role: 'SuperAdmin', fullName: 'Super Admin' },
      { email: 'sales@dev.com', role: 'Sales', fullName: 'Sales User' },
      { email: 'accounts@dev.com', role: 'Accounts', fullName: 'Accounts User' },
      { email: 'teamlead@dev.com', role: 'TeamLead', fullName: 'Team Lead' },
      { email: 'employee@dev.com', role: 'Employee', fullName: 'Employee User' },
      { email: 'pm@dev.com', role: 'ProjectManager', fullName: 'Project Manager' },
    ];

    for (const u of roles) {
      await db.insert(users).values({
        tenantId: tenant.tenantId,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash: passwordHash,
      });
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await client.end();
  }
}

seed();
