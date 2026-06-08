import React, { useEffect, useState } from 'react';
import { 
  Activity, Users, AlertTriangle, Clock, Search, Folder, CheckSquare, 
  Send, AlertCircle, FileText, ChevronRight, UserPlus, Sparkles,
  Clipboard, Calendar, ArrowUpRight, GraduationCap, MapPin, Loader2, Settings, Bell
} from 'lucide-react';
import type { SharedState } from '../types';
import {
  createCarePlan,
  getCases,
  getClinicianDashboard,
  getSpecialists,
  referCase,
  type CaseRecord,
} from '../api/clinician';
import { getNotifications, markNotificationAsRead, type NotificationRecord } from '../api/notifications';
import { calcAge, formatGender, timeAgo } from '../utils/format';
import { ApiError } from '../api/client';

interface ClinicianPortalProps {
  state: SharedState;
  setState: React.Dispatch<React.SetStateAction<SharedState>>;
  onCaseSelect?: (patient: CaseRecord['patient']) => void;
}

interface QueuePatient {
  id: string;
  patientId: string;
  name: string;
  age: string;
  gender: string;
  code: string;
  symptoms: string;
  flag: string;
  flagColor: string;
  confidence: string;
  time: string;
  raw: CaseRecord;
}

function flagStyle(aiFlag?: string): { flag: string; flagColor: string } {
  const level = (aiFlag || 'medium').toLowerCase();
  if (level === 'high' || level === 'urgent') {
    return { flag: 'AI Flag: High', flagColor: 'bg-red-500/20 text-red-400 border border-red-500/30' };
  }
  if (level === 'low') {
    return { flag: 'AI Flag: Low', flagColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
  }
  return { flag: 'AI Flag: Medium', flagColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
}

export const ClinicianPortal: React.FC<ClinicianPortalProps> = ({ state, setState, onCaseSelect }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'records' | 'labs' | 'notes'>('timeline');
  const [clinicianSearch, setClinicianSearch] = useState('');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [dashboard, setDashboard] = useState<{
    activeCases: number;
    urgentCases: number;
    pendingInterpretations: number;
    avgResolutionDays: number;
  } | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState('Dashboard');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dash, caseList, notifs] = await Promise.all([getClinicianDashboard(), getCases(), getNotifications()]);
        if (cancelled) return;
        setDashboard(dash.stats);
        setCases(caseList);
        setNotifications(notifs.data);
        if (caseList.length > 0) {
          setSelectedCaseId(caseList[0].id);
          onCaseSelect?.(caseList[0].patient);
        }
      } catch (err) {
        if (!cancelled) {
          setActionError(err instanceof ApiError ? err.message : 'Failed to load clinician data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [onCaseSelect]);

  const patientsList: QueuePatient[] = cases.map((c) => {
    const topDx = c.patient.diagnosticSuggestions?.[0];
    const { flag, flagColor } = flagStyle(c.aiFlag);
    return {
      id: c.id,
      patientId: c.patientId,
      name: c.patient.user.fullName,
      age: `${calcAge(c.patient.dateOfBirth)} y/o`,
      gender: formatGender(c.patient.user.gender),
      code: c.title,
      symptoms: c.description || 'No description',
      flag,
      flagColor,
      confidence: topDx ? `${Math.round(topDx.confidenceScore * 100)}%` : '—',
      time: timeAgo(c.createdAt),
      raw: c,
    };
  });

  const currentPatient = patientsList.find((p) => p.id === selectedCaseId) || patientsList[0] || null;

  const handleSelectCase = (patient: QueuePatient) => {
    setSelectedCaseId(patient.id);
    onCaseSelect?.(patient.raw.patient);
  };

  const handleCreateCarePlan = async () => {
    if (!currentPatient) return;
    setActionError(null);
    try {
      const diagnosis =
        currentPatient.raw.patient.diagnosticSuggestions?.[0]?.diseaseName ||
        'Rare disease workup';
      await createCarePlan({
        patientId: currentPatient.patientId,
        caseId: currentPatient.id,
        primaryDiagnosis: diagnosis,
        recommendedTests: ['Whole Exome Sequencing', 'Genetic Counseling', 'CK Level'],
      });
      setState((prev) => ({ ...prev, carePlanCreated: true }));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to create care plan');
    }
  };

  const handleSendSpecialistCase = async () => {
    if (!currentPatient) return;
    setActionError(null);
    try {
      const specialists = await getSpecialists('Genomics');
      const specialist = specialists[0];
      if (!specialist) {
        setActionError('No specialists available for referral');
        return;
      }
      await referCase(currentPatient.id, {
        specialistId: specialist.user.id,
        reason: `Referral for ${currentPatient.name}: genomic review and variant interpretation needed.`,
        urgency: 'urgent',
      });
      setState((prev) => ({ ...prev, specialistReferred: true }));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to send referral');
    }
  };

  // Filter patients by search query
  const filteredPatients = patientsList.filter(p => 
    p.name.toLowerCase().includes(clinicianSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(clinicianSearch.toLowerCase())
  );

  return (
    <div className="flex-1 bg-clinician-dark text-slate-100 font-sans flex overflow-hidden min-h-[calc(100vh-64px)]">
      
      {/* Sidebar navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            Clinical Tools
          </div>
          
          <nav className="space-y-1">
            {[
              { label: 'Dashboard', icon: Activity },
              { label: 'Patients', icon: Users, count: 142 },
              { label: 'Case Queue', icon: Clock, count: 8, urgent: true },
              { label: 'Alerts', icon: AlertCircle, count: 32 },
              { label: 'Calendar', icon: Calendar },
              { label: 'Knowledge Base', icon: GraduationCap },
              { label: 'Specialists', icon: UserPlus },
              { label: 'Reports', icon: FileText },
              { label: 'Settings', icon: Settings },
            ].map((item, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveSidebarTab(item.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  activeSidebarTab === item.label 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.urgent 
                      ? 'bg-red-500/25 text-red-300' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600 shrink-0">
              <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80" alt="Dr. Arjun Patel" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-slate-200">Dr. Arjun Patel</p>
              <p className="text-[10px] text-slate-500">Neuromuscular Specialist</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <main className="flex-1 flex flex-col overflow-y-auto p-6 bg-clinician-dark">
        
        {/* Header toolbar */}
        <div className="flex justify-between items-center pb-5 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-slate-100 tracking-tight">Dashboard Overview</h2>
            <p className="text-xs text-slate-400">Collaborative Clinical Decision Support & Diagnostics</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                value={clinicianSearch}
                onChange={(e) => setClinicianSearch(e.target.value)}
                placeholder="Search patient, cases, genes..."
                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs w-60 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="relative w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-750 text-slate-300">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700">
              <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80" alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
            {actionError}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading cases...
          </div>
        )}

        {/* Stats banner row */}
        {!loading && activeSidebarTab === 'Dashboard' && <div className="grid grid-cols-4 gap-4 mt-5 flex-shrink-0">
          {[
            { label: 'Active Cases', val: String(dashboard?.activeCases ?? '—'), change: 'Live from API', icon: Users, color: 'text-brand-400 bg-brand-500/10' },
            { label: 'Urgent Cases', val: String(dashboard?.urgentCases ?? '—'), change: 'Requires attention', icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
            { label: 'Avg. Resolution Time', val: `${dashboard?.avgResolutionDays ?? 12} Days`, change: 'Platform metric', icon: Clock, color: 'text-emerald-400 bg-emerald-500/10' },
            { label: 'Rare Disease Alerts', val: String(dashboard?.pendingInterpretations ?? '—'), change: 'New signals found', icon: Activity, color: 'text-indigo-400 bg-indigo-500/10' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-clinician-card p-4 rounded-xl border border-slate-800/80 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-display font-extrabold text-slate-100">{stat.val}</p>
                <p className="text-[10px] text-slate-500 font-medium">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>}

        {/* Dynamic Patient Selector and Diagnostic Layout */}
        {!loading && activeSidebarTab === 'Dashboard' && <div className="grid grid-cols-12 gap-5 mt-5 flex-1 min-h-0">
          
          {/* Left Col: Cases list queue (Span 4) */}
          <div className="col-span-4 bg-clinician-card rounded-xl border border-slate-800/80 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display font-bold text-sm text-slate-200">Patient Case Queue</h3>
              <span onClick={() => setActiveSidebarTab('Case Queue')} className="text-[10px] font-bold text-brand-400 hover:underline cursor-pointer">View All</span>
            </div>
            
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {filteredPatients.map(patient => (
                <div 
                  key={patient.id}
                  onClick={() => handleSelectCase(patient)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between h-28 ${
                    selectedCaseId === patient.id 
                      ? 'bg-slate-900 border-brand-500 shadow-md' 
                      : 'bg-slate-850/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-200">{patient.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{patient.code} • {patient.age} • {patient.gender}</p>
                    </div>
                    <span className="text-[9px] text-slate-500 font-semibold">{patient.time}</span>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-2">
                    {patient.symptoms}
                  </p>

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/50">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${patient.flagColor}`}>
                      {patient.flag}
                    </span>
                    <div className="flex items-center text-[10px] font-bold text-slate-300">
                      <span>{patient.confidence} Match</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
              {filteredPatients.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No matching case found.
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Diagnosis Workbench (Span 8) */}
          <div className="col-span-8 flex flex-col space-y-5 overflow-y-auto">
            {!currentPatient && (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No cases in queue. Seed the database to load demo cases.
              </div>
            )}
            {currentPatient && <>
            {/* Patient Header Review Card */}
            <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-400 text-xl font-bold font-display">
                  {currentPatient.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-display font-bold text-base text-slate-100">{currentPatient.name}</h3>
                    <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded text-[9px] font-bold uppercase border border-brand-500/20">
                      {currentPatient.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {currentPatient.age} • {currentPatient.gender} • HPO Phenotype Matches Found: <span className="font-semibold text-brand-400">5 terms</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center">
                  <Folder className="w-4 h-4 mr-1.5" /> Documents
                </button>
                <button className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center">
                  <Send className="w-4 h-4 mr-1.5" /> Share
                </button>
              </div>
            </div>

            {/* Diagnostic Tabs Menu */}
            <div className="bg-clinician-card rounded-xl border border-slate-800/80 overflow-hidden flex flex-col">
              <div className="bg-slate-900/60 border-b border-slate-800 flex justify-between items-center px-4">
                <div className="flex space-x-4 text-xs font-bold text-slate-400">
                  {[
                    { id: 'timeline', label: 'Clinical Timeline' },
                    { id: 'records', label: 'EHR / Clinical Notes' },
                    { id: 'labs', label: 'Genomics & Lab Reports' },
                    { id: 'notes', label: 'Clinician Notes' }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'timeline' | 'records' | 'labs' | 'notes')}
                      className={`py-3.5 border-b-2 transition focus:outline-none ${
                        activeTab === tab.id 
                          ? 'border-brand-500 text-white font-extrabold' 
                          : 'border-transparent hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  FHIR R4 Configured
                </div>
              </div>

              <div className="p-5 text-xs text-slate-300 min-h-48">
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-200">Integrated Longitudinal Record</p>
                      <button className="text-xs font-bold text-brand-400 hover:underline flex items-center">
                        Edit HPO Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative pl-6 border-l border-slate-800 space-y-4">
                      <div className="relative">
                        <span className="absolute -left-[30px] top-0.5 w-4 h-4 bg-brand-500 rounded-full border border-clinician-dark flex items-center justify-center text-[8px] text-white">●</span>
                        <div className="flex justify-between font-semibold">
                          <span>Whole Exome Sequencing Ordered</span>
                          <span className="text-slate-500 text-[10px]">May 2026</span>
                        </div>
                        <p className="text-slate-400 mt-1">Status: Pending analysis. Blood sample received at Stanford Genomics lab.</p>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-[30px] top-0.5 w-4 h-4 bg-emerald-500 rounded-full border border-clinician-dark flex items-center justify-center text-[8px] text-white">✓</span>
                        <div className="flex justify-between font-semibold">
                          <span>Muscle Magnetic Resonance Imaging (MRI)</span>
                          <span className="text-slate-500 text-[10px]">Apr 2026</span>
                        </div>
                        <p className="text-slate-400 mt-1">Fatty replacement and proximal muscle atrophy identified. HPO mapped: HP:0003707</p>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-[30px] top-0.5 w-4 h-4 bg-slate-700 rounded-full border border-clinician-dark flex items-center justify-center text-[8px] text-white">✓</span>
                        <div className="flex justify-between font-semibold">
                          <span>Symptom Tracker Daily Checks Initiated</span>
                          <span className="text-slate-500 text-[10px]">Jan 2025</span>
                        </div>
                        <p className="text-slate-400 mt-1">Patient Sarah Johnson registered logs for proximal weakness and stair difficulty.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'records' && (
                  <div className="space-y-4">
                    <p className="font-bold text-slate-200">Natural Language Processing (NLP) Phenotypic Extraction</p>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                      <p className="text-slate-400 italic">
                        "Patient exhibits progressive muscle weakness primarily in proximal limbs. Gowers sign is positive. Gowers maneuvers are visible. Muscle biopsies show abnormal dystrophin staining."
                      </p>
                      
                      <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-brand-500/10 text-brand-400 rounded-lg font-semibold flex items-center border border-brand-500/25">
                          HP:0003707 (Muscle weakness) <Sparkles className="w-3 h-3 ml-1" />
                        </span>
                        <span className="px-2 py-1 bg-brand-500/10 text-brand-400 rounded-lg font-semibold flex items-center border border-brand-500/25">
                          HP:0003391 (Gowers' sign) <Sparkles className="w-3 h-3 ml-1" />
                        </span>
                        <span className="px-2 py-1 bg-brand-500/10 text-brand-400 rounded-lg font-semibold flex items-center border border-brand-500/25">
                          HP:0003560 (Muscle dystrophy) <Sparkles className="w-3 h-3 ml-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'labs' && (
                  <div className="space-y-3">
                    <p className="font-bold text-slate-200">Genomics / VCF Ingestion Status</p>
                    <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <div className="flex items-center space-x-2.5">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="font-bold text-slate-300">sample_SJ.vcf</p>
                          <p className="text-[10px] text-slate-500">4.2 GB • Whole Exome Sequencing • Stanford Labs</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        state.genomicData.status === 'completed' 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35' 
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/35 animate-pulse'
                      }`}>
                        {state.genomicData.status === 'completed' ? 'processed' : 'processing'}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-2">
                    <textarea 
                      placeholder="Add diagnostic comments or observations..." 
                      className="w-full h-24 p-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none text-xs text-slate-200 focus:border-brand-500" 
                    />
                    <button className="px-4 py-2 bg-brand-500 text-white rounded-lg font-semibold shadow-md hover:bg-brand-600 transition">
                      Save Notes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Diagnosis and Action Panel */}
            <div className="grid grid-cols-2 gap-5 flex-shrink-0">
              
              {/* Left Column: AI Differential Diagnosis */}
              <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-display font-bold text-sm text-slate-200">AI Differential Diagnosis</h4>
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                </div>
                
                <div className="space-y-3">
                  {(currentPatient?.raw.patient.diagnosticSuggestions?.length
                    ? currentPatient.raw.patient.diagnosticSuggestions
                    : state.diagnosticSuggestions
                  ).map((disease, idx) => {
                    const pct = Math.round(disease.confidenceScore * 100);
                    const colors = ['bg-brand-500', 'bg-indigo-500', 'bg-purple-500', 'bg-slate-600'];
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-slate-350">
                          <span>{disease.diseaseName}</span>
                          <span>{pct}% Match</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors[idx] || 'bg-slate-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!currentPatient?.raw.patient.diagnosticSuggestions?.length &&
                    !state.diagnosticSuggestions.length && (
                      <p className="text-xs text-slate-500">No AI suggestions yet for this case.</p>
                    )}
                </div>
              </div>

              {/* Right Column: Suggested Actions / Referrals */}
              <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-200 mb-3">Recommended Actions</h4>
                  
                  <div className="space-y-2">
                    {[
                      'Confirm DMD variant prioritisations',
                      'Schedule Muscle Biopsy or check Dystrophin stain',
                      'Refer to Neuromuscular Geneticist',
                      'Order Echocardiogram evaluation'
                    ].map((act, idx) => (
                      <div key={idx} className="flex items-center space-x-2.5 p-2 bg-slate-900/40 rounded-lg border border-slate-805">
                        <CheckSquare className="w-4 h-4 text-brand-400 shrink-0" />
                        <span className="text-xs text-slate-300 font-medium line-clamp-1">{act}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleCreateCarePlan}
                  disabled={state.carePlanCreated}
                  className="w-full py-2.5 bg-brand-500 disabled:bg-emerald-500/20 disabled:text-emerald-400 disabled:border disabled:border-emerald-500/30 text-white font-bold rounded-lg hover:bg-brand-600 active:scale-98 transition flex items-center justify-center space-x-1.5 text-xs mt-3 shadow-md"
                >
                  <Clipboard className="w-4 h-4" />
                  <span>{state.carePlanCreated ? 'Care Plan Created & Synchronized' : 'Create Custom Care Plan'}</span>
                </button>
              </div>

            </div>

            {/* Specialist Routing Section */}
            <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-5 shadow-xs flex justify-between items-center flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full border-2 border-indigo-500 p-0.5 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1594824813573-246434e33963?w=100&auto=format&fit=crop&q=80" alt="Dr. Nair" className="w-full h-full object-cover rounded-full" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200 text-sm">Dr. Meera Nair</span>
                    <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded text-[9px] font-bold border border-indigo-500/25">
                      Top Match
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Neuromuscular Genetics expert • Stanford Medicine Center</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 flex items-center">
                    <MapPin className="w-3 h-3 mr-0.5" /> Redwood City, CA • Response SLA: 48 Hours
                  </p>
                </div>
              </div>

              <button 
                onClick={handleSendSpecialistCase}
                disabled={state.specialistReferred}
                className="px-5 py-2.5 bg-indigo-650 disabled:bg-emerald-500/20 disabled:text-emerald-400 disabled:border disabled:border-emerald-500/30 text-white hover:bg-indigo-700 text-xs font-bold rounded-lg transition shadow-md flex items-center space-x-1.5"
              >
                <ArrowUpRight className="w-4.5 h-4.5" />
                <span>{state.specialistReferred ? 'Case Dispatched to Dr. Nair' : 'Send Case details'}</span>
              </button>
            </div>
            </>}

            {/* Additional Dashboard Sections: Alerts & Reviews */}
            <div className="grid grid-cols-2 gap-5 flex-shrink-0">
              {/* Diagnostic Alerts */}
              <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-display font-bold text-sm text-slate-200">Diagnostic Alerts</h4>
                  <span onClick={() => setActiveSidebarTab('Alerts')} className="text-[10px] font-bold text-brand-400 hover:underline cursor-pointer">View All</span>
                </div>
                <div className="space-y-3">
                  {notifications.filter(n => !n.isRead).slice(0, 3).map(notif => (
                    <div key={notif.id} className="flex space-x-3 items-start p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-200">{notif.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                  {notifications.filter(n => !n.isRead).length === 0 && (
                    <p className="text-xs text-slate-500">No unread alerts.</p>
                  )}
                </div>
              </div>

              {/* Recent Specialist Reviews */}
              <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-display font-bold text-sm text-slate-200">Recent Specialist Reviews</h4>
                  <span className="text-[10px] font-bold text-brand-400 hover:underline cursor-pointer">View All</span>
                </div>
                <div className="space-y-3">
                  <div className="flex space-x-3 items-center p-2 rounded-lg hover:bg-slate-800/50 transition">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Dr. M. Nair reviewed SJ</p>
                      <p className="text-[10px] text-slate-400">"Agree with DMD prioritization based on elevated CK and MRI."</p>
                    </div>
                  </div>
                  <div className="flex space-x-3 items-center p-2 rounded-lg hover:bg-slate-800/50 transition">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Dr. K. Chen updated case</p>
                      <p className="text-[10px] text-slate-400">"Added secondary phenotype mapping for epilepsy."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>}

        {!loading && activeSidebarTab === 'Case Queue' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-slate-100 mb-6">Patient Case Queue</h2>
            <div className="bg-clinician-card rounded-xl border border-slate-800/80 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-bold">
                  <tr>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Condition / Code</th>
                    <th className="p-4">Flag</th>
                    <th className="p-4">Match</th>
                    <th className="p-4">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {patientsList.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40 cursor-pointer transition" onClick={() => { handleSelectCase(p); setActiveSidebarTab('Dashboard'); }}>
                      <td className="p-4 font-semibold text-slate-200">{p.name}<div className="text-[10px] text-slate-500 font-normal">{p.age} • {p.gender}</div></td>
                      <td className="p-4 text-slate-300">{p.code}</td>
                      <td className="p-4"><span className={`px-2 py-0.5 rounded uppercase text-[9px] font-bold ${p.flagColor}`}>{p.flag}</span></td>
                      <td className="p-4 text-brand-400 font-bold">{p.confidence}</td>
                      <td className="p-4 text-slate-500">{p.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeSidebarTab === 'Patients' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-slate-100 mb-6">My Patients</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {patientsList.map(p => (
                <div key={p.id} className="bg-clinician-card border border-slate-800/80 p-5 rounded-xl flex items-center space-x-4 hover:border-brand-500/50 cursor-pointer transition shadow-sm" onClick={() => { handleSelectCase(p); setActiveSidebarTab('Dashboard'); }}>
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center font-display font-bold text-slate-300 border border-slate-700 shrink-0">
                    {p.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{p.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{p.age} • {p.gender}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && activeSidebarTab === 'Alerts' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-slate-100 mb-6">System Alerts & Notifications</h2>
            <div className="space-y-4 max-w-4xl">
              {notifications.map(notif => (
                <div key={notif.id} className={`p-5 rounded-xl border flex justify-between items-center transition ${notif.isRead ? 'bg-slate-900/40 border-slate-800/50' : 'bg-clinician-card border-slate-700 shadow-md'}`}>
                  <div className="flex items-start space-x-4">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${notif.isRead ? 'bg-slate-700' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                    <div>
                      <h4 className={`text-sm font-bold ${notif.isRead ? 'text-slate-400' : 'text-slate-200'}`}>{notif.title}</h4>
                      <p className={`text-xs mt-1 ${notif.isRead ? 'text-slate-500' : 'text-slate-300'}`}>{notif.message}</p>
                      <p className="text-[10px] text-slate-500 mt-2.5 font-medium">{new Date(notif.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {!notif.isRead && (
                    <button onClick={async () => {
                      await markNotificationAsRead(notif.id);
                      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                    }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition border border-slate-700 hover:border-slate-600">
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="py-10 text-center text-slate-500 text-sm">No notifications found.</div>
              )}
            </div>
          </div>
        )}

        {!loading && !['Dashboard', 'Case Queue', 'Patients', 'Alerts'].includes(activeSidebarTab) && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700 shadow-lg">
              <Activity className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-200">{activeSidebarTab}</h3>
            <p className="text-sm mt-2 max-w-sm text-center">This section is currently under development. Please check back later.</p>
          </div>
        )}

      </main>
    </div>
  );
};
