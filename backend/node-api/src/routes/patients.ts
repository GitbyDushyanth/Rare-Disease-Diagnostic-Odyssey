import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditLog } from '../middleware/audit';
import { validateBody, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// All patient routes require authentication
router.use(requireAuth);

// ── Schemas ───────────────────────────────────────────────────────────────────
const CreatePatientSchema = z.object({
  userId: z.string().uuid(),
  dateOfBirth: z.string(),
  organizationId: z.string().uuid().optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  primaryLanguage: z.string().default('en'),
  lifeStatus: z.enum(['alive', 'deceased']).default('alive'),
});

const UpdatePatientSchema = z.object({
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  primaryLanguage: z.string().optional(),
  lifeStatus: z.enum(['alive', 'deceased']).optional(),
  isDeceased: z.boolean().optional(),
  deceasedDate: z.string().optional(),
});

const AddContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isPrimary: z.boolean().default(false),
});

const AddConditionSchema = z.object({
  icdCode: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['active', 'resolved', 'inactive', 'suspected']).default('active'),
  onsetDate: z.string().optional(),
  notes: z.string().optional(),
});

// ── GET /api/v1/patients — list (clinician/admin only) ────────────────────────
router.get(
  '/',
  requireRole(['clinician', 'admin', 'researcher']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;

      const where = search
        ? {
            user: {
              OR: [
                { fullName: { contains: search } },
                { email: { contains: search } },
              ],
            },
          }
        : {};

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: { select: { fullName: true, email: true, role: true } },
            conditions: { where: { status: 'active' }, take: 3 },
            _count: { select: { symptomEntries: true, documents: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.patient.count({ where }),
      ]);

      res.json({
        success: true,
        data: patients,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/patients/me — patient's own record ────────────────────────────
router.get('/me', async (req: AuthenticatedRequest, res, next) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.user!.sub },
      include: {
        user: { select: { fullName: true, email: true, phone: true, profile: true } },
        contacts: true,
        conditions: { where: { status: 'active' } },
        medications: { where: { status: 'active' } },
        _count: {
          select: {
            symptomEntries: true,
            documents: true,
            genomicSamples: true,
            trialMatches: true,
          },
        },
      },
    });
    if (!patient) throw AppError.notFound('Patient record not found');
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/patients/:id ──────────────────────────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { fullName: true, email: true, phone: true, profile: true } },
        contacts: true,
        conditions: true,
        medications: { where: { status: 'active' } },
        encounters: { orderBy: { startDate: 'desc' }, take: 10 },
        observations: { orderBy: { createdAt: 'desc' }, take: 20 },
        diagnosticSuggestions: { orderBy: { rank: 'asc' }, take: 5 },
        _count: {
          select: {
            symptomEntries: true,
            documents: true,
            genomicSamples: true,
            trialMatches: true,
            cases: true,
          },
        },
      },
    });

    if (!patient) throw AppError.notFound('Patient not found');

    // Patients can only view their own record
    if (req.user!.role === 'patient' && patient.userId !== req.user!.sub) {
      throw AppError.forbidden('You can only access your own patient record');
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/patients ─────────────────────────────────────────────────────
router.post(
  '/',
  requireRole(['clinician', 'admin']),
  validateBody(CreatePatientSchema),
  auditLog({ resource: 'patient' }),
  async (req, res, next) => {
    try {
      const patient = await prisma.patient.create({
        data: {
          id: uuidv4(),
          ...req.body,
          dateOfBirth: new Date(req.body.dateOfBirth),
          mrn: `MRN-${Date.now()}`,
        },
      });
      res.status(201).json({ success: true, data: patient });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/v1/patients/:id ────────────────────────────────────────────────
router.patch(
  '/:id',
  validateBody(UpdatePatientSchema),
  auditLog({ resource: 'patient' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const existing = await prisma.patient.findUnique({ where: { id: req.params.id } });
      if (!existing) throw AppError.notFound('Patient not found');
      if (req.user!.role === 'patient' && existing.userId !== req.user!.sub) {
        throw AppError.forbidden('Cannot update another patient\'s record');
      }
      const updated = await prisma.patient.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          ...(req.body.deceasedDate && { deceasedDate: new Date(req.body.deceasedDate) }),
        },
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/patients/:id/contacts ───────────────────────────────────────
router.post(
  '/:id/contacts',
  validateBody(AddContactSchema),
  auditLog({ resource: 'patient_contact' }),
  async (req, res, next) => {
    try {
      const contact = await prisma.patientContact.create({
        data: { id: uuidv4(), patientId: req.params.id, ...req.body },
      });
      res.status(201).json({ success: true, data: contact });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/patients/:id/conditions ──────────────────────────────────────
router.get('/:id/conditions', async (req, res, next) => {
  try {
    const conditions = await prisma.condition.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: conditions });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/patients/:id/conditions ─────────────────────────────────────
router.post(
  '/:id/conditions',
  requireRole(['clinician', 'admin']),
  validateBody(AddConditionSchema),
  auditLog({ resource: 'condition' }),
  async (req, res, next) => {
    try {
      const condition = await prisma.condition.create({
        data: {
          id: uuidv4(),
          patientId: req.params.id,
          ...req.body,
          onsetDate: req.body.onsetDate ? new Date(req.body.onsetDate) : undefined,
        },
      });
      res.status(201).json({ success: true, data: condition });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/patients/:id/encounters ──────────────────────────────────────
router.get('/:id/encounters', async (req, res, next) => {
  try {
    const encounters = await prisma.encounter.findMany({
      where: { patientId: req.params.id },
      orderBy: { startDate: 'desc' },
    });
    res.json({ success: true, data: encounters });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/patients/:id/timeline ────────────────────────────────────────
router.get('/:id/timeline', async (req: AuthenticatedRequest, res, next) => {
  try {
    const patientId = req.params.id;
    const [symptoms, encounters, conditions, documents] = await Promise.all([
      prisma.symptomEntry.findMany({ where: { patientId }, orderBy: { date: 'desc' }, take: 50 }),
      prisma.encounter.findMany({ where: { patientId }, orderBy: { startDate: 'desc' }, take: 20 }),
      prisma.condition.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } }),
      prisma.document.findMany({ where: { patientId }, orderBy: { uploadedAt: 'desc' }, take: 20 }),
    ]);

    const timeline = [
      ...symptoms.map((s) => ({ type: 'symptom', date: s.date, data: s })),
      ...encounters.map((e) => ({ type: 'encounter', date: e.startDate, data: e })),
      ...conditions.map((c) => ({ type: 'condition', date: c.createdAt, data: c })),
      ...documents.map((d) => ({ type: 'document', date: d.uploadedAt, data: d })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, data: timeline });
  } catch (err) {
    next(err);
  }
});

export default router;
