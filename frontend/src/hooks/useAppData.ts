import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '../api/auth';
import { getMyPatient, getPatient, listPatients, type PatientRecord } from '../api/patients';
import type { SymptomEntry } from '../api/symptoms';
import type { DocumentRecord } from '../api/documents';
import { getSymptomHistory } from '../api/symptoms';
import { getPatientDocuments } from '../api/documents';
import {
  extractVariantsFromSamples,
  getPatientSamples,
  getVcfFileName,
} from '../api/genomics';
import { getAdminDashboard } from '../api/admin';
import type { SharedState } from '../types';
import { calcAge, formatBytes, formatDateFull, formatDateShort, formatGender } from '../utils/format';

const emptyState = (): SharedState => ({
  patientId: undefined,
  patientProfile: {
    name: '',
    age: 0,
    gender: '',
    country: '',
    status: 'Undiagnosed',
    isCompleted: false,
  },
  diagnosticSuggestions: [],
  symptomLogs: [],
  uploadedFiles: [],
  genomicData: {
    fileName: '',
    status: 'idle',
    progress: 0,
    selectedCaseId: '',
    reportGenerated: false,
    prioritizedVariants: [],
  },
  carePlanCreated: false,
  specialistReferred: false,
  auditLogs: [],
  loading: false,
  error: null,
});

function patientToProfile(patient: PatientRecord): SharedState['patientProfile'] {
  const topCondition = patient.conditions?.[0]?.name;
  const topDx = patient.diagnosticSuggestions?.[0];
  return {
    name: patient.user.fullName,
    age: calcAge(patient.dateOfBirth),
    gender: formatGender(patient.user.gender),
    country: patient.user.country || 'Unknown',
    status: topCondition || (topDx ? `Potential: ${topDx.diseaseName}` : 'Undiagnosed'),
    isCompleted: true,
  };
}

export function useAppData(user: AuthUser | null) {
  const [state, setState] = useState<SharedState>(emptyState);

  const loadPatientBundle = useCallback(async (patientId: string) => {
    const [patient, history, documents, samples] = await Promise.all([
      getPatient(patientId).catch(() => getMyPatient()),
      getSymptomHistory(patientId),
      getPatientDocuments(patientId),
      getPatientSamples(patientId).catch(() => []),
    ]);

    const variants = extractVariantsFromSamples(samples);
    const vcfName = getVcfFileName(samples);

    setState((prev) => ({
      ...prev,
      patientId: patient.id,
      patientProfile: patientToProfile(patient),
      diagnosticSuggestions: patient.diagnosticSuggestions ?? [],
      symptomLogs: history.entries.map((e: SymptomEntry) => ({
        date: formatDateShort(e.date),
        pain: e.pain,
        fatigue: e.fatigue,
        mobility: e.mobility,
        sleep: e.sleep,
        mood: e.mood,
      })),
      uploadedFiles: documents.map((d: DocumentRecord) => ({
        id: d.id,
        name: d.title,
        date: formatDateFull(d.uploadedAt),
        type: d.fileType?.toUpperCase() || 'FILE',
        size: formatBytes(d.fileSize),
      })),
      genomicData: {
        ...prev.genomicData,
        fileName: vcfName,
        status: variants.length > 0 ? 'completed' : prev.genomicData.status,
        prioritizedVariants:
          variants.length > 0 ? variants : prev.genomicData.prioritizedVariants,
      },
      loading: false,
      error: null,
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (user.role === 'patient') {
        const patient = await getMyPatient();
        await loadPatientBundle(patient.id);
        return;
      }

      if (user.role === 'admin') {
        const dashboard = await getAdminDashboard();
        setState((prev) => ({
          ...prev,
          auditLogs: dashboard.recentAuditLogs.map((log) => ({
            id: log.id,
            timestamp: new Date(log.createdAt).toLocaleTimeString(),
            action: log.action,
            user: log.user?.fullName || 'System',
            details: log.details || log.resource || '',
          })),
          loading: false,
        }));
      }

      if (['admin', 'lab', 'clinician', 'researcher'].includes(user.role)) {
        try {
          const patients = await listPatients(1);
          if (patients[0]) await loadPatientBundle(patients[0].id);
          else setState((prev) => ({ ...prev, loading: false }));
        } catch {
          setState((prev) => ({ ...prev, loading: false }));
        }
        return;
      }

      setState((prev) => ({ ...prev, loading: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load data',
      }));
    }
  }, [user, loadPatientBundle]);

  useEffect(() => {
    if (user) refresh();
    else setState(emptyState());
  }, [user, refresh]);

  const syncPatientFromCase = useCallback(
    (patient: {
      id: string;
      dateOfBirth: string;
      user: { fullName: string; gender?: string; country?: string };
      diagnosticSuggestions?: Array<{ diseaseName: string; confidenceScore: number }>;
    }) => {
      setState((prev) => ({
        ...prev,
        patientId: patient.id,
        patientProfile: {
          name: patient.user.fullName,
          age: calcAge(patient.dateOfBirth),
          gender: formatGender(patient.user.gender),
          country: patient.user.country || 'Unknown',
          status:
            patient.diagnosticSuggestions?.[0]?.diseaseName
              ? `Potential: ${patient.diagnosticSuggestions[0].diseaseName}`
              : 'Under review',
          isCompleted: true,
        },
        diagnosticSuggestions: patient.diagnosticSuggestions ?? [],
      }));
    },
    []
  );

  return { state, setState, refresh, syncPatientFromCase, loadPatientBundle };
}
