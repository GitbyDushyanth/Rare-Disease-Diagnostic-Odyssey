import logging
from fastapi import APIRouter, HTTPException, Depends
from models.schemas import (
    VariantPrioritizeRequest, VariantPrioritizeResponse, VariantResult
)
from services.ai_service import AIService, get_ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai/variants", tags=["Variant Prioritization"])


@router.post("/prioritize", response_model=VariantPrioritizeResponse)
async def prioritize_variants(
    request: VariantPrioritizeRequest,
    ai: AIService = Depends(get_ai_service),
):
    """
    AI Module 3: Variant Prioritization Engine
    Prioritizes genomic variants using HPO phenotype context and ACMG/AMP guidelines.
    Input: VCF sample ID + HPO profile + inheritance mode
    Output: Top 10-20 candidate variants with ACMG classifications
    """
    if not request.hpo_terms:
        raise HTTPException(status_code=422, detail="HPO terms required for variant prioritization")

    try:
        result, elapsed = await ai.prioritize_variants(
            hpo_terms=request.hpo_terms,
            inheritance_mode=request.inheritance_mode,
            sample_id=request.sample_id,
        )

        variants = [
            VariantResult(
                gene=v.get("gene", "UNKNOWN"),
                variant=v.get("variant", ""),
                acmg=v.get("acmg", "VUS"),
                confidence=float(v.get("confidence", 0)),
                clinvar=v.get("clinvar"),
                gnomad=v.get("gnomad"),
                omim=v.get("omim"),
                literature=v.get("literature"),
                notes=v.get("notes"),
                chromosome=v.get("chromosome"),
                position=v.get("position"),
                zygosity=v.get("zygosity"),
                cadd_score=v.get("cadd_score"),
            )
            for v in result.get("variants", [])
        ]

        # Sort by confidence desc
        variants.sort(key=lambda v: v.confidence, reverse=True)

        logger.info(f"Prioritized {len(variants)} variants for sample {request.sample_id} in {elapsed}ms")

        return VariantPrioritizeResponse(
            variants=variants,
            total_variants_analyzed=result.get("total_variants_analyzed", len(variants) * 1000),
            model_used=ai.model,
            processing_time_ms=elapsed,
        )

    except Exception as e:
        logger.error(f"Variant prioritization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Variant prioritization failed: {str(e)}")


@router.post("/classify")
async def classify_variant(
    gene: str,
    variant: str,
    evidence: dict,
    ai: AIService = Depends(get_ai_service),
):
    """
    Standalone ACMG variant classification endpoint.
    Provide gene, variant (HGVS), and evidence dict.
    """
    try:
        result, elapsed = await ai.json_completion(
            system_prompt="""You are an ACMG/AMP variant classification expert.
Classify the variant using ACMG 2015 criteria and return:
{
  "acmg_classification": "Pathogenic",
  "criteria_met": ["PVS1", "PS1", "PM2"],
  "criteria_evidence": {"PVS1": "Frameshift causing premature stop codon"},
  "confidence": 0.94,
  "explanation": "Frameshift in critical domain...",
  "references": ["PMID:12345678"]
}""",
            user_message=f"Gene: {gene}\nVariant: {variant}\nEvidence: {evidence}",
        )
        return {"success": True, "data": result, "elapsed_ms": elapsed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
