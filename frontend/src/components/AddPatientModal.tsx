import React, { useState } from 'react';
import { X, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { register } from '../api/auth';
import { createCase } from '../api/clinician';
import type { CaseRecord } from '../api/clinician';

interface AddPatientModalProps {
  onClose: () => void;
  onSuccess: (newCase: CaseRecord) => void;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const AddPatientModal: React.FC<AddPatientModalProps> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    country: '',
    caseTitle: '',
    caseDescription: '',
    priority: 'routine' as 'routine' | 'urgent' | 'emergency',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Register the patient user account
      const user = await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: 'patient',
        country: form.country || undefined,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || undefined,
      }, false);

      // 2. Open a new case for this patient
      // The backend auto-creates a patient record on register with role=patient
      // We need the patient ID — fetch it
      const { listPatients } = await import('../api/patients');
      const patients = await listPatients(50);
      const newPatient = patients.find((p) => p.userId === user.id);

      if (!newPatient) throw new Error('Patient record not created yet. Please try again.');

      const newCase = await createCase({
        patientId: newPatient.id,
        title: form.caseTitle || `New case for ${form.fullName}`,
        description: form.caseDescription || undefined,
        priority: form.priority,
      });

      onSuccess(newCase);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-sm">Add New Patient</h2>
              <p className="text-[10px] text-slate-500">Step {step} of 2 — {step === 1 ? 'Patient Details' : 'Case Details'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-start space-x-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input
                      name="fullName"
                      required
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Jane Smith"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Address *
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="patient@email.com"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Temporary Password *
                    </label>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500 transition"
                    >
                      {GENDER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Country
                    </label>
                    <input
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      placeholder="e.g. United States"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Case Title *
                  </label>
                  <input
                    name="caseTitle"
                    required
                    value={form.caseTitle}
                    onChange={handleChange}
                    placeholder="e.g. Unexplained proximal muscle weakness"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Clinical Description
                  </label>
                  <textarea
                    name="caseDescription"
                    value={form.caseDescription}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe the presenting symptoms, relevant history, or reason for referral..."
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['routine', 'urgent', 'emergency'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                        className={`py-2 rounded-lg text-[11px] font-bold uppercase transition border ${
                          form.priority === p
                            ? p === 'emergency'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : p === 'urgent'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Summary: </span>
                  Creating patient <span className="text-brand-400 font-semibold">{form.fullName}</span> with case "
                  <span className="text-slate-200">{form.caseTitle || 'New case'}</span>"
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/30 flex items-center justify-between">
            <button
              type="button"
              onClick={step === 1 ? onClose : () => setStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              {step === 1 ? 'Cancel' : '← Back'}
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (!form.fullName || !form.email || !form.password) {
                    setError('Full name, email, and password are required.');
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition shadow-md"
              >
                Next: Case Details →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition shadow-md"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>{loading ? 'Creating Patient...' : 'Create Patient & Case'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
