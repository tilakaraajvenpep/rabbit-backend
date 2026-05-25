import { Router } from 'express';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.middleware.js';
import { success } from '../../utils/response.js';
import bcrypt from 'bcryptjs';


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
    isActive: users.isActive,
    allocatedHours: users.allocatedHours,
    costPerHour: users.costPerHour,
    teamLeadId: users.teamLeadId
  })
    .from(users)
    .where(whereClause);

  return success(res, allUsers);
});

// POST /users — create a new user within the admin's tenant
router.post('/', authenticate, async (req: any, res, next) => {
  try {
    const { tenantId, role: userRole } = req.user;

    if (userRole !== 'TenantAdmin' && userRole !== 'SuperAdmin') {
      return res.status(403).json({ success: false, message: 'Only TenantAdmin can create users' });
    }

    const { fullName, email, password, role, costPerHour, teamLeadId, tenantId: bodyTenantId } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'fullName, email, password and role are required' });
    }

    // Determine target tenant ID
    const targetTenantId = (userRole === 'SuperAdmin' && bodyTenantId)
      ? parseInt(bodyTenantId as string)
      : tenantId;

    // Check email uniqueness within tenant
    const [existing] = await db.select().from(users).where(and(eq(users.email, email), eq(users.tenantId, targetTenantId)));
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists in this tenant' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      tenantId: targetTenantId,
      fullName,
      email,
      passwordHash,
      role,
      costPerHour: costPerHour ? String(costPerHour) : '0.00',
      teamLeadId: teamLeadId ? parseInt(String(teamLeadId)) : null,
      isActive: true,
      isDeleted: false,
      allocatedHours: '8.50',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    const { passwordHash: _, ...safeUser } = newUser as any;
    return success(res, safeUser, 'User created successfully');
  } catch (err) {
    next(err);
  }
});

router.put('/:id/allocated-hours', authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { allocatedHours } = req.body;
    const { tenantId, role: userRole } = req.user;

    if (userRole !== 'TenantAdmin') {
      return res.status(403).json({ success: false, message: 'Only TenantAdmin can set allocated hours' });
    }

    if (allocatedHours === undefined || allocatedHours === null || Number(allocatedHours) < 0) {
      return res.status(400).json({ success: false, message: 'Invalid allocatedHours value' });
    }

    const [updatedUser] = await db.update(users)
      .set({ allocatedHours: String(allocatedHours), updatedAt: new Date() })
      .where(and(eq(users.userId, parseInt(id)), eq(users.tenantId, tenantId)))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found in this tenant' });
    }

    return success(res, { id: updatedUser.userId, allocatedHours: updatedUser.allocatedHours }, 'Allocated hours updated');
  } catch (err) {
    next(err);
  }
});



router.put('/:id/status', authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { tenantId, role: userRole } = req.user;

    let whereClause = eq(users.userId, parseInt(id));
    if (userRole !== 'SuperAdmin') {
      whereClause = and(whereClause, eq(users.tenantId, tenantId)) as any;
    }

    const [user] = await db.select().from(users).where(whereClause);
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
    const { tenantId, role: userRole } = req.user;

    let whereClause = eq(users.userId, parseInt(id));
    if (userRole !== 'SuperAdmin') {
      whereClause = and(whereClause, eq(users.tenantId, tenantId)) as any;
    }

    const [updatedUser] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(whereClause)
      .returning();

    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });

    return success(res, updatedUser, 'Role updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { tenantId, role: userRole } = req.user;
    const userIdInt = parseInt(id);

    // Only TenantAdmin or SuperAdmin can delete users
    if (userRole !== 'TenantAdmin' && userRole !== 'SuperAdmin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    let whereClause = eq(users.userId, userIdInt);
    if (userRole !== 'SuperAdmin') {
      whereClause = and(whereClause, eq(users.tenantId, tenantId)) as any;
    }

    const [user] = await db.select().from(users).where(whereClause);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Cascade delete user associations to avoid foreign key violations:
    const { dailyReports, dailyReportItems, tickets, projects, auditLogs, leaves } = await import('../../db/schema/index.js');
    
    // 1. Delete daily report items associated with the user's reports
    const userReports = await db.select({ reportId: dailyReports.reportId }).from(dailyReports).where(eq(dailyReports.userId, userIdInt));
    const userReportIds = userReports.map(r => r.reportId);
    if (userReportIds.length > 0) {
      await db.delete(dailyReportItems).where(inArray(dailyReportItems.reportId, userReportIds));
    }
    // 2. Delete reports
    await db.delete(dailyReports).where(eq(dailyReports.userId, userIdInt));

    // 3. Clear ticket assignments
    await db.update(tickets).set({ assignedToUserId: null }).where(eq(tickets.assignedToUserId, userIdInt));

    // 4. Clear project assignments/creations
    await db.update(projects).set({ assignedTeamLeadId: null }).where(eq(projects.assignedTeamLeadId, userIdInt));
    await db.update(projects).set({ createdByUserId: null }).where(eq(projects.createdByUserId, userIdInt));

    // 5. Clear audit log references
    await db.update(auditLogs).set({ userId: null }).where(eq(auditLogs.userId, userIdInt));

    // 5.5 Delete associated leaves
    await db.delete(leaves).where(eq(leaves.userId, userIdInt));

    // 6. Hard delete the user
    await db.delete(users).where(eq(users.userId, userIdInt));

    return success(res, null, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: any, res, next) => {
  try {
    const { userId, tenantId } = req.user;
    const [user] = await db.select({
      id: users.userId,
      name: users.fullName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      allocatedHours: users.allocatedHours,
      createdAt: users.createdAt,
    }).from(users).where(and(eq(users.userId, userId), eq(users.tenantId, tenantId)));

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return success(res, user);
  } catch (err) {
    next(err);
  }
});

router.put('/me/profile', authenticate, async (req: any, res, next) => {
  try {
    const { userId } = req.user;
    const { fullName, email } = req.body;

    const [updatedUser] = await db.update(users)
      .set({ fullName, email, updatedAt: new Date() })
      .where(eq(users.userId, userId))
      .returning();

    const { passwordHash, ...userWithoutPassword } = updatedUser as any;
    return success(res, userWithoutPassword, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
});

router.put('/me/password', authenticate, async (req: any, res, next) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    const [user] = await db.select().from(users).where(eq(users.userId, userId));
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.userId, userId));

    return success(res, null, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
