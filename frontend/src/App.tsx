import React, { useEffect, useState } from 'react';
import { PatientApp } from './components/PatientApp';
import { ClinicianPortal } from './components/ClinicianPortal';
import { LabWorkstation } from './components/LabWorkstation';
import { ResearchPortal } from './components/ResearchPortal';
import { AdminPortal } from './components/AdminPortal';
import { LoginPage } from './components/LoginPage';
import { AuthProvider, canAccessPortal, portalForRole, useAuth } from './context/AuthContext';
import { useAppData } from './hooks/useAppData';
import {
  Smartphone,
  ShieldCheck,
  Globe,
  Activity,
  ChevronRight,
  Terminal,
  LogOut,
  Loader2,
} from 'lucide-react';

type PortalId = 'patient' | 'clinician' | 'lab' | 'research' | 'admin';

const PORTALS: Array<{
  id: PortalId;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'patient', label: 'Patient App', icon: Smartphone },
  { id: 'clinician', label: 'Clinician Portal', icon: Activity },
  { id: 'lab', label: 'Lab Workstation', icon: Terminal },
  { id: 'research', label: 'Research Portal', icon: Globe },
  { id: 'admin', label: 'Admin Portal', icon: ShieldCheck },
];

const AppShell: React.FC = () => {
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  const { state, setState, refresh, syncPatientFromCase } = useAppData(user);
  const [activePortal, setActivePortal] = useState<PortalId>('patient');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setActivePortal(portalForRole(user.role));
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  const visiblePortals = PORTALS.filter((p) => canAccessPortal(user.role, p.id));

  const setActiveTabPortal = (portal: PortalId) => {
    if (!canAccessPortal(user.role, portal)) return;
    setActivePortal(portal);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 font-sans">
      <header className="bg-slate-900 text-white border-b border-slate-800 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center font-display font-extrabold text-lg text-white shadow-lg border border-brand-500/30">
                L
              </div>
              <div>
                <h1 className="font-display font-extrabold text-base tracking-tight leading-none text-white">
                  LUMEN
                </h1>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                  Connected Platform
                </p>
              </div>
            </div>

            <nav className="flex space-x-1.5 p-1 bg-slate-950 rounded-xl border border-slate-850">
              {visiblePortals.map((portal) => (
                <button
                  key={portal.id}
                  onClick={() => setActiveTabPortal(portal.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none ${
                    activePortal === portal.id
                      ? 'bg-slate-800 text-white shadow border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <portal.icon className="w-3.5 h-3.5" />
                  <span>{portal.label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-200">{user.fullName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</p>
              </div>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <button
                onClick={() => logout()}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {state.error && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-amber-800 text-xs font-medium text-center">
          API warning: {state.error}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 relative">
        {state.loading && (
          <div className="absolute inset-0 bg-white/60 z-40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        )}

        {activePortal === 'patient' && (
          <PatientApp state={state} setState={setState} onRefresh={refresh} />
        )}
        {activePortal === 'clinician' && (
          <ClinicianPortal
            state={state}
            setState={setState}
            onCaseSelect={syncPatientFromCase}
          />
        )}
        {activePortal === 'lab' && (
          <LabWorkstation state={state} setState={setState} patientId={state.patientId} />
        )}
        {activePortal === 'research' && <ResearchPortal state={state} setState={setState} />}
        {activePortal === 'admin' && <AdminPortal state={state} setState={setState} />}
      </div>

      <footer className="bg-slate-900 border-t border-slate-800 text-white py-3 px-6 text-xs flex justify-between items-center flex-shrink-0 z-35 font-sans">
        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-slate-400">
          <span>Continuous Learning Loop</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>

        <div className="flex space-x-8 items-center text-[11px] font-semibold text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                state.patientProfile.isCompleted
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {state.patientProfile.isCompleted ? '✓' : '1'}
            </span>
            <span className={state.patientProfile.isCompleted ? 'text-slate-200' : 'text-slate-500'}>
              Patient Profile Created
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                state.genomicData.status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {state.genomicData.status === 'completed' ? '✓' : '2'}
            </span>
            <span
              className={state.genomicData.status === 'completed' ? 'text-slate-200' : 'text-slate-500'}
            >
              VCF Sequenced & prioritized
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                state.genomicData.reportGenerated
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {state.genomicData.reportGenerated ? '✓' : '3'}
            </span>
            <span className={state.genomicData.reportGenerated ? 'text-slate-200' : 'text-slate-500'}>
              Genomic report Signed
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                state.carePlanCreated
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {state.carePlanCreated ? '✓' : '4'}
            </span>
            <span className={state.carePlanCreated ? 'text-slate-200' : 'text-slate-500'}>
              Clinician Care Plan Released
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                state.specialistReferred
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {state.specialistReferred ? '✓' : '5'}
            </span>
            <span className={state.specialistReferred ? 'text-slate-200' : 'text-slate-500'}>
              Specialist Referred
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold uppercase">
          <span>Active Patient:</span>
          <span className="text-brand-400 font-semibold">{state.patientProfile.name || 'None'}</span>
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
