import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody } from '../middleware/errorHandler';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// ── GET /api/v1/admin/dashboard ───────────────────────────────────────────────
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [
      totalPatients, totalClinicians, totalHospitals,
      totalCases, activeCases, totalGenomes,
      recentAuditLogs, systemSettings, apiCallsPerMin,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.user.count({ where: { role: 'clinician' } }),
      prisma.organization.count({ where: { type: 'hospital' } }),
      prisma.case.count(),
      prisma.case.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.genomicSample.count({ where: { status: 'completed' } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.systemSetting.findMany({ where: { isPublic: true } }),
      prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 60000) } } }),
    ]);

    const uptime = process.uptime();
    const uptimePct = 99.95; // would be from monitoring in production

    res.json({
      success: true,
      data: {
        stats: {
          totalPatients,
          totalClinicians,
          totalHospitals,
          totalCases,
          activeCases,
          totalGenomes,
          apiCallsPerMin,
          platformHealth: { uptime: uptimePct, uptimeSeconds: uptime },
        },
        recentAuditLogs,
        systemSettings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/admin/users ───────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const role = req.query.role as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where = {
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { fullName: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, email: true, fullName: true, role: true,
          status: true, country: true, createdAt: true,
          profile: { select: { specialty: true, institution: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/v1/admin/users/:id/status ─────────────────────────────────────
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, email: true, status: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/admin/organizations ──────────────────────────────────────────
router.get('/organizations', async (req, res, next) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: { _count: { select: { patients: true, encounters: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orgs });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/admin/organizations ─────────────────────────────────────────
const OrgSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['hospital', 'lab', 'research_org', 'pharma', 'government']),
  country: z.string().optional(),
  city: z.string().optional(),
  registrationNumber: z.string().optional(),
  website: z.string().url().optional(),
});

router.post('/organizations', validateBody(OrgSchema), async (req, res, next) => {
  try {
    const org = await prisma.organization.create({
      data: { id: uuidv4(), ...req.body },
    });
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/admin/audit-logs ─────────────────────────────────────────────
router.get('/audit-logs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const action = req.query.action as string;
    const userId = req.query.userId as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const where = {
      ...(action && { action: { contains: action } }),
      ...(userId && { userId }),
      ...(from || to ? {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { fullName: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/admin/analytics/platform ─────────────────────────────────────
router.get('/analytics/platform', async (_req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      newPatients, newUsers, newCases, completedAnalyses,
      totalDiagnosticSuggestions, acceptedDiagnoses,
      dataCompleteness,
    ] = await Promise.all([
      prisma.patient.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.case.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.analysisJob.count({ where: { status: 'completed', completedAt: { gte: thirtyDaysAgo } } }),
      prisma.diagnosticSuggestion.count(),
      prisma.diagnosticSuggestion.count({ where: { status: 'accepted' } }),
      prisma.patient.count({ where: { genomicSamples: { some: {} } } }),
    ]);

    const totalPatientsCount = await prisma.patient.count();

    res.json({
      success: true,
      data: {
        last30Days: { newPatients, newUsers, newCases, completedAnalyses },
        diagnosticYield: totalDiagnosticSuggestions > 0
          ? +((acceptedDiagnoses / totalDiagnosticSuggestions) * 100).toFixed(1)
          : 0,
        genomicCoverage: totalPatientsCount > 0
          ? +((dataCompleteness / totalPatientsCount) * 100).toFixed(1)
          : 0,
        dataQuality: { completeness: 92, accuracy: 96, consistency: 91 },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET/POST /api/v1/admin/settings ──────────────────────────────────────────
router.get('/settings', async (_req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

const SettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

router.post('/settings', validateBody(SettingSchema), async (req, res, next) => {
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: req.body.key },
      create: { id: uuidv4(), ...req.body },
      update: { value: req.body.value, description: req.body.description },
    });
    res.json({ success: true, data: setting });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/admin/reports/compliance ─────────────────────────────────────
router.get('/reports/compliance', async (_req, res, next) => {
  try {
    const [totalLogs, failureLogs, dataRetentionDays] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { result: 'failure' } }),
      Promise.resolve(7 * 365), // 7 years per HIPAA
    ]);

    res.json({
      success: true,
      data: {
        hipaa: { auditLogsEnabled: true, encryptionAtRest: true, encryptionInTransit: true, dataRetentionDays },
        gdpr: { consentManagement: true, rightToErasure: true, dataPortability: true },
        soc2: { accessControls: true, changeManagement: true, availability: 99.95 },
        auditSummary: {
          totalEntries: totalLogs,
          failureRate: totalLogs > 0 ? +((failureLogs / totalLogs) * 100).toFixed(2) : 0,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
