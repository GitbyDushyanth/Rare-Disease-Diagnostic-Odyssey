import React from 'react';
import {
  ArrowRight,
  Activity,
  Database,
  ShieldCheck,
  Dna,
  Brain,
  Globe2,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react';
import heroCommand from '../assets/hero-clinical-command.png';

interface LandingPageProps {
  onGetStarted: () => void;
}

const METRICS = [
  { label: 'Avg. diagnostic review', value: '48h' },
  { label: 'Genomic samples indexed', value: '2.8M' },
  { label: 'Compliant data nodes', value: '142' },
];

const WORKSPACES = [
  {
    icon: Brain,
    title: 'Clinical intelligence',
    desc: 'Transform notes, symptoms, and case history into HPO-mapped diagnostic suggestions.',
  },
  {
    icon: Dna,
    title: 'Genomics operations',
    desc: 'Prioritize variants, review ACMG evidence, and publish reports from one workstation.',
  },
  {
    icon: Globe2,
    title: 'Research network',
    desc: 'Build de-identified cohorts and export compliant datasets for discovery work.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white text-slate-950 font-sans selection:bg-brand-100">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3">
            <span className="w-9 h-9 bg-slate-950 rounded-lg flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </span>
            <span className="font-display font-extrabold text-xl tracking-tight">LUMEN</span>
          </a>

          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#platform" className="hover:text-slate-950 transition">Platform</a>
            <a href="#workspaces" className="hover:text-slate-950 transition">Workspaces</a>
            <a href="#trust" className="hover:text-slate-950 transition">Trust</a>
          </div>

          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition shadow-sm"
          >
            Access Portal
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main>
        <section className="relative min-h-[88svh] overflow-hidden bg-slate-950">
          <img
            src={heroCommand}
            alt="Clinical genomics command center"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.82)_35%,rgba(15,23,42,0.34)_68%,rgba(15,23,42,0.08)_100%)]" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[88svh] flex items-center">
            <div className="max-w-2xl py-20">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-bold text-cyan-100 uppercase tracking-wide mb-6">
                <LockKeyhole className="w-3.5 h-3.5" />
                Rare Disease Diagnostic Intelligence
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.02]">
                LUMEN
              </h1>
              <p className="mt-6 text-xl sm:text-2xl font-semibold text-white max-w-xl">
                A clinical operating system for faster rare disease diagnosis.
              </p>
              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-8 max-w-xl">
                Bring case review, genomic interpretation, research cohorts, and compliance monitoring into one secure workspace for care teams.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-sm font-extrabold rounded-lg transition shadow-lg shadow-cyan-950/30"
                >
                  Open Workstation
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#platform"
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white text-sm font-bold rounded-lg border border-white/15 transition"
                >
                  Explore Platform
                </a>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
                {METRICS.map((metric) => (
                  <div key={metric.label} className="border-l border-white/20 pl-4">
                    <div className="text-2xl font-display font-extrabold text-white">{metric.value}</div>
                    <div className="mt-1 text-[11px] leading-4 font-semibold text-slate-400">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 items-start">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-brand-600">Platform</p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                  Built for repeated clinical work, not a one-off demo.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  LUMEN keeps the operational screens dense, readable, and role-specific so clinicians, lab teams, researchers, and administrators can move quickly without losing context.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {WORKSPACES.map((item) => (
                  <div key={item.title} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                    <item.icon className="w-6 h-6 text-brand-600" />
                    <h3 className="mt-4 text-sm font-extrabold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="workspaces" className="py-16 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <p className="text-xs font-extrabold uppercase tracking-wide text-brand-600">Workflow</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950">
                  One connected diagnostic path.
                </h2>
              </div>
              <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
                {[
                  'Create a longitudinal patient case',
                  'Map phenotype evidence from symptoms and notes',
                  'Review genomic variants and confidence signals',
                  'Publish reports, referrals, and audit-ready outcomes',
                ].map((step) => (
                  <div key={step} className="flex items-start gap-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold leading-6 text-slate-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="py-12 bg-slate-950 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8 md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">Designed for secure clinical operations.</h2>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl">
                Role-based access, audit logging, and de-identified research workflows are built into the platform foundation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: ShieldCheck, label: 'HIPAA-ready' },
                { icon: Database, label: 'FHIR-aware' },
                { icon: LockKeyhole, label: 'SOC2 controls' },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-xs font-bold">
                  <item.icon className="w-4 h-4 text-cyan-300" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
