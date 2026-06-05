import { apiGet, apiPatch, type ApiResponse } from './client';

export interface PatientRecord {
  id: string;
  userId: string;
  mrn: string;
  dateOfBirth: string;
  heightCm?: number;
  weightKg?: number;
  user: {
    fullName: string;
    email: string;
    phone?: string;
    country?: string;
    gender?: string;
  };
  conditions?: Array<{ id: string; name: string; status: string; icdCode?: string }>;
  diagnosticSuggestions?: Array<{
    id: string;
    diseaseName: string;
    confidenceScore: number;
    rank: number;
    explanation?: string;
  }>;
  _count?: {
    symptomEntries: number;
    documents: number;
    genomicSamples: number;
    trialMatches?: number;
  };
}

export async function getMyPatient(): Promise<PatientRecord> {
  const res = await apiGet<ApiResponse<PatientRecord>>('/patients/me');
  return res.data;
}

export async function listPatients(limit = 5): Promise<PatientRecord[]> {
  const res = await apiGet<ApiResponse<PatientRecord[]>>(`/patients?limit=${limit}`);
  return res.data;
}

export async function getPatient(id: string): Promise<PatientRecord> {
  const res = await apiGet<ApiResponse<PatientRecord>>(`/patients/${id}`);
  return res.data;
}

export async function updatePatient(
  id: string,
  data: Partial<{ heightCm: number; weightKg: number; primaryLanguage: string }>
): Promise<PatientRecord> {
  const res = await apiPatch<ApiResponse<PatientRecord>>(`/patients/${id}`, data);
  return res.data;
}
