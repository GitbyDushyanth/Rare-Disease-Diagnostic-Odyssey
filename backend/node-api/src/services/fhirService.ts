// ─────────────────────────────────────────────────────────────────────────────
// FHIR R4 Resource Builders
// Converts Prisma models → valid FHIR R4 JSON resources
// ─────────────────────────────────────────────────────────────────────────────

export function buildFhirPatient(patient: {
  id: string;
  mrn: string;
  dateOfBirth: Date;
  lifeStatus: string;
  primaryLanguage: string;
  user: { fullName: string; email: string; gender?: string | null; phone?: string | null };
  contacts: Array<{ name: string; relationship: string; phone?: string | null }>;
}) {
  const nameParts = patient.user.fullName.trim().split(' ');
  const given = nameParts.slice(0, -1);
  const family = nameParts[nameParts.length - 1];

  return {
    resourceType: 'Patient',
    id: patient.id,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient'],
      lastUpdated: new Date().toISOString(),
    },
    identifier: [
      {
        use: 'official',
        system: 'https://lumen.health/patients/mrn',
        value: patient.mrn,
      },
    ],
    active: patient.lifeStatus === 'alive',
    name: [{ use: 'official', family, given: given.length > 0 ? given : [nameParts[0]] }],
    telecom: [
      ...(patient.user.email ? [{ system: 'email', value: patient.user.email, use: 'home' }] : []),
      ...(patient.user.phone ? [{ system: 'phone', value: patient.user.phone, use: 'mobile' }] : []),
    ],
    gender: mapGender(patient.user.gender || 'unknown'),
    birthDate: patient.dateOfBirth.toISOString().split('T')[0],
    deceasedBoolean: patient.lifeStatus === 'deceased',
    communication: [
      {
        language: {
          coding: [{ system: 'urn:ietf:bcp:47', code: patient.primaryLanguage }],
        },
        preferred: true,
      },
    ],
    contact: patient.contacts.map((c) => ({
      relationship: [{ text: c.relationship }],
      name: { text: c.name },
      telecom: c.phone ? [{ system: 'phone', value: c.phone }] : [],
    })),
  };
}

export function buildFhirObservation(
  obs: {
    id: string;
    code: string;
    name?: string | null;
    value?: string | null;
    unit?: string | null;
    status: string;
    performedDate?: Date | null;
  },
  patientId: string
) {
  return {
    resourceType: 'Observation',
    id: obs.id,
    status: obs.status,
    subject: { reference: `Patient/${patientId}` },
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: obs.code,
          display: obs.name || obs.code,
        },
      ],
      text: obs.name || obs.code,
    },
    ...(obs.value && obs.unit
      ? {
          valueQuantity: {
            value: parseFloat(obs.value) || obs.value,
            unit: obs.unit,
            system: 'http://unitsofmeasure.org',
          },
        }
      : obs.value
      ? { valueString: obs.value }
      : {}),
    effectiveDateTime: obs.performedDate?.toISOString(),
  };
}

export function buildFhirCondition(
  condition: {
    id: string;
    icdCode: string;
    name: string;
    status: string;
    onsetDate?: Date | null;
    notes?: string | null;
  },
  patientId: string
) {
  return {
    resourceType: 'Condition',
    id: condition.id,
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: mapConditionStatus(condition.status),
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
        },
      ],
    },
    code: {
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: condition.icdCode,
          display: condition.name,
        },
      ],
      text: condition.name,
    },
    subject: { reference: `Patient/${patientId}` },
    onsetDateTime: condition.onsetDate?.toISOString(),
    note: condition.notes ? [{ text: condition.notes }] : undefined,
  };
}

export function buildFhirBundle(
  type: 'searchset' | 'collection' | 'transaction',
  entries: unknown[]
) {
  return {
    resourceType: 'Bundle',
    type,
    total: entries.length,
    timestamp: new Date().toISOString(),
    entry: entries.map((resource) => ({
      resource,
      fullUrl: `https://lumen.health/fhir/${(resource as { resourceType: string; id: string }).resourceType}/${(resource as { id: string }).id}`,
    })),
  };
}

function mapGender(gender: string): string {
  const map: Record<string, string> = {
    male: 'male', female: 'female', other: 'other', unknown: 'unknown',
    prefer_not_to_say: 'unknown',
  };
  return map[gender.toLowerCase()] || 'unknown';
}

function mapConditionStatus(status: string): string {
  const map: Record<string, string> = {
    active: 'active', resolved: 'resolved', inactive: 'inactive', suspected: 'provisional',
  };
  return map[status] || 'active';
}
