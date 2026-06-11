import React, { useState } from 'react';
import {
  Activity,
  Globe2,
  ShieldCheck,
  Terminal,
  ArrowLeft,
  UserPlus,
  LogIn,
  Lock,
  Mail,
  User,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import type { UserRole } from '../api/auth';
import { register } from '../api/auth';
import heroCommand from '../assets/hero-clinical-command.png';

interface LoginPageProps {
  onBack?: () => void;
}

const ROLES: Array<{ id: UserRole; label: string; desc: string; icon: React.ElementType }> = [
  { id: 'clinician', label: 'Clinician', desc: 'Patient cases', icon: Activity },
  { id: 'lab', label: 'Lab', desc: 'Genomics', icon: Terminal },
  { id: 'researcher', label: 'Research', desc: 'Cohorts', icon: Globe2 },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onBack }) => {
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('clinician');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        await register({ email, password, fullName, role });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${isSignUp ? 'Registration' : 'Login'} failed. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden lg:block overflow-hidden bg-slate-950">
          <img src={heroCommand} alt="Clinical genomics command center" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.16)_0%,rgba(2,6,23,0.86)_100%)]" />
          <div className="relative z-10 h-full flex flex-col justify-between p-10 text-white">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex w-fit items-center gap-2 text-sm font-bold text-white/80 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </button>

            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-cyan-300" />
                Secure clinical access
              </div>
              <h1 className="mt-5 font-display text-5xl font-extrabold tracking-tight leading-tight">
                Keep every diagnostic handoff in one place.
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Sign in to review cases, prioritize variants, query cohorts, and manage audit-ready workflows.
              </p>
            </div>
          </div>
        </section>

        <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center shadow-sm">
                  <Activity className="w-5 h-5 text-white" />
                </span>
                <div>
                  <div className="font-display text-xl font-extrabold tracking-tight">LUMEN</div>
                  <div className="text-xs font-semibold text-slate-500">Diagnostic Intelligence</div>
                </div>
              </div>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-950"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-extrabold transition ${
                    !isSignUp ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-extrabold transition ${
                    isSignUp ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Register
                </button>
              </div>

              <div className="mt-6">
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  {isSignUp ? 'Create workspace access' : 'Welcome back'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isSignUp ? 'Choose the role that matches your clinical workflow.' : 'Use your LUMEN account to continue.'}
                </p>
              </div>

              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 space-y-4">
                {isSignUp && (
                  <label className="block">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Full name</span>
                    <span className="mt-1.5 relative block">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={isSignUp}
                        className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                        placeholder="Dr. Jane Doe"
                      />
                    </span>
                  </label>
                )}

                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Email address</span>
                  <span className="mt-1.5 relative block">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      placeholder="you@hospital.org"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Password</span>
                    {!isSignUp && (
                      <button type="button" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                        Forgot password?
                      </button>
                    )}
                  </span>
                  <span className="mt-1.5 relative block">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      placeholder="Enter password"
                    />
                  </span>
                </label>

                {isSignUp && (
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Role</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {ROLES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRole(item.id)}
                          className={`rounded-lg border p-3 text-left transition ${
                            role === item.id
                              ? 'border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="mt-2 block text-xs font-extrabold">{item.label}</span>
                          <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-200 pt-4 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> HIPAA</span>
                <span className="inline-flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" /> GDPR</span>
                <span className="inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> SOC2</span>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
