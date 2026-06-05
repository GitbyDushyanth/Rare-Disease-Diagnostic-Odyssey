import logging
from fastapi import APIRouter, HTTPException, Depends
from models.schemas import TrialMatchRequest, TrialMatchResponse, TrialMatch
from services.ai_service import AIService, get_ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai/trials", tags=["Trial Matching"])


@router.post("/match", response_model=TrialMatchResponse)
async def match_trials(
    request: TrialMatchRequest,
    ai: AIService = Depends(get_ai_service),
):
    """
    AI Module 6: Clinical Trial Matching Engine
    Matches patient profile to eligible clinical trials from ClinicalTrials.gov.
    Input: Patient HPO profile, age, conditions
    Output: Ranked eligible trials with match scores and reasons
    """
    try:
        result, elapsed = await ai.match_trials(
            hpo_terms=request.hpo_terms,
            conditions=request.conditions or [],
            age=request.age,
            country=request.country,
        )

        matches = [
            TrialMatch(
                nct_id=m.get("nct_id", "NCT00000000"),
                title=m.get("title", "Unknown Trial"),
                phase=m.get("phase", "N/A"),
                sponsor=m.get("sponsor", "Unknown"),
                status=m.get("status", "Recruiting"),
                match_score=float(m.get("match_score", 0)),
                match_reason=m.get("match_reason", []),
                locations=m.get("locations", []),
                contact_email=m.get("contact_email"),
                start_date=m.get("start_date"),
                description=m.get("description"),
            )
            for m in result.get("matches", [])
        ]

        # Filter to requested max
        matches = sorted(matches, key=lambda m: m.match_score, reverse=True)
        matches = matches[: (request.max_results or 10)]

        logger.info(f"Matched {len(matches)} trials for patient {request.patient_id} in {elapsed}ms")

        return TrialMatchResponse(
            matches=matches,
            patient_id=request.patient_id,
            model_used=ai.model,
            processing_time_ms=elapsed,
        )

    except Exception as e:
        logger.error(f"Trial matching failed: {e}")
        raise HTTPException(status_code=500, detail=f"Trial matching failed: {str(e)}")


@router.get("/search")
async def search_trials(
    condition: str,
    phase: str | None = None,
    country: str | None = None,
    ai: AIService = Depends(get_ai_service),
):
    """Search for clinical trials by condition name (AI-augmented)."""
    try:
        result, elapsed = await ai.json_completion(
            system_prompt="""Return a list of relevant clinical trials as JSON:
{
  "trials": [
    {
      "nct_id": "NCT04680585",
      "title": "...",
      "phase": "Phase 3",
      "status": "Recruiting",
      "sponsor": "...",
      "locations": ["Boston, MA"],
      "description": "..."
    }
  ]
}""",
            user_message=f"Find clinical trials for: {condition}\nPhase: {phase or 'any'}\nCountry: {country or 'any'}",
        )
        return {"success": True, "data": result.get("trials", []), "elapsed_ms": elapsed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
