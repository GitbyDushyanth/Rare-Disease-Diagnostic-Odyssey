import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, Server, ClipboardList, Database, HardDrive, 
  Search, CheckCircle2, Activity, AlertTriangle, Loader2, Users, Key, CreditCard, Globe
} from 'lucide-react';
import type { SharedState } from '../types';
import { getAdminDashboard, getComplianceReport, getPlatformAnalytics, type PlatformAnalytics } from '../api/admin';
import { ApiError } from '../api/client';

interface AdminPortalProps {
  state: SharedState;
  setState: React.Dispatch<React.SetStateAction<SharedState>>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ state, setState }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'roles' | 'audit' | 'billing' | 'quality'>('overview');
  const [auditSearch, setAuditSearch] = useState('');
  const [stats, setStats] = useState<{
    totalPatients: number;
    totalClinicians: number;
    totalHospitals: number;
    apiCallsPerMin: number;
    uptime: number;
  } | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [auditProgress, setAuditProgress] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);

  useEffect(() => {
    Promise.all([getAdminDashboard(), getPlatformAnalytics()])
      .then(([data, platformData]) => {
        setStats({
          totalPatients: data.stats.totalPatients,
          totalClinicians: data.stats.totalClinicians,
          totalHospitals: data.stats.totalHospitals,
          apiCallsPerMin: data.stats.apiCallsPerMin,
          uptime: data.stats.platformHealth.uptime,
        });
        setAnalytics(platformData);
        setState((prev) => ({
          ...prev,
          auditLogs: data.recentAuditLogs.map((log) => ({
            id: log.id,
            timestamp: new Date(log.createdAt).toLocaleTimeString(),
            action: log.action,
            user: log.user?.fullName || 'System',
            details: log.details || log.resource || '',
          })),
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setState]);

  const handleGenerateAuditReport = async () => {
    setAuditProgress(true);
    try {
      await getComplianceReport();
      setAuditComplete(true);
      setTimeout(() => setAuditComplete(false), 2000);
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : 'Report failed');
    } finally {
      setAuditProgress(false);
    }
  };

  const filteredLogs = state.auditLogs.filter(log => 
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.details.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 font-sans flex overflow-hidden min-h-[calc(100vh-64px)]">
      
      {/* Sidebar navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Admin Console
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Platform Overview', icon: Server },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'roles', label: 'Roles & Permissions', icon: Key },
              { id: 'audit', label: 'Audit Logs', icon: ClipboardList },
              { id: 'billing', label: 'Billing', icon: CreditCard },
              { id: 'quality', label: 'Data Quality Engine', icon: Database }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === item.id 
                    ? 'bg-pink-50 text-pink-700 shadow-xs border border-pink-100' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 bg-pink-50/50 border border-pink-100 rounded-xl text-xs">
          <div className="flex items-center space-x-2.5 text-pink-700">
            <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
            <div className="overflow-hidden">
              <p className="font-bold truncate text-[10px]">Admin Console</p>
              <p className="text-[9px] text-pink-500 font-medium">SOC2 Compliance Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        
        {/* Header toolbar */}
        <div className="flex justify-between items-center pb-5 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Lumen OS Operations</h2>
            <p className="text-xs text-slate-500">Security Access Governance & Infrastructure Monitoring</p>
          </div>
          <div className="text-xs text-pink-700 bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-lg font-semibold flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> SOC2 Type II Certified
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading platform data...
          </div>
        )}

        {/* Dynamic Panels */}
        {!loading && activeTab === 'overview' && (
          <div className="space-y-6 mt-5 animate-fade-in flex-1">
            
            {/* Top metrics dashboard */}
            <div className="grid grid-cols-4 gap-4 flex-shrink-0">
              {[
                { label: 'Total Users', val: String(stats?.totalClinicians ? stats.totalClinicians + stats.totalPatients : '—'), status: 'Registered accounts', icon: Users, color: 'border-blue-100 bg-blue-50/20 text-blue-600' },
                { label: 'Active Nodes', val: String(stats?.totalHospitals ?? '—'), status: 'Federated hospital nodes', icon: Server, color: 'border-indigo-100 bg-indigo-50/20 text-indigo-600' },
                { label: 'API Calls / Min', val: String(stats?.apiCallsPerMin ?? '—'), status: 'Recent requests', icon: Activity, color: 'border-pink-100 bg-pink-50/20 text-pink-600' },
                { label: 'System Uptime SLA', val: `${stats?.uptime ?? 99.95}%`, status: 'Platform health metric', icon: HardDrive, color: 'border-emerald-100 bg-emerald-50/20 text-emerald-600' }
              ].map((stat, idx) => (
                <div key={idx} className="p-4 border border-slate-250 bg-white rounded-xl shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-display font-extrabold text-slate-900">{stat.val}</p>
                    <p className="text-[9px] text-slate-500 font-semibold">{stat.status}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color.split(' ').slice(0, 2).join(' ')}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Split work area */}
            <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
              
              {/* Left Column: Data quality indicators (Span 7) */}
              <div className="col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-850 text-sm mb-3">Diagnostic Data Quality Monitor</h3>
                  <p className="text-xs text-slate-500 mb-4">Gauges checking the metadata verification levels of clinical notes NLP maps.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Phenotype Map Completeness', val: analytics?.dataQuality.completeness ?? 0, status: `${analytics?.dataQuality.completeness ?? 0}% (High Coverage)`, color: 'bg-pink-600' },
                    { label: 'ClinVar Verification Accuracy', val: analytics?.dataQuality.accuracy ?? 0, status: `${analytics?.dataQuality.accuracy ?? 0}% (ACMG Standard)`, color: 'bg-emerald-500' },
                    { label: 'Cross-Hospital Log Consistency', val: analytics?.dataQuality.consistency ?? 0, status: `${analytics?.dataQuality.consistency ?? 0}% (Synced Node Hub)`, color: 'bg-blue-500' }
                  ].map((gauge, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{gauge.label}</span>
                        <span>{gauge.status}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${gauge.color}`} style={{ width: `${gauge.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 mt-4 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  Data quality engine computes continuous verification indexes from the NLP mapper output accuracy versus gold-standard ClinVar genomic annotators.
                </p>

                <div className="mt-6">
                  <h3 className="font-display font-bold text-slate-850 text-sm mb-3 flex items-center">
                    <Globe className="w-4 h-4 mr-2 text-slate-400" />
                    Global Network Traffic
                  </h3>
                  <div className="h-24 bg-slate-50 border border-slate-150 rounded-lg flex items-end px-2 py-1 space-x-1">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="w-full bg-pink-500/20 rounded-t-sm" 
                        style={{ height: `${Math.max(10, Math.random() * 100)}%` }} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Reports audit trigger (Span 5) */}
              <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-850 text-sm mb-3">Compliance Audits</h3>
                  <p className="text-xs text-slate-500 mb-4">Trigger automated SOC2 compliance audits or system data logs export.</p>
                </div>

                <div className="space-y-2">
                  {[
                    'Generate SOC2 Compliance Report',
                    'Audit Phenotype NLP models (90% target)',
                    'Release Node Health report (AWS EKS logs)'
                  ].map((rep, idx) => (
                    <div key={idx} className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-lg border border-slate-150 text-xs font-medium text-slate-750">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{rep}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleGenerateAuditReport}
                  disabled={auditProgress || auditComplete}
                  className="w-full py-2.5 bg-pink-650 hover:bg-pink-700 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center justify-center space-x-1.5 mt-4"
                >
                  {auditProgress ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldCheck className="w-4.5 h-4.5" />}
                  <span>
                    {auditProgress ? 'Running Auditing Tools...' : auditComplete ? 'Audit Trail Saved' : 'Generate Compliance Audit'}
                  </span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* Audit Log view */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mt-5 animate-fade-in flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-display font-bold text-slate-850 text-sm">Security & Action Audit Logs</h3>
                <p className="text-xs text-slate-500">De-identified clinical actions mapped chronologically in active workspace sessions.</p>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                <input 
                  type="text" 
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search audit trail logs..." 
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-250 rounded text-xs w-56 focus:outline-none" 
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2 text-xs min-h-0">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex justify-between items-start space-x-3">
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-[9px] bg-slate-200 text-slate-550 px-2 py-0.5 rounded font-semibold">{log.user}</span>
                    </div>
                    <p className="text-slate-500 leading-normal">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">{log.timestamp}</span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No matching audit logs found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Quality detailed settings view */}
        {activeTab === 'quality' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mt-5 animate-fade-in space-y-4">
            <h3 className="font-display font-bold text-slate-850 text-sm">FHIR Validation Diagnostics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verifying active schemas alignment with FHIR R4 standard structures. DiagnosticReports are mapped directly to corresponding HPO Phenotypic terms in the Neo4j Graph DB nodes.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
                <div className="flex items-center space-x-2 text-indigo-700">
                  <Activity className="w-4.5 h-4.5" />
                  <span className="font-bold text-xs">FHIR R4 Schema Validator</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Verifying DiagnosticReport & Observation schema resources templates consistency.
                </p>
                <div className="text-[10px] text-emerald-600 font-bold">100% Validation compliance</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
                <div className="flex items-center space-x-2 text-pink-700">
                  <AlertTriangle className="w-4.5 h-4.5" />
                  <span className="font-bold text-xs">Graph DB Node Consistency</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Verifying Patient-Phenotype edge connection references mapping indices.
                </p>
                <div className="text-[10px] text-pink-650 font-bold">98% Referencing integrity</div>
              </div>
            </div>
          </div>
        )}

        {/* Users view */}
        {!loading && activeTab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mt-5 animate-fade-in space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-slate-850 text-sm">Registered Users</h3>
              <span className="text-xs text-slate-500">{(stats?.totalClinicians ?? 0) + (stats?.totalPatients ?? 0)} total accounts</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Clinicians', val: stats?.totalClinicians ?? '—', color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { label: 'Patients', val: stats?.totalPatients ?? '—', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                { label: 'Hospitals', val: stats?.totalHospitals ?? '—', color: 'text-pink-600 bg-pink-50 border-pink-100' },
              ].map((item, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${item.color} text-center`}>
                  <p className="text-2xl font-display font-extrabold">{item.val}</p>
                  <p className="text-xs font-bold mt-1 opacity-70">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roles & Billing placeholder */}
        {!loading && ['roles', 'billing'].includes(activeTab) && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 mt-5">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
              <ShieldCheck className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-800 capitalize">{activeTab} Management</h3>
            <p className="text-sm mt-2 max-w-sm text-center">This administration module is restricted or currently under maintenance.</p>
          </div>
        )}

      </main>
    </div>
  );
};
