import React, { useState } from 'react';
import { Activity, Globe, ShieldCheck, Sparkles, Terminal, ArrowLeft, UserPlus, LogIn, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import type { UserRole } from '../api/auth';
import { register } from '../api/auth';

interface LoginPageProps {
  onBack?: () => void;
}

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

  const ROLES: Array<{ id: UserRole; label: string; desc: string; icon: React.ElementType; color: string; bg: string }> = [
    { id: 'clinician', label: 'Clinician', desc: 'Patient management', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
    { id: 'lab', label: 'Lab Technician', desc: 'Genomic processing', icon: Terminal, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
    { id: 'researcher', label: 'Researcher', desc: 'Cohort analytics', icon: Globe, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  ];

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
        </div>

        <div className="relative">
          {/* Glow effect behind form */}
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/30 to-purple-500/30 rounded-3xl blur-xl opacity-50" />
          
          <form
            onSubmit={handleSubmit}
            className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className={`flex items-center space-x-1.5 text-sm font-bold tracking-wide transition ${!isSignUp ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <div className="w-px h-4 bg-slate-700" />
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className={`flex items-center space-x-1.5 text-sm font-bold tracking-wide transition ${isSignUp ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
              <div className="flex space-x-1">
                <span className={`w-1.5 h-1.5 rounded-full ${!isSignUp ? 'bg-brand-500 animate-pulse' : 'bg-slate-700'}`} />
                <span className={`w-1.5 h-1.5 rounded-full ${isSignUp ? 'bg-brand-500 animate-pulse' : 'bg-slate-700'}`} />
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
              {isSignUp && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={isSignUp}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                      placeholder="Dr. Jane Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    placeholder="you@hospital.org"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 px-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  {!isSignUp && (
                    <a href="#" className="text-[10px] text-brand-400 hover:text-brand-300 font-medium transition">
                      Forgot?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1 mt-6 border-t border-white/5 pt-4">
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                          role === r.id
                            ? `${r.bg} ${r.color} shadow-lg scale-105 z-10`
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <r.icon className={`w-5 h-5 mb-2 ${role === r.id ? r.color : 'text-slate-500'}`} />
                        <span className="text-[10px] font-bold">{r.label}</span>
                        <span className="text-[8px] mt-0.5 opacity-70 hidden sm:block">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                  <span>{isSignUp ? 'Create Account' : 'Authenticate'}</span>
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
