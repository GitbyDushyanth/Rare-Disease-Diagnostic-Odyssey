import { apiGet, apiPost, type ApiResponse } from './client';

export interface DocumentRecord {
  id: string;
  patientId: string;
  title: string;
  docType: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  extractions?: Array<{ extractionStatus: string }>;
}

export async function getPatientDocuments(patientId: string): Promise<DocumentRecord[]> {
  const res = await apiGet<ApiResponse<DocumentRecord[]>>(`/documents/patient/${patientId}`);
  return res.data;
}

export async function uploadDocument(
  patientId: string,
  file: File,
  title?: string
): Promise<DocumentRecord> {
  const form = new FormData();
  form.append('file', file);
  form.append('patientId', patientId);
  if (title) form.append('title', title);

  const res = await apiPost<ApiResponse<DocumentRecord>>('/documents/upload', form);
  return res.data;
}
