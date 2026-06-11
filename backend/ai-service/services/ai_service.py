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
        client_kwargs: dict[str, Any] = {"api_key": settings.openai_api_key or "missing-key"}
        if settings.openai_base_url:
            client_kwargs["base_url"] = settings.openai_base_url
        self.client = AsyncOpenAI(**client_kwargs)
        self.model = settings.openai_model
        self.fallback_mode = settings.ai_fallback_mode and (
            not settings.openai_api_key
            or settings.openai_api_key.startswith("sk-your")
            or settings.openai_api_key.lower() in {"placeholder", "changeme", "your-openai-api-key-here"}
        )

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
        if self.fallback_mode:
            return self._fallback_hpo_terms(text), 0

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
        if self.fallback_mode:
            return self._fallback_disease_matches(hpo_terms, max_results), 0

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
        if self.fallback_mode:
            return self._fallback_variants(hpo_terms), 0

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
        if self.fallback_mode:
            return self._fallback_trials(conditions, age, country), 0

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
        if self.fallback_mode:
            return self._fallback_summary(text), 0

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
        if self.fallback_mode:
            return self._fallback_progression(horizons), 0

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
        if self.fallback_mode:
            return self._fallback_drug_discovery(query, disease_context), 0

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

    def _fallback_hpo_terms(self, text: str) -> dict:
        lowered = text.lower()
        terms = []
        candidates = [
            ("weakness", {"id": "HP:0001324", "name": "Muscle weakness", "category": "Musculature abnormality"}),
            ("seizure", {"id": "HP:0001250", "name": "Seizure", "category": "Nervous system abnormality"}),
            ("development", {"id": "HP:0001263", "name": "Global developmental delay", "category": "Nervous system abnormality"}),
            ("fatigue", {"id": "HP:0012378", "name": "Fatigue", "category": "Constitutional symptom"}),
            ("pain", {"id": "HP:0012531", "name": "Pain", "category": "Clinical modifier"}),
        ]
        for needle, term in candidates:
            if needle in lowered:
                terms.append({**term, "definition": None, "confidence": 0.82, "evidence_text": needle})
        if not terms:
            terms = [
                {
                    "id": "HP:0001324",
                    "name": "Muscle weakness",
                    "definition": None,
                    "category": "Musculature abnormality",
                    "confidence": 0.55,
                    "evidence_text": text[:120],
                }
            ]
        return {"hpo_terms": terms[:8], "raw_entities": [t["name"] for t in terms[:8]]}

    def _fallback_disease_matches(self, hpo_terms: list[str], max_results: int) -> dict:
        matches = [
            {
                "disease_id": "OMIM:310200",
                "disease_name": "Duchenne Muscular Dystrophy",
                "confidence": 0.89,
                "rank": 1,
                "hpo_overlap": hpo_terms[:4],
                "gene_associations": ["DMD"],
                "inheritance_pattern": "X-linked recessive",
                "prevalence": "1 in 3,500 male births",
                "omim_id": "310200",
                "orphanet_id": "ORPHA:98896",
                "explanation": "Demo fallback match based on neuromuscular phenotype terms.",
            },
            {
                "disease_id": "OMIM:608807",
                "disease_name": "Spinal Muscular Atrophy",
                "confidence": 0.72,
                "rank": 2,
                "hpo_overlap": hpo_terms[:3],
                "gene_associations": ["SMN1"],
                "inheritance_pattern": "Autosomal recessive",
                "prevalence": "1 in 10,000 births",
                "omim_id": "608807",
                "orphanet_id": "ORPHA:70",
                "explanation": "Demo fallback match with overlapping weakness and motor findings.",
            },
        ]
        return {"matches": matches[:max_results]}

    def _fallback_variants(self, hpo_terms: list[str]) -> dict:
        return {
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
                    "notes": f"Demo fallback prioritized from phenotype profile: {', '.join(hpo_terms[:3])}",
                    "chromosome": "X",
                    "position": 31775038,
                    "zygosity": "hemizygous",
                    "cadd_score": 35.2,
                },
                {
                    "gene": "SMN1",
                    "variant": "exon 7 deletion",
                    "acmg": "Likely Pathogenic",
                    "confidence": 81,
                    "clinvar": "Likely pathogenic",
                    "gnomad": 0.00004,
                    "omim": "600354",
                    "literature": 18,
                    "notes": "Demo fallback secondary candidate.",
                    "chromosome": "5",
                    "position": 70247773,
                    "zygosity": "homozygous",
                    "cadd_score": 29.4,
                },
            ],
            "total_variants_analyzed": 45231,
        }

    def _fallback_trials(self, conditions: list[str], age: Optional[int], country: Optional[str]) -> dict:
        condition = conditions[0] if conditions else "rare neuromuscular disease"
        return {
            "matches": [
                {
                    "nct_id": "NCT04680585",
                    "title": f"Gene Therapy Registry Study for {condition}",
                    "phase": "Phase 3",
                    "sponsor": "Rare Disease Research Network",
                    "status": "Recruiting",
                    "match_score": 0.86,
                    "match_reason": ["Phenotype match", f"Age compatible: {age or 'unknown'}", country or "Global site search"],
                    "locations": [country or "United States"],
                    "contact_email": "trials@example.org",
                    "start_date": "2025-01-15",
                    "description": "Demo fallback trial match. Replace with live trial provider credentials when available.",
                }
            ]
        }

    def _fallback_summary(self, text: str) -> dict:
        return {
            "summary": "Demo AI fallback summary generated because no live model key is configured.",
            "key_findings": ["Clinical text received", "Phenotype review recommended", "Genomic confirmation recommended"],
            "hpo_terms": [
                {"id": "HP:0001324", "name": "Muscle weakness", "confidence": 0.7, "category": "Musculature abnormality"}
            ],
            "medications": [],
            "diagnoses": ["Rare disease workup"],
            "recommended_tests": ["Whole exome sequencing", "Genetic counseling"],
            "timeline": [
                {"date": "Unknown", "event": "Document uploaded", "type": "visit", "details": text[:160]}
            ],
        }

    def _fallback_progression(self, horizons: list[str]) -> dict:
        return {
            "predictions": [
                {
                    "horizon": horizon,
                    "risk_level": "moderate",
                    "risk_score": 58,
                    "predicted_symptoms": ["Fatigue monitoring advised", "Mobility trend review"],
                    "recommended_actions": ["Schedule follow-up", "Review respiratory and cardiac baseline"],
                    "confidence_interval": [45, 70],
                    "explanation": "Demo fallback prediction until a live AI key is configured.",
                }
                for horizon in horizons
            ]
        }

    def _fallback_drug_discovery(self, query: str, disease_context: Optional[str]) -> dict:
        return {
            "clusters": [
                {"name": "Neuromuscular phenotype cluster", "patient_count": 124, "key_genes": ["DMD", "SMN1"], "phenotype_signature": query}
            ],
            "signals": [
                {"signal": "Candidate cohort enrichment", "confidence": 0.64, "supporting_cases": 12}
            ],
            "insights": [f"Demo fallback insight for {disease_context or query}."],
            "repurposing_candidates": [
                {"drug": "Example compound", "original_indication": "Research use", "potential_mechanism": "Pathway modulation", "evidence_score": 0.52}
            ],
        }


# Singleton instance
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
