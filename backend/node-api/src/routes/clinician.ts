import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditLog } from '../middleware/audit';
import { validateBody, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import aiClient from '../services/aiClient';

const router = express.Router();
router.use(requireAuth, requireRole(['clinician', 'admin']));

// ── GET /api/v1/clinician/dashboard ──────────────────────────────────────────
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [activeCases, urgentCases, recentSuggestions, pendingInterpretations, closedCases] =
      await Promise.all([
        prisma.case.count({ where: { status: { in: ['open', 'in_progress'] } } }),
        prisma.case.count({ where: { priority: 'urgent', status: { not: 'closed' } } }),
        prisma.diagnosticSuggestion.findMany({
          where: { status: 'new' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { patient: { include: { user: { select: { fullName: true } } } } },
        }),
        prisma.variantInterpretation.count({ where: { reviewStatus: 'pending' } }),
        prisma.case.findMany({ where: { status: 'closed', closedAt: { not: null } }, select: { createdAt: true, closedAt: true } })
      ]);

    let avgResolutionDays = 0;
    if (closedCases.length > 0) {
      const totalTimeMs = closedCases.reduce((acc, c) => acc + (new Date(c.closedAt!).getTime() - new Date(c.createdAt).getTime()), 0);
      avgResolutionDays = Math.round(totalTimeMs / closedCases.length / (1000 * 60 * 60 * 24));
    }

    res.json({
      success: true,
      data: {
        stats: {
          activeCases,
          urgentCases,
          pendingInterpretations,
          avgResolutionDays,
        },
        recentSuggestions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/clinician/cases ───────────────────────────────────────────────
router.get('/cases', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const priority = req.query.priority as string;

    const where = {
      ...(status && { status }),
      ...(priority && { priority }),
    };

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          patient: {
            include: {
              user: { select: { fullName: true, email: true, gender: true } },
              conditions: { where: { status: 'active' } },
              diagnosticSuggestions: { orderBy: { rank: 'asc' }, take: 5 },
            },
          },
          participants: { include: { user: { select: { fullName: true, role: true } } } },
          _count: { select: { messages: true, attachments: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.case.count({ where }),
    ]);

    res.json({
      success: true,
      data: cases,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/clinician/cases/:id ──────────────────────────────────────────
router.get('/cases/:id', async (req, res, next) => {
  try {
    const caseData = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true } },
            conditions: { where: { status: 'active' } },
            medications: { where: { status: 'active' } },
            diagnosticSuggestions: { orderBy: { rank: 'asc' }, take: 5 },
          },
        },
        participants: { include: { user: { select: { id: true, fullName: true, role: true, profile: true } } } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { fullName: true } } } },
        attachments: true,
      },
    });
    if (!caseData) throw AppError.notFound('Case not found');
    res.json({ success: true, data: caseData });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/clinician/cases ──────────────────────────────────────────────
const CreateCaseSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

router.post(
  '/cases',
  validateBody(CreateCaseSchema),
  auditLog({ resource: 'case' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const newCase = await prisma.case.create({
        data: {
          id: uuidv4(),
          ...req.body,
          createdBy: req.user!.sub,
          status: 'open',
          participants: {
            create: { id: uuidv4(), userId: req.user!.sub, role: 'owner' },
          },
        },
      });
      res.status(201).json({ success: true, data: newCase });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/v1/clinician/cases/:id ────────────────────────────────────────
const UpdateCaseSchema = z.object({
  status: z.enum(['open', 'in_progress', 'pending_review', 'closed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().optional(),
  aiFlag: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

router.patch(
  '/cases/:id',
  validateBody(UpdateCaseSchema),
  auditLog({ resource: 'case' }),
  async (req, res, next) => {
    try {
      const updated = await prisma.case.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          ...(req.body.status === 'closed' && { closedAt: new Date() }),
        },
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/clinician/cases/:id/messages ────────────────────────────────
const MessageSchema = z.object({
  message: z.string().min(1),
  type: z.enum(['text', 'system', 'ai_suggestion', 'file_shared']).default('text'),
});

router.post(
  '/cases/:id/messages',
  validateBody(MessageSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const msg = await prisma.caseMessage.create({
        data: {
          id: uuidv4(),
          caseId: req.params.id,
          senderId: req.user!.sub,
          message: req.body.message,
          type: req.body.type,
        },
        include: { sender: { select: { fullName: true } } },
      });
      res.status(201).json({ success: true, data: msg });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/clinician/differential ──────────────────────────────────────
const DifferentialSchema = z.object({
  patientId: z.string().uuid(),
  symptoms: z.array(z.string()).min(1),
  clinicalNotes: z.string().optional(),
  labValues: z.record(z.string(), z.unknown()).optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
});

router.post(
  '/differential',
  validateBody(DifferentialSchema),
  auditLog({ resource: 'differential_diagnosis' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { patientId, symptoms, clinicalNotes } = req.body;

      // Extract HPO terms from symptom descriptions
      const hpoTerms = await aiClient.extractHpoTerms(
        [symptoms.join(', '), clinicalNotes || ''].join('. ')
      );

      // Run disease similarity
      const hpoIds = hpoTerms.map((t: { id: string }) => t.id).filter(Boolean);
      const matches = await aiClient.rankDiseases(hpoIds.length > 0 ? hpoIds : symptoms);

      // Save as analysis job
      const job = await prisma.analysisJob.create({
        data: {
          id: uuidv4(),
          patientId,
          jobType: 'disease_similarity',
          status: 'completed',
          inputData: JSON.stringify({ symptoms, clinicalNotes, hpoTerms }),
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      await prisma.analysisResult.create({
        data: {
          id: uuidv4(),
          jobId: job.id,
          resultType: 'disease_matches',
          structuredData: JSON.stringify(matches),
          confidenceScore: matches[0]?.confidence ?? 0,
        },
      });

      const diagnosticSuggestions = matches.slice(0, 10).map((m, i) => ({
        id: uuidv4(),
        patientId,
        analysisJobId: job.id,
        diseaseName: m.diseaseName,
        diseaseId: m.diseaseId,
        confidenceScore: m.confidence,
        rank: i + 1,
        hpoOverlap: JSON.stringify(m.hpoOverlap),
        explanation: m.explanation,
      }));

      if (diagnosticSuggestions.length > 0) {
        await prisma.diagnosticSuggestion.deleteMany({ where: { patientId } });
        await prisma.diagnosticSuggestion.createMany({ data: diagnosticSuggestions });
      }

      res.json({
        success: true,
        data: {
          jobId: job.id,
          hpoTerms,
          differentialDiagnosis: matches,
          diagnosticSuggestions,
          suggestedTests: generateSuggestedTests(matches),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/clinician/care-plan ─────────────────────────────────────────
const CarePlanSchema = z.object({
  patientId: z.string().uuid(),
  caseId: z.string().uuid().optional(),
  primaryDiagnosis: z.string(),
  recommendedTests: z.array(z.string()),
  medications: z.array(z.string()).optional(),
  referrals: z.array(z.string()).optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  '/care-plan',
  validateBody(CarePlanSchema),
  auditLog({ resource: 'care_plan' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Store care plan as a case message + condition update
      if (req.body.caseId) {
        await prisma.caseMessage.create({
          data: {
            id: uuidv4(),
            caseId: req.body.caseId,
            senderId: req.user!.sub,
            type: 'system',
            message: `Care Plan Released: ${req.body.primaryDiagnosis}. Tests: ${req.body.recommendedTests.join(', ')}`,
            metadata: JSON.stringify(req.body),
          },
        });
      }

      // Create notification for patient
      const patient = await prisma.patient.findUnique({
        where: { id: req.body.patientId },
        select: { userId: true },
      });

      if (patient) {
        await prisma.notification.create({
          data: {
            id: uuidv4(),
            userId: patient.userId,
            type: 'diagnostic',
            title: 'New Care Plan Available',
            message: `Your clinician has created a care plan for: ${req.body.primaryDiagnosis}`,
            metadata: JSON.stringify({ caseId: req.body.caseId }),
          },
        });
      }

      res.status(201).json({
        success: true,
        message: 'Care plan created and patient notified',
        data: { carePlan: req.body, createdAt: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/clinician/specialists ────────────────────────────────────────
router.get('/specialists', async (req, res, next) => {
  try {
    const specialty = req.query.specialty as string;
    const specialists = await prisma.userProfile.findMany({
      where: {
        specialty: specialty ? { contains: specialty } : { not: null },
        user: {
          role: { in: ['clinician', 'lab'] },
          status: 'active',
        },
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
      take: 20,
    });

    res.json({ success: true, data: specialists });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/clinician/cases/:id/refer ───────────────────────────────────
const ReferSchema = z.object({
  specialistId: z.string().uuid(),
  reason: z.string().min(10),
  urgency: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
});

router.post(
  '/cases/:id/refer',
  validateBody(ReferSchema),
  auditLog({ resource: 'specialist_referral' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { specialistId, reason, urgency } = req.body;

      // Add specialist as participant
      await prisma.caseParticipant.upsert({
        where: { caseId_userId: { caseId: req.params.id, userId: specialistId } },
        create: { id: uuidv4(), caseId: req.params.id, userId: specialistId, role: 'specialist' },
        update: { role: 'specialist' },
      });

      // Notify specialist
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          userId: specialistId,
          type: 'alert',
          title: `New Case Referral (${urgency.toUpperCase()})`,
          message: `You have been referred to Case ${req.params.id}: ${reason}`,
          metadata: JSON.stringify({ caseId: req.params.id, urgency }),
        },
      });

      // Log as case message
      await prisma.caseMessage.create({
        data: {
          id: uuidv4(),
          caseId: req.params.id,
          senderId: req.user!.sub,
          type: 'system',
          message: `Specialist referred: ${reason} (${urgency})`,
        },
      });

      res.json({ success: true, message: 'Specialist referred and notified' });
    } catch (err) {
      next(err);
    }
  }
);

function generateSuggestedTests(matches: Array<{ diseaseName: string }>): string[] {
  const tests = new Set<string>(['Complete Blood Count (CBC)', 'Comprehensive Metabolic Panel']);
  if (matches.some((m) => m.diseaseName.toLowerCase().includes('muscular'))) {
    tests.add('Creatine Kinase (CK) Level');
    tests.add('Muscle Biopsy');
    tests.add('Electromyography (EMG)');
  }
  if (matches.some((m) => m.diseaseName.toLowerCase().includes('epilep'))) {
    tests.add('EEG');
    tests.add('Brain MRI');
  }
  tests.add('Whole Exome Sequencing (WES)');
  tests.add('Genetic Counseling Referral');
  return Array.from(tests);
}

export default router;
