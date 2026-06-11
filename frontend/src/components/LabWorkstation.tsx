import React, { useState, useEffect } from 'react';
import { 
  FileCode, Database, RefreshCw, Upload, Check, CheckCircle2, 
  Search, FileText, Activity, Cpu, Plus, X, List, FileStack
} from 'lucide-react';
import type { SharedState } from '../types';
import {
  extractVariantsFromSamples,
  getPatientSamples,
  getVcfFileName,
} from '../api/genomics';
import { listPatients, type PatientRecord } from '../api/patients';

interface LabWorkstationProps {
  state: SharedState;
  setState: React.Dispatch<React.SetStateAction<SharedState>>;
  patientId?: string;
}

export const LabWorkstation: React.FC<LabWorkstationProps> = ({ state, setState, patientId }) => {
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'variants' | 'phenotype' | 'reports' | 'files'>('variants');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'evidence' | 'population' | 'literature' | 'notes'>('overview');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  // Handle uploading and parsing process animation
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const selectedVariant = state.genomicData.prioritizedVariants[selectedVariantIdx] || state.genomicData.prioritizedVariants[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patientsList = await listPatients(10);
        if (!cancelled) setPatients(patientsList);

        let targetPatientId = patientId;
        if (!targetPatientId && patientsList.length > 0) {
          targetPatientId = patientsList[0].id;
        }
        if (!targetPatientId || cancelled) return;
        if (!cancelled) setSelectedCaseId(targetPatientId);
        
        const samples = await getPatientSamples(targetPatientId);
        const variants = extractVariantsFromSamples(samples);
        if (variants.length === 0 || cancelled) return;
        setState((s) => ({
          ...s,
          patientId: targetPatientId,
          genomicData: {
            ...s.genomicData,
            fileName: getVcfFileName(samples),
            status: 'completed',
            prioritizedVariants: variants,
          },
        }));
      } catch {
        // keep mock/seed variants if API unavailable
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, setState]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state.genomicData.status === 'uploading') {
      interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setState(s => ({
              ...s,
              genomicData: { ...s.genomicData, status: 'analyzing' }
            }));
            return 100;
          }
          return prev + 25;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [state.genomicData.status, setState]);

  useEffect(() => {
    if (state.genomicData.status === 'analyzing') {
      const timer = setTimeout(() => {
        setState(s => ({
          ...s,
          genomicData: { ...s.genomicData, status: 'completed' },
          auditLogs: [
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              action: 'Genomic Pipeline Complete',
              user: 'Bioinformatics Engine',
              details: `Analyzed variants in ${s.genomicData.fileName}. Identified top candidates.`
            },
            ...s.auditLogs
          ]
        }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.genomicData.status, setState]);

  const handleStartAnalysis = () => {
    setState(s => ({
      ...s,
      genomicData: { ...s.genomicData, status: 'uploading' }
    }));
    setUploadProgress(0);
  };

  const handleGenerateReport = () => {
    setState(s => ({
      ...s,
      patientProfile: {
        ...s.patientProfile,
        status: 'Diagnosed: Duchenne Muscular Dystrophy'
      },
      genomicData: {
        ...s.genomicData,
        reportGenerated: true
      },
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          action: 'Diagnostic Report Released',
          user: 'Laboratory Workstation',
          details: 'Genomics Diagnostic report approved and published. Patient clinical status set to Diagnosed.'
        },
        ...s.auditLogs
      ]
    }));
  };

  return (
    <div className="flex-1 bg-lab-dark text-slate-100 font-sans flex overflow-hidden min-h-[calc(100vh-64px)]">
      
      {/* Sidebar with active case folders */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Lab Cases
            </div>
            <button className="p-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition mr-2">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative mb-3 mx-2">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search case folder..." 
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-850 rounded text-[11px] text-slate-200 focus:outline-none focus:border-purple-500" 
            />
          </div>

          <nav className="space-y-1.5">
            {patients.map(patient => {
              const hasGenomicData = (patient._count?.genomicSamples ?? 0) > 0;
              return (
              <button 
                key={patient.id}
                onClick={() => setSelectedCaseId(patient.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition ${
                  selectedCaseId === patient.id 
                    ? 'bg-purple-950/20 border-purple-500 text-purple-200 shadow-md' 
                    : 'bg-slate-850/30 border-slate-850 text-slate-400 hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-bold text-[11px] tracking-wide truncate max-w-[130px]">{patient.user.fullName}</div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    hasGenomicData ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`} />
                </div>
                <div className="text-[9px] text-slate-500 mt-1 truncate">{patient.mrn} • {hasGenomicData ? 'WES Complete' : 'Pending Upload'}</div>
              </button>
            )})}
            {patients.length === 0 && (
              <div className="text-center py-4 text-[10px] text-slate-500">No cases found</div>
            )}
          </nav>
        </div>

        <div className="p-3 bg-purple-950/10 rounded-xl border border-purple-500/20 text-xs">
          <div className="flex items-center space-x-2 text-purple-300">
            <Cpu className="w-4.5 h-4.5 shrink-0" />
            <span className="font-semibold text-[10px]">Variant AI Co-pilot Active</span>
          </div>
        </div>
      </aside>

      {/* Lab Central Workbench Panel */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        
        {/* Workspace Title header */}
        <div className="flex justify-between items-center pb-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="font-display font-extrabold text-2xl text-slate-100 tracking-tight">{patients.find(p => p.id === selectedCaseId)?.mrn || 'CASE-0000'}</h2>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold uppercase">Completed</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-slate-400 font-semibold flex items-center bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg">
              <Database className="w-3.5 h-3.5 text-purple-400 mr-2" /> Database: GRCh38 / ClinVar v2026
            </div>
            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic VCF file processor banner */}
        {state.genomicData.status === 'idle' && (
          <div className="mt-5 bg-lab-card border border-dashed border-slate-700/80 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 flex-shrink-0">
            <div className="p-4 bg-slate-900 rounded-full border border-slate-800">
              <Upload className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base">Ingest Genomic Sequencing Data</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Upload raw sequencing coordinates (.vcf, .bam, or .cram) to initialize AI prioritisation based on candidate HPO phenotypes.
              </p>
            </div>
            <button 
              onClick={handleStartAnalysis}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-750 text-white font-bold rounded-lg text-xs shadow-md transition"
            >
              Load {state.genomicData.fileName} file
            </button>
          </div>
        )}

        {state.genomicData.status === 'uploading' && (
          <div className="mt-5 bg-lab-card border border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 flex-shrink-0">
            <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin flex items-center justify-center" />
            <div>
              <h3 className="font-display font-bold text-base">Uploading Genomic Sequence VCF...</h3>
              <p className="text-xs text-slate-400 mt-1">{uploadProgress}% complete • 4.2 GB of data</p>
            </div>
            <div className="w-64 bg-slate-850 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {state.genomicData.status === 'analyzing' && (
          <div className="mt-5 bg-lab-card border border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 flex-shrink-0">
            <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-full relative">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
              <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-ping" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base">AI Variant Prioritization Engine Active</h3>
              <p className="text-xs text-slate-400 mt-1">Cross-referencing coordinates with ACMG classifications & ClinVar database...</p>
            </div>
          </div>
        )}

        {state.genomicData.status === 'completed' && (
          <div className="space-y-5 mt-5 flex-1 min-h-0 flex flex-col">
            
            {/* Top metrics showing sample data */}
            <div className="grid grid-cols-3 gap-4 flex-shrink-0">
              <div className="bg-lab-card border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Sample Code</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{state.genomicData.fileName}</p>
                </div>
                <FileCode className="w-5 h-5 text-purple-400" />
              </div>
              <div className="bg-lab-card border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Variants Analyzed</p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{state.genomicData.prioritizedVariants.length} priority candidates</p>
                </div>
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="bg-lab-card border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Genomics Yield Quality</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">99.98% coverage</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            {/* Central Workarea split panel */}
            <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
              
              {/* Tab Selector Column left (Span 7) */}
              <div className="col-span-7 bg-lab-card border border-slate-850 rounded-xl flex flex-col min-h-0">
                <div className="border-b border-slate-800 px-4 flex justify-between items-center flex-shrink-0">
                  <div className="flex space-x-4 text-xs font-bold text-slate-400">
                    {[
                      { id: 'variants', label: 'Variants', icon: List },
                      { id: 'phenotype', label: 'Phenotype', icon: Activity },
                      { id: 'reports', label: 'Reports', icon: FileText },
                      { id: 'files', label: 'Files', icon: FileStack }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-3.5 border-b-2 transition flex items-center space-x-1.5 ${
                          activeTab === tab.id 
                            ? 'border-purple-500 text-purple-200 font-extrabold' 
                            : 'border-transparent hover:text-slate-200'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold uppercase border border-purple-500/20">
                    AI Filter Applied
                  </span>
                </div>

                <div className="p-4 flex-1 overflow-y-auto min-h-0">
                  {activeTab === 'variants' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase px-2">
                        <span>Gene / Variant</span>
                        <div className="flex space-x-12">
                          <span>ACMG</span>
                          <span className="w-16 text-right">Confidence</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {state.genomicData.prioritizedVariants.map((v, idx) => (
                          <div 
                            key={idx}
                            onClick={() => setSelectedVariantIdx(idx)}
                            className={`p-3 rounded-lg border transition cursor-pointer flex justify-between items-center ${
                              selectedVariantIdx === idx 
                                ? 'bg-purple-950/15 border-purple-500 text-white' 
                                : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:bg-slate-850/40 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="w-5 h-5 bg-slate-950 rounded border border-slate-800 flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-bold text-xs text-slate-200">{v.gene}</p>
                                <p className="text-[9px] text-slate-500 font-semibold">{v.variant}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-8 text-xs font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase ${
                                v.acmg === 'Pathogenic' 
                                  ? 'bg-red-500/15 text-red-400' 
                                  : v.acmg === 'Likely Pathogenic' 
                                    ? 'bg-amber-500/15 text-amber-400' 
                                    : 'bg-slate-700 text-slate-400'
                              }`}>
                                {v.acmg}
                              </span>
                              <span className="w-16 text-right font-bold text-purple-400">
                                {v.confidence}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'phenotype' && (
                    <div className="space-y-4 py-6 text-center text-slate-400">
                      <Activity className="w-8 h-8 mx-auto opacity-50 mb-2" />
                      <p>Phenotype-driven prioritization settings</p>
                    </div>
                  )}

                  {activeTab === 'files' && (
                    <div className="space-y-4 py-6 text-center text-slate-400">
                      <FileStack className="w-8 h-8 mx-auto opacity-50 mb-2" />
                      <p>Raw sequencing files (VCF, BAM, CRAM)</p>
                    </div>
                  )}

                  {activeTab === 'reports' && (
                    <div className="space-y-4 text-center py-6">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto border border-purple-500/20">
                        <FileText className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-slate-200 text-sm">Release Case Report</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Sign and publish the clinical report to the Clinician Workspace and Patient Medical Vault.
                        </p>
                      </div>

                      {state.genomicData.reportGenerated ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center justify-center space-x-2">
                          <Check className="w-4 h-4" />
                          <span>Report Published & Synced Successfully</span>
                        </div>
                      ) : (
                        <button 
                          onClick={handleGenerateReport}
                          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-750 text-white font-bold rounded-lg text-xs shadow-md transition"
                        >
                          Generate & Sign Report
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column details viewer (Span 5) */}
              <div className="col-span-5 bg-lab-card border border-slate-850 rounded-xl p-4 flex flex-col justify-between min-h-0">
                <div className="space-y-4">
                  <div className="pb-3 border-b border-slate-800">
                    <span className="px-2 py-0.5 bg-slate-950 rounded text-[9px] font-bold uppercase tracking-wider text-slate-550 border border-slate-800">
                      Variant Overview
                    </span>
                    <h3 className="font-display font-extrabold text-base text-slate-100 mt-2">{selectedVariant.gene}</h3>
                    <p className="text-[10px] text-purple-400 font-mono mt-0.5">{selectedVariant.variant}</p>
                  </div>

                  <div className="flex space-x-4 border-b border-slate-800 pb-2">
                    {['overview', 'evidence', 'population', 'literature', 'notes'].map((tab) => (
                      <button 
                        key={tab}
                        onClick={() => setActiveSubTab(tab as any)}
                        className={`text-[10px] font-bold uppercase tracking-wider transition ${
                          activeSubTab === tab ? 'text-purple-400 border-b border-purple-400 pb-2 -mb-2' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {activeSubTab === 'overview' && (
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-850">
                        <span className="text-slate-500">ACMG Annotation</span>
                        <span className="font-bold text-red-400">{selectedVariant.acmg}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-850">
                        <span className="text-slate-500">Protein Change</span>
                        <span className="font-bold text-slate-200 font-mono">—</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-850">
                        <span className="text-slate-500">Inheritance</span>
                        <span className="font-bold text-slate-200">—</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-850">
                        <span className="text-slate-500">ClinVar Verdict</span>
                        <span className="font-bold text-slate-200">{selectedVariant.clinvar}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-850">
                        <span className="text-slate-500">gnomAD Frequency</span>
                        <span className="font-bold text-slate-200 font-mono">{selectedVariant.gnomad}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">PubMed Citations</span>
                        <span className="font-bold text-purple-300">{selectedVariant.literature} articles</span>
                      </div>
                    </div>
                  )}

                  {activeSubTab !== 'overview' && (
                    <div className="py-8 text-center text-slate-500 text-xs italic">
                      {activeSubTab.charAt(0).toUpperCase() + activeSubTab.slice(1)} data panel rendering...
                    </div>
                  )}
                </div>

                {/* Visual Confidence Meter gauge */}
                <div className="mt-4 pt-4 border-t border-slate-800 text-center space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                    <span>Prioritization Confidence</span>
                    <span className="text-purple-400 font-mono">{selectedVariant.confidence}%</span>
                  </div>
                  <div className="w-full bg-slate-950 border border-slate-850 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style={{ width: `${selectedVariant.confidence}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Confidence is generated via combined weights of ACMG guidelines, ClinVar pathogenicity, and patient phenotype similarity index.
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
};
