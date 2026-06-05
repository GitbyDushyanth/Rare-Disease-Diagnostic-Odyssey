import { apiGet, apiPost, type ApiResponse } from './client';

export interface SymptomEntry {
  id: string;
  patientId: string;
  date: string;
  pain: number;
  fatigue: number;
  mobility: number;
  sleep: number;
  mood: number;
  notes?: string;
  hpoTerms?: string;
}

export async function logSymptom(data: {
  patientId: string;
  pain: number;
  fatigue: number;
  mobility: number;
  sleep: number;
  mood: number;
  notes?: string;
}): Promise<SymptomEntry> {
  const res = await apiPost<ApiResponse<SymptomEntry>>('/symptoms/log', data);
  return res.data;
}

export async function getSymptomHistory(
  patientId: string,
  days = 90
): Promise<{ entries: SymptomEntry[]; stats: Record<string, number> | null }> {
  const res = await apiGet<ApiResponse<SymptomEntry[]> & { meta?: { stats: Record<string, number> | null } }>(
    `/symptoms/${patientId}/history?days=${days}`
  );
  return { entries: res.data, stats: res.meta?.stats ?? null };
}
