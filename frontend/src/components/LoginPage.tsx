import React, { useState } from 'react';
import { Activity, Globe, ShieldCheck, Smartphone, Sparkles, Terminal } from 'lucide-react';
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
  { role: 'patient', label: 'Patient', email: 'sarah.johnson@example.com', password: 'Patient@123', icon: Smartphone, color: 'border-brand-500/30 bg-brand-500/10 text-brand-300' },
  { role: 'clinician', label: 'Clinician', email: 'dr.patel@stanford.edu', password: 'Clinician@123', icon: Activity, color: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  { role: 'lab', label: 'Lab', email: 'lab@lumen.health', password: 'Lab@123456', icon: Terminal, color: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
  { role: 'researcher', label: 'Researcher', email: 'researcher@lumen.health', password: 'Research@123', icon: Globe, color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' },
  { role: 'admin', label: 'Admin', email: 'admin@lumen.health', password: 'Admin@123456', icon: ShieldCheck, color: 'border-pink-500/30 bg-pink-500/10 text-pink-300' },
];

export const LoginPage: React.FC = () => {
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

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        <div className="text-white space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center font-display font-extrabold text-xl shadow-lg border border-brand-500/30">
              L
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl tracking-tight">LUMEN</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rare Disease Intelligence</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-bold text-3xl leading-tight">
              Sign in to the diagnostic platform
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Connect patients, clinicians, labs, and researchers through a unified rare disease operating system.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick demo access</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:scale-105 ${account.color}`}
                >
                  <account.icon className="w-3.5 h-3.5" />
                  <span>{account.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-5"
        >
          <div className="flex items-center space-x-2 text-brand-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Secure Login</span>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                placeholder="you@hospital.org"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            JWT session · 15 min access token · HIPAA audit logging enabled
          </p>
        </form>
      </div>
    </div>
  );
};
