import { db } from '../../db/index.js';
import { tenants } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import redis from '../../cache/redis.js';

export class TenantService {
  static async resolveTenant(tenantCode: string) {
    const cacheKey = `tenant:${tenantCode}`;
    
    // Check Cache
    if (redis.isOpen) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    // Query DB
    const tenant = await db.query.tenants.findFirst({
      where: and(eq(tenants.tenantCode, tenantCode), eq(tenants.isDeleted, false)),
    });

    if (!tenant) {
      const err = new Error('Tenant not found');
      (err as any).status = 404;
      throw err;
    }

    if (!tenant.isActive) {
      const err = new Error('Tenant is inactive');
      (err as any).status = 403;
      throw err;
    }

    // Cache for 5 minutes
    if (redis.isOpen) {
      await redis.set(cacheKey, JSON.stringify(tenant), {
        EX: 300,
      });
    }

    return tenant;
  }

  static async listTenants() {
    return await db.query.tenants.findMany({
      where: eq(tenants.isDeleted, false),
    });
  }

  static async getTenantById(id: number) {
    return await db.query.tenants.findFirst({
      where: and(eq(tenants.tenantId, id), eq(tenants.isDeleted, false)),
    });
  }

  static async createTenant(data: any) {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  }

  static async updateTenant(id: number, data: any) {
    const [tenant] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tenants.tenantId, id), eq(tenants.isDeleted, false)))
      .returning();
    return tenant;
  }

  static async updateStatus(id: number, isActive: boolean) {
    const [tenant] = await db
      .update(tenants)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(tenants.tenantId, id), eq(tenants.isDeleted, false)))
      .returning();
    return tenant;
  }
}
