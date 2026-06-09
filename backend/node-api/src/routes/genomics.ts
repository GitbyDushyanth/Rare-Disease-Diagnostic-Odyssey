import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditLog } from '../middleware/audit';
import { validateBody, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import aiClient from '../services/aiClient';

const router = express.Router();
router.use(requireAuth);

// ── Multer for genomic files ───────────────────────────────────────────────────
const genomicDir = path.resolve('./uploads/genomics');
if (!fs.existsSync(genomicDir)) fs.mkdirSync(genomicDir, { recursive: true });

const genomicStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, genomicDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});

const uploadGenomic = multer({
  storage: genomicStorage,
  limits: { fileSize: 500 * 1024 * 1024 * 1024 }, // 500GB max
});

// ── Schemas ───────────────────────────────────────────────────────────────────
const CreateSampleSchema = z.object({
  patientId: z.string().uuid(),
  sampleType: z.enum(['blood', 'saliva', 'tissue', 'buccal', 'cord_blood']),
  platform: z.enum(['WES', 'WGS', 'targeted_panel', 'SNP_array', 'RNA-seq']).optional(),
  genomeRef: z.string().default('GRCh38'),
  organizationId: z.string().uuid().optional(),
});

const PrioritizeSchema = z.object({
  sampleId: z.string().uuid(),
  patientId: z.string().uuid(),
  hpoTerms: z.array(z.string()).min(1, 'At least one HPO term required'),
  inheritanceMode: z.enum(['autosomal_dominant', 'autosomal_recessive', 'x_linked', 'unknown']).optional(),
});

// ── POST /api/v1/genomics/samples ─────────────────────────────────────────────
router.post(
  '/samples',
  requireRole(['clinician', 'lab', 'admin']),
  validateBody(CreateSampleSchema),
  auditLog({ resource: 'genomic_sample' }),
  async (req, res, next) => {
    try {
      const sample = await prisma.genomicSample.create({
        data: {
          id: uuidv4(),
          ...req.body,
          status: 'received',
          receivedDate: new Date(),
        },
      });
      res.status(201).json({ success: true, data: sample });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/genomics/upload ──────────────────────────────────────────────
router.post(
  '/upload',
  requireRole(['clinician', 'lab', 'admin']),
  uploadGenomic.single('file') as express.RequestHandler,
  auditLog({ resource: 'genomic_file' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.file) throw AppError.badRequest('No genomic file uploaded');
      const { sampleId } = req.body;
      if (!sampleId) throw AppError.badRequest('sampleId required');

      const run = await prisma.sequencingRun.create({
        data: {
          id: uuidv4(),
          sampleId,
          runDate: new Date(),
          platform: req.body.platform,
          vcfUrl: `/uploads/genomics/${req.file.filename}`,
          status: 'completed',
        },
      });

      await prisma.genomicSample.update({
        where: { id: sampleId },
        data: { status: 'completed', storageUrl: `/uploads/genomics/${req.file.filename}` },
      });

      res.status(201).json({
        success: true,
        message: 'Genomic file uploaded. Ready for variant analysis.',
        data: { run, filename: req.file.filename },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/genomics/samples/patient/:patientId ───────────────────────────
router.get('/samples/patient/:patientId', async (req, res, next) => {
  try {
    const samples = await prisma.genomicSample.findMany({
      where: { patientId: req.params.patientId },
      include: {
        sequencingRuns: {
          include: { variants: { include: { annotations: true, interpretations: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: samples });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/genomics/samples/:id ─────────────────────────────────────────
router.get('/samples/:id', async (req, res, next) => {
  try {
    const sample = await prisma.genomicSample.findUnique({
      where: { id: req.params.id },
      include: {
        sequencingRuns: {
          include: {
            variants: {
              include: { annotations: true, interpretations: true },
              orderBy: { qualityScore: 'desc' },
            },
          },
        },
      },
    });
    if (!sample) throw AppError.notFound('Genomic sample not found');
    res.json({ success: true, data: sample });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/genomics/prioritize ─────────────────────────────────────────
// AI Variant Prioritization
router.post(
  '/prioritize',
  requireRole(['clinician', 'lab', 'admin']),
  validateBody(PrioritizeSchema),
  auditLog({ resource: 'variant_prioritization' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { sampleId, patientId, hpoTerms, inheritanceMode } = req.body;

      const job = await prisma.analysisJob.create({
        data: {
          id: uuidv4(),
          patientId,
          jobType: 'variant_prioritization',
          status: 'running',
          inputData: JSON.stringify({ sampleId, hpoTerms, inheritanceMode }),
          startedAt: new Date(),
        },
      });

      const variants = await aiClient.prioritizeVariants({ sampleId, hpoTerms, inheritanceMode });

      await prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      const result = await prisma.analysisResult.create({
        data: {
          id: uuidv4(),
          jobId: job.id,
          resultType: 'variant_priorities',
          structuredData: JSON.stringify(variants),
          confidenceScore: variants[0]?.confidence ? variants[0].confidence / 100 : 0,
        },
      });

      // Store variant interpretations if run exists
      const run = await prisma.sequencingRun.findFirst({ where: { sampleId } });
      if (run) {
        for (const v of variants.slice(0, 5)) {
          const variant = await prisma.variant.findFirst({
            where: { sampleId, geneSymbol: v.gene },
          });
          if (variant) {
            await prisma.variantInterpretation.create({
              data: {
                id: uuidv4(),
                variantId: variant.id,
                interpretedBy: 'AI-LUMEN-v1',
                acmgClassification: v.acmg.toLowerCase().replace(/ /g, '_'),
                confidenceScore: v.confidence / 100,
                explanation: v.notes,
                reviewStatus: 'pending',
              },
            });
          }
        }
      }

      res.json({ success: true, data: { jobId: job.id, resultId: result.id, variants } });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/genomics/variants/:sampleId ───────────────────────────────────
router.get('/variants/:sampleId', async (req, res, next) => {
  try {
    const { acmg, gene } = req.query;
    const runs = await prisma.sequencingRun.findMany({ where: { sampleId: req.params.sampleId } });
    const runIds = runs.map((r) => r.id);

    const variants = await prisma.variant.findMany({
      where: {
        sampleId: req.params.sampleId,
        ...(gene && { geneSymbol: { contains: gene as string } }),
      },
      include: {
        annotations: true,
        interpretations: {
          where: acmg ? { acmgClassification: (acmg as string).toLowerCase() } : {},
        },
      },
      orderBy: { qualityScore: 'desc' },
    });

    res.json({ success: true, data: variants });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/genomics/variants/:variantId/interpret ───────────────────────
const InterpretSchema = z.object({
  acmgClassification: z.enum(['pathogenic', 'likely_pathogenic', 'vus', 'likely_benign', 'benign']),
  confidenceScore: z.number().min(0).max(1).optional(),
  explanation: z.string().optional(),
  interpretationNotes: z.string().optional(),
});

router.post(
  '/variants/:variantId/interpret',
  requireRole(['clinician', 'lab', 'admin']),
  validateBody(InterpretSchema),
  auditLog({ resource: 'variant_interpretation' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const interp = await prisma.variantInterpretation.create({
        data: {
          id: uuidv4(),
          variantId: req.params.variantId,
          interpretedBy: req.user!.sub,
          ...req.body,
          reviewStatus: 'accepted',
        },
      });
      res.status(201).json({ success: true, data: interp });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/genomics/report/:jobId ───────────────────────────────────────
router.post('/report/:jobId', requireRole(['clinician', 'lab', 'admin']), async (req, res, next) => {
  try {
    const job = await prisma.analysisJob.findUnique({
      where: { id: req.params.jobId },
      include: { results: true },
    });
    if (!job) throw AppError.notFound('Analysis job not found');
    if (job.status !== 'completed') throw AppError.badRequest('Job not completed yet');

    const variants = job.results[0]?.structuredData
      ? JSON.parse(job.results[0].structuredData)
      : [];

    const patient = await prisma.patient.findUnique({
      where: { id: job.patientId },
      include: { user: { select: { fullName: true } } },
    });

    res.json({
      success: true,
      data: {
        reportId: uuidv4(),
        generatedAt: new Date().toISOString(),
        patient: { id: job.patientId, name: patient?.user?.fullName },
        topVariants: variants.slice(0, 5),
        summary: variants[0]
          ? `Primary finding: ${variants[0].gene} ${variants[0].variant} classified as ${variants[0].acmg} with ${variants[0].confidence}% confidence.`
          : 'No pathogenic variants identified.',
        status: 'signed',
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
