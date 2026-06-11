import { apiGet, apiPost, type ApiResponse } from './client';

const rawApiUrl = import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/$/, '')}/api/v1`;

export interface ResearchDashboard {
  totalPatients: number;
  totalGenomes: number;
  totalTrials: number;
  countries: number;
  phenotypesMapped: number;
  topHpoTerms: Array<{ name: string; count: number }>;
}

export interface CohortDemographics {
  age: Array<{ label: string; pct: number }>;
  gender: Array<{ label: string; pct: number }>;
}

export interface CohortPatient {
  id: string;
  ageGroup: string;
  lifeStatus: string;
  conditions: string[];
  hasGenomicData: boolean;
  symptomCount: number;
}

export interface CohortResult {
  patients: CohortPatient[];
  total: number;
  page: number;
  limit: number;
  demographics?: CohortDemographics;
}

interface CohortMeta {
  total?: number;
  page?: number;
  limit?: number;
  demographics?: CohortDemographics;
}

export async function getResearchDashboard(): Promise<ResearchDashboard> {
  const res = await apiGet<ApiResponse<ResearchDashboard>>('/research/dashboard');
  return res.data;
}

export async function searchCohort(filters: {
  genes?: string[];
  conditions?: string[];
  ageMin?: number;
  ageMax?: number;
  limit?: number;
}): Promise<CohortResult> {
  const res = await apiPost<ApiResponse<CohortPatient[]>>('/research/cohort', filters);
  const meta = res.meta as CohortMeta | undefined;
  return {
    patients: res.data,
    total: meta?.total ?? res.data.length,
    page: meta?.page ?? 1,
    limit: meta?.limit ?? filters.limit ?? res.data.length,
    demographics: meta?.demographics,
  };
}

export async function exportDataset(format: 'json' | 'csv' = 'json'): Promise<Blob> {
  const res = await fetch(
    `${API_BASE}/research/datasets/export?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('lumen_access_token') || ''}`,
      },
    }
  );
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
