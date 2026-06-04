import logging
from fastapi import APIRouter, HTTPException, Depends
from models.schemas import DiseaseRankRequest, DiseaseRankResponse, DiseaseMatch
from services.ai_service import AIService, get_ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai/disease", tags=["Disease Similarity"])


@router.post("/rank", response_model=DiseaseRankResponse)
async def rank_diseases(
    request: DiseaseRankRequest,
    ai: AIService = Depends(get_ai_service),
):
    """
    AI Module 2: Disease Similarity Engine
    Ranks rare diseases by phenotypic similarity to an HPO profile.
    Input: HPO term IDs or names
    Output: Top-20 disease matches with confidence scores
    Target response: <2 seconds
    """
    if not request.hpo_terms:
        raise HTTPException(status_code=422, detail="At least one HPO term is required")

    try:
        result, elapsed = await ai.rank_diseases(request.hpo_terms, request.max_results or 20)

        matches = [
            DiseaseMatch(
                disease_id=m.get("disease_id", ""),
                disease_name=m.get("disease_name", "Unknown Disease"),
                confidence=float(m.get("confidence", 0)),
                rank=m.get("rank", i + 1),
                hpo_overlap=m.get("hpo_overlap", []),
                gene_associations=m.get("gene_associations", []),
                inheritance_pattern=m.get("inheritance_pattern"),
                prevalence=m.get("prevalence"),
                omim_id=m.get("omim_id"),
                orphanet_id=m.get("orphanet_id"),
                explanation=m.get("explanation"),
            )
            for i, m in enumerate(result.get("matches", []))
        ]

        # Apply inheritance filter if requested
        if request.filter_inheritance:
            matches = [
                m for m in matches
                if m.inheritance_pattern and request.filter_inheritance.lower() in m.inheritance_pattern.lower()
            ]

        logger.info(f"Ranked {len(matches)} diseases for {len(request.hpo_terms)} HPO terms in {elapsed}ms")

        return DiseaseRankResponse(
            matches=matches,
            hpo_terms_used=request.hpo_terms,
            model_used=ai.model,
            processing_time_ms=elapsed,
        )

    except Exception as e:
        logger.error(f"Disease ranking failed: {e}")
        raise HTTPException(status_code=500, detail=f"Disease similarity ranking failed: {str(e)}")


@router.get("/info/{disease_id}")
async def get_disease_info(disease_id: str, ai: AIService = Depends(get_ai_service)):
    """Get detailed information about a specific disease by OMIM or Orphanet ID."""
    try:
        result, elapsed = await ai.json_completion(
            system_prompt="""You are a rare disease database expert. Return detailed disease information as JSON:
{
  "id": "OMIM:310200",
  "name": "Duchenne Muscular Dystrophy",
  "aliases": ["DMD", "Pseudohypertrophic Muscular Dystrophy"],
  "genes": ["DMD"],
  "inheritance": "X-linked recessive",
  "prevalence": "1 in 3,500 male births",
  "onset": "Childhood (2-5 years)",
  "progression": "Progressive, life-limiting",
  "symptoms": ["Progressive proximal muscle weakness", "Pseudohypertrophy of calves"],
  "hpo_terms": ["HP:0001324", "HP:0003236"],
  "treatments": ["Corticosteroids", "Exon skipping therapy", "Gene therapy"],
  "clinical_trials": ["NCT04680585"],
  "registries": ["TREAT-NMD", "DuchenneConnect"],
  "resources": ["Parent Project Muscular Dystrophy"]
}""",
            user_message=f"Get detailed information for disease ID: {disease_id}",
        )
        return {"success": True, "data": result, "elapsed_ms": elapsed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
