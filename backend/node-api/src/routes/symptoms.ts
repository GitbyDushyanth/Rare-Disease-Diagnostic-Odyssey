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

const SymptomLogSchema = z.object({
  patientId: z.string().uuid(),
  pain: z.number().min(0).max(10).default(0),
  fatigue: z.number().min(0).max(10).default(0),
  mobility: z.number().min(0).max(10).default(0),
  sleep: z.number().min(0).max(10).default(0),
  mood: z.number().min(0).max(10).default(0),
  notes: z.string().max(2000).optional(),
  date: z.string().optional(),
  source: z.enum(['self', 'clinician', 'device', 'caregiver']).default('self'),
});

// ── POST /api/v1/symptoms/log ─────────────────────────────────────────────────
router.post(
  '/log',
  validateBody(SymptomLogSchema),
  auditLog({ resource: 'symptom_entry' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { patientId, notes, date, ...scores } = req.body;

      // Verify patient ownership
      if (req.user!.role === 'patient') {
        const patient = await prisma.patient.findFirst({ where: { userId: req.user!.sub } });
        if (!patient || patient.id !== patientId) throw AppError.forbidden('Cannot log symptoms for another patient');
      }

      // Create symptom entry
      const entry = await prisma.symptomEntry.create({
        data: {
          id: uuidv4(),
          patientId,
          date: date ? new Date(date) : new Date(),
          notes,
          ...scores,
        },
      });

      // Async: trigger HPO extraction from notes if notes provided
      if (notes && notes.length > 10) {
        aiClient.extractHpoTerms(notes).then(async (hpoTerms) => {
          if (hpoTerms.length > 0) {
            await prisma.symptomEntry.update({
              where: { id: entry.id },
              data: { hpoTerms: JSON.stringify(hpoTerms) },
            });
          }
        }).catch(() => {/* non-blocking */});
      }

      res.status(201).json({ success: true, data: entry });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/symptoms/:patientId/history ───────────────────────────────────
router.get('/:patientId/history', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { patientId } = req.params;
    const days = parseInt(req.query.days as string) || 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const entries = await prisma.symptomEntry.findMany({
      where: { patientId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    // Compute stats
    const stats = entries.length > 0 ? {
      avgPain: +(entries.reduce((s, e) => s + e.pain, 0) / entries.length).toFixed(1),
      avgFatigue: +(entries.reduce((s, e) => s + e.fatigue, 0) / entries.length).toFixed(1),
      avgMobility: +(entries.reduce((s, e) => s + e.mobility, 0) / entries.length).toFixed(1),
      avgSleep: +(entries.reduce((s, e) => s + e.sleep, 0) / entries.length).toFixed(1),
      avgMood: +(entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1),
      totalEntries: entries.length,
    } : null;

    res.json({ success: true, data: entries, meta: { stats, days } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/symptoms/:patientId/latest ────────────────────────────────────
router.get('/:patientId/latest', async (req, res, next) => {
  try {
    const entry = await prisma.symptomEntry.findFirst({
      where: { patientId: req.params.patientId },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/symptoms/:patientId/hpo ──────────────────────────────────────
// Aggregated HPO terms from all symptom entries
router.get('/:patientId/hpo', async (req, res, next) => {
  try {
    const entries = await prisma.symptomEntry.findMany({
      where: { patientId: req.params.patientId, hpoTerms: { not: null } },
      select: { hpoTerms: true, date: true },
    });

    const hpoMap = new Map<string, { term: unknown; count: number; lastSeen: Date }>();
    for (const entry of entries) {
      if (!entry.hpoTerms) continue;
      const terms = JSON.parse(entry.hpoTerms) as Array<{ id: string; name: string }>;
      for (const term of terms) {
        const existing = hpoMap.get(term.id);
        if (existing) {
          existing.count++;
          if (entry.date > existing.lastSeen) existing.lastSeen = entry.date;
        } else {
          hpoMap.set(term.id, { term, count: 1, lastSeen: entry.date });
        }
      }
    }

    const aggregated = Array.from(hpoMap.values())
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: aggregated });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/symptoms/:patientId/analyze ──────────────────────────────────
// Trigger AI disease similarity on accumulated HPO terms
router.post('/:patientId/analyze', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { patientId } = req.params;

    const entries = await prisma.symptomEntry.findMany({
      where: { patientId, hpoTerms: { not: null } },
      select: { hpoTerms: true },
    });

    const allHpoIds = new Set<string>();
    for (const e of entries) {
      if (!e.hpoTerms) continue;
      const terms = JSON.parse(e.hpoTerms) as Array<{ id: string }>;
      terms.forEach((t) => allHpoIds.add(t.id));
    }

    if (allHpoIds.size === 0) {
      throw AppError.badRequest('No HPO terms found. Log symptoms with notes first.');
    }

    const job = await prisma.analysisJob.create({
      data: {
        id: uuidv4(),
        patientId,
        jobType: 'disease_similarity',
        status: 'running',
        inputData: JSON.stringify({ hpoTerms: Array.from(allHpoIds) }),
        startedAt: new Date(),
      },
    });

    // Call AI service
    const matches = await aiClient.rankDiseases(Array.from(allHpoIds));

    // Store results
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    const result = await prisma.analysisResult.create({
      data: {
        id: uuidv4(),
        jobId: job.id,
        resultType: 'disease_matches',
        structuredData: JSON.stringify(matches),
        confidenceScore: matches[0]?.confidence ?? 0,
      },
    });

    // Upsert diagnostic suggestions
    if (matches.length > 0) {
      await prisma.diagnosticSuggestion.deleteMany({ where: { patientId, analysisJobId: null } });
      await prisma.diagnosticSuggestion.createMany({
        data: matches.slice(0, 10).map((m, i) => ({
          id: uuidv4(),
          patientId,
          analysisJobId: job.id,
          diseaseName: m.diseaseName,
          diseaseId: m.diseaseId,
          confidenceScore: m.confidence,
          rank: i + 1,
          hpoOverlap: JSON.stringify(m.hpoOverlap),
          explanation: m.explanation,
        })),
      });
    }

    res.json({ success: true, data: { jobId: job.id, resultId: result.id, matches } });
  } catch (err) {
    next(err);
  }
});

export default router;
