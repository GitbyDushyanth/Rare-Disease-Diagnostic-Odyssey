import { apiGet, apiPost, type ApiResponse } from './client';

export interface ResearchDashboard {
  totalPatients: number;
  totalGenomes: number;
  totalTrials: number;
  countries: number;
  phenotypesMapped: number;
  topHpoTerms: Array<{ name: string; count: number }>;
}

export interface CohortResult {
  patients: Array<{
    id: string;
    dateOfBirth: string;
    user: { fullName: string; gender?: string; country?: string };
  }>;
  total: number;
  page: number;
  limit: number;
  demographics?: {
    age: Array<{ label: string; pct: number }>;
    gender: Array<{ label: string; pct: number }>;
  };
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
  const res = await apiPost<ApiResponse<CohortResult>>('/research/cohort', filters);
  return res.data;
}

export async function exportDataset(format: 'json' | 'csv' = 'json'): Promise<Blob> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || '/api/v1'}/research/export?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('lumen_access_token') || ''}`,
      },
    }
  );
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
