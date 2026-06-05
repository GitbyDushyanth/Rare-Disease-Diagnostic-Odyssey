import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validateBody, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = express.Router();
router.use(requireAuth);

// ── GET /api/v1/notifications ────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const unreadOnly = req.query.unread === 'true';

    const where = {
      userId: req.user!.sub,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.sub, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/v1/notifications/:id/read ─────────────────────────────────────
router.patch('/:id/read', async (req: AuthenticatedRequest, res, next) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif) throw AppError.notFound('Notification not found');
    if (notif.userId !== req.user!.sub) throw AppError.forbidden('Not your notification');

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/notifications/read-all ──────────────────────────────────────
router.post('/read-all', async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/v1/notifications/:id ─────────────────────────────────────────
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif) throw AppError.notFound('Notification not found');
    if (notif.userId !== req.user!.sub) throw AppError.forbidden('Not your notification');

    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/notifications/send (admin only) ─────────────────────────────
const SendSchema = z.object({
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string().min(1),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

router.post(
  '/send',
  validateBody(SendSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (req.user!.role !== 'admin') throw AppError.forbidden('Admin only');
      const notif = await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: req.body.userId,
          type: req.body.type,
          title: req.body.title,
          message: req.body.message,
          metadata: req.body.metadata ? JSON.stringify(req.body.metadata) : undefined,
        },
      });
      res.status(201).json({ success: true, data: notif });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
