import React, { useState } from 'react';
import { 
  Activity, Users, AlertTriangle, Clock, Search, Folder, CheckSquare, 
  Send, AlertCircle, FileText, ChevronRight, UserPlus, Sparkles,
  Clipboard, Calendar, ArrowUpRight, GraduationCap, MapPin
} from 'lucide-react';
import type { SharedState } from '../types';

interface ClinicianPortalProps {
  state: SharedState;
  setState: React.Dispatch<React.SetStateAction<SharedState>>;
}

export const ClinicianPortal: React.FC<ClinicianPortalProps> = ({ state, setState }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('case-1');
  const [activeTab, setActiveTab] = useState<'timeline' | 'records' | 'labs' | 'notes'>('timeline');
  const [clinicianSearch, setClinicianSearch] = useState('');
  
  // Custom mock patients queue list
  const patientsList = [
    {
      id: 'case-1',
      name: state.patientProfile.name || 'Sarah Johnson',
      age: `${state.patientProfile.age}y`,
      gender: state.patientProfile.gender,
      code: 'CASE-2024-1456',
      symptoms: 'Progressive muscle weakness, Gowers sign, delayed motor milestones',
      flag: 'AI Flag: High',
      flagColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
      confidence: '89%',
      time: '2h ago'
    },
    {
      id: 'case-2',
      name: 'Michael Lee',
      age: '8y',
      gender: 'Male',
      code: 'CASE-2024-1457',
      symptoms: 'Seizures, developmental delay, microcephaly, hypotonia',
      flag: 'AI Flag: Medium',
      flagColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      confidence: '67%',
      time: '5h ago'
    },
    {
      id: 'case-3',
      name: 'Emma Davis',
      age: '5y',
      gender: 'Female',
      code: 'CASE-2024-1458',
      symptoms: 'Short stature, vision problems, hearing loss, skeletal dysplasia',
      flag: 'AI Flag: Low',
      flagColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      confidence: '34%',
      time: '1d ago'
    }
  ];

  const currentPatient = patientsList.find(p => p.id === selectedCaseId) || patientsList[0];

  const handleCreateCarePlan = () => {
    setState(prev => ({
      ...prev,
      carePlanCreated: true,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          action: 'Care Plan Created',
          user: 'Dr. Arjun Patel',
          details: `Custom care plan generated for patient ${currentPatient.name} (${currentPatient.code}).`
        },
        ...prev.auditLogs
      ]
    }));
  };

  const handleSendSpecialistCase = () => {
    setState(prev => ({
      ...prev,
      specialistReferred: true,
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          action: 'Specialist Referral Dispatched',
          user: 'Dr. Arjun Patel',
          details: `Case details and HPO profile of ${currentPatient.name} referred to Dr. Meera Nair (SLA 48h).`
        },
        ...prev.auditLogs
      ]
    }));
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
              { label: 'Dashboard', icon: Activity, active: true },
              { label: 'Patients', icon: Users, count: 142 },
              { label: 'Case Queue', icon: Clock, count: 8, urgent: true },
              { label: 'Alerts', icon: AlertCircle, count: 32 },
              { label: 'Calendar', icon: Calendar },
              { label: 'Knowledge Base', icon: GraduationCap },
              { label: 'Specialists', icon: UserPlus },
              { label: 'Reports', icon: FileText },
            ].map((item, idx) => (
              <button 
                key={idx}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  item.active 
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
            <h2 className="font-display font-extrabold text-2xl text-slate-100 tracking-tight">Clinician Workstation</h2>
            <p className="text-xs text-slate-400">Collaborative Clinical Decision Support & Diagnostics</p>
          </div>
          
          <div className="flex items-center space-x-3">
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
              <AlertCircle className="w-4.5 h-4.5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Stats banner row */}
        <div className="grid grid-cols-4 gap-4 mt-5 flex-shrink-0">
          {[
            { label: 'Active Cases', val: '142', change: '+12 this week', icon: Users, color: 'text-brand-400 bg-brand-500/10' },
            { label: 'Urgent Cases', val: '8', change: 'Requires attention', icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
            { label: 'Avg. Resolution Time', val: '12 Days', change: '-3 days vs last month', icon: Clock, color: 'text-emerald-400 bg-emerald-500/10' },
            { label: 'Rare Disease Alerts', val: '32', change: '+8 this week', icon: Activity, color: 'text-indigo-400 bg-indigo-500/10' },
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
        </div>

        {/* Dynamic Patient Selector and Diagnostic Layout */}
        <div className="grid grid-cols-12 gap-5 mt-5 flex-1 min-h-0">
          
          {/* Left Col: Cases list queue (Span 4) */}
          <div className="col-span-4 bg-clinician-card rounded-xl border border-slate-800/80 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display font-bold text-sm text-slate-200">Patient Case Queue</h3>
              <span className="text-[10px] font-bold text-brand-400 hover:underline cursor-pointer">View All</span>
            </div>
            
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {filteredPatients.map(patient => (
                <div 
                  key={patient.id}
                  onClick={() => setSelectedCaseId(patient.id)}
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
                      onClick={() => setActiveTab(tab.id as any)}
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
                  {[
                    { name: 'Duchenne Muscular Dystrophy', match: '89%', color: 'bg-brand-500' },
                    { name: 'Becker Muscular Dystrophy', match: '71%', color: 'bg-indigo-500' },
                    { name: 'Limb-Girdle Muscular Dystrophy (LGMD)', match: '44%', color: 'bg-purple-500' },
                    { name: 'Congenital Myopathy', match: '28%', color: 'bg-slate-600' }
                  ].map((disease, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-350">
                        <span>{disease.name}</span>
                        <span>{disease.match} Match</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${disease.color}`} style={{ width: disease.match }} />
                      </div>
                    </div>
                  ))}
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

          </div>

        </div>

      </main>
    </div>
  );
};
