# LUMEN – Rare Disease Diagnostic Intelligence Platform

## Overview
LUMEN is a full-stack healthcare platform designed to support rare disease diagnosis and care coordination.

### Components
- Frontend: React + Vite + TypeScript
- API Gateway: Node.js + Express + Prisma
- AI Service: FastAPI (Python)
- Database: SQLite (development)

---

## Project Structure

```text
frontend/                 React application
backend/
├── node-api/             Express + Prisma API
└── ai-service/           FastAPI AI service
```

---

## Prerequisites

### Required
- Node.js 20+
- npm 10+
- Python 3.11+
- Git

Optional:
- Docker Desktop

---

## Installation

### 1. Clone Project

```bash
git clone <repository-url>
cd Rare-Disease-Diagnostic-Odyssey
```

---

### 2. Configure Node API

```bash
cd backend/node-api
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Initialize database:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

Start API:

```bash
npm run dev
```

API runs on:

```text
http://localhost:3001
```

---

### 3. Configure AI Service

```bash
cd backend/ai-service
python -m venv venv
```

Activate:

Windows:

```bash
venv\Scripts\activate
```

Linux/macOS:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create:

```bash
cp .env.example .env
```

Start:

```bash
uvicorn main:app --reload --port 8000
```

Swagger:

```text
http://localhost:8000/docs
```

---

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Demo Accounts

| Role | Email | Password |
|------|--------|----------|
| Admin | admin@lumen.health | Admin@123456 |
| Clinician | dr.patel@stanford.edu | Clinician@123 |
| Lab | lab@lumen.health | Lab@123456 |
| Researcher | researcher@lumen.health | Research@123 |
| Patient | sarah.johnson@example.com | Patient@123 |

---

## Features

### Patient Portal
- Symptom tracking
- Health check-ins
- Medical records upload
- Diagnostic timeline

### Clinician Portal
- Case management
- AI diagnostic suggestions
- Care plans

### Lab Portal
- Variant interpretation
- Genomic review workflow

### Research Portal
- Cohort analysis
- Clinical trial matching

### Admin Portal
- User management
- Audit monitoring
- Platform analytics

---

## Common Commands

### Node API

```bash
npm run dev
npm run build
npm run db:push
npm run db:seed
```

### Frontend

```bash
npm run dev
npm run build
```

### AI Service

```bash
uvicorn main:app --reload
```

---

## Known Issues / Review Notes

1. Frontend package name is still `hachazards` and should be renamed to a project-specific name.
2. Login depends on seeded demo users; authentication will fail if `npm run db:seed` is skipped.
3. Environment variables must be copied from `.env.example` files before first run.
4. SQLite is suitable for development only; production should use PostgreSQL or another managed database.
5. API, AI service, and frontend must all be running simultaneously for full functionality.
6. Verify frontend API endpoint configuration (`VITE_API_URL`) when deploying outside local development.

---

## Ports

| Service | Port |
|-----------|------|
| Frontend | 5173 |
| Node API | 3001 |
| AI Service | 8000 |

---

## License

Educational / demonstration project.
