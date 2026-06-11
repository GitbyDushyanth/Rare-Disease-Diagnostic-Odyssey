import React from 'react';
import { ArrowRight, Activity, Database, Shield, Dna, Brain, Globe } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              LUMEN
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <a href="#platform" className="hover:text-white transition">Platform</a>
            <a href="#solutions" className="hover:text-white transition">Solutions</a>
            <a href="#compliance" className="hover:text-white transition">Compliance</a>
            <a href="#about" className="hover:text-white transition">About</a>
          </div>
          <button 
            onClick={onGetStarted}
            className="px-6 py-2.5 bg-white text-slate-950 font-bold rounded-full hover:bg-slate-200 transition shadow-lg shadow-white/10 active:scale-95"
          >
            Access Portal
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-brand-400 mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            <span>LUMEN OS v2.0 is now live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight mb-8 leading-[1.1]">
            The Intelligence Layer for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-500">
              Rare Disease Diagnosis
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Accelerate the diagnostic odyssey from years to days. LUMEN connects genomic sequencing, clinical NLP, and global cohorts into a unified operating system for specialists, labs, and researchers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-full transition shadow-xl shadow-brand-500/25 flex items-center justify-center group active:scale-95"
            >
              Sign In to Workstation
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 transition backdrop-blur-sm active:scale-95"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Dashboard Preview — styled mock instead of external image */}
        <div className="mt-20 max-w-6xl mx-auto px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
            {/* Mock dashboard preview */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {['Active Cases', 'Urgent Cases', 'Avg. Resolution', 'Pending Reviews'].map((label, i) => (
                <div key={i} className="bg-slate-800/70 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{label}</p>
                  <div className="h-4 w-12 bg-slate-700 rounded mt-2 animate-pulse" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 bg-slate-800/70 rounded-xl p-3 border border-white/5 space-y-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Patient Queue</p>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/30" />
                    <div className="flex-1 h-2 bg-slate-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="col-span-2 bg-slate-800/70 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">AI Differential Diagnosis</p>
                {[85, 62, 41].map((pct, i) => (
                  <div key={i} className="mb-2">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="platform" className="py-24 bg-slate-900/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold mb-4">Unified Diagnostic Ecosystem</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Seamlessly connecting every stakeholder in the rare disease journey through secure, AI-powered specialized workspaces.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Brain, title: 'AI Clinical Copilot', desc: 'NLP-powered HPO phenotyping directly from clinical notes to suggest differential diagnoses.', color: 'text-brand-400' },
              { icon: Dna, title: 'Genomics Workstation', desc: 'Automated VCF ingestion, ACMG pathogenicity scoring, and variant prioritization.', color: 'text-purple-400' },
              { icon: Globe, title: 'Federated Research', desc: 'Global de-identified cohort builder across compliant data nodes for discovery.', color: 'text-emerald-400' },
              { icon: Activity, title: 'Clinician Dashboard', desc: 'Integrated longitudinal patient timeline and cross-specialist referral network.', color: 'text-pink-400' },
              { icon: Database, title: 'Graph Database', desc: 'Neo4j knowledge graph linking gene-disease-phenotype relationships.', color: 'text-indigo-400' },
              { icon: Shield, title: 'Enterprise Compliance', desc: 'Built-in SOC2, HIPAA, and GDPR compliance with granular audit logging.', color: 'text-slate-300' }
            ].map((feat, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition group cursor-pointer">
                <feat.icon className={`w-8 h-8 mb-4 ${feat.color}`} />
                <h3 className="text-lg font-bold mb-2 group-hover:text-brand-400 transition">{feat.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-brand-500" />
            <span className="font-display font-bold text-lg tracking-tight text-white/90">LUMEN</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} LUMEN Intelligence Platform. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">System Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
