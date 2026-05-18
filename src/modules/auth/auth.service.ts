import { db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { and, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { redis } from '../../cache/redis.js';

/* -----------------------
   ENV SAFETY (NO FALLBACKS IN PROD)
------------------------ */
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets are missing in environment variables');
}

export class AuthService {

  /* -----------------------
     LOGIN
  ------------------------ */
  static async login({ email, password, tenantId }: any) {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.tenantId, tenantId),
        eq(users.isActive, true),
        eq(users.isDeleted, false)
      ),
    });

    if (!user) {
      const err = new Error('Invalid credentials');
      (err as any).status = 401;
      throw err;
    }

    if (!user.passwordHash) {
      const err = new Error('User password not set');
      (err as any).status = 500;
      throw err;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      const err = new Error('Invalid credentials');
      (err as any).status = 401;
      throw err;
    }

    const accessToken = jwt.sign(
      { userId: user.userId, tenantId: user.tenantId, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    const refreshToken = jwt.sign(
      { userId: user.userId },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN as any }
    );

    /* -----------------------
       SAFE REDIS STORAGE
    ------------------------ */
    try {
      await redis.connect().catch(() => {});
      await redis.set(`refresh:${user.userId}`, refreshToken, {
        EX: 7 * 24 * 60 * 60,
      });
    } catch (err) {
      console.warn('Redis not available, skipping refresh token storage');
    }

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  /* -----------------------
     REFRESH TOKEN
  ------------------------ */
  static async refresh({ refreshToken }: { refreshToken: string }) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const userId = decoded.userId;

      const user = await db.query.users.findFirst({
        where: and(
          eq(users.userId, userId),
          eq(users.isActive, true)
        ),
      });

      if (!user) {
        throw new Error('User not found');
      }

      const accessToken = jwt.sign(
        { userId: user.userId, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.userId },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN as any }
      );

      try {
        await redis.set(`refresh:${user.userId}`, newRefreshToken, {
          EX: 7 * 24 * 60 * 60,
        });
      } catch {}

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };

    } catch {
      const err = new Error('Invalid refresh token');
      (err as any).status = 401;
      throw err;
    }
  }

  /* -----------------------
     LOGOUT
  ------------------------ */
  static async logout(userId: number) {
    try {
      await redis.del(`refresh:${userId}`);
    } catch {}

    return { success: true };
  }
}