import React, { useState } from 'react';
import { 
  Globe, Database, Key, Search, Compass, ArrowDownToLine, Filter, UserCheck, CheckCircle2
} from 'lucide-react';
import type { SharedState } from '../types';

interface ResearchPortalProps {
  state: SharedState;
  setState: React.Dispatch<React.SetStateAction<SharedState>>;
}

export const ResearchPortal: React.FC<ResearchPortalProps> = ({ state: _state, setState }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'cohort' | 'api'>('overview');
  const [geneQuery, setGeneQuery] = useState('KCNQ2');
  const [symptomQuery, setSymptomQuery] = useState('Epilepsy');
  const [ageMin, setAgeMin] = useState(2);
  const [ageMax, setAgeMax] = useState(12);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchRun, setSearchRun] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleSearchCohort = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setSearchRun(true);
      
      setState(prev => ({
        ...prev,
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            action: 'Cohort Query Executed',
            user: 'Researcher Portal',
            details: `Federated query run: Gene=${geneQuery}, Symptom=${symptomQuery}, AgeRange=${ageMin}-${ageMax}. 247 results.`
          },
          ...prev.auditLogs
        ]
      }));
    }, 1200);
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
              { id: 'api', label: 'Federated API Access', icon: Key }
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

        {/* Dynamic Screens */}
        {activeTab === 'overview' && (
          <div className="space-y-6 mt-5 animate-fade-in flex-1">
            
            {/* Cohort Stats banner cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Ingested Genomes', val: '3.4M+', desc: 'Across 12 medical networks', color: 'border-indigo-100 bg-indigo-50/30' },
                { label: 'Structured Phenotypes', val: '12,000+', desc: 'HPO ontology terms mapped', color: 'border-emerald-100 bg-emerald-50/30' },
                { label: 'Active Countries', val: '42 Countries', desc: 'Federated global coverage', color: 'border-blue-100 bg-blue-50/30' }
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
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center relative overflow-hidden">
                  <svg className="w-full h-full text-slate-300" viewBox="0 0 800 400" fill="currentColor">
                    {/* Simplified World outlines path */}
                    <path d="M150,150 Q180,130 200,160 T250,120 T300,180 T350,140 T400,200 T450,160 T500,220 T550,180 T600,240 T700,200 Z" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4" />
                    {/* Circle indicators representing global data hubs */}
                    <circle cx="200" cy="160" r="18" className="fill-indigo-500/20 stroke-indigo-500 stroke-2 animate-pulse" />
                    <circle cx="350" cy="140" r="10" className="fill-indigo-500/20 stroke-indigo-500 stroke-2" />
                    <circle cx="500" cy="220" r="22" className="fill-indigo-500/20 stroke-indigo-500 stroke-2 animate-pulse" />
                    <circle cx="650" cy="180" r="8" className="fill-indigo-500/20 stroke-indigo-500 stroke-2" />
                  </svg>
                  
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 text-[10px] space-y-1">
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
                  <h3 className="font-display font-bold text-slate-800 text-sm mb-3">Top Ingested Gene Variants</h3>
                  <p className="text-xs text-slate-500 mb-4">Breakdown of the highest prioritized disease targets across the network.</p>
                </div>
                
                <div className="space-y-4">
                  {[
                    { gene: 'KCNQ2 (Epileptic Encephalopathy)', pct: 42, count: '1,428 cases' },
                    { gene: 'SCN1A (Dravet Syndrome)', pct: 28, count: '952 cases' },
                    { gene: 'CDKL5 (Rett-like Disorder)', pct: 18, count: '612 cases' },
                    { gene: 'STXBP1 (Infantile Spasms)', pct: 12, count: '408 cases' }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{item.gene}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-650 h-full rounded-full" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs focus:outline-none focus:border-indigo-500" 
                      placeholder="e.g. DMD"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phenotypic Symptom</label>
                    <input 
                      type="text" 
                      value={symptomQuery}
                      onChange={(e) => setSymptomQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs focus:outline-none focus:border-indigo-500" 
                      placeholder="e.g. Epilepsy"
                    />
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
                          <p className="text-xs text-slate-400">Total matched: <span className="font-bold text-indigo-600">247 de-identified patient files</span></p>
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

      </main>
    </div>
  );
};
