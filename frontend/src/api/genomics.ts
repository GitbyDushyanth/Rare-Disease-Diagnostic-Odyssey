import { apiGet, apiPost, type ApiResponse } from './client';

export interface GenomicVariant {
  id: string;
  geneSymbol: string;
  chromosome: string;
  position: number;
  qualityScore?: number;
  annotations?: Array<{
    gnomadFrequency?: number;
    omimId?: string;
    pathogenicity?: string;
    clinvarId?: string;
  }>;
  interpretations?: Array<{
    acmgClassification: string;
    confidenceScore: number;
    explanation?: string;
  }>;
}

export interface GenomicSample {
  id: string;
  patientId: string;
  sampleType: string;
  status: string;
  storageUrl?: string;
  sequencingRuns?: Array<{
    id: string;
    vcfUrl?: string;
    status: string;
    variants?: GenomicVariant[];
  }>;
}

export interface PrioritizedVariant {
  gene: string;
  variant: string;
  acmg: string;
  confidence: number;
  clinvar?: string;
  gnomad?: number;
  omim?: string;
  literature?: number;
  notes?: string;
}

function mapVariantToUi(v: GenomicVariant): PrioritizedVariant {
  const interp = v.interpretations?.[0];
  const annot = v.annotations?.[0];
  const acmg = interp?.acmgClassification || annot?.pathogenicity || 'vus';
  return {
    gene: v.geneSymbol,
    variant: `chr${v.chromosome}:${v.position}`,
    acmg: acmg.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    confidence: Math.round((interp?.confidenceScore ?? (v.qualityScore ?? 50) / 100) * 100),
    clinvar: annot?.clinvarId,
    gnomad: annot?.gnomadFrequency,
    omim: annot?.omimId,
    literature: 0,
    notes: interp?.explanation,
  };
}

export async function getPatientSamples(patientId: string): Promise<GenomicSample[]> {
  const res = await apiGet<ApiResponse<GenomicSample[]>>(`/genomics/samples/patient/${patientId}`);
  return res.data;
}

export async function prioritizeVariants(data: {
  sampleId: string;
  patientId: string;
  hpoTerms: string[];
}): Promise<{ jobId: string; variants: PrioritizedVariant[] }> {
  const res = await apiPost<
    ApiResponse<{ jobId: string; variants: PrioritizedVariant[] }>
  >('/genomics/prioritize', data);
  return res.data;
}

export async function generateReport(jobId: string): Promise<unknown> {
  const res = await apiPost<ApiResponse<unknown>>(`/genomics/report/${jobId}`, {});
  return res.data;
}

export function extractVariantsFromSamples(samples: GenomicSample[]): PrioritizedVariant[] {
  const variants: PrioritizedVariant[] = [];
  for (const sample of samples) {
    for (const run of sample.sequencingRuns ?? []) {
      for (const v of run.variants ?? []) {
        variants.push(mapVariantToUi(v));
      }
    }
  }
  return variants.sort((a, b) => b.confidence - a.confidence);
}

export function getVcfFileName(samples: GenomicSample[]): string {
  for (const sample of samples) {
    for (const run of sample.sequencingRuns ?? []) {
      if (run.vcfUrl) {
        const parts = run.vcfUrl.split('/');
        return parts[parts.length - 1] || 'sample.vcf';
      }
    }
    if (sample.storageUrl) {
      const parts = sample.storageUrl.split('/');
      return parts[parts.length - 1] || 'sample.vcf';
    }
  }
  return 'sample.vcf';
}
