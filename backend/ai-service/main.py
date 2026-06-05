import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routers import hpo_nlp, disease_sim, variant_ai, trial_match, summarizer

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("lumen.ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🧬 LUMEN AI Service starting up...")
    logger.info(f"   Model: {settings.openai_model}")
    logger.info(f"   Environment: {settings.env}")
    if not settings.openai_api_key:
        logger.warning("⚠️  OPENAI_API_KEY is not set — AI endpoints will fail!")
    yield
    logger.info("🛑 LUMEN AI Service shutting down...")


app = FastAPI(
    title="LUMEN AI Intelligence Layer",
    description="""
## LUMEN Rare Disease AI Platform — AI Microservice

Provides 6 specialized AI modules for rare disease diagnostics:

| Module | Endpoint | Description |
|--------|----------|-------------|
| HPO NLP | `POST /ai/hpo/extract` | Extract HPO terms from clinical text |
| Disease Similarity | `POST /ai/disease/rank` | Rank diseases by phenotypic similarity |
| Variant Prioritization | `POST /ai/variants/prioritize` | Prioritize genomic variants |
| Progression Prediction | `POST /ai/progression/predict` | Predict disease trajectory |
| Record Summarizer | `POST /ai/records/summarize` | Summarize medical documents |
| Trial Matching | `POST /ai/trials/match` | Match patients to clinical trials |
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = int((time.time() - start) * 1000)
    response.headers["X-Process-Time-Ms"] = str(elapsed)
    logger.debug(f"{request.method} {request.url.path} → {response.status_code} ({elapsed}ms)")
    return response

# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc), "path": str(request.url.path)},
    )

# ── Mount routers ─────────────────────────────────────────────────────────────
app.include_router(hpo_nlp.router)
app.include_router(disease_sim.router)
app.include_router(variant_ai.router)
app.include_router(trial_match.router)
app.include_router(summarizer.router)

# ── Health & info endpoints ───────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "LUMEN AI Intelligence Layer",
        "version": "1.0.0",
        "model": settings.openai_model,
        "environment": settings.env,
        "modules": [
            "hpo_nlp", "disease_similarity", "variant_prioritization",
            "progression_prediction", "record_summarizer", "trial_matching",
            "drug_discovery",
        ],
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "name": "LUMEN AI Service",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "hpo_extract": "/ai/hpo/extract",
            "disease_rank": "/ai/disease/rank",
            "variant_prioritize": "/ai/variants/prioritize",
            "trial_match": "/ai/trials/match",
            "record_summarize": "/ai/records/summarize",
            "progression_predict": "/ai/progression/predict",
            "drug_discovery": "/ai/research/drug-discovery",
        },
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "development",
        log_level=settings.log_level,
    )
