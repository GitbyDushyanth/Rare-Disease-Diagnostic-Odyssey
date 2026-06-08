import React, { useState } from 'react';
import { Activity, Globe, ShieldCheck, Smartphone, Sparkles, Terminal, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import type { UserRole } from '../api/auth';

const DEMO_ACCOUNTS: Array<{
  role: UserRole;
  label: string;
  email: string;
  password: string;
  icon: React.ElementType;
  color: string;
}> = [
  { role: 'clinician', label: 'Clinician', email: 'dr.patel@stanford.edu', password: 'Clinician@123', icon: Activity, color: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  { role: 'lab', label: 'Lab', email: 'lab@lumen.health', password: 'Lab@123456', icon: Terminal, color: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
  { role: 'researcher', label: 'Researcher', email: 'researcher@lumen.health', password: 'Research@123', icon: Globe, color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' },
  { role: 'admin', label: 'Admin', email: 'admin@lumen.health', password: 'Admin@123456', icon: ShieldCheck, color: 'border-pink-500/30 bg-pink-500/10 text-pink-300' },
];

interface LoginPageProps {
  onBack?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = async (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
    setSubmitting(true);
    try {
      await login(account.email, account.password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-subtle" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-subtle" style={{ animationDelay: '2s' }} />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="text-white space-y-8">
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-white transition group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to home</span>
            </button>
          )}

          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 border border-brand-400/30">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <span className="font-display font-extrabold text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                LUMEN
              </span>
            </div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-brand-400 uppercase tracking-wider">
              <span>System Version 2.0.4</span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-bold text-3xl leading-tight">
              Diagnostic <br/> Intelligence Portal
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Secure access to the rare disease operating system. Authentication is required to access patient data, genomic sequencing, and cohort analytics.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/10">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fast Access (Demo)</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition hover:scale-105 active:scale-95 ${account.color} bg-opacity-10 backdrop-blur-sm`}
                >
                  <account.icon className="w-3.5 h-3.5" />
                  <span>{account.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          {/* Glow effect behind form */}
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/30 to-purple-500/30 rounded-3xl blur-xl opacity-50" />
          
          <form
            onSubmit={handleSubmit}
            className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2 text-brand-400">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-bold tracking-wide">Secure Login</span>
              </div>
              <div className="flex space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    placeholder="you@hospital.org"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 px-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-[10px] text-brand-400 hover:text-brand-300 font-medium transition">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-400 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/25 active:scale-[0.98]"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate</span>
                  <Sparkles className="w-4 h-4 ml-1 opacity-70" />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-center space-x-4 text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                <span className="flex items-center"><ShieldCheck className="w-3 h-3 mr-1" /> HIPAA</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                <span className="flex items-center"><Globe className="w-3 h-3 mr-1" /> GDPR</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                <span className="flex items-center"><ShieldCheck className="w-3 h-3 mr-1" /> SOC2</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
