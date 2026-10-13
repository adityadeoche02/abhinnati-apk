import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export interface JwtPayload {
  userId: string;
  phone: string;
  role: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment');
  }
  return secret;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' });
}

export function requireRole(user: { role: string }, allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions for this operation');
  }
}

export async function verifyAuth(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token || token === 'mock_jwt_token_auth_verified') {
      // Disallow mock token bypasses for real API requests
      return null;
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (!decoded || !decoded.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { vendorProfile: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      return null;
    }

    return user;
  } catch (error: any) {
    // Return null on expired or invalid token without leaking secrets in logs
    return null;
  }
}
