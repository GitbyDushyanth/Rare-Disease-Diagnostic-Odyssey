import time
import logging
from fastapi import APIRouter, HTTPException, Depends
from models.schemas import HpoExtractRequest, HpoExtractResponse, HpoTerm
from services.ai_service import AIService, get_ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai/hpo", tags=["HPO NLP"])


@router.post("/extract", response_model=HpoExtractResponse)
async def extract_hpo_terms(
    request: HpoExtractRequest,
    ai: AIService = Depends(get_ai_service),
):
    """
    AI Module 1: Phenotype NLP Engine
    Extracts structured HPO terms from free-text clinical notes or symptom descriptions.
    Target accuracy: 90%+
    """
    if len(request.text.strip()) < 3:
        raise HTTPException(status_code=422, detail="Text too short for HPO extraction")

    try:
        result, elapsed = await ai.extract_hpo_terms(request.text, request.context)

        hpo_terms = [
            HpoTerm(
                id=t.get("id", f"HP:{i:07d}"),
                name=t.get("name", "Unknown"),
                definition=t.get("definition"),
                category=t.get("category"),
                confidence=float(t.get("confidence", 0.5)),
                evidence_text=t.get("evidence_text"),
            )
            for i, t in enumerate(result.get("hpo_terms", []))
        ]

        logger.info(f"Extracted {len(hpo_terms)} HPO terms in {elapsed}ms")

        return HpoExtractResponse(
            hpo_terms=hpo_terms,
            raw_entities=result.get("raw_entities", []),
            model_used=ai.model,
            processing_time_ms=elapsed,
        )

    except Exception as e:
        logger.error(f"HPO extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"HPO extraction failed: {str(e)}")


@router.post("/batch-extract")
async def batch_extract_hpo(
    texts: list[str],
    ai: AIService = Depends(get_ai_service),
):
    """Extract HPO terms from multiple texts (max 10)."""
    if len(texts) > 10:
        raise HTTPException(status_code=422, detail="Maximum 10 texts per batch")

    results = []
    for text in texts:
        try:
            result, elapsed = await ai.extract_hpo_terms(text)
            results.append({"terms": result.get("hpo_terms", []), "elapsed_ms": elapsed})
        except Exception as e:
            results.append({"error": str(e), "terms": []})

    return {"success": True, "results": results}
