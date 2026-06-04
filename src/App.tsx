import React, { useState } from 'react';
import type { SharedState } from './types';
import { PatientApp } from './components/PatientApp';
import { ClinicianPortal } from './components/ClinicianPortal';
import { LabWorkstation } from './components/LabWorkstation';
import { ResearchPortal } from './components/ResearchPortal';
import { AdminPortal } from './components/AdminPortal';
import { Smartphone, ShieldCheck, Globe, Activity, ChevronRight, Terminal } from 'lucide-react';

const initialSharedState: SharedState = {
  patientProfile: {
    name: 'Sarah Johnson',
    age: 12,
    gender: 'Female',
    country: 'United States',
    status: 'Undiagnosed',
    isCompleted: false
  },
  symptomLogs: [
    { date: 'May 30', pain: 2, fatigue: 4, mobility: 6, sleep: 5, mood: 7 },
    { date: 'Jun 02', pain: 3, fatigue: 5, mobility: 5, sleep: 4, mood: 8 }
  ],
  uploadedFiles: [
    { id: 'f-1', name: 'Milli_Clinical_Record.pdf', date: 'Mar 12, 2024', type: 'PDF', size: '2.4 MB' },
    { id: 'f-2', name: 'Neurologist_Visit_Notes.pdf', date: 'Apr 02, 2024', type: 'PDF', size: '1.8 MB' },
    { id: 'f-3', name: 'Pelvic_Limb_MRI_Report.jpg', date: 'May 10, 2024', type: 'JPG', size: '4.1 MB' }
  ],
  genomicData: {
    fileName: 'sample_SJ.vcf',
    status: 'idle',
    progress: 0,
    selectedCaseId: 'case-1',
    reportGenerated: false,
    prioritizedVariants: [
      {
        gene: 'DMD',
        variant: 'c.5899dupC',
        acmg: 'Pathogenic',
        confidence: 94,
        clinvar: 'Pathogenic / Duchenne Muscular Dystrophy',
        gnomad: 0.00001,
        omim: '310200',
        literature: 32,
        notes: 'Frameshift mutation in exon 40. Strongly associated with classical early-onset Duchenne muscular dystrophy in female carriers displaying skewing.'
      },
      {
        gene: 'DMD',
        variant: 'c.123+2T>G',
        acmg: 'Likely Pathogenic',
        confidence: 78,
        clinvar: 'Likely Pathogenic / Becker Muscular Dystrophy',
        gnomad: 0.00005,
        omim: '300376',
        literature: 18,
        notes: 'Splicing junction variant affecting exon 3 donor site. Results in partial deletion of dystrophin rod domain.'
      },
      {
        gene: 'TTN',
        variant: 'c.10425A>G',
        acmg: 'VUS',
        confidence: 45,
        clinvar: 'Variant of Uncertain Significance',
        gnomad: 0.0012,
        omim: '188840',
        literature: 5,
        notes: 'Missense substitution in A-band region. Low pathogenicity scoring across in-silico models.'
      },
      {
        gene: 'RYR1',
        variant: 'c.7321G>A',
        acmg: 'VUS',
        confidence: 32,
        clinvar: 'Variant of Uncertain Significance',
        gnomad: 0.0031,
        omim: '180901',
        literature: 3,
        notes: 'Synonymous codon alteration. No splicing defect predicted by splice-AI models.'
      }
    ]
  },
  carePlanCreated: false,
  specialistReferred: false,
  auditLogs: [
    {
      id: 'log-1',
      timestamp: '09:20:15 AM',
      action: 'Session Initialized',
      user: 'Security Gateway',
      details: 'Distributed database nodes verified. Secure connection established with Stanford Bio-bank.'
    },
    {
      id: 'log-2',
      timestamp: '09:22:30 AM',
      action: 'FHIR Endpoint Connected',
      user: 'FHIR Connector',
      details: 'Patient and diagnostic resources synced with clinical EHR gateways successfully.'
    }
  ]
};

export const App: React.FC = () => {
  const [state, setState] = useState<SharedState>(initialSharedState);
  const [activePortal, setActivePortal] = useState<'patient' | 'clinician' | 'lab' | 'research' | 'admin'>('patient');

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 font-sans">
      
      {/* Dynamic Portal Selector Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Title & Branding */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center font-display font-extrabold text-lg text-white shadow-lg animate-pulse-subtle border border-brand-500/30">
                L
              </div>
              <div>
                <h1 className="font-display font-extrabold text-base tracking-tight leading-none text-white">LUMEN</h1>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Master Flow Demo</p>
              </div>
            </div>

            {/* Portal Switcher Tabs */}
            <nav className="flex space-x-1.5 p-1 bg-slate-950 rounded-xl border border-slate-850">
              {[
                { id: 'patient', label: 'Patient App', icon: Smartphone, color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
                { id: 'clinician', label: 'Clinician Portal', icon: Activity, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                { id: 'lab', label: 'Lab Workstation', icon: Terminal, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                { id: 'research', label: 'Research Portal', icon: Globe, color: 'text-indigo-400 bg-indigo-50/10 border-indigo-500/20' },
                { id: 'admin', label: 'Admin Portal', icon: ShieldCheck, color: 'text-pink-400 bg-pink-50/10 border-pink-500/20' }
              ].map(portal => (
                <button
                  key={portal.id}
                  onClick={() => setActiveTabPortal(portal.id as any)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none ${
                    activePortal === portal.id 
                      ? 'bg-slate-800 text-white shadow border border-slate-700' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <portal.icon className={`w-3.5 h-3.5`} />
                  <span>{portal.label}</span>
                </button>
              ))}
            </nav>

            {/* Session Indicator */}
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Demo Environment</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main View Area rendering the active workspace portal */}
      <div className="flex-1 flex flex-col min-h-0">
        {activePortal === 'patient' && <PatientApp state={state} setState={setState} />}
        {activePortal === 'clinician' && <ClinicianPortal state={state} setState={setState} />}
        {activePortal === 'lab' && <LabWorkstation state={state} setState={setState} />}
        {activePortal === 'research' && <ResearchPortal state={state} setState={setState} />}
        {activePortal === 'admin' && <AdminPortal state={state} setState={setState} />}
      </div>

      {/* Master Ecosystem Loop Progress Bar (Bottom Dashboard Tracker) */}
      <footer className="bg-slate-900 border-t border-slate-800 text-white py-3 px-6 text-xs flex justify-between items-center flex-shrink-0 z-35 font-sans">
        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-slate-400">
          <span>Continuous Learning Loop</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
        
        {/* Dynamic visual checkpoints based on actions in multiple portals */}
        <div className="flex space-x-8 items-center text-[11px] font-semibold text-slate-400">
          
          <div className="flex items-center space-x-1.5">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              state.patientProfile.isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {state.patientProfile.isCompleted ? '✓' : '1'}
            </span>
            <span className={state.patientProfile.isCompleted ? 'text-slate-200' : 'text-slate-500'}>Patient Profile Created</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              state.genomicData.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {state.genomicData.status === 'completed' ? '✓' : '2'}
            </span>
            <span className={state.genomicData.status === 'completed' ? 'text-slate-200' : 'text-slate-500'}>VCF Sequenced & prioritized</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              state.genomicData.reportGenerated ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {state.genomicData.reportGenerated ? '✓' : '3'}
            </span>
            <span className={state.genomicData.reportGenerated ? 'text-slate-200' : 'text-slate-500'}>Genomic report Signed</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              state.carePlanCreated ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {state.carePlanCreated ? '✓' : '4'}
            </span>
            <span className={state.carePlanCreated ? 'text-slate-200' : 'text-slate-500'}>Clinician Care Plan Released</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              state.specialistReferred ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {state.specialistReferred ? '✓' : '5'}
            </span>
            <span className={state.specialistReferred ? 'text-slate-200' : 'text-slate-500'}>Specialist Referred</span>
          </div>

        </div>

        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold uppercase">
          <span>Active Patient:</span>
          <span className="text-brand-400 font-semibold">{state.patientProfile.name || 'None'}</span>
        </div>
      </footer>
    </div>
  );

  // Switch helper and audit logger
  function setActiveTabPortal(portal: 'patient' | 'clinician' | 'lab' | 'research' | 'admin') {
    setActivePortal(portal);
    setState(prev => ({
      ...prev,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          action: 'Portal Access Toggled',
          user: 'System Switcher',
          details: `User navigated to the ${portal.charAt(0).toUpperCase() + portal.slice(1)} Portal.`
        },
        ...prev.auditLogs
      ]
    }));
  }
};

export default App;
