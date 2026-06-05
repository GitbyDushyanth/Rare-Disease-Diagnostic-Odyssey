import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { buildFhirPatient, buildFhirObservation, buildFhirCondition, buildFhirBundle } from '../services/fhirService';

const router = express.Router();
router.use(requireAuth);

// ── GET /api/v1/fhir/Patient/:id ─────────────────────────────────────────────
router.get('/Patient/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: { user: true, contacts: true },
    });
    if (!patient) throw AppError.notFound('Patient not found');

    res.setHeader('Content-Type', 'application/fhir+json');
    res.json(buildFhirPatient(patient));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/fhir/Observation/:patientId ───────────────────────────────────
router.get('/Observation/:patientId', async (req, res, next) => {
  try {
    const observations = await prisma.observation.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const entries = observations.map((o) => buildFhirObservation(o, req.params.patientId));
    res.setHeader('Content-Type', 'application/fhir+json');
    res.json(buildFhirBundle('searchset', entries));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/fhir/Condition/:patientId ────────────────────────────────────
router.get('/Condition/:patientId', async (req, res, next) => {
  try {
    const conditions = await prisma.condition.findMany({
      where: { patientId: req.params.patientId },
    });

    const entries = conditions.map((c) => buildFhirCondition(c, req.params.patientId));
    res.setHeader('Content-Type', 'application/fhir+json');
    res.json(buildFhirBundle('searchset', entries));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/fhir/metadata ─────────────────────────────────────────────────
router.get('/metadata', (_req, res) => {
  res.setHeader('Content-Type', 'application/fhir+json');
  res.json({
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['application/fhir+json'],
    rest: [{
      mode: 'server',
      resource: [
        { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Observation', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Condition', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'DiagnosticReport', interaction: [{ code: 'read' }] },
        { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
      ],
    }],
  });
});

// ── GET /api/v1/fhir/Patient/:id/$everything ──────────────────────────────────
router.get('/Patient/:id/\\$everything', async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const [patient, observations, conditions, encounters] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId }, include: { user: true, contacts: true } }),
      prisma.observation.findMany({ where: { patientId }, take: 100 }),
      prisma.condition.findMany({ where: { patientId } }),
      prisma.encounter.findMany({ where: { patientId }, take: 50 }),
    ]);

    if (!patient) throw AppError.notFound('Patient not found');

    const entries = [
      buildFhirPatient(patient),
      ...observations.map((o) => buildFhirObservation(o, patientId)),
      ...conditions.map((c) => buildFhirCondition(c, patientId)),
    ];

    res.setHeader('Content-Type', 'application/fhir+json');
    res.json(buildFhirBundle('collection', entries));
  } catch (err) {
    next(err);
  }
});

export default router;
