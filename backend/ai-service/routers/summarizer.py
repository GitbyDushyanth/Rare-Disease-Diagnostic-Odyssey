import os
import logging
import aiofiles
from fastapi import APIRouter, HTTPException, Depends
from models.schemas import (
    SummarizeRequest, SummarizeResponse, DocumentSummary,
    HpoTerm, TimelineEntry, ProgressionRequest, ProgressionResponse,
    ProgressionPrediction, DrugDiscoveryRequest, DrugDiscoveryResponse
)
from services.ai_service import AIService, get_ai_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["AI Analysis"])


# ── AI Module 5: Medical Record Summarizer ────────────────────────────────────
@router.post("/ai/records/summarize", response_model=SummarizeResponse)
async def summarize_record(
    request: SummarizeRequest,
    ai: AIService = Depends(get_ai_service),
):
    """
    AI Module 5: Medical Record Summarizer
    Extracts structured clinical timeline, HPO terms, diagnoses, and key findings
    from PDFs, clinical notes, or lab reports.
    """
    text_content = request.text_content

    # If file path provided, attempt to read text
    if not text_content and request.file_path:
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

        file_ext = os.path.splitext(request.file_path)[1].lower()

        if file_ext == ".pdf":
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(request.file_path)
                text_content = "\n\n".join(page.get_text() for page in doc)
                doc.close()
            except Exception as e:
                logger.warning(f"PDF extraction failed: {e}. Using filename as context.")
                text_content = f"Medical document: {os.path.basename(request.file_path)}"
        elif file_ext in [".txt", ".md", ".csv"]:
            async with aiofiles.open(request.file_path, "r", encoding="utf-8", errors="ignore") as f:
                text_content = await f.read()
        else:
            text_content = f"Document filename: {os.path.basename(request.file_path)}"

    if not text_content or len(text_content.strip()) < 10:
        raise HTTPException(status_code=422, detail="No readable text content found")

    try:
        result, elapsed = await ai.summarize_medical_record(text_content)

        hpo_terms = [
            HpoTerm(
                id=t.get("id", "HP:0000001"),
                name=t.get("name", ""),
                definition=t.get("definition"),
                category=t.get("category"),
                confidence=float(t.get("confidence", 0.5)),
            )
            for t in result.get("hpo_terms", [])
        ]

        timeline = [
            TimelineEntry(
                date=e.get("date", "Unknown"),
                event=e.get("event", ""),
                type=e.get("type", "visit"),
                details=e.get("details"),
            )
            for e in result.get("timeline", [])
        ]

        summary = DocumentSummary(
            summary=result.get("summary", ""),
            key_findings=result.get("key_findings", []),
            hpo_terms=hpo_terms,
            medications=result.get("medications", []),
            diagnoses=result.get("diagnoses", []),
            recommended_tests=result.get("recommended_tests", []),
            timeline=timeline,
        )

        logger.info(f"Summarized document {request.document_id} in {elapsed}ms")

        return SummarizeResponse(
            summary=summary,
            document_id=request.document_id,
            model_used=ai.model,
            processing_time_ms=elapsed,
        )

    except Exception as e:
        logger.error(f"Document summarization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


# ── AI Module 4: Longitudinal Progression Predictor ──────────────────────────
@router.post("/ai/progression/predict", response_model=ProgressionResponse)
async def predict_progression(
    request: ProgressionRequest,
    ai: AIService = Depends(get_ai_service),
):
    """
    AI Module 4: Longitudinal Prediction Engine
    Predicts disease progression trajectory based on symptom history.
    Prediction horizons: 6m, 12m, 24m
    """
    if len(request.symptom_history) < 2:
        raise HTTPException(status_code=422, detail="At least 2 symptom history data points required")

    try:
        result, elapsed = await ai.predict_progression(
            symptom_history=request.symptom_history,
            horizons=request.horizons or ["6m", "12m", "24m"],
        )

        predictions = [
            ProgressionPrediction(
                horizon=p.get("horizon", "6m"),
                risk_level=p.get("risk_level", "moderate"),
                risk_score=float(p.get("risk_score", 50)),
                predicted_symptoms=p.get("predicted_symptoms", []),
                recommended_actions=p.get("recommended_actions", []),
                confidence_interval=p.get("confidence_interval", [40, 60]),
                explanation=p.get("explanation", ""),
            )
            for p in result.get("predictions", [])
        ]

        return ProgressionResponse(
            predictions=predictions,
            patient_id=request.patient_id,
            model_used=ai.model,
        )

    except Exception as e:
        logger.error(f"Progression prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Progression prediction failed: {str(e)}")


# ── Drug Discovery Intelligence ────────────────────────────────────────────────
@router.post("/ai/research/drug-discovery", response_model=DrugDiscoveryResponse)
async def drug_discovery(
    request: DrugDiscoveryRequest,
    ai: AIService = Depends(get_ai_service),
):
    """
    Drug Discovery Intelligence Engine
    Detects novel phenotype clusters and potential disease signals.
    """
    try:
        result, elapsed = await ai.drug_discovery(request.query, request.disease_context)

        return DrugDiscoveryResponse(
            clusters=result.get("clusters", []),
            signals=result.get("signals", []),
            insights=result.get("insights", []),
            repurposing_candidates=result.get("repurposing_candidates", []),
            model_used=ai.model,
        )
    except Exception as e:
        logger.error(f"Drug discovery failed: {e}")
        raise HTTPException(status_code=500, detail=f"Drug discovery query failed: {str(e)}")
