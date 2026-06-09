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

// ── Multer config ─────────────────────────────────────────────────────────────
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '250') * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.dcm', '.vcf', '.bam', '.txt', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type not allowed: ${ext}`));
  },
});

// ── POST /api/v1/documents/upload ─────────────────────────────────────────────
router.post(
  '/upload',
  upload.single('file') as express.RequestHandler,
  auditLog({ resource: 'document' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.file) throw AppError.badRequest('No file uploaded');

      const { patientId, title, docType } = req.body;
      if (!patientId) throw AppError.badRequest('patientId is required');

      const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '').toUpperCase();

      const doc = await prisma.document.create({
        data: {
          id: uuidv4(),
          patientId,
          uploadedBy: req.user!.sub,
          title: title || req.file.originalname,
          docType: docType || 'other',
          fileUrl: `/uploads/${req.file.filename}`,
          fileType: ext,
          fileSize: req.file.size,
        },
      });

      // Create extraction placeholder
      const extraction = await prisma.documentExtraction.create({
        data: { id: uuidv4(), documentId: doc.id, extractionStatus: 'pending' },
      });

      // Async: trigger AI summarization for PDF/text files
      if (['PDF', 'TXT'].includes(ext)) {
        aiClient.summarizeDocument(req.file.path, doc.id).then(async (summary) => {
          await prisma.documentExtraction.update({
            where: { id: extraction.id },
            data: {
              extractedText: summary.summary,
              hpoTerms: JSON.stringify(summary.hpoTerms),
              keyFindings: JSON.stringify(summary.keyFindings),
              summaryTimeline: JSON.stringify(summary.timeline),
              extractionStatus: 'completed',
              extractedAt: new Date(),
            },
          });
        }).catch(async () => {
          await prisma.documentExtraction.update({
            where: { id: extraction.id },
            data: { extractionStatus: 'failed' },
          });
        });
      }

      res.status(201).json({
        success: true,
        message: 'Document uploaded. AI extraction in progress.',
        data: doc,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/documents/patient/:patientId ──────────────────────────────────
router.get('/patient/:patientId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const docType = req.query.docType as string;

    const where = {
      patientId: req.params.patientId,
      ...(docType && { docType }),
    };

    const [docs, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: { extractions: { select: { extractionStatus: true, hpoTerms: true, keyFindings: true } } },
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      success: true,
      data: docs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/documents/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { extractions: true },
    });
    if (!doc) throw AppError.notFound('Document not found');
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/documents/:id/extraction ─────────────────────────────────────
router.get('/:id/extraction', async (req, res, next) => {
  try {
    const extraction = await prisma.documentExtraction.findFirst({
      where: { documentId: req.params.id },
    });
    if (!extraction) throw AppError.notFound('Extraction not found');

    const parsed = {
      ...extraction,
      hpoTerms: extraction.hpoTerms ? JSON.parse(extraction.hpoTerms) : [],
      keyFindings: extraction.keyFindings ? JSON.parse(extraction.keyFindings) : [],
      summaryTimeline: extraction.summaryTimeline ? JSON.parse(extraction.summaryTimeline) : [],
    };

    res.json({ success: true, data: parsed });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/documents/:id/re-extract ────────────────────────────────────
router.post('/:id/re-extract', requireRole(['clinician', 'admin']), async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { extractions: true },
    });
    if (!doc) throw AppError.notFound('Document not found');

    const extractionId = doc.extractions[0]?.id;
    if (extractionId) {
      await prisma.documentExtraction.update({
        where: { id: extractionId },
        data: { extractionStatus: 'processing' },
      });

      const filePath = path.join(uploadDir, path.basename(doc.fileUrl));
      aiClient.summarizeDocument(filePath, doc.id).then(async (summary) => {
        await prisma.documentExtraction.update({
          where: { id: extractionId },
          data: {
            extractedText: summary.summary,
            hpoTerms: JSON.stringify(summary.hpoTerms),
            keyFindings: JSON.stringify(summary.keyFindings),
            summaryTimeline: JSON.stringify(summary.timeline),
            extractionStatus: 'completed',
            extractedAt: new Date(),
          },
        });
      }).catch(async () => {
        await prisma.documentExtraction.update({
          where: { id: extractionId },
          data: { extractionStatus: 'failed' },
        });
      });
    }

    res.json({ success: true, message: 'Re-extraction triggered' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/v1/documents/:id ─────────────────────────────────────────────
router.delete(
  '/:id',
  requireRole(['clinician', 'admin', 'patient']),
  auditLog({ resource: 'document' }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
      if (!doc) throw AppError.notFound('Document not found');

      if (req.user!.role === 'patient' && doc.uploadedBy !== req.user!.sub) {
        throw AppError.forbidden('Cannot delete documents uploaded by others');
      }

      // Remove file from disk
      const filePath = path.join(uploadDir, path.basename(doc.fileUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      await prisma.document.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Document deleted' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
