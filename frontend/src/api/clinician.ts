import { apiGet, apiPost, type ApiResponse } from './client';

export interface ClinicianDashboard {
  stats: {
    activeCases: number;
    urgentCases: number;
    pendingInterpretations: number;
    avgResolutionDays: number;
  };
  recentSuggestions: Array<{
    id: string;
    diseaseName: string;
    confidenceScore: number;
    patient: { user: { fullName: string } };
  }>;
}

export interface CaseRecord {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  aiFlag?: string;
  createdAt: string;
  patient: {
    id: string;
    dateOfBirth: string;
    user: { fullName: string; email: string; gender?: string };
    diagnosticSuggestions?: Array<{
      diseaseName: string;
      confidenceScore: number;
      rank: number;
    }>;
  };
}

export interface SpecialistRecord {
  id: string;
  specialty?: string;
  institution?: string;
  user: { id: string; fullName: string; email: string };
}

export async function getClinicianDashboard(): Promise<ClinicianDashboard> {
  const res = await apiGet<ApiResponse<ClinicianDashboard>>('/clinician/dashboard');
  return res.data;
}

export async function getCases(): Promise<CaseRecord[]> {
  const res = await apiGet<ApiResponse<CaseRecord[]>>('/clinician/cases');
  return res.data;
}

export async function getCase(id: string): Promise<CaseRecord> {
  const res = await apiGet<ApiResponse<CaseRecord>>(`/clinician/cases/${id}`);
  return res.data;
}

export async function createCarePlan(data: {
  patientId: string;
  caseId?: string;
  primaryDiagnosis: string;
  recommendedTests: string[];
  referrals?: string[];
  notes?: string;
}): Promise<void> {
  await apiPost('/clinician/care-plan', data);
}

export async function referCase(
  caseId: string,
  data: { specialistId: string; reason: string; urgency?: 'routine' | 'urgent' | 'emergency' }
): Promise<void> {
  await apiPost(`/clinician/cases/${caseId}/refer`, data);
}

export async function getSpecialists(specialty?: string): Promise<SpecialistRecord[]> {
  const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
  const res = await apiGet<ApiResponse<SpecialistRecord[]>>(`/clinician/specialists${query}`);
  return res.data;
}
