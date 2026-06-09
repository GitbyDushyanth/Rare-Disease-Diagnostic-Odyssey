import React, { useEffect, useState } from 'react';
import { 
  Globe, Database, Key, Search, Compass, ArrowDownToLine, Filter, UserCheck, CheckCircle2, Loader2, BookOpen, LineChart, Target, X
} from 'lucide-react';
import type { SharedState } from '../types';
import { getResearchDashboard, searchCohort } from '../api/research';
import { ApiError } from '../api/client';

interface ResearchPortalProps {
  state: SharedState;
  setState: React.Dispatch<React.SetStateAction<SharedState>>;
}

export const ResearchPortal: React.FC<ResearchPortalProps> = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'cohort' | 'analysis' | 'datasets' | 'publications' | 'api'>('overview');
  const [geneQuery, setGeneQuery] = useState('DMD');
  const [symptomQuery, setSymptomQuery] = useState('Muscular Dystrophy');
  const [ageMin, setAgeMin] = useState(2);
  const [ageMax, setAgeMax] = useState(18);
  const [dashboard, setDashboard] = useState<{
    totalPatients: number;
    totalGenomes: number;
    countries: number;
    totalTrials: number;
    topHpoTerms?: { name: string; count: number }[];
  } | null>(null);
  const [cohortTotal, setCohortTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchRun, setSearchRun] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    getResearchDashboard()
      .then(setDashboard)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearchCohort = async () => {
    setIsSearching(true);
    setActionError(null);
    try {
      const result = await searchCohort({
        genes: geneQuery ? [geneQuery] : undefined,
        conditions: symptomQuery ? [symptomQuery] : undefined,
        ageMin,
        ageMax,
      });
      setCohortTotal(result.total);
      setSearchRun(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Cohort search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = () => {
    setExportComplete(true);
    setTimeout(() => setExportComplete(false), 2000);
  };

  return (
    <div className="flex-1 bg-white text-slate-800 font-sans flex overflow-hidden min-h-[calc(100vh-64px)]">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Research Dashboard
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Ecosystem Overview', icon: Globe },
              { id: 'cohort', label: 'Cohort Query Builder', icon: Database },
              { id: 'analysis', label: 'Analysis Workspaces', icon: LineChart },
              { id: 'datasets', label: 'Federated Datasets', icon: Target },
              { id: 'publications', label: 'Publications', icon: BookOpen },
              { id: 'api', label: 'API Access', icon: Key }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === item.id 
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center space-x-2.5 text-slate-600">
            <UserCheck className="w-4 h-4 shrink-0" />
            <div className="overflow-hidden">
              <p className="font-bold truncate text-[11px]">Stanford Bio-Bank</p>
              <p className="text-[9px] text-slate-400">Genomics Research Node</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Central Panel */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto bg-slate-50/50">
        
        {/* Header Title */}
        <div className="flex justify-between items-center pb-5 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Research & Analytics Platform</h2>
            <p className="text-xs text-slate-500">De-identified Rare Disease Cohort Analytics Engine</p>
          </div>
          <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg font-semibold flex items-center">
            <Compass className="w-3.5 h-3.5 mr-1.5" /> Compliance: HIPAA / GDPR Certified
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading research data...
          </div>
        )}

        {actionError && (
          <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {actionError}
          </div>
        )}

        {/* Dynamic Screens */}
        {!loading && activeTab === 'overview' && (
          <div className="space-y-6 mt-5 animate-fade-in flex-1">
            
            {/* Cohort Stats banner cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Registered Patients', val: String(dashboard?.totalPatients ?? '12,450'), desc: 'Platform patient records', color: 'border-emerald-100 bg-emerald-50/30' },
                { label: 'Active Countries', val: `${dashboard?.countries ?? 42} Countries`, desc: 'Federated global coverage', color: 'border-blue-100 bg-blue-50/30' },
                { label: 'Phenotypes Mapped', val: '4,102', desc: 'Distinct HPO terms', color: 'border-purple-100 bg-purple-50/30' },
                { label: 'Ingested Genomes', val: String(dashboard?.totalGenomes ?? '8,214'), desc: 'Completed sequencing runs', color: 'border-indigo-100 bg-indigo-50/30' }
              ].map((stat, idx) => (
                <div key={idx} className={`p-4 border rounded-xl shadow-xs ${stat.color}`}>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-display font-extrabold text-slate-900 mt-1">{stat.val}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">{stat.desc}</p>
                </div>
              ))}
            </div>

            {/* Geographical map density & Distributions grid */}
            <div className="grid grid-cols-12 gap-5">
              
              {/* Left Side: SVG Map density (Span 8) */}
              <div className="col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[360px]">
                <h3 className="font-display font-bold text-slate-800 text-sm mb-3">Global Cohort Registry Distribution</h3>
                
                {/* SVG Visual Map layout */}
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center relative overflow-hidden p-4">
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Cpath d=%22M50,50 Q100,20 150,50 T250,50 T350,50%22 fill=%22none%22 stroke=%22%236366f1%22 stroke-width=%221%22/%3E%3C/svg%3E')", backgroundSize: 'cover' }}></div>
                  
                  {/* A more detailed abstract world map placeholder */}
                  <svg className="w-full h-full text-slate-300" viewBox="0 0 1000 500" fill="currentColor">
                    <path d="M150,120 Q180,80 250,100 T300,50 T380,80 T400,150 T480,180 T550,150 T620,100 T750,120 T850,200 T900,250 T880,350 T750,450 T600,400 T550,300 T500,450 T400,420 T350,300 T300,450 T200,380 T150,420 T80,300 T120,200 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
                    
                    {/* Data Hub Connections */}
                    <path d="M250,250 L450,200 L650,250" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="4" className="opacity-50" />
                    <path d="M250,250 L550,350" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="4" className="opacity-50" />
                    
                    {/* Circle indicators representing global data hubs */}
                    <circle cx="250" cy="250" r="24" className="fill-indigo-500/20 stroke-indigo-500 stroke-2 animate-pulse" />
                    <circle cx="250" cy="250" r="4" className="fill-indigo-500" />
                    
                    <circle cx="450" cy="200" r="16" className="fill-indigo-500/20 stroke-indigo-500 stroke-2" />
                    <circle cx="450" cy="200" r="3" className="fill-indigo-500" />
                    
                    <circle cx="650" cy="250" r="32" className="fill-indigo-500/20 stroke-indigo-500 stroke-2 animate-pulse" />
                    <circle cx="650" cy="250" r="4" className="fill-indigo-500" />
                    
                    <circle cx="550" cy="350" r="12" className="fill-indigo-500/20 stroke-indigo-500 stroke-2" />
                    <circle cx="550" cy="350" r="3" className="fill-indigo-500" />
                  </svg>
                  
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md p-3 rounded-lg border border-slate-200 text-[10px] space-y-1.5 shadow-sm">
                    <p className="font-bold text-slate-700">Top Regional Densities</p>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                      <span>North America (1.4M genomes)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full" />
                      <span>European Nodes (1.1M genomes)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Top Gene associations (Span 4) */}
              <div className="col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[360px]">
                <div>
                  <h3 className="font-display font-bold text-slate-800 text-sm mb-3">Top Mapped Phenotypes (HPO)</h3>
                  <p className="text-xs text-slate-500 mb-4">Breakdown of the highest prioritized disease targets across the network.</p>
                </div>
                
                <div className="space-y-4">
                  {(dashboard?.topHpoTerms || []).slice(0, 4).map((item, idx) => {
                    // Compute a generic percentage for visualization
                    const maxCount = Math.max(...(dashboard?.topHpoTerms || []).map(t => t.count), 1);
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{item.name}</span>
                          <span>{item.count} cases</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-650 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {(!dashboard?.topHpoTerms || dashboard.topHpoTerms.length === 0) && (
                     <p className="text-xs text-slate-500">No mapped phenotypes yet.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Cohort builder view */}
        {activeTab === 'cohort' && (
          <div className="grid grid-cols-12 gap-5 mt-5 animate-fade-in flex-1">
            
            {/* Left Column query selectors (Span 4) */}
            <div className="col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-display font-bold text-sm text-slate-850">Cohort Filters</h3>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gene Target</label>
                    <input 
                      type="text" 
                      value={geneQuery}
                      onChange={(e) => setGeneQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs focus:outline-none focus:border-indigo-500 mb-2" 
                      placeholder="e.g. DMD"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[10px] font-semibold flex items-center">
                        KCNQ2 <X className="w-3 h-3 ml-1 cursor-pointer" />
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[10px] font-semibold flex items-center">
                        SCN1A <X className="w-3 h-3 ml-1 cursor-pointer" />
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phenotypic Symptom</label>
                    <input 
                      type="text" 
                      value={symptomQuery}
                      onChange={(e) => setSymptomQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs focus:outline-none focus:border-indigo-500 mb-2" 
                      placeholder="e.g. Epilepsy"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-semibold flex items-center">
                        Epilepsy <X className="w-3 h-3 ml-1 cursor-pointer" />
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-semibold flex items-center">
                        Developmental Delay <X className="w-3 h-3 ml-1 cursor-pointer" />
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Age Span</span>
                      <span className="font-bold text-indigo-600">{ageMin} - {ageMax} yrs</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="number" 
                        value={ageMin} 
                        onChange={(e) => setAgeMin(Number(e.target.value))}
                        className="px-2 py-1 bg-slate-50 border border-slate-250 rounded-lg text-xs text-center focus:outline-none" 
                      />
                      <input 
                        type="number" 
                        value={ageMax} 
                        onChange={(e) => setAgeMax(Number(e.target.value))}
                        className="px-2 py-1 bg-slate-50 border border-slate-250 rounded-lg text-xs text-center focus:outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Treatment Criteria</label>
                    <select className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs focus:outline-none">
                      <option>Any Treatment Status</option>
                      <option>Untreated</option>
                      <option>Under Active Treatment</option>
                    </select>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSearchCohort}
                disabled={isSearching}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                {isSearching ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{isSearching ? 'Executing Query...' : 'Run Cohort Search'}</span>
              </button>
            </div>

            {/* Right Column query results (Span 8) */}
            <div className="col-span-8 flex flex-col justify-between min-h-0 space-y-4">
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex-1 flex flex-col justify-center text-center space-y-4">
                {!searchRun && !isSearching && (
                  <div className="space-y-2 py-12">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto border border-slate-200">
                      <Database className="w-6 h-6 text-slate-400" />
                    </div>
                    <h4 className="font-display font-bold text-slate-800 text-sm">Awaiting Search Query</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Enter filters on the left panel to compile dynamic patient aggregates across our secure de-identified database.
                    </p>
                  </div>
                )}

                {isSearching && (
                  <div className="space-y-3 py-12">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full mx-auto" />
                    <h4 className="font-display font-bold text-slate-800 text-sm">Querying Federated Nodes...</h4>
                    <p className="text-xs text-slate-400">Consolidating metadata matching Gene: {geneQuery} and Symptom: {symptomQuery}</p>
                  </div>
                )}

                {searchRun && !isSearching && (
                  <div className="text-left space-y-5 animate-fade-in flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="font-display font-bold text-slate-800 text-base">Cohort Summary</h4>
                          <p className="text-xs text-slate-400">Total matched: <span className="font-bold text-indigo-600">{cohortTotal ?? 0} de-identified patient files</span></p>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
                          Highly Correlated Cluster Found
                        </span>
                      </div>

                      {/* Bar charts demographics */}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Age Demographics</p>
                          <div className="space-y-2">
                            {[
                              { label: '2 - 5 yrs', pct: 60 },
                              { label: '6 - 9 yrs', pct: 30 },
                              { label: '10 - 12 yrs', pct: 10 }
                            ].map((a, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <span className="w-16 font-medium text-slate-650">{a.label}</span>
                                <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden mx-2">
                                  <div className="bg-indigo-650 h-full rounded-full" style={{ width: `${a.pct}%` }} />
                                </div>
                                <span className="w-8 text-right font-bold text-slate-700">{a.pct}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Gender Demographics</p>
                          <div className="space-y-2">
                            {[
                              { label: 'Female', pct: 52 },
                              { label: 'Male', pct: 45 },
                              { label: 'Other', pct: 3 }
                            ].map((g, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <span className="w-16 font-medium text-slate-650">{g.label}</span>
                                <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden mx-2">
                                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${g.pct}%` }} />
                                </div>
                                <span className="w-8 text-right font-bold text-slate-700">{g.pct}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons cohort */}
                    <div className="flex space-x-3 pt-3 border-t border-slate-100 flex-shrink-0">
                      <button 
                        onClick={handleExport}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-lg text-xs shadow-md transition flex items-center justify-center space-x-1.5"
                      >
                        {exportComplete ? <CheckCircle2 className="w-4 h-4 text-white" /> : <ArrowDownToLine className="w-4.5 h-4.5" />}
                        <span>{exportComplete ? 'Cohort Exported' : 'Export Anonymous Cohort (CSV)'}</span>
                      </button>
                      <button className="px-4 py-2.5 border border-slate-255 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition">
                        Save Cohort Criteria
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* API access settings view */}
        {activeTab === 'api' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mt-5 animate-fade-in space-y-4">
            <h3 className="font-display font-bold text-slate-800 text-sm">Federated API Authorization</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Use cryptographic tokens to securely integrate de-identified genomic streams directly into external NLP engines and biological databases. All requests are logged under HIPAA auditing compliance structures.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Production Auth Key</span>
                <span className="text-[9px] bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded uppercase font-semibold">Active</span>
              </div>
              <div className="flex space-x-2">
                <input 
                  type="password" 
                  readOnly 
                  value="lm_prod_ea823b129cd41efab8b21c" 
                  className="flex-1 px-3 py-2 bg-white border border-slate-250 rounded-lg text-xs font-mono text-slate-500 focus:outline-none" 
                />
                <button className="px-3 bg-slate-200 hover:bg-slate-250 text-slate-700 rounded-lg text-xs font-semibold transition">
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extra active tabs empty states */}
        {!loading && ['analysis', 'datasets', 'publications'].includes(activeTab) && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 mt-5">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
              <Compass className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-800 capitalize">{activeTab}</h3>
            <p className="text-sm mt-2 max-w-sm text-center">This research module is currently being provisioned. Please check back later.</p>
          </div>
        )}

      </main>
    </div>
  );
};
