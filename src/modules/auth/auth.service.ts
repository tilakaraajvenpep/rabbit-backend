import { db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { and, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import redis from '../../cache/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthService {
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

    // Store refresh token in Redis (if open)
    try {
      if (redis.isOpen) {
        await redis.set(`refresh:${user.userId}`, refreshToken, {
          EX: 7 * 24 * 60 * 60, // 7 days
        });
      }
    } catch (err) {
      console.error('Redis error during login:', err);
      // Non-blocking, continue login
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return { accessToken, refreshToken, user: userWithoutPassword };
  }

  static async refresh({ refreshToken }: { refreshToken: string }) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const userId = decoded.userId;

      // Check Redis
      if (redis.isOpen) {
        const storedToken = await redis.get(`refresh:${userId}`);
        if (storedToken !== refreshToken) throw new Error('Invalid refresh token');
      }

      const user = await db.query.users.findFirst({
        where: and(eq(users.userId, userId), eq(users.isActive, true)),
      });

      if (!user) throw new Error('User not found');

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

      if (redis.isOpen) {
        await redis.set(`refresh:${user.userId}`, newRefreshToken, {
          EX: 7 * 24 * 60 * 60,
        });
      }

      return { accessToken, refreshToken: newRefreshToken };
    } catch (err) {
      throw new Error('Invalid refresh token');
    }
  }

  static async logout(userId: number) {
    if (redis.isOpen) {
      await redis.del(`refresh:${userId}`);
    }
    return { success: true };
  }
}
