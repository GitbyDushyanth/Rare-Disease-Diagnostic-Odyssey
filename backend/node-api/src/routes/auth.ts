import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { validateBody } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { auditLog, writeAuditLog } from '../middleware/audit';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_dev_secret_32_chars_min';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'changeme_refresh_secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// ── Zod Schemas ───────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
  role: z.enum(['patient', 'clinician', 'lab', 'researcher', 'admin']).default('patient'),
  phone: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateTokens(userId: string, email: string, role: string) {
  const payload = { sub: userId, email, role };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
}

// ── POST /api/v1/auth/register ────────────────────────────────────────────────
router.post(
  '/register',
  validateBody(RegisterSchema),
  auditLog({ resource: 'auth' }),
  async (req, res, next) => {
    try {
      const { email, password, fullName, role, phone, country, dateOfBirth, gender } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw AppError.conflict('Email already registered');

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          passwordHash,
          fullName,
          role,
          phone,
          country,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          profile: { create: { id: uuidv4() } },
        },
        select: { id: true, email: true, fullName: true, role: true, createdAt: true },
      });

      // If patient role, create patient record
      if (role === 'patient') {
        await prisma.patient.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            mrn: `MRN-${Date.now()}`,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('2000-01-01'),
          },
        });
      }

      const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

      // Persist refresh token
      await prisma.refreshToken.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { user, accessToken, refreshToken },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
router.post(
  '/login',
  validateBody(LoginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw AppError.unauthorized('Invalid credentials');

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) throw AppError.unauthorized('Invalid credentials');

      if (user.status !== 'active') throw AppError.forbidden('Account is suspended');

      const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

      await prisma.refreshToken.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await writeAuditLog({
        userId: user.id,
        action: 'LOGIN',
        resource: 'auth',
        details: { email },
        result: 'success',
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────────────
router.post(
  '/refresh',
  validateBody(RefreshSchema),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (!stored || stored.expiresAt < new Date()) {
        throw AppError.unauthorized('Refresh token expired or invalid');
      }

      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
        sub: string; email: string; role: string;
      };

      const { accessToken, refreshToken: newRefresh } = generateTokens(
        payload.sub, payload.email, payload.role
      );

      // Rotate refresh token
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
      await prisma.refreshToken.create({
        data: {
          id: uuidv4(),
          userId: payload.sub,
          token: newRefresh,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      res.json({
        success: true,
        data: { accessToken, refreshToken: newRefresh },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    // Revoke all tokens for this user if requested
    if (req.body.revokeAll && req.user?.sub) {
      await prisma.refreshToken.deleteMany({ where: { userId: req.user.sub } });
    }
    await writeAuditLog({ userId: req.user?.sub, action: 'LOGOUT', resource: 'auth' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true, email: true, fullName: true, role: true,
        phone: true, country: true, language: true, status: true, createdAt: true,
        profile: true,
      },
    });
    if (!user) throw AppError.notFound('User not found');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/v1/auth/me ─────────────────────────────────────────────────────
const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  profile: z.object({
    bio: z.string().optional(),
    specialty: z.string().optional(),
    institution: z.string().optional(),
    licenseNumber: z.string().optional(),
  }).optional(),
});

router.patch(
  '/me',
  requireAuth,
  validateBody(UpdateProfileSchema),
  auditLog({ resource: 'user_profile' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { profile, ...userData } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user!.sub },
        data: {
          ...userData,
          ...(profile && {
            profile: { update: profile },
          }),
        },
        select: {
          id: true, email: true, fullName: true, role: true,
          phone: true, country: true, language: true, profile: true,
        },
      });
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
