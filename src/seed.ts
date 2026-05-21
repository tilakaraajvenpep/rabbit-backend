import { db } from './db/index.js';
import { tenants, users } from './db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function seedDB() {
  console.log('Running idempotent database seeding...');

  try {
    const passwordHash = await bcrypt.hash('rabbit123', 10);

    // Define the tenants and their respective user lists
    const seedData = [
      {
        code: 'dev',
        name: 'Dev Tenant',
        usersList: [
          { email: 'superadmin@dev.com', role: 'SuperAdmin', fullName: 'Super Admin' },
          { email: 'superadmin@rabbit4.0.com', role: 'SuperAdmin', fullName: 'Super Admin' },
          { email: 'sales@dev.com', role: 'Sales', fullName: 'Sales User' },
          { email: 'accounts@dev.com', role: 'Accounts', fullName: 'Accounts User' },
          { email: 'teamlead@dev.com', role: 'TeamLead', fullName: 'Team Lead' },
          { email: 'employee@dev.com', role: 'Employee', fullName: 'Employee User' },
          { email: 'pm@dev.com', role: 'ProjectManager', fullName: 'Project Manager' },
        ]
      },
      {
        code: 'acme',
        name: 'Acme Corp',
        usersList: [
          { email: 'admin@acme.com', role: 'TenantAdmin', fullName: 'Tenant Admin' },
          { email: 'sales@acme.com', role: 'Sales', fullName: 'Sales Manager' },
          { email: 'accounts@acme.com', role: 'Accounts', fullName: 'Accounts Head' },
          { email: 'lead@acme.com', role: 'TeamLead', fullName: 'Team Lead' },
          { email: 'emp@acme.com', role: 'Employee', fullName: 'John Employee' },
          { email: 'pm@acme.com', role: 'ProjectManager', fullName: 'Sarah PM' },
        ]
      },
      {
        code: 'venpep',
        name: 'Venpep Tenant',
        usersList: [
          { email: 'admin@venpep.com', role: 'TenantAdmin', fullName: 'Venpep Admin' },
          { email: 'raj@venpep.com', role: 'TenantAdmin', fullName: 'Raj Tenant Admin' },
          { email: 'sales@venpep.com', role: 'Sales', fullName: 'Venpep Sales' },
          { email: 'accounts@venpep.com', role: 'Accounts', fullName: 'Venpep Accounts' },
          { email: 'lead@venpep.com', role: 'TeamLead', fullName: 'Venpep Team Lead' },
          { email: 'emp@venpep.com', role: 'Employee', fullName: 'Venpep Employee' },
          { email: 'pm@venpep.com', role: 'ProjectManager', fullName: 'Venpep Project Manager' },
        ]
      }
    ];

    for (const tData of seedData) {
      // 1. Resolve or Create Tenant
      let tenant = await db.query.tenants.findFirst({
        where: eq(tenants.tenantCode, tData.code)
      });

      if (!tenant) {
        console.log(`🌱 Creating missing tenant: ${tData.code}`);
        const [newTenant] = await db.insert(tenants).values({
          tenantCode: tData.code,
          tenantName: tData.name,
        }).returning();
        tenant = newTenant;
      } else {
        console.log(`✔ Tenant exists: ${tData.code}`);
      }

      // 2. Resolve or Create Users
      for (const u of tData.usersList) {
        const existingUser = await db.query.users.findFirst({
          where: and(eq(users.email, u.email), eq(users.tenantId, tenant.tenantId))
        });

        if (!existingUser) {
          console.log(`  🌱 Creating missing user: ${u.email} (${u.role})`);
          await db.insert(users).values({
            tenantId: tenant.tenantId,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            passwordHash: passwordHash,
            isActive: true,
          });
        } else {
          // If user exists, let's verify or update role/name if they are out of sync
          if (existingUser.role !== u.role || existingUser.fullName !== u.fullName) {
            console.log(`  🔄 Updating existing user: ${u.email}`);
            await db.update(users)
              .set({ role: u.role, fullName: u.fullName })
              .where(eq(users.userId, existingUser.userId));
          }
        }
      }
    }

    console.log('Database seeding verified and up to date!');
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
