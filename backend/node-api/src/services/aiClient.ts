import axios, { AxiosInstance } from 'axios';
import logger from '../lib/logger';
import { HpoTerm, DiseaseMatch, VariantPriority, TrialMatchResult, DocumentSummary } from '../types';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '30000');

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
      return data.matches || [];
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
      return data.summary || { timeline: [], keyFindings: [], hpoTerms: [], medications: [], diagnoses: [], recommendedTests: [], summary: '' };
    } catch (err) {
      logger.warn('Document summarization failed', { err });
      return { timeline: [], keyFindings: [], hpoTerms: [], medications: [], diagnoses: [], recommendedTests: [], summary: 'Extraction failed. Please retry.' };
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
      return data.matches || [];
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
