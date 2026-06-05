// ─────────────────────────────────────────────────────────────────────────────
// LUMEN API — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

import { Request } from 'express';

// ── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'patient' | 'clinician' | 'lab' | 'researcher' | 'admin';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ── API Responses ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── AI Service Types ──────────────────────────────────────────────────────────
export interface HpoTerm {
  id: string;           // e.g. HP:0001250
  name: string;
  definition?: string;
  category?: string;
  confidence?: number;
}

export interface DiseaseMatch {
  diseaseId: string;    // OMIM / Orphanet ID
  diseaseName: string;
  confidence: number;   // 0–1
  rank: number;
  hpoOverlap: string[];
  geneAssociations?: string[];
  inheritancePattern?: string;
  prevalence?: string;
  explanation?: string;
}

export interface VariantPriority {
  gene: string;
  variant: string;       // HGVS notation
  acmg: string;          // pathogenic | likely_pathogenic | vus | likely_benign | benign
  confidence: number;    // 0–100
  clinvar?: string;
  gnomad?: number;
  omim?: string;
  literature?: number;
  notes?: string;
  chromosome?: string;
  position?: number;
}

export interface TrialMatchResult {
  nctId: string;
  title: string;
  phase: string;
  sponsor: string;
  status: string;
  matchScore: number;
  matchReason: string[];
  locations?: string[];
  contactEmail?: string;
}

export interface DocumentSummary {
  timeline: TimelineEntry[];
  keyFindings: string[];
  hpoTerms: HpoTerm[];
  medications: string[];
  diagnoses: string[];
  recommendedTests: string[];
  summary: string;
}

export interface TimelineEntry {
  date: string;
  event: string;
  type: 'symptom' | 'diagnosis' | 'procedure' | 'medication' | 'test' | 'visit';
  details?: string;
}

export interface ProgressionPrediction {
  horizon: '6m' | '12m' | '24m';
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number;   // 0–100
  predictedSymptoms: string[];
  recommendedActions: string[];
  confidenceInterval: [number, number];
  explanation: string;
}

// ── FHIR ──────────────────────────────────────────────────────────────────────
export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  name: Array<{ family: string; given: string[] }>;
  birthDate: string;
  gender: string;
  language?: string;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: string;
  subject: { reference: string };
  code: { coding: Array<{ system: string; code: string; display: string }> };
  valueQuantity?: { value: number; unit: string };
  effectiveDateTime?: string;
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export interface AuditContext {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  result?: 'success' | 'failure' | 'warning';
}
