import React, { useEffect, useState } from 'react';
import {
  Activity, Users, AlertTriangle, Clock, Search, Folder, CheckSquare,
  Send, AlertCircle, FileText, ChevronRight, UserPlus, Sparkles,
  Clipboard, Calendar, ArrowUpRight, GraduationCap, MapPin, Loader2, Settings, Bell,
  Stethoscope, Pill, FlaskConical, Heart
} from 'lucide-react';
import type { SharedState } from '../types';
import {
  createCarePlan,
  getCases,
  getClinicianDashboard,
  getSpecialists,
  referCase,
  type CaseRecord,
  type SpecialistRecord,
} from '../api/clinician';
import { getNotifications, markNotificationAsRead, type NotificationRecord } from '../api/notifications';
import { getPatientTimeline, type TimelineEvent } from '../api/patients';
import { calcAge, formatGender, timeAgo } from '../utils/format';
import { ApiError } from '../api/client';
import { AddPatientModal } from './AddPatientModal';

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

// Initials avatar — replaces all hardcoded profile images
function InitialsAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-brand-600 to-indigo-700 border-2 border-brand-500/30 flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

// Timeline icon per event type
function timelineIcon(type: string) {
  switch (type) {
    case 'symptom': return <Heart className="w-3 h-3 text-white" />;
    case 'encounter': return <Stethoscope className="w-3 h-3 text-white" />;
    case 'condition': return <AlertTriangle className="w-3 h-3 text-white" />;
    case 'document': return <FileText className="w-3 h-3 text-white" />;
    default: return <Activity className="w-3 h-3 text-white" />;
  }
}

function timelineColor(type: string) {
  switch (type) {
    case 'symptom': return 'bg-rose-500';
    case 'encounter': return 'bg-brand-500';
    case 'condition': return 'bg-amber-500';
    case 'document': return 'bg-purple-500';
    default: return 'bg-slate-600';
  }
}

function timelineLabel(event: TimelineEvent): { title: string; detail: string } {
  const d = event.data as Record<string, string>;
  switch (event.type) {
    case 'symptom':
      return { title: 'Symptom Log Recorded', detail: `Pain: ${d.pain ?? '—'} • Fatigue: ${d.fatigue ?? '—'} • Mobility: ${d.mobility ?? '—'}` };
    case 'encounter':
      return { title: d.type ? `${d.type} Encounter` : 'Clinical Encounter', detail: d.notes || d.chiefComplaint || 'No notes recorded' };
    case 'condition':
      return { title: d.name || 'Condition Recorded', detail: `ICD: ${d.icdCode || '—'} • Status: ${d.status || 'active'}` };
    case 'document':
      return { title: d.title || 'Document Uploaded', detail: `${d.fileType?.toUpperCase() || 'FILE'} — ${d.source || 'Unknown source'}` };
    default:
      return { title: 'Event', detail: '' };
  }
}

export const ClinicianPortal: React.FC<ClinicianPortalProps> = ({ state, setState, onCaseSelect }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'records' | 'labs' | 'notes'>('timeline');
  const [clinicianSearch, setClinicianSearch] = useState('');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [specialist, setSpecialist] = useState<SpecialistRecord | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [clinicianNotes, setClinicianNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [dashboard, setDashboard] = useState<{
    activeCases: number;
    urgentCases: number;
    pendingInterpretations: number;
    avgResolutionDays: number;
  } | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState('Dashboard');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [dash, caseList, notifs, specialists] = await Promise.all([
          getClinicianDashboard(),
          getCases(),
          getNotifications(),
          getSpecialists().catch(() => [] as SpecialistRecord[]),
        ]);
        if (cancelled) return;
        setDashboard(dash.stats);
        setCases(caseList);
        setNotifications(notifs.data);
        setSpecialist(specialists[0] ?? null);
        if (caseList.length > 0) {
          setSelectedCaseId(caseList[0].id);
          onCaseSelect?.(caseList[0].patient);
        }
      } catch (err) {
        if (!cancelled) setActionError(err instanceof ApiError ? err.message : 'Failed to load clinician data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Fetch timeline when patient changes
  useEffect(() => {
    if (!state.patientId) return;
    let cancelled = false;
    (async () => {
      setTimelineLoading(true);
      try {
        const events = await getPatientTimeline(state.patientId!);
        if (!cancelled) setTimeline(events);
      } catch {
        if (!cancelled) setTimeline([]);
      } finally {
        if (!cancelled) setTimelineLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [state.patientId]);

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
        currentPatient.raw.patient.diagnosticSuggestions?.[0]?.diseaseName || 'Rare disease workup';
      const tests = currentPatient.raw.patient.diagnosticSuggestions?.length
        ? currentPatient.raw.patient.diagnosticSuggestions
            .slice(0, 3)
            .map((s) => `Investigate: ${s.diseaseName}`)
        : ['Whole Exome Sequencing', 'Genetic Counseling'];
      await createCarePlan({
        patientId: currentPatient.patientId,
        caseId: currentPatient.id,
        primaryDiagnosis: diagnosis,
        recommendedTests: tests,
      });
      setState((prev) => ({ ...prev, carePlanCreated: true }));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to create care plan');
    }
  };

  const handleSendSpecialistCase = async () => {
    if (!currentPatient || !specialist) return;
    setActionError(null);
    try {
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

  const handleSaveNotes = () => {
    if (!clinicianNotes.trim()) return;
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleShareCase = () => {
    if (!currentPatient) return;
    const url = `${window.location.origin}?case=${currentPatient.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg('Copied!');
      setTimeout(() => setShareMsg(''), 2000);
    });
  };

  const handlePatientAdded = (newCase: CaseRecord) => {
    setShowAddPatient(false);
    setCases((prev) => [newCase, ...prev]);
    setSelectedCaseId(newCase.id);
    onCaseSelect?.(newCase.patient);
  };

  const filteredPatients = patientsList.filter(
    (p) =>
      p.name.toLowerCase().includes(clinicianSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(clinicianSearch.toLowerCase())
  );

  // Dynamic sidebar counts from live data
  const unreadAlerts = notifications.filter((n) => !n.isRead).length;
  const urgentCases = cases.filter((c) => (c.aiFlag || '').toLowerCase() === 'high').length;

  // Derive recommended actions from diagnostic suggestions
  const recommendedActions: string[] = (() => {
    const suggestions = currentPatient?.raw.patient.diagnosticSuggestions ?? [];
    if (suggestions.length === 0) return ['No AI suggestions yet — add symptoms or upload documents'];
    return [
      `Review top match: ${suggestions[0].diseaseName}`,
      ...(suggestions[1] ? [`Rule out: ${suggestions[1].diseaseName}`] : []),
      'Order relevant confirmatory tests',
      'Schedule genetic counseling if variant found',
    ];
  })();

  return (
    <div className="flex-1 bg-clinician-dark text-slate-100 font-sans flex overflow-hidden min-h-[calc(100vh-64px)]">

      {/* Add Patient Modal */}
      {showAddPatient && (
        <AddPatientModal onClose={() => setShowAddPatient(false)} onSuccess={handlePatientAdded} />
      )}

      {/* Sidebar navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            Clinical Tools
          </div>

          <nav className="space-y-1">
            {[
              { label: 'Dashboard', icon: Activity },
              { label: 'Patients', icon: Users, count: dashboard?.activeCases ?? null },
              { label: 'Case Queue', icon: Clock, count: urgentCases || null, urgent: true },
              { label: 'Alerts', icon: AlertCircle, count: unreadAlerts || null },
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
                {item.count != null && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.urgent ? 'bg-red-500/25 text-red-300' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Add Patient Button */}
        <div className="space-y-3">
          <button
            onClick={() => setShowAddPatient(true)}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-xs font-bold bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-300 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ New Patient</span>
          </button>

          {/* Logged-in clinician info — initials only, no hardcoded image */}
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-2.5">
              <InitialsAvatar name={state.patientProfile.name || 'Clinician'} size="sm" />
              <div>
                <p className="font-bold text-slate-200">My Account</p>
                <p className="text-[10px] text-slate-500">Clinician</p>
              </div>
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
            <div className="relative w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-750 text-slate-300" onClick={() => setActiveSidebarTab('Alerts')}>
              <Bell className="w-4 h-4" />
              {unreadAlerts > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </div>
            <button
              onClick={() => setShowAddPatient(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Patient</span>
            </button>
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
            { label: 'Avg. Resolution Time', val: `${dashboard?.avgResolutionDays ?? '—'} Days`, change: 'Platform metric', icon: Clock, color: 'text-emerald-400 bg-emerald-500/10' },
            { label: 'Pending Interpretations', val: String(dashboard?.pendingInterpretations ?? '—'), change: 'Awaiting review', icon: Activity, color: 'text-indigo-400 bg-indigo-500/10' },
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

          {/* Left Col: Cases list queue */}
          <div className="col-span-4 bg-clinician-card rounded-xl border border-slate-800/80 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-display font-bold text-sm text-slate-200">Patient Case Queue</h3>
              <span onClick={() => setActiveSidebarTab('Case Queue')} className="text-[10px] font-bold text-brand-400 hover:underline cursor-pointer">
                View All
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {filteredPatients.map((patient) => (
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

                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-2">{patient.symptoms}</p>

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
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                    <Users className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">No patients yet</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Add your first patient to get started</p>
                  </div>
                  <button
                    onClick={() => setShowAddPatient(true)}
                    className="px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-300 text-xs font-bold rounded-lg transition"
                  >
                    + Add Patient
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Diagnosis Workbench */}
          <div className="col-span-8 flex flex-col space-y-5 overflow-y-auto">
            {!currentPatient && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                  <Stethoscope className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-300 text-lg">No Cases In Queue</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs">
                    Add your first patient to start reviewing cases and AI-powered diagnostics.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddPatient(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add New Patient</span>
                </button>
              </div>
            )}

            {currentPatient && <>
              {/* Patient Header Review Card */}
              <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <InitialsAvatar name={currentPatient.name} size="md" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-display font-bold text-base text-slate-100">{currentPatient.name}</h3>
                      <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded text-[9px] font-bold uppercase border border-brand-500/20">
                        {currentPatient.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {currentPatient.age} • {currentPatient.gender}
                      {currentPatient.raw.patient.diagnosticSuggestions?.length
                        ? ` • ${currentPatient.raw.patient.diagnosticSuggestions.length} AI suggestion${currentPatient.raw.patient.diagnosticSuggestions.length > 1 ? 's' : ''}`
                        : ' • No AI suggestions yet'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setActiveTab('records')}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center"
                  >
                    <Folder className="w-4 h-4 mr-1.5" /> Documents
                  </button>
                  <button 
                    onClick={handleShareCase}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center"
                  >
                    <Send className="w-4 h-4 mr-1.5" /> {shareMsg || 'Share'}
                  </button>
                </div>
              </div>

              {/* Diagnostic Tabs */}
              <div className="bg-clinician-card rounded-xl border border-slate-800/80 overflow-hidden flex flex-col">
                <div className="bg-slate-900/60 border-b border-slate-800 flex justify-between items-center px-4">
                  <div className="flex space-x-4 text-xs font-bold text-slate-400">
                    {[
                      { id: 'timeline', label: 'Clinical Timeline' },
                      { id: 'records', label: 'Conditions & Docs' },
                      { id: 'labs', label: 'Genomics & Lab Reports' },
                      { id: 'notes', label: 'Clinician Notes' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">FHIR R4</div>
                </div>

                <div className="p-5 text-xs text-slate-300 min-h-48">
                  {/* ── Timeline Tab: real API data ── */}
                  {activeTab === 'timeline' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-200">Longitudinal Clinical Timeline</p>
                        <span className="text-[10px] text-slate-500">{timeline.length} event{timeline.length !== 1 ? 's' : ''}</span>
                      </div>

                      {timelineLoading && (
                        <div className="flex items-center space-x-2 text-slate-500 py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading timeline…</span>
                        </div>
                      )}

                      {!timelineLoading && timeline.length === 0 && (
                        <div className="py-6 text-center text-slate-500">
                          <Activity className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                          <p>No timeline events yet.</p>
                          <p className="text-[10px] mt-1">Events appear after symptoms, encounters, or documents are added.</p>
                        </div>
                      )}

                      {!timelineLoading && timeline.length > 0 && (
                        <div className="relative pl-6 border-l border-slate-800 space-y-4">
                          {timeline.slice(0, 8).map((event, idx) => {
                            const { title, detail } = timelineLabel(event);
                            return (
                              <div key={idx} className="relative">
                                <span className={`absolute -left-[30px] top-0.5 w-4 h-4 ${timelineColor(event.type)} rounded-full border border-clinician-dark flex items-center justify-center`}>
                                  {timelineIcon(event.type)}
                                </span>
                                <div className="flex justify-between font-semibold">
                                  <span>{title}</span>
                                  <span className="text-slate-500 text-[10px]">
                                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                <p className="text-slate-400 mt-1 text-[11px]">{detail}</p>
                              </div>
                            );
                          })}
                          {timeline.length > 8 && (
                            <p className="text-[10px] text-slate-500 pl-0">+{timeline.length - 8} more events…</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Conditions & Docs Tab: real API data ── */}
                  {activeTab === 'records' && (
                    <div className="space-y-4">
                      {/* Conditions */}
                      <div>
                        <p className="font-bold text-slate-200 mb-2">Active Conditions</p>
                        {(currentPatient.raw.patient as { conditions?: Array<{ id: string; name: string; icdCode?: string; status: string }> }).conditions?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {(currentPatient.raw.patient as { conditions?: Array<{ id: string; name: string; icdCode?: string; status: string }> }).conditions!.map((c) => (
                              <span key={c.id} className="px-2 py-1 bg-brand-500/10 text-brand-400 rounded-lg font-semibold flex items-center border border-brand-500/25">
                                {c.icdCode ? `${c.icdCode} — ` : ''}{c.name} <Pill className="w-3 h-3 ml-1.5 opacity-60" />
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500">No active conditions recorded yet.</p>
                        )}
                      </div>

                      {/* Uploaded documents */}
                      <div>
                        <p className="font-bold text-slate-200 mb-2">Uploaded Documents ({state.uploadedFiles.length})</p>
                        {state.uploadedFiles.length > 0 ? (
                          <div className="space-y-2">
                            {state.uploadedFiles.map((f) => (
                              <div key={f.id} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                                <div className="flex items-center space-x-2.5">
                                  <FileText className="w-4 h-4 text-purple-400" />
                                  <div>
                                    <p className="font-semibold text-slate-300">{f.name}</p>
                                    <p className="text-[10px] text-slate-500">{f.type} • {f.size} • {f.date}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500">No documents uploaded yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Lab Tab: real state data ── */}
                  {activeTab === 'labs' && (
                    <div className="space-y-3">
                      <p className="font-bold text-slate-200">Genomics / VCF Ingestion Status</p>
                      {state.genomicData.fileName ? (
                        <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-800">
                          <div className="flex items-center space-x-2.5">
                            <FlaskConical className="w-5 h-5 text-purple-400" />
                            <div>
                              <p className="font-bold text-slate-300">{state.genomicData.fileName}</p>
                              <p className="text-[10px] text-slate-500">Whole Exome Sequencing</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                            state.genomicData.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/35 animate-pulse'
                          }`}>
                            {state.genomicData.status === 'completed' ? 'processed' : state.genomicData.status}
                          </span>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-slate-500">
                          <FlaskConical className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                          <p>No genomic file uploaded yet.</p>
                          <p className="text-[10px] mt-1">Upload a VCF file from the Lab Workstation.</p>
                        </div>
                      )}

                      {/* Prioritized variants if available */}
                      {state.genomicData.prioritizedVariants.length > 0 && (
                        <div>
                          <p className="font-bold text-slate-200 mb-2">Top Prioritized Variants</p>
                          {state.genomicData.prioritizedVariants.slice(0, 3).map((v, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 mb-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-300">{v.gene} — {v.variant}</span>
                                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 rounded font-bold uppercase">{v.acmg}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">Confidence: {v.confidence}%</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Notes Tab ── */}
                  {activeTab === 'notes' && (
                    <div className="space-y-2">
                      <textarea
                        value={clinicianNotes}
                        onChange={(e) => setClinicianNotes(e.target.value)}
                        placeholder="Add diagnostic comments or observations..."
                        className="w-full h-24 p-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none text-xs text-slate-200 focus:border-brand-500"
                      />
                      <button 
                        onClick={handleSaveNotes}
                        disabled={!clinicianNotes.trim()}
                        className="px-4 py-2 bg-brand-500 disabled:opacity-40 text-white rounded-lg font-semibold shadow-md hover:bg-brand-600 transition text-xs"
                      >
                        {notesSaved ? '✓ Notes Saved' : 'Save Notes'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Diagnosis and Action Panel */}
              <div className="grid grid-cols-2 gap-5 flex-shrink-0">

                {/* AI Differential Diagnosis — live data */}
                <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-display font-bold text-sm text-slate-200">AI Differential Diagnosis</h4>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>

                  <div className="space-y-3">
                    {(currentPatient.raw.patient.diagnosticSuggestions?.length
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
                            <div className={`h-full rounded-full ${colors[idx] || 'bg-slate-600'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {!currentPatient.raw.patient.diagnosticSuggestions?.length && !state.diagnosticSuggestions.length && (
                      <p className="text-xs text-slate-500">No AI suggestions yet. Add symptoms or documents to generate.</p>
                    )}
                  </div>
                </div>

                {/* Recommended Actions — derived from AI data */}
                <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-200 mb-3">Recommended Actions</h4>
                    <div className="space-y-2">
                      {recommendedActions.map((act, idx) => (
                        <div key={idx} className="flex items-center space-x-2.5 p-2 bg-slate-900/40 rounded-lg border border-slate-800">
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

              {/* Specialist Routing Section — live data */}
              <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-5 shadow-xs flex justify-between items-center flex-shrink-0">
                {specialist ? (
                  <>
                    <div className="flex items-center space-x-4">
                      <InitialsAvatar name={specialist.user.fullName} size="lg" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-200 text-sm">{specialist.user.fullName}</span>
                          <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded text-[9px] font-bold border border-indigo-500/25">
                            Top Match
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {specialist.specialty ?? 'Specialist'} • {specialist.institution ?? 'Institution not listed'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 flex items-center">
                          <MapPin className="w-3 h-3 mr-0.5" /> {specialist.user.email}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSendSpecialistCase}
                      disabled={state.specialistReferred}
                      className="px-5 py-2.5 bg-indigo-600 disabled:bg-emerald-500/20 disabled:text-emerald-400 disabled:border disabled:border-emerald-500/30 text-white hover:bg-indigo-700 text-xs font-bold rounded-lg transition shadow-md flex items-center space-x-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>{state.specialistReferred ? `Case Dispatched to ${specialist.user.fullName.split(' ')[1] ?? specialist.user.fullName}` : 'Send Case Details'}</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center space-x-3 text-slate-500">
                    <GraduationCap className="w-6 h-6" />
                    <div>
                      <p className="text-xs font-semibold">No specialists available</p>
                      <p className="text-[10px]">Specialists registered with the system will appear here for referrals.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Alerts & Notifications — live data */}
              <div className="grid grid-cols-2 gap-5 flex-shrink-0">
                <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-display font-bold text-sm text-slate-200">Diagnostic Alerts</h4>
                    <span onClick={() => setActiveSidebarTab('Alerts')} className="text-[10px] font-bold text-brand-400 hover:underline cursor-pointer">View All</span>
                  </div>
                  <div className="space-y-3">
                    {notifications.filter((n) => !n.isRead).slice(0, 3).map((notif) => (
                      <div key={notif.id} className="flex space-x-3 items-start p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-200">{notif.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{notif.message}</p>
                        </div>
                      </div>
                    ))}
                    {notifications.filter((n) => !n.isRead).length === 0 && (
                      <p className="text-xs text-slate-500">No unread alerts.</p>
                    )}
                  </div>
                </div>

                {/* Recent activity from notifications marked as read */}
                <div className="bg-clinician-card rounded-xl border border-slate-800/80 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-display font-bold text-sm text-slate-200">Recent Activity</h4>
                    <span onClick={() => setActiveSidebarTab('Alerts')} className="text-[10px] font-bold text-brand-400 hover:underline cursor-pointer">View All</span>
                  </div>
                  <div className="space-y-3">
                    {notifications.filter((n) => n.isRead).slice(0, 3).map((notif) => (
                      <div key={notif.id} className="flex space-x-3 items-center p-2 rounded-lg hover:bg-slate-800/50 transition">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400">{notif.title}</p>
                          <p className="text-[10px] text-slate-500">{notif.message}</p>
                        </div>
                      </div>
                    ))}
                    {notifications.filter((n) => n.isRead).length === 0 && (
                      <p className="text-xs text-slate-500">No recent activity.</p>
                    )}
                  </div>
                </div>
              </div>
            </>}
          </div>
        </div>}

        {/* Case Queue full view */}
        {!loading && activeSidebarTab === 'Case Queue' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-xl text-slate-100">Patient Case Queue</h2>
              <button
                onClick={() => setShowAddPatient(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Patient</span>
              </button>
            </div>
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
                  {patientsList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 cursor-pointer transition" onClick={() => { handleSelectCase(p); setActiveSidebarTab('Dashboard'); }}>
                      <td className="p-4 font-semibold text-slate-200">{p.name}<div className="text-[10px] text-slate-500 font-normal">{p.age} • {p.gender}</div></td>
                      <td className="p-4 text-slate-300">{p.code}</td>
                      <td className="p-4"><span className={`px-2 py-0.5 rounded uppercase text-[9px] font-bold ${p.flagColor}`}>{p.flag}</span></td>
                      <td className="p-4 text-brand-400 font-bold">{p.confidence}</td>
                      <td className="p-4 text-slate-500">{p.time}</td>
                    </tr>
                  ))}
                  {patientsList.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No cases yet. Add a patient to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Patients grid view */}
        {!loading && activeSidebarTab === 'Patients' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-xl text-slate-100">My Patients</h2>
              <button
                onClick={() => setShowAddPatient(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Patient</span>
              </button>
            </div>
            {patientsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                <Users className="w-12 h-12 text-slate-700" />
                <p>No patients yet. Add your first patient to get started.</p>
                <button
                  onClick={() => setShowAddPatient(true)}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition"
                >
                  + Add Patient
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {patientsList.map((p) => (
                  <div key={p.id} className="bg-clinician-card border border-slate-800/80 p-5 rounded-xl flex items-center space-x-4 hover:border-brand-500/50 cursor-pointer transition shadow-sm" onClick={() => { handleSelectCase(p); setActiveSidebarTab('Dashboard'); }}>
                    <InitialsAvatar name={p.name} size="md" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{p.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{p.age} • {p.gender}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{p.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alerts view */}
        {!loading && activeSidebarTab === 'Alerts' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-slate-100 mb-6">System Alerts & Notifications</h2>
            <div className="space-y-4 max-w-4xl">
              {notifications.map((notif) => (
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
                      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
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

        {/* Placeholder for other sidebar tabs */}
        {!loading && !['Dashboard', 'Case Queue', 'Patients', 'Alerts'].includes(activeSidebarTab) && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700 shadow-lg">
              <Activity className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-200">{activeSidebarTab}</h3>
            <p className="text-sm mt-2 max-w-sm text-center">This section is under development. Please check back later.</p>
          </div>
        )}

      </main>
    </div>
  );
};
