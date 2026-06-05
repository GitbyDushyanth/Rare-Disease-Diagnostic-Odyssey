import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { validateBody, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import aiClient from '../services/aiClient';

const router = express.Router();
router.use(requireAuth);

// ── GET /api/v1/trials ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string || 'Recruiting';
    const phase = req.query.phase as string;
    const condition = req.query.condition as string;

    const where = {
      ...(status && { status }),
      ...(phase && { phase }),
      ...(condition && { conditions: { contains: condition } }),
    };

    const [trials, total] = await Promise.all([
      prisma.clinicalTrial.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { eligibilityCriteria: true, _count: { select: { matches: true } } },
        orderBy: { startDate: 'desc' },
      }),
      prisma.clinicalTrial.count({ where }),
    ]);

    res.json({
      success: true,
      data: trials,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/trials/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const trial = await prisma.clinicalTrial.findUnique({
      where: { id: req.params.id },
      include: {
        eligibilityCriteria: true,
        _count: { select: { matches: true } },
      },
    });
    if (!trial) throw AppError.notFound('Trial not found');
    res.json({ success: true, data: trial });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/trials/match/:patientId ─────────────────────────────────────
router.post(
  '/match/:patientId',
  auditLog({ resource: 'trial_matching' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { patientId } = req.params;

      // Gather patient profile
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          conditions: { where: { status: 'active' } },
          user: { select: { dateOfBirth: true } },
        },
      });
      if (!patient) throw AppError.notFound('Patient not found');

      // Get HPO terms from symptom entries
      const symptomEntries = await prisma.symptomEntry.findMany({
        where: { patientId, hpoTerms: { not: null } },
        select: { hpoTerms: true },
      });

      const hpoIds = new Set<string>();
      symptomEntries.forEach((e) => {
        if (e.hpoTerms) {
          JSON.parse(e.hpoTerms).forEach((t: { id: string }) => hpoIds.add(t.id));
        }
      });

      const age = patient.user?.dateOfBirth
        ? Math.floor((Date.now() - new Date(patient.user.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : undefined;

      const job = await prisma.analysisJob.create({
        data: {
          id: uuidv4(),
          patientId,
          jobType: 'trial_matching',
          status: 'running',
          inputData: JSON.stringify({ hpoTerms: Array.from(hpoIds), age }),
          startedAt: new Date(),
        },
      });

      const matches = await aiClient.matchTrials({
        patientId,
        hpoTerms: Array.from(hpoIds),
        age,
        conditions: patient.conditions.map((c) => c.name),
      });

      await prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      // Store matches in DB
      await prisma.trialMatch.deleteMany({ where: { patientId } });
      for (const match of matches) {
        // Upsert trial record if not exists
        let trial = await prisma.clinicalTrial.findUnique({ where: { nctId: match.nctId } });
        if (!trial) {
          trial = await prisma.clinicalTrial.create({
            data: {
              id: uuidv4(),
              nctId: match.nctId,
              title: match.title,
              phase: match.phase,
              sponsor: match.sponsor,
              status: match.status,
              conditions: JSON.stringify([]),
              locations: JSON.stringify(match.locations || []),
              contactEmail: match.contactEmail,
            },
          });
        }

        await prisma.trialMatch.create({
          data: {
            id: uuidv4(),
            patientId,
            trialId: trial.id,
            matchScore: match.matchScore,
            matchReason: JSON.stringify(match.matchReason),
            status: match.matchScore > 0.7 ? 'eligible' : 'potential',
          },
        });
      }

      res.json({ success: true, data: { jobId: job.id, matches } });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/trials/matches/:patientId ────────────────────────────────────
router.get('/matches/:patientId', async (req, res, next) => {
  try {
    const matches = await prisma.trialMatch.findMany({
      where: { patientId: req.params.patientId },
      include: { trial: { include: { eligibilityCriteria: true } } },
      orderBy: { matchScore: 'desc' },
    });
    res.json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/v1/trials/matches/:matchId/status ─────────────────────────────
router.patch('/matches/:matchId/status', async (req, res, next) => {
  try {
    const updated = await prisma.trialMatch.update({
      where: { id: req.params.matchId },
      data: { status: req.body.status },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
