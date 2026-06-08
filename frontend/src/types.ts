export interface SymptomLog {
  date: string;
  pain: number;
  fatigue: number;
  mobility: number;
  sleep: number;
  mood: number;
}

export interface MedicalFile {
  id: string;
  name: string;
  date: string;
  type: string;
  size: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

export interface DiagnosticSuggestion {
  diseaseName: string;
  confidenceScore: number;
  rank?: number;
  explanation?: string;
}

export interface SharedState {
  patientId?: string;
  patientProfile: {
    name: string;
    age: number;
    gender: string;
    country: string;
    status: string;
    isCompleted: boolean;
  };
  diagnosticSuggestions: DiagnosticSuggestion[];
  symptomLogs: SymptomLog[];
  uploadedFiles: MedicalFile[];
  loading?: boolean;
  error?: string | null;
  genomicData: {
    fileName: string;
    status: 'idle' | 'uploading' | 'analyzing' | 'completed';
    progress: number;
    selectedCaseId: string;
    reportGenerated: boolean;
    prioritizedVariants: {
      gene: string;
      variant: string;
      acmg: string;
      confidence: number;
      clinvar?: string;
      gnomad?: number;
      omim?: string;
      literature?: number;
      notes?: string;
    }[];
  };
  carePlanCreated: boolean;
  specialistReferred: boolean;
  auditLogs: AuditLog[];
}
