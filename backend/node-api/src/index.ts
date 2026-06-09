import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRouter from './routes/auth';
import patientsRouter from './routes/patients';
import symptomsRouter from './routes/symptoms';
import documentsRouter from './routes/documents';
import genomicsRouter from './routes/genomics';
import clinicianRouter from './routes/clinician';
import trialsRouter from './routes/trials';
import researchRouter from './routes/research';
import adminRouter from './routes/admin';
import fhirRouter from './routes/fhir';
import notificationsRouter from './routes/notifications';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import logger from './lib/logger';
import prisma from './lib/prisma';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const API_BASE = `/api/${process.env.API_VERSION || 'v1'}`;

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
    if (!origin || allowed.includes(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});
app.use(limiter);

// ── Body parsing & compression ────────────────────────────────────────────────
app.use(compression() as express.RequestHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.path === '/health',
}));

// ── Static file serving for uploads ──────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

// ── Health check (no auth) ────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: { database: 'ok', api: 'ok' },
    });
  } catch {
    res.status(503).json({ success: false, status: 'unhealthy', services: { database: 'error' } });
  }
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use(`${API_BASE}/auth`, authRouter);
app.use(`${API_BASE}/patients`, patientsRouter);
app.use(`${API_BASE}/symptoms`, symptomsRouter);
app.use(`${API_BASE}/documents`, documentsRouter);
app.use(`${API_BASE}/genomics`, genomicsRouter);
app.use(`${API_BASE}/clinician`, clinicianRouter);
app.use(`${API_BASE}/trials`, trialsRouter);
app.use(`${API_BASE}/research`, researchRouter);
app.use(`${API_BASE}/admin`, adminRouter);
app.use(`${API_BASE}/fhir`, fhirRouter);
app.use(`${API_BASE}/notifications`, notificationsRouter);

// ── API root info ──────────────────────────────────────────────────────────────
app.get(API_BASE, (_req, res) => {
  res.json({
    success: true,
    name: 'LUMEN API',
    description: 'Rare Disease Diagnostic Intelligence Platform',
    version: process.env.API_VERSION || 'v1',
    endpoints: {
      auth: `${API_BASE}/auth`,
      patients: `${API_BASE}/patients`,
      symptoms: `${API_BASE}/symptoms`,
      documents: `${API_BASE}/documents`,
      genomics: `${API_BASE}/genomics`,
      clinician: `${API_BASE}/clinician`,
      trials: `${API_BASE}/trials`,
      research: `${API_BASE}/research`,
      admin: `${API_BASE}/admin`,
      fhir: `${API_BASE}/fhir`,
      notifications: `${API_BASE}/notifications`,
    },
    fhir: { version: 'R4', baseUrl: `${API_BASE}/fhir` },
  });
});

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Server startup ────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 LUMEN API running on http://localhost:${PORT}`);
      logger.info(`📋 API base: http://localhost:${PORT}${API_BASE}`);
      logger.info(`❤️  Health: http://localhost:${PORT}/health`);
      logger.info(`🧬 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { err });
    await prisma.$disconnect();
    process.exit(1);
  }
}

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

bootstrap();

export default app;
