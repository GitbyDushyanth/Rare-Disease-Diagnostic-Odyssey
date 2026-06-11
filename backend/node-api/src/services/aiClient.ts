import axios, { AxiosInstance } from 'axios';
import logger from '../lib/logger';
import { HpoTerm, DiseaseMatch, VariantPriority, TrialMatchResult, DocumentSummary } from '../types';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '30000');

type AiHpoTerm = HpoTerm & {
  evidence_text?: string;
};

type AiDiseaseMatch = {
  disease_id?: string;
  diseaseId?: string;
  disease_name?: string;
  diseaseName?: string;
  confidence?: number;
  rank?: number;
  hpo_overlap?: string[];
  hpoOverlap?: string[];
  gene_associations?: string[];
  geneAssociations?: string[];
  inheritance_pattern?: string;
  inheritancePattern?: string;
  prevalence?: string;
  explanation?: string;
};

type AiTrialMatch = {
  nct_id?: string;
  nctId?: string;
  title?: string;
  phase?: string;
  sponsor?: string;
  status?: string;
  match_score?: number;
  matchScore?: number;
  match_reason?: string[];
  matchReason?: string[];
  locations?: string[];
  contact_email?: string;
  contactEmail?: string;
};

type AiDocumentSummary = {
  timeline?: DocumentSummary['timeline'];
  key_findings?: string[];
  keyFindings?: string[];
  hpo_terms?: AiHpoTerm[];
  hpoTerms?: AiHpoTerm[];
  medications?: string[];
  diagnoses?: string[];
  recommended_tests?: string[];
  recommendedTests?: string[];
  summary?: string;
};

const emptyDocumentSummary = (summary = ''): DocumentSummary => ({
  timeline: [],
  keyFindings: [],
  hpoTerms: [],
  medications: [],
  diagnoses: [],
  recommendedTests: [],
  summary,
});

function normalizeDiseaseMatch(match: AiDiseaseMatch, index: number): DiseaseMatch {
  return {
    diseaseId: match.diseaseId || match.disease_id || '',
    diseaseName: match.diseaseName || match.disease_name || 'Unknown Disease',
    confidence: match.confidence ?? 0,
    rank: match.rank ?? index + 1,
    hpoOverlap: match.hpoOverlap || match.hpo_overlap || [],
    geneAssociations: match.geneAssociations || match.gene_associations || [],
    inheritancePattern: match.inheritancePattern || match.inheritance_pattern,
    prevalence: match.prevalence,
    explanation: match.explanation,
  };
}

function normalizeTrialMatch(match: AiTrialMatch): TrialMatchResult {
  return {
    nctId: match.nctId || match.nct_id || '',
    title: match.title || 'Unknown Trial',
    phase: match.phase || 'N/A',
    sponsor: match.sponsor || 'Unknown',
    status: match.status || 'Recruiting',
    matchScore: match.matchScore ?? match.match_score ?? 0,
    matchReason: match.matchReason || match.match_reason || [],
    locations: match.locations || [],
    contactEmail: match.contactEmail || match.contact_email,
  };
}

function normalizeDocumentSummary(summary?: AiDocumentSummary): DocumentSummary {
  if (!summary) return emptyDocumentSummary();
  return {
    timeline: summary.timeline || [],
    keyFindings: summary.keyFindings || summary.key_findings || [],
    hpoTerms: summary.hpoTerms || summary.hpo_terms || [],
    medications: summary.medications || [],
    diagnoses: summary.diagnoses || [],
    recommendedTests: summary.recommendedTests || summary.recommended_tests || [],
    summary: summary.summary || '',
  };
}

class AiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: AI_SERVICE_URL,
      timeout: TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      logger.debug(`AI request → ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('AI service error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        throw error;
      }
    );
  }

  // ── Module 1: HPO NLP Engine ───────────────────────────────────────────────
  async extractHpoTerms(text: string): Promise<HpoTerm[]> {
    try {
      const { data } = await this.client.post('/ai/hpo/extract', { text });
      return data.hpo_terms || [];
    } catch (err) {
      logger.warn('HPO extraction failed, returning empty array', { err });
      return [];
    }
  }

  // ── Module 2: Disease Similarity Engine ───────────────────────────────────
  async rankDiseases(hpoTerms: string[]): Promise<DiseaseMatch[]> {
    try {
      const { data } = await this.client.post('/ai/disease/rank', { hpo_terms: hpoTerms });
      return (data.matches || []).map(normalizeDiseaseMatch);
    } catch (err) {
      logger.warn('Disease ranking failed', { err });
      return [];
    }
  }

  // ── Module 3: Variant Prioritization AI ──────────────────────────────────
  async prioritizeVariants(payload: {
    sampleId: string;
    hpoTerms: string[];
    inheritanceMode?: string;
  }): Promise<VariantPriority[]> {
    try {
      const { data } = await this.client.post('/ai/variants/prioritize', {
        sample_id: payload.sampleId,
        hpo_terms: payload.hpoTerms,
        inheritance_mode: payload.inheritanceMode,
      });
      return data.variants || [];
    } catch (err) {
      logger.warn('Variant prioritization failed', { err });
      return [];
    }
  }

  // ── Module 4: Longitudinal Progression Predictor ──────────────────────────
  async predictProgression(patientId: string, symptomHistory: unknown[]): Promise<unknown[]> {
    try {
      const { data } = await this.client.post('/ai/progression/predict', {
        patient_id: patientId,
        symptom_history: symptomHistory,
      });
      return data.predictions || [];
    } catch (err) {
      logger.warn('Progression prediction failed', { err });
      return [];
    }
  }

  // ── Module 5: Medical Record Summarizer ──────────────────────────────────
  async summarizeDocument(filePath: string, documentId: string): Promise<DocumentSummary> {
    try {
      const { data } = await this.client.post('/ai/records/summarize', {
        file_path: filePath,
        document_id: documentId,
      });
      return normalizeDocumentSummary(data.summary);
    } catch (err) {
      logger.warn('Document summarization failed', { err });
      return emptyDocumentSummary('Extraction failed. Please retry.');
    }
  }

  // ── Module 6: Trial Matching Engine ──────────────────────────────────────
  async matchTrials(payload: {
    patientId: string;
    hpoTerms: string[];
    age?: number;
    conditions?: string[];
  }): Promise<TrialMatchResult[]> {
    try {
      const { data } = await this.client.post('/ai/trials/match', {
        patient_id: payload.patientId,
        hpo_terms: payload.hpoTerms,
        age: payload.age,
        conditions: payload.conditions,
      });
      return (data.matches || []).map(normalizeTrialMatch);
    } catch (err) {
      logger.warn('Trial matching failed', { err });
      return [];
    }
  }

  // ── Drug Discovery Intelligence ───────────────────────────────────────────
  async drugDiscovery(query: string): Promise<unknown> {
    try {
      const { data } = await this.client.post('/ai/research/drug-discovery', { query });
      return data;
    } catch (err) {
      logger.warn('Drug discovery query failed', { err });
      return { clusters: [], signals: [], insights: [] };
    }
  }

  // ── Health Check ─────────────────────────────────────────────────────────
  async healthCheck(): Promise<{ status: string; models: string[] }> {
    try {
      const { data } = await this.client.get('/health');
      return data;
    } catch {
      return { status: 'unavailable', models: [] };
    }
  }
}

const aiClient = new AiClient();
export default aiClient;
