from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ── HPO NLP ───────────────────────────────────────────────────────────────────
class HpoExtractRequest(BaseModel):
    text: str = Field(..., min_length=3, description="Clinical notes or symptom description")
    context: Optional[str] = Field(None, description="Additional clinical context")
    language: Optional[str] = Field("en", description="Language code")


class HpoTerm(BaseModel):
    id: str = Field(..., description="HPO term ID e.g. HP:0001250")
    name: str
    definition: Optional[str] = None
    category: Optional[str] = None
    confidence: float = Field(ge=0, le=1)
    evidence_text: Optional[str] = None


class HpoExtractResponse(BaseModel):
    hpo_terms: List[HpoTerm]
    raw_entities: List[str] = []
    model_used: str
    processing_time_ms: int


# ── Disease Similarity ────────────────────────────────────────────────────────
class DiseaseRankRequest(BaseModel):
    hpo_terms: List[str] = Field(..., min_length=1, description="List of HPO term IDs or names")
    max_results: Optional[int] = Field(20, ge=1, le=50)
    filter_inheritance: Optional[str] = None


class DiseaseMatch(BaseModel):
    disease_id: str
    disease_name: str
    confidence: float = Field(ge=0, le=1)
    rank: int
    hpo_overlap: List[str]
    gene_associations: List[str] = []
    inheritance_pattern: Optional[str] = None
    prevalence: Optional[str] = None
    omim_id: Optional[str] = None
    orphanet_id: Optional[str] = None
    explanation: Optional[str] = None


class DiseaseRankResponse(BaseModel):
    matches: List[DiseaseMatch]
    hpo_terms_used: List[str]
    model_used: str
    processing_time_ms: int


# ── Variant Prioritization ────────────────────────────────────────────────────
class VariantPrioritizeRequest(BaseModel):
    sample_id: str
    hpo_terms: List[str] = Field(..., min_length=1)
    inheritance_mode: Optional[str] = Field(None, description="autosomal_dominant | autosomal_recessive | x_linked | unknown")
    proband_sex: Optional[str] = None
    family_history: Optional[Dict[str, Any]] = None


class VariantResult(BaseModel):
    gene: str
    variant: str
    acmg: str = Field(..., description="pathogenic | likely_pathogenic | vus | likely_benign | benign")
    confidence: float = Field(ge=0, le=100)
    clinvar: Optional[str] = None
    gnomad: Optional[float] = None
    omim: Optional[str] = None
    literature: Optional[int] = None
    notes: Optional[str] = None
    chromosome: Optional[str] = None
    position: Optional[int] = None
    zygosity: Optional[str] = None
    cadd_score: Optional[float] = None


class VariantPrioritizeResponse(BaseModel):
    variants: List[VariantResult]
    total_variants_analyzed: int
    model_used: str
    processing_time_ms: int


# ── Trial Matching ────────────────────────────────────────────────────────────
class TrialMatchRequest(BaseModel):
    patient_id: str
    hpo_terms: List[str] = []
    age: Optional[int] = None
    gender: Optional[str] = None
    conditions: Optional[List[str]] = []
    country: Optional[str] = None
    max_results: Optional[int] = Field(10, ge=1, le=50)


class TrialMatch(BaseModel):
    nct_id: str
    title: str
    phase: str
    sponsor: str
    status: str
    match_score: float = Field(ge=0, le=1)
    match_reason: List[str]
    locations: List[str] = []
    contact_email: Optional[str] = None
    start_date: Optional[str] = None
    description: Optional[str] = None


class TrialMatchResponse(BaseModel):
    matches: List[TrialMatch]
    patient_id: str
    model_used: str
    processing_time_ms: int


# ── Medical Record Summarizer ─────────────────────────────────────────────────
class SummarizeRequest(BaseModel):
    file_path: Optional[str] = None
    document_id: str
    text_content: Optional[str] = None
    document_type: Optional[str] = None


class TimelineEntry(BaseModel):
    date: str
    event: str
    type: str = Field(..., description="symptom | diagnosis | procedure | medication | test | visit")
    details: Optional[str] = None


class DocumentSummary(BaseModel):
    summary: str
    key_findings: List[str]
    hpo_terms: List[HpoTerm]
    medications: List[str]
    diagnoses: List[str]
    recommended_tests: List[str]
    timeline: List[TimelineEntry]


class SummarizeResponse(BaseModel):
    summary: DocumentSummary
    document_id: str
    model_used: str
    processing_time_ms: int


# ── Progression Prediction ────────────────────────────────────────────────────
class ProgressionRequest(BaseModel):
    patient_id: str
    symptom_history: List[Dict[str, Any]]
    horizons: Optional[List[str]] = Field(["6m", "12m", "24m"])


class ProgressionPrediction(BaseModel):
    horizon: str
    risk_level: str
    risk_score: float = Field(ge=0, le=100)
    predicted_symptoms: List[str]
    recommended_actions: List[str]
    confidence_interval: List[float]
    explanation: str


class ProgressionResponse(BaseModel):
    predictions: List[ProgressionPrediction]
    patient_id: str
    model_used: str


# ── Drug Discovery ────────────────────────────────────────────────────────────
class DrugDiscoveryRequest(BaseModel):
    query: str
    disease_context: Optional[str] = None
    gene_targets: Optional[List[str]] = []


class DrugDiscoveryResponse(BaseModel):
    clusters: List[Dict[str, Any]]
    signals: List[Dict[str, Any]]
    insights: List[str]
    repurposing_candidates: List[Dict[str, Any]]
    model_used: str
