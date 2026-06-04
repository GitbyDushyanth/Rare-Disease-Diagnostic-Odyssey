import time
import json
import logging
from typing import Any, Optional
from openai import AsyncOpenAI
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AIService:
    """
    Central OpenAI client wrapper for all LUMEN AI modules.
    All methods are async and structured for healthcare/genomics prompts.
    """

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    async def chat_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.1,
        max_tokens: int = 2048,
        response_format: Optional[dict] = None,
    ) -> tuple[str, int]:
        """
        Core OpenAI chat completion with timing.
        Returns (response_text, elapsed_ms).
        """
        start = time.time()
        try:
            kwargs: dict[str, Any] = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if response_format:
                kwargs["response_format"] = response_format

            response = await self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content or ""
            elapsed = int((time.time() - start) * 1000)
            logger.debug(f"OpenAI call completed in {elapsed}ms")
            return content, elapsed

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def json_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.1,
        max_tokens: int = 3000,
    ) -> tuple[dict, int]:
        """
        JSON-mode completion — always returns parsed dict.
        """
        content, elapsed = await self.chat_completion(
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        try:
            return json.loads(content), elapsed
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}\nContent: {content[:500]}")
            raise ValueError(f"AI returned invalid JSON: {e}")

    # ── HPO Extraction ────────────────────────────────────────────────────────
    async def extract_hpo_terms(self, text: str, context: Optional[str] = None) -> tuple[dict, int]:
        system_prompt = """You are a clinical NLP expert specialized in rare disease phenotyping.
Extract Human Phenotype Ontology (HPO) terms from clinical text.

Return ONLY valid JSON in this exact format:
{
  "hpo_terms": [
    {
      "id": "HP:0001250",
      "name": "Seizures",
      "definition": "Recurrent episodic neurological dysfunction",
      "category": "Nervous system abnormality",
      "confidence": 0.95,
      "evidence_text": "patient reports seizures"
    }
  ],
  "raw_entities": ["seizures", "muscle weakness"]
}

Rules:
- Use official HPO term IDs (HP:XXXXXXX format)
- confidence 0-1 based on specificity of the text
- category from HPO top-level categories
- Only include terms clearly evidenced in the text
- Include up to 20 terms maximum"""

        user_message = f"Clinical text to analyze:\n\n{text}"
        if context:
            user_message += f"\n\nAdditional context: {context}"

        return await self.json_completion(system_prompt, user_message)

    # ── Disease Similarity ────────────────────────────────────────────────────
    async def rank_diseases(
        self, hpo_terms: list[str], max_results: int = 20
    ) -> tuple[dict, int]:
        system_prompt = """You are a rare disease diagnostic AI trained on OMIM, Orphanet, and clinical genomics databases.
Given a list of HPO phenotype terms, rank the most likely rare diseases by phenotypic similarity.

Return ONLY valid JSON:
{
  "matches": [
    {
      "disease_id": "OMIM:310200",
      "disease_name": "Duchenne Muscular Dystrophy",
      "confidence": 0.89,
      "rank": 1,
      "hpo_overlap": ["HP:0003236", "HP:0001324"],
      "gene_associations": ["DMD"],
      "inheritance_pattern": "X-linked recessive",
      "prevalence": "1 in 3,500 males",
      "omim_id": "310200",
      "orphanet_id": "ORPHA:98896",
      "explanation": "Strong phenotypic match: proximal muscle weakness + elevated CK + childhood onset"
    }
  ]
}

Rank by decreasing confidence. Include up to """ + str(max_results) + """ diseases.
Focus on rare diseases (prevalence < 1 in 2000). Be clinically precise."""

        user_message = f"Patient HPO profile:\n{json.dumps(hpo_terms, indent=2)}"
        return await self.json_completion(system_prompt, user_message)

    # ── Variant Prioritization ────────────────────────────────────────────────
    async def prioritize_variants(
        self,
        hpo_terms: list[str],
        inheritance_mode: Optional[str] = None,
        sample_id: Optional[str] = None,
    ) -> tuple[dict, int]:
        system_prompt = """You are a clinical genomics AI specializing in variant interpretation using ACMG/AMP guidelines.
Given a patient's HPO phenotype profile, generate a realistic prioritized variant list as would be found in a VCF analysis.

Return ONLY valid JSON:
{
  "variants": [
    {
      "gene": "DMD",
      "variant": "c.5899dupC",
      "acmg": "Pathogenic",
      "confidence": 94,
      "clinvar": "Pathogenic / Duchenne Muscular Dystrophy",
      "gnomad": 0.00001,
      "omim": "310200",
      "literature": 32,
      "notes": "Frameshift mutation in exon 40. Strongly associated with classical early-onset DMD.",
      "chromosome": "X",
      "position": 31775038,
      "zygosity": "hemizygous",
      "cadd_score": 35.2
    }
  ],
  "total_variants_analyzed": 45231
}

Generate 4-8 clinically meaningful variants consistent with the HPO profile.
ACMG must be one of: Pathogenic, Likely Pathogenic, VUS, Likely Benign, Benign
Use realistic genomic coordinates and population frequencies."""

        inheritance_note = f"\nInheritance mode: {inheritance_mode}" if inheritance_mode else ""
        user_message = f"Patient HPO terms: {json.dumps(hpo_terms)}{inheritance_note}"
        return await self.json_completion(system_prompt, user_message)

    # ── Trial Matching ────────────────────────────────────────────────────────
    async def match_trials(
        self,
        hpo_terms: list[str],
        conditions: list[str],
        age: Optional[int] = None,
        country: Optional[str] = None,
    ) -> tuple[dict, int]:
        system_prompt = """You are a clinical trial matching specialist with access to ClinicalTrials.gov.
Match a patient profile to the most relevant open clinical trials for rare diseases.

Return ONLY valid JSON:
{
  "matches": [
    {
      "nct_id": "NCT04680585",
      "title": "Gene Therapy Trial for Duchenne Muscular Dystrophy",
      "phase": "Phase 3",
      "sponsor": "Sarepta Therapeutics",
      "status": "Recruiting",
      "match_score": 0.92,
      "match_reason": ["DMD diagnosis", "Age 4-18 years", "No prior gene therapy"],
      "locations": ["Boston, MA, USA", "London, UK"],
      "contact_email": "trials@sarepta.com",
      "start_date": "2024-01-15",
      "description": "Evaluating safety and efficacy of SRP-9001 in ambulatory DMD patients"
    }
  ]
}

Return up to 8 matches, ranked by match_score (0-1).
Use realistic NCT IDs and current pharmaceutical sponsors."""

        age_note = f"\nAge: {age}" if age else ""
        country_note = f"\nCountry preference: {country}" if country else ""
        user_message = f"Patient profile:\nHPO terms: {json.dumps(hpo_terms)}\nConditions: {json.dumps(conditions)}{age_note}{country_note}"
        return await self.json_completion(system_prompt, user_message)

    # ── Medical Record Summarizer ─────────────────────────────────────────────
    async def summarize_medical_record(self, text: str) -> tuple[dict, int]:
        system_prompt = """You are a medical record analysis AI specialized in rare disease cases.
Analyze the medical record text and extract structured clinical information.

Return ONLY valid JSON:
{
  "summary": "12-year-old female with progressive proximal muscle weakness since age 8...",
  "key_findings": ["Elevated CK (12,000 U/L)", "Proximal muscle weakness", "Gowers sign positive"],
  "hpo_terms": [
    {"id": "HP:0003236", "name": "Elevated serum creatine kinase", "confidence": 0.98, "category": "Laboratory abnormality"}
  ],
  "medications": ["Deflazacort 0.9mg/kg/day", "Calcium + Vitamin D"],
  "diagnoses": ["Suspected Duchenne Muscular Dystrophy", "Rule out Becker MD"],
  "recommended_tests": ["Dystrophin gene deletion/duplication analysis", "Muscle biopsy", "Cardiac MRI"],
  "timeline": [
    {"date": "2020-03", "event": "First symptom onset", "type": "symptom", "details": "Difficulty climbing stairs"},
    {"date": "2022-06", "event": "Neurology referral", "type": "visit", "details": "CK elevated x40"}
  ]
}"""

        user_message = f"Medical record to analyze:\n\n{text[:8000]}"
        return await self.json_completion(system_prompt, user_message, max_tokens=4000)

    # ── Progression Prediction ─────────────────────────────────────────────────
    async def predict_progression(
        self, symptom_history: list[dict], horizons: list[str]
    ) -> tuple[dict, int]:
        system_prompt = """You are a longitudinal disease progression AI for rare disease patients.
Given symptom history over time, predict disease trajectory.

Return ONLY valid JSON:
{
  "predictions": [
    {
      "horizon": "6m",
      "risk_level": "moderate",
      "risk_score": 62,
      "predicted_symptoms": ["Increased fatigue", "Reduced mobility", "Respiratory involvement possible"],
      "recommended_actions": ["Pulmonary function tests", "Physical therapy intensification", "Cardiology review"],
      "confidence_interval": [55, 70],
      "explanation": "Based on trajectory of increasing fatigue scores over 3 months..."
    }
  ]
}

risk_level: low | moderate | high | critical
risk_score: 0-100"""

        user_message = f"Symptom history:\n{json.dumps(symptom_history[-20:])}\nPredict for horizons: {horizons}"
        return await self.json_completion(system_prompt, user_message)

    # ── Drug Discovery ────────────────────────────────────────────────────────
    async def drug_discovery(self, query: str, disease_context: Optional[str] = None) -> tuple[dict, int]:
        system_prompt = """You are a drug discovery AI specializing in rare disease therapeutics and drug repurposing.
Analyze the query and return insights on potential therapeutic targets and repurposing candidates.

Return ONLY valid JSON:
{
  "clusters": [
    {"name": "DMD Neuromuscular Cluster", "patient_count": 1245, "key_genes": ["DMD", "SGCA"], "phenotype_signature": "..."}
  ],
  "signals": [
    {"signal": "Novel dystrophin truncation mechanism", "confidence": 0.78, "supporting_cases": 23}
  ],
  "insights": ["Exon 51 skipping candidates show 40% higher response rate in this cohort"],
  "repurposing_candidates": [
    {"drug": "Tamoxifen", "original_indication": "Breast cancer", "potential_mechanism": "NF-kB pathway modulation", "evidence_score": 0.71}
  ]
}"""

        user_message = f"Query: {query}"
        if disease_context:
            user_message += f"\nDisease context: {disease_context}"
        return await self.json_completion(system_prompt, user_message)


# Singleton instance
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
