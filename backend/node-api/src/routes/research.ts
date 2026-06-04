import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validateBody, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import aiClient from '../services/aiClient';

const router = express.Router();
router.use(requireAuth, requireRole(['researcher', 'admin']));

// ── GET /api/v1/research/dashboard ────────────────────────────────────────────
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [totalPatients, totalGenomes, totalTrials, countriesRaw] = await Promise.all([
      prisma.patient.count(),
      prisma.genomicSample.count({ where: { status: 'completed' } }),
      prisma.clinicalTrial.count(),
      prisma.patient.findMany({ include: { organization: { select: { country: true } } } }),
    ]);

    const countries = new Set(countriesRaw.map((p) => p.organization?.country).filter(Boolean));

    const hpoEntries = await prisma.symptomEntry.findMany({
      where: { hpoTerms: { not: null } },
      select: { hpoTerms: true },
    });

    const hpoMap = new Map<string, number>();
    hpoEntries.forEach((e) => {
      if (!e.hpoTerms) return;
      JSON.parse(e.hpoTerms).forEach((t: { id: string; name: string }) => {
        hpoMap.set(t.name, (hpoMap.get(t.name) || 0) + 1);
      });
    });

    res.json({
      success: true,
      data: {
        totalPatients,
        totalGenomes,
        totalTrials,
        countries: countries.size,
        topHpoTerms: Array.from(hpoMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/research/cohort ──────────────────────────────────────────────
const CohortSchema = z.object({
  hpoTerms: z.array(z.string()).optional(),
  genes: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  gender: z.string().optional(),
  country: z.string().optional(),
  hasGenomicData: z.boolean().optional(),
  acmgClassifications: z.array(z.string()).optional(),
  limit: z.number().max(1000).default(100),
  page: z.number().default(1),
});

router.post('/cohort', validateBody(CohortSchema), async (req, res, next) => {
  try {
    const {
      hpoTerms, genes, conditions, ageMin, ageMax,
      gender, country, hasGenomicData, limit, page,
    } = req.body;

    const skip = (page - 1) * limit;

    // Build patient filters
    const patientWhere: Record<string, unknown> = {};

    if (country) {
      patientWhere.organization = { country };
    }

    if (hasGenomicData) {
      patientWhere.genomicSamples = { some: { status: 'completed' } };
    }

    if (conditions && conditions.length > 0) {
      patientWhere.conditions = {
        some: { name: { in: conditions }, status: 'active' },
      };
    }

    if (genes && genes.length > 0) {
      patientWhere.genomicSamples = {
        some: {
          sequencingRuns: {
            some: {
              variants: {
                some: { geneSymbol: { in: genes } },
              },
            },
          },
        },
      };
    }

    if (hpoTerms && hpoTerms.length > 0) {
      patientWhere.symptomEntries = {
        some: {
          AND: hpoTerms.map((term: string) => ({
            hpoTerms: { contains: term },
          })),
        },
      };
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where: patientWhere,
        skip,
        take: limit,
        select: {
          id: true,
          mrn: true,
          dateOfBirth: true,
          lifeStatus: true,
          conditions: { select: { name: true, icdCode: true } },
          _count: { select: { symptomEntries: true, genomicSamples: true } },
        },
      }),
      prisma.patient.count({ where: patientWhere }),
    ]);

    // De-identify patient data for research
    const deidentified = patients.map((p) => ({
      id: p.id,
      ageGroup: getAgeGroup(p.dateOfBirth),
      lifeStatus: p.lifeStatus,
      conditions: p.conditions.map((c) => c.name),
      hasGenomicData: p._count.genomicSamples > 0,
      symptomCount: p._count.symptomEntries,
    }));

    res.json({
      success: true,
      data: deidentified,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/research/analytics/disease-distribution ──────────────────────
router.get('/analytics/disease-distribution', async (_req, res, next) => {
  try {
    const suggestions = await prisma.diagnosticSuggestion.groupBy({
      by: ['diseaseName'],
      _count: { diseaseName: true },
      orderBy: { _count: { diseaseName: 'desc' } },
      take: 20,
    });

    res.json({
      success: true,
      data: suggestions.map((s) => ({
        disease: s.diseaseName,
        count: s._count.diseaseName,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/research/analytics/gene-frequency ────────────────────────────
router.get('/analytics/gene-frequency', async (_req, res, next) => {
  try {
    const variants = await prisma.variant.groupBy({
      by: ['geneSymbol'],
      _count: { geneSymbol: true },
      where: { geneSymbol: { not: null } },
      orderBy: { _count: { geneSymbol: 'desc' } },
      take: 20,
    });

    res.json({
      success: true,
      data: variants.map((v) => ({
        gene: v.geneSymbol,
        variantCount: v._count.geneSymbol,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/research/analytics/diagnostic-yield ──────────────────────────
router.get('/analytics/diagnostic-yield', async (_req, res, next) => {
  try {
    const [total, withDiagnosis, withGenomics, pathogenicVariants] = await Promise.all([
      prisma.patient.count(),
      prisma.diagnosticSuggestion.groupBy({
        by: ['patientId'],
        where: { status: 'accepted' },
      }).then((r) => r.length),
      prisma.patient.count({ where: { genomicSamples: { some: {} } } }),
      prisma.variantInterpretation.count({
        where: { acmgClassification: { in: ['pathogenic', 'likely_pathogenic'] }, reviewStatus: 'accepted' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalPatients: total,
        diagnosedPatients: withDiagnosis,
        diagnosticYield: total > 0 ? +((withDiagnosis / total) * 100).toFixed(1) : 0,
        genomicPatients: withGenomics,
        pathogenicVariantsFound: pathogenicVariants,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/research/datasets/export ─────────────────────────────────────
router.get('/datasets/export', async (req, res, next) => {
  try {
    const format = req.query.format as string || 'json';

    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        dateOfBirth: true,
        conditions: { select: { name: true, icdCode: true } },
        diagnosticSuggestions: { select: { diseaseName: true, confidenceScore: true }, orderBy: { rank: 'asc' }, take: 1 },
        _count: { select: { symptomEntries: true, genomicSamples: true } },
      },
      take: 500,
    });

    const exported = patients.map((p) => ({
      id: p.id,
      ageGroup: getAgeGroup(p.dateOfBirth),
      conditions: p.conditions.map((c) => c.icdCode),
      primaryDiagnosis: p.diagnosticSuggestions[0]?.diseaseName,
      diagnosticConfidence: p.diagnosticSuggestions[0]?.confidenceScore,
      hasGenomics: p._count.genomicSamples > 0,
      symptomDataPoints: p._count.symptomEntries,
    }));

    if (format === 'csv') {
      const headers = Object.keys(exported[0] || {}).join(',');
      const rows = exported.map((r) => Object.values(r).join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=lumen_cohort.csv');
      res.send([headers, ...rows].join('\n'));
    } else {
      res.json({ success: true, data: exported, meta: { count: exported.length } });
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/research/drug-discovery ─────────────────────────────────────
router.post('/drug-discovery', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) throw AppError.badRequest('query is required');

    const result = await aiClient.drugDiscovery(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

function getAgeGroup(dob: Date): string {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365));
  if (age < 5) return '0-4';
  if (age < 12) return '5-11';
  if (age < 18) return '12-17';
  if (age < 40) return '18-39';
  if (age < 65) return '40-64';
  return '65+';
}

export default router;
