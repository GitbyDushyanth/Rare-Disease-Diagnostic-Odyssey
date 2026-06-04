# LUMEN Backend

> Rare Disease Diagnostic Intelligence Platform — Backend Services

---

## Architecture

```
backend/
├── node-api/          # Express + TypeScript API Gateway  (port 3001)
└── ai-service/        # Python FastAPI AI Layer           (port 8000)
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- npm / pip

### 1 — Node.js API

```bash
cd backend/node-api

# Install dependencies
npm install

# Copy and fill env
copy .env.example .env

# Push schema to SQLite (creates dev.db)
npx prisma db push

# Seed demo data (all 5 user roles + patient records)
npm run db:seed

# Start dev server
npm run dev
```

API available at: `http://localhost:3001`
Swagger not included — use the endpoint table below.

---

### 2 — Python AI Service

```bash
cd backend/ai-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and fill env (add your OpenAI key)
copy .env.example .env

# Start dev server
uvicorn main:app --reload --port 8000
```

API docs at: `http://localhost:8000/docs`

---

### 3 — Docker (Full Stack)

```bash
cd backend

# Create .env with your OPENAI_API_KEY
echo OPENAI_API_KEY=sk-your-key > .env

docker-compose up --build
```

---

## Demo Credentials

| Role       | Email                        | Password      |
|------------|------------------------------|---------------|
| Admin      | admin@lumen.health           | Admin@123456  |
| Clinician  | dr.patel@stanford.edu        | Clinician@123 |
| Lab        | lab@lumen.health             | Lab@123456    |
| Researcher | researcher@lumen.health      | Research@123  |
| Patient    | sarah.johnson@example.com    | Patient@123   |

---

## Node.js API Endpoints (`/api/v1/...`)

### Auth
| Method | Endpoint              | Description              | Auth |
|--------|-----------------------|--------------------------|------|
| POST   | `/auth/register`      | Create account           | —    |
| POST   | `/auth/login`         | Get JWT tokens           | —    |
| POST   | `/auth/refresh`       | Rotate refresh token     | —    |
| POST   | `/auth/logout`        | Revoke tokens            | ✅   |
| GET    | `/auth/me`            | Get own profile          | ✅   |
| PATCH  | `/auth/me`            | Update profile           | ✅   |

### Patients
| Method | Endpoint                      | Description              | Roles          |
|--------|-------------------------------|--------------------------|----------------|
| GET    | `/patients`                   | List all patients        | clinician/admin|
| GET    | `/patients/me`                | Own patient record       | patient        |
| GET    | `/patients/:id`               | Get patient              | all            |
| POST   | `/patients`                   | Create patient           | clinician/admin|
| PATCH  | `/patients/:id`               | Update patient           | all            |
| GET    | `/patients/:id/timeline`      | Full event timeline      | all            |
| GET    | `/patients/:id/conditions`    | Active conditions        | all            |
| POST   | `/patients/:id/conditions`    | Add condition            | clinician/admin|
| GET    | `/patients/:id/encounters`    | Encounter history        | all            |
| POST   | `/patients/:id/contacts`      | Add emergency contact    | all            |

### Symptoms
| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| POST   | `/symptoms/log`                   | Log daily symptom check-in   |
| GET    | `/symptoms/:patientId/history`    | History (with ?days=90)      |
| GET    | `/symptoms/:patientId/latest`     | Most recent entry            |
| GET    | `/symptoms/:patientId/hpo`        | Aggregated HPO terms         |
| POST   | `/symptoms/:patientId/analyze`    | Trigger AI disease analysis  |

### Documents (Medical Vault)
| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| POST   | `/documents/upload`               | Upload file (multipart)      |
| GET    | `/documents/patient/:patientId`   | List patient documents       |
| GET    | `/documents/:id`                  | Get document                 |
| GET    | `/documents/:id/extraction`       | Get AI extraction result     |
| POST   | `/documents/:id/re-extract`       | Re-trigger AI extraction     |
| DELETE | `/documents/:id`                  | Delete document + file       |

### Genomics
| Method | Endpoint                              | Description                   |
|--------|---------------------------------------|-------------------------------|
| POST   | `/genomics/samples`                   | Create genomic sample         |
| POST   | `/genomics/upload`                    | Upload VCF/BAM file           |
| GET    | `/genomics/samples/patient/:pid`      | Patient's samples             |
| GET    | `/genomics/samples/:id`               | Sample + variants             |
| POST   | `/genomics/prioritize`                | AI variant prioritization     |
| GET    | `/genomics/variants/:sampleId`        | Variant list                  |
| POST   | `/genomics/variants/:id/interpret`    | Add ACMG interpretation       |
| POST   | `/genomics/report/:jobId`             | Generate genomic report       |

### Clinician Portal
| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| GET    | `/clinician/dashboard`            | Stats + recent alerts        |
| GET    | `/clinician/cases`                | Case queue                   |
| GET    | `/clinician/cases/:id`            | Case detail                  |
| POST   | `/clinician/cases`                | Create case                  |
| PATCH  | `/clinician/cases/:id`            | Update case status/priority  |
| POST   | `/clinician/cases/:id/messages`   | Post case message            |
| POST   | `/clinician/cases/:id/refer`      | Refer to specialist          |
| POST   | `/clinician/differential`         | AI differential diagnosis    |
| POST   | `/clinician/care-plan`            | Create + notify care plan    |
| GET    | `/clinician/specialists`          | Find specialists             |

### Clinical Trials
| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| GET    | `/trials`                         | Browse trials                |
| GET    | `/trials/:id`                     | Trial detail                 |
| POST   | `/trials/match/:patientId`        | AI patient-trial matching    |
| GET    | `/trials/matches/:patientId`      | Patient's trial matches      |
| PATCH  | `/trials/matches/:id/status`      | Update match status          |

### Research Portal
| Method | Endpoint                                  | Description               |
|--------|-------------------------------------------|---------------------------|
| GET    | `/research/dashboard`                     | Platform stats            |
| POST   | `/research/cohort`                        | Cohort builder query      |
| GET    | `/research/analytics/disease-distribution`| Disease frequency chart   |
| GET    | `/research/analytics/gene-frequency`      | Gene variant frequency    |
| GET    | `/research/analytics/diagnostic-yield`    | Diagnostic yield stats    |
| GET    | `/research/datasets/export`               | Export dataset (JSON/CSV) |
| POST   | `/research/drug-discovery`                | Drug discovery query      |

### Admin Portal
| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| GET    | `/admin/dashboard`                | Platform overview            |
| GET    | `/admin/users`                    | User management              |
| PATCH  | `/admin/users/:id/status`         | Suspend/activate user        |
| GET    | `/admin/organizations`            | Hospital/lab list            |
| POST   | `/admin/organizations`            | Add organization             |
| GET    | `/admin/audit-logs`               | HIPAA audit trail            |
| GET    | `/admin/analytics/platform`       | 30-day platform analytics    |
| GET    | `/admin/settings`                 | System settings              |
| POST   | `/admin/settings`                 | Update setting               |
| GET    | `/admin/reports/compliance`       | HIPAA/GDPR/SOC2 report       |

### FHIR R4
| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| GET    | `/fhir/metadata`                  | CapabilityStatement          |
| GET    | `/fhir/Patient/:id`               | FHIR Patient resource        |
| GET    | `/fhir/Observation/:patientId`    | FHIR Observations Bundle     |
| GET    | `/fhir/Condition/:patientId`      | FHIR Conditions Bundle       |
| GET    | `/fhir/Patient/:id/$everything`   | Full patient Bundle          |

### Notifications
| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | `/notifications`              | List (with ?unread=true) |
| PATCH  | `/notifications/:id/read`     | Mark as read             |
| POST   | `/notifications/read-all`     | Mark all read            |
| DELETE | `/notifications/:id`          | Delete notification      |
| POST   | `/notifications/send`         | Admin broadcast          |

---

## Python AI Service Endpoints

| Method | Endpoint                        | Description                   |
|--------|---------------------------------|-------------------------------|
| GET    | `/health`                       | Service health check          |
| POST   | `/ai/hpo/extract`               | HPO term extraction from text |
| POST   | `/ai/hpo/batch-extract`         | Batch HPO extraction          |
| POST   | `/ai/disease/rank`              | Disease similarity ranking    |
| GET    | `/ai/disease/info/:disease_id`  | Disease detail lookup         |
| POST   | `/ai/variants/prioritize`       | Variant prioritization        |
| POST   | `/ai/variants/classify`         | ACMG variant classification   |
| POST   | `/ai/trials/match`              | Patient-trial matching        |
| GET    | `/ai/trials/search`             | Trial search by condition     |
| POST   | `/ai/records/summarize`         | Medical record summarization  |
| POST   | `/ai/progression/predict`       | Disease progression prediction|
| POST   | `/ai/research/drug-discovery`   | Drug discovery intelligence   |

---

## Database Schema (SQLite via Prisma)

30 tables across 6 domains:

| Domain | Tables |
|--------|--------|
| Core & Identity | User, RefreshToken, UserProfile, Organization |
| Clinical & Patient | Patient, PatientContact, Condition, Encounter |
| Symptoms | SymptomEntry, Observation, Procedure, Medication |
| Documents | Document, DocumentExtraction, ImagingStudy |
| Genomics | GenomicSample, SequencingRun, Variant, VariantAnnotation, VariantInterpretation |
| AI & Analysis | AnalysisJob, AnalysisResult, DiagnosticSuggestion |
| Collaboration | Case, CaseParticipant, CaseMessage, CaseAttachment |
| Research & Trials | ClinicalTrial, TrialEligibilityCriteria, TrialMatch |
| System & Audit | AuditLog, Notification, SystemSetting |

---

## Compliance

- **HIPAA**: Every mutating request auto-logged to `AuditLog`. 7-year retention. PII encrypted at rest.
- **GDPR**: User deletion cascade. Data export endpoint. Consent in patient profile.
- **SOC 2**: Role-based access control. JWT 15-min expiry + 30-day refresh rotation. Rate limiting.
- **FHIR R4**: Patient, Observation, Condition resources. `$everything` operation.

---

## Environment Variables

### Node API (`.env`)
```
DATABASE_URL=file:./dev.db
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
AI_SERVICE_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:5173
UPLOAD_DIR=./uploads
```

### AI Service (`.env`)
```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
```
