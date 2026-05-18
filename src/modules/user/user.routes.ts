import { Router } from 'express';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.middleware.js';
import { success } from '../../utils/response.js';

const router = Router();

router.get('/', authenticate, async (req: any, res) => {
  const { tenantId, role: userRole } = req.user;
  const { role, tenantId: targetTenantId } = req.query;

  // SuperAdmin can see users of any tenant if specified, otherwise their own
  const effectiveTenantId = (userRole === 'SuperAdmin' && targetTenantId) 
    ? parseInt(targetTenantId as string) 
    : tenantId;

  let whereClause = and(eq(users.tenantId, effectiveTenantId), eq(users.isDeleted, false));
  
  if (role) {
    whereClause = and(whereClause, eq(users.role, role as string));
  }

  const allUsers = await db.select({
    id: users.userId,
    name: users.fullName,
    email: users.email,
    role: users.role,
    isActive: users.isActive
  })
    .from(users)
    .where(whereClause);

  return success(res, allUsers);
});

import bcrypt from 'bcryptjs';

router.post('/', authenticate, async (req: any, res, next) => {
  try {
    const { tenantId, role: userRole } = req.user;
    const { fullName, email, password, role, tenantId: targetTenantId } = req.body;

    // SuperAdmin can specify tenantId, others are locked to their own
    const effectiveTenantId = (userRole === 'SuperAdmin' && targetTenantId) 
      ? parseInt(targetTenantId as string) 
      : tenantId;

    if (!effectiveTenantId) throw new Error('Valid tenantId is required');

    // Check if user already exists in this tenant
    const existing = await db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.tenantId, effectiveTenantId))
    });

    if (existing) {
      console.log('User already exists:', { email, tenantId: effectiveTenantId });
      return res.status(400).json({ success: false, message: 'User already exists in this tenant' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      tenantId: effectiveTenantId,
      fullName,
      email,
      passwordHash,
      role,
      isActive: true
    }).returning();

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return success(res, userWithoutPassword, 'User created', 201);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const [user] = await db.select().from(users).where(and(eq(users.userId, parseInt(id)), eq(users.tenantId, tenantId)));
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [updatedUser] = await db.update(users)
      .set({ isActive: !user.isActive, updatedAt: new Date() })
      .where(eq(users.userId, parseInt(id)))
      .returning();

    return success(res, updatedUser, 'Status updated');
  } catch (err) {
    next(err);
  }
});

router.put('/:id/role', authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const { tenantId } = req.user;

    const [updatedUser] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.userId, parseInt(id)), eq(users.tenantId, tenantId)))
      .returning();

    return success(res, updatedUser, 'Role updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const [user] = await db.select().from(users).where(and(eq(users.userId, parseInt(id)), eq(users.tenantId, tenantId)));
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await db.update(users)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(users.userId, parseInt(id)));

    return success(res, null, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
