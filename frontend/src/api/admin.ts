import { apiGet, type ApiResponse } from './client';

export interface AdminDashboard {
  stats: {
    totalPatients: number;
    totalClinicians: number;
    totalHospitals: number;
    totalCases: number;
    activeCases: number;
    totalGenomes: number;
    apiCallsPerMin: number;
    platformHealth: { uptime: number; uptimeSeconds: number };
  };
  recentAuditLogs: AuditLogRecord[];
}

export interface PlatformAnalytics {
  last30Days: { newPatients: number; newUsers: number; newCases: number; completedAnalyses: number };
  diagnosticYield: number;
  genomicCoverage: number;
  dataQuality: { completeness: number; accuracy: number; consistency: number };
}

export interface AuditLogRecord {
  id: string;
  action: string;
  resource?: string;
  details?: string;
  result?: string;
  createdAt: string;
  user?: { fullName: string; email: string };
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const res = await apiGet<ApiResponse<AdminDashboard>>('/admin/dashboard');
  return res.data;
}

export async function getComplianceReport(): Promise<unknown> {
  const res = await apiGet<ApiResponse<unknown>>('/admin/reports/compliance');
  return res.data;
}

export async function getAuditLogs(page = 1, limit = 50): Promise<AuditLogRecord[]> {
  const res = await apiGet<ApiResponse<AuditLogRecord[]>>(
    `/admin/audit-logs?page=${page}&limit=${limit}`
  );
  return res.data;
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const res = await apiGet<ApiResponse<PlatformAnalytics>>('/admin/analytics/platform');
  return res.data;
}
