import React, { useState } from 'react';
import { ClinicianPortal } from './components/ClinicianPortal';
import { LabWorkstation } from './components/LabWorkstation';
import { ResearchPortal } from './components/ResearchPortal';
import { AdminPortal } from './components/AdminPortal';
import { LoginPage } from './components/LoginPage';
import { LandingPage } from './components/LandingPage';
import { AuthProvider, canAccessPortal, portalForRole, useAuth } from './context/AuthContext';
import { useAppData } from './hooks/useAppData';
import {
  ShieldCheck,
  Globe2,
  Activity,
  Terminal,
  LogOut,
  Loader2,
  CheckCircle2,
  Circle,
} from 'lucide-react';

type PortalId = 'clinician' | 'lab' | 'research' | 'admin';

const PORTALS: Array<{
  id: PortalId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}> = [
  { id: 'clinician', label: 'Clinician Portal', shortLabel: 'Clinician', icon: Activity },
  { id: 'lab', label: 'Lab Workstation', shortLabel: 'Lab', icon: Terminal },
  { id: 'research', label: 'Research Portal', shortLabel: 'Research', icon: Globe2 },
  { id: 'admin', label: 'Admin Portal', shortLabel: 'Admin', icon: ShieldCheck },
];

const AppShell: React.FC = () => {
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  const { state, setState, syncPatientFromCase } = useAppData(user);
  const [activePortal, setActivePortal] = useState<PortalId>('clinician');
  const [showLogin, setShowLogin] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (showLogin) {
      return <LoginPage onBack={() => setShowLogin(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  const visiblePortals = PORTALS.filter((p) => canAccessPortal(user.role, p.id));
  const rolePortal = portalForRole(user.role);
  const fallbackPortal = rolePortal === 'patient' ? 'clinician' : rolePortal;
  const currentPortal = canAccessPortal(user.role, activePortal) ? activePortal : fallbackPortal;

  const setActiveTabPortal = (portal: PortalId) => {
    if (!canAccessPortal(user.role, portal)) return;
    setActivePortal(portal);
  };

  const workflowSteps = [
    { label: 'Profile', done: state.patientProfile.isCompleted },
    { label: 'Sequencing', done: state.genomicData.status === 'completed' },
    { label: 'Report', done: state.genomicData.reportGenerated },
    { label: 'Care plan', done: state.carePlanCreated },
    { label: 'Referral', done: state.specialistReferred },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 font-sans">
      <header className="bg-white/95 text-slate-950 border-b border-slate-200 z-50 flex-shrink-0 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-4 h-16">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-slate-950 rounded-lg flex items-center justify-center font-display font-extrabold text-lg text-white shadow-sm">
                L
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-extrabold text-base tracking-tight leading-none text-slate-950">
                  LUMEN
                </h1>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider truncate">
                  Connected Platform
                </p>
              </div>
            </div>

            <nav className="flex-1 max-w-xl overflow-x-auto">
              <div className="flex w-max sm:w-full justify-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
                {visiblePortals.map((portal) => (
                  <button
                    key={portal.id}
                    onClick={() => setActiveTabPortal(portal.id)}
                    className={`flex min-w-11 items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-extrabold transition focus:outline-none ${
                      currentPortal === portal.id
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title={portal.label}
                  >
                    <portal.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{portal.shortLabel}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs font-extrabold text-slate-900">{user.fullName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{user.role}</p>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {state.error && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-amber-800 text-xs font-bold text-center">
          API warning: {state.error}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 relative">
        {state.loading && (
          <div className="absolute inset-0 bg-white/70 z-40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        )}

        {currentPortal === 'clinician' && (
          <ClinicianPortal
            state={state}
            setState={setState}
            onCaseSelect={syncPatientFromCase}
          />
        )}
        {currentPortal === 'lab' && (
          <LabWorkstation state={state} setState={setState} patientId={state.patientId} />
        )}
        {currentPortal === 'research' && <ResearchPortal state={state} setState={setState} />}
        {currentPortal === 'admin' && <AdminPortal state={state} setState={setState} />}
      </div>

      <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-2.5 flex-shrink-0 z-35 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase font-extrabold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Diagnostic workflow
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {workflowSteps.map((step, index) => {
              const Icon = step.done ? CheckCircle2 : Circle;
              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-1.5 shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-extrabold ${
                    step.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{index + 1}. {step.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
            <span>Active patient</span>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-900">
              {state.patientProfile.name || 'None'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <AppShell />
  </AuthProvider>
);

export default App;
