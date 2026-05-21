import { db } from './db/index.js';
import { tenants, users } from './db/schema/index.js';
import bcrypt from 'bcryptjs';

export async function seedDB() {
  console.log('Seeding database...');

  try {
    const passwordHash = await bcrypt.hash('rabbit123', 10);

    // 1. Seed 'dev' tenant and users
    console.log('Seeding dev tenant...');
    const [devTenant] = await db.insert(tenants).values({
      tenantCode: 'dev',
      tenantName: 'Dev Tenant',
    }).returning();

    const devUsers = [
      { email: 'superadmin@dev.com', role: 'SuperAdmin', fullName: 'Super Admin' },
      { email: 'superadmin@rabbit4.0.com', role: 'SuperAdmin', fullName: 'Super Admin' },
      { email: 'sales@dev.com', role: 'Sales', fullName: 'Sales User' },
      { email: 'accounts@dev.com', role: 'Accounts', fullName: 'Accounts User' },
      { email: 'teamlead@dev.com', role: 'TeamLead', fullName: 'Team Lead' },
      { email: 'employee@dev.com', role: 'Employee', fullName: 'Employee User' },
      { email: 'pm@dev.com', role: 'ProjectManager', fullName: 'Project Manager' },
    ];

    for (const u of devUsers) {
      await db.insert(users).values({
        tenantId: devTenant.tenantId,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash: passwordHash,
      });
    }

    // 2. Seed 'acme' tenant and users
    console.log('Seeding acme tenant...');
    const [acmeTenant] = await db.insert(tenants).values({
      tenantCode: 'acme',
      tenantName: 'Acme Corp',
    }).returning();

    const acmeUsers = [
      { email: 'admin@acme.com', role: 'TenantAdmin', fullName: 'Tenant Admin' },
      { email: 'sales@acme.com', role: 'Sales', fullName: 'Sales Manager' },
      { email: 'accounts@acme.com', role: 'Accounts', fullName: 'Accounts Head' },
      { email: 'lead@acme.com', role: 'TeamLead', fullName: 'Team Lead' },
      { email: 'emp@acme.com', role: 'Employee', fullName: 'John Employee' },
      { email: 'pm@acme.com', role: 'ProjectManager', fullName: 'Sarah PM' },
    ];

    for (const u of acmeUsers) {
      await db.insert(users).values({
        tenantId: acmeTenant.tenantId,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash: passwordHash,
      });
    }

    // 3. Seed 'venpep' tenant and users
    console.log('Seeding venpep tenant...');
    const [venpepTenant] = await db.insert(tenants).values({
      tenantCode: 'venpep',
      tenantName: 'Venpep Tenant',
    }).returning();

    const venpepUsers = [
      { email: 'admin@venpep.com', role: 'TenantAdmin', fullName: 'Venpep Admin' },
      { email: 'raj@venpep.com', role: 'TenantAdmin', fullName: 'Raj Tenant Admin' },
    ];

    for (const u of venpepUsers) {
      await db.insert(users).values({
        tenantId: venpepTenant.tenantId,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash: passwordHash,
      });
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
}

// Support direct running of script
if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  const { client } = await import('./db/index.js');
  seedDB()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await client.end();
      process.exit(0);
    });
}
