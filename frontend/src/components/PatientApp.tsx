import React, { useState } from 'react';
import { 
  Heart, Calendar, FileText, Users, User, ArrowRight, Plus, 
  ChevronRight, Award, Compass, ShieldAlert,
  ChevronLeft, Sparkles, Download, CheckCircle2
} from 'lucide-react';
import type { SharedState } from '../types';

interface PatientAppProps {
  state: SharedState;
  setState: React.Dispatch<React.SetStateAction<SharedState>>;
}

export const PatientApp: React.FC<PatientAppProps> = ({ state, setState }) => {
  const [currentTab, setCurrentTab] = useState<'home' | 'journey' | 'records' | 'community' | 'profile'>('home');
  const [step, setStep] = useState<number>(state.patientProfile.isCompleted ? 3 : 1);
  
  // Local state for profile creation form
  const [formName, setFormName] = useState(state.patientProfile.name || 'Sarah Johnson');
  const [formAge, setFormAge] = useState(state.patientProfile.age || 12);
  const [formGender, setFormGender] = useState(state.patientProfile.gender || 'Female');
  const [formCountry, setFormCountry] = useState(state.patientProfile.country || 'United States');
  
  // Local state for daily check-in form
  const [checkinPain, setCheckinPain] = useState(3);
  const [checkinFatigue, setCheckinFatigue] = useState(6);
  const [checkinMobility, setCheckinMobility] = useState(5);
  const [checkinSleep, setCheckinSleep] = useState(4);
  const [checkinMood, setCheckinMood] = useState(8);
  const [checkinSaved, setCheckinSaved] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Local state for custom record file upload
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('PDF');
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateProfile = () => {
    setState(prev => ({
      ...prev,
      patientProfile: {
        name: formName,
        age: formAge,
        gender: formGender,
        country: formCountry,
        status: 'Undiagnosed',
        isCompleted: true
      },
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          action: 'Profile Created',
          user: formName,
          details: `Patient registered: ${formName}, ${formAge}y/o ${formGender} from ${formCountry}.`
        },
        ...prev.auditLogs
      ]
    }));
    setStep(3); // Go to home dashboard
  };

  const handleSaveCheckin = () => {
    const newLog = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pain: checkinPain,
      fatigue: checkinFatigue,
      mobility: checkinMobility,
      sleep: checkinSleep,
      mood: checkinMood
    };
    setState(prev => ({
      ...prev,
      symptomLogs: [newLog, ...prev.symptomLogs],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          action: 'Symptom Check-in Saved',
          user: state.patientProfile.name || 'Patient',
          details: `Symptom entry: Pain ${checkinPain}/10, Fatigue ${checkinFatigue}/10, Mobility ${checkinMobility}/10.`
        },
        ...prev.auditLogs
      ]
    }));
    setCheckinSaved(true);
    setTimeout(() => {
      setCheckinSaved(false);
      setIsCheckingIn(false);
      setCurrentTab('journey'); // Navigate to timeline to see history
    }, 1200);
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) return;
    setIsUploading(true);
    setTimeout(() => {
      const newFile = {
        id: `file-${Date.now()}`,
        name: uploadName.endsWith('.pdf') || uploadName.endsWith('.png') || uploadName.endsWith('.jpg') ? uploadName : `${uploadName}.pdf`,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        type: uploadType,
        size: `${(Math.random() * 5 + 1).toFixed(1)} MB`
      };
      setState(prev => ({
        ...prev,
        uploadedFiles: [newFile, ...prev.uploadedFiles],
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            action: 'Document Uploaded',
            user: state.patientProfile.name || 'Patient',
            details: `Document added to Medical Vault: ${newFile.name} (${newFile.size}).`
          },
          ...prev.auditLogs
        ]
      }));
      setUploadName('');
      setIsUploading(false);
    }, 1000);
  };

  return (
    <div className="flex justify-center items-center py-6 px-4 bg-slate-100 min-h-screen">
      {/* Mobile Frame Container */}
      <div className="relative w-[375px] h-[812px] bg-slate-50 rounded-[48px] shadow-2xl border-[12px] border-slate-900 overflow-hidden flex flex-col font-sans">
        
        {/* Status Bar Indicator */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-brand-600 text-white flex justify-between items-center px-6 text-xs font-semibold z-30">
          <span>9:41</span>
          <div className="w-24 h-4 bg-black rounded-full absolute left-1/2 transform -translate-x-1/2 top-1" />
          <div className="flex items-center space-x-1">
            <span className="w-3.5 h-2.5 bg-white rounded-xs inline-block opacity-90" />
            <span className="w-2.5 h-2.5 bg-white rounded-full inline-block opacity-90" />
          </div>
        </div>

        {/* Step 1: Onboarding Landing */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-between px-6 pt-16 pb-8 bg-gradient-to-b from-brand-600 to-indigo-900 text-white text-center z-10">
            <div className="flex flex-col items-center mt-6">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                <Sparkles className="w-8 h-8 text-blue-300" />
              </div>
              <h1 className="font-display font-extrabold text-3xl tracking-tight">LUMEN</h1>
              <p className="text-blue-200 text-sm mt-1">Rare Disease Diagnostic Intelligence</p>
            </div>

            <div className="flex flex-col items-center px-4">
              <div className="w-48 h-48 bg-blue-500/10 rounded-full flex items-center justify-center border border-white/10 relative overflow-hidden animate-pulse-subtle">
                <Heart className="w-24 h-24 text-blue-300 opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-400/20 to-transparent rotate-45" />
              </div>
              <h2 className="font-display font-bold text-xl mt-6">Your journey to answers starts here.</h2>
              <p className="text-blue-100 text-xs mt-2 px-2">
                Empowering rare disease patients and clinicians with clinical-grade phenotype-genotype tracking.
              </p>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-white text-brand-700 font-bold rounded-xl shadow-lg hover:bg-blue-50 active:scale-98 transition flex items-center justify-center space-x-2 text-sm"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Create Profile */}
        {step === 2 && (
          <div className="flex-1 flex flex-col justify-between px-6 pt-16 pb-8 bg-white text-slate-800 z-10 overflow-y-auto">
            <div>
              <button onClick={() => setStep(1)} className="flex items-center text-slate-500 text-xs font-semibold hover:text-slate-700 mb-4">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="font-display font-extrabold text-2xl text-slate-900 leading-tight">Create Profile</h2>
              <p className="text-xs text-slate-500 mt-1">Provide basic information to configure the diagnostics engine.</p>
              
              {/* Progress dots */}
              <div className="flex space-x-1.5 mt-4">
                <div className="w-4 h-1.5 bg-brand-500 rounded-full" />
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500" 
                    placeholder="Sarah Johnson"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Age</label>
                    <input 
                      type="number" 
                      value={formAge}
                      onChange={(e) => setFormAge(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500" 
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                    <select 
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                    >
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Country</label>
                  <input 
                    type="text" 
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500" 
                    placeholder="United States"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Clinical Status</label>
                  <div className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Searching for a diagnosis (Undiagnosed)</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleCreateProfile}
              className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-600 active:scale-98 transition flex items-center justify-center space-x-2 text-sm mt-6"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Authenticated Screens */}
        {step === 3 && (
          <>
            {/* Top Header */}
            <div className="pt-10 pb-4 px-5 bg-white border-b border-slate-100 flex justify-between items-center z-10 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-display font-extrabold text-sm shadow-md">
                  L
                </div>
                <span className="font-display font-extrabold text-lg text-slate-900 tracking-tight">LUMEN</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80" alt="Sarah" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Screen Viewer Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-20">

              {/* TAB 1: HOME */}
              {currentTab === 'home' && !isCheckingIn && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Good Morning / User Greeting */}
                  <div>
                    <h3 className="font-display font-bold text-xl text-slate-800">Good Morning, {state.patientProfile.name.split(' ')[0]} 👋</h3>
                    <p className="text-xs text-slate-500">Your diagnostics dashboard is up to date.</p>
                  </div>

                  {/* Diagnosis / AI Intelligence Card */}
                  <div className="bg-gradient-to-br from-brand-600 to-indigo-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-0.5 bg-blue-400/20 text-blue-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Potential Diagnosis
                        </span>
                        <h4 className="font-display font-bold text-lg mt-1.5 leading-tight">
                          Duchenne Muscular Dystrophy
                        </h4>
                      </div>
                      
                      {/* Percent match */}
                      <div className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20">
                        <span className="text-xl font-display font-extrabold text-blue-100">89%</span>
                        <span className="text-[8px] text-blue-200 uppercase tracking-wider font-semibold">Confidence</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                      <div>
                        <p className="text-blue-200 text-[10px] uppercase font-bold">Recommended Next Step</p>
                        <p className="font-medium text-white mt-0.5">Schedule genetic consultation</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-200" />
                    </div>
                  </div>

                  {/* Daily Check-in Card */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Today's Check-in</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Log symptoms to update the AI models.</p>
                      </div>
                      <button 
                        onClick={() => setIsCheckingIn(true)}
                        className="px-3.5 py-1.5 bg-brand-50 text-brand-600 text-xs font-bold rounded-lg hover:bg-brand-100 transition"
                      >
                        Start
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2 mt-4">
                      {['Pain', 'Fatigue', 'Mobility', 'Sleep', 'Mood'].map((sym, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                          <p className="text-[10px] text-slate-500 font-medium">{sym}</p>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">
                            {state.symptomLogs.length > 0 
                              ? state.symptomLogs[0][sym.toLowerCase() as keyof typeof state.symptomLogs[0]]
                              : '-'
                            }/10
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Insight Snippet */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-indigo-900 text-xs">AI Insight</h5>
                      <p className="text-xs text-indigo-700 mt-0.5">
                        Your symptom logs show a 12% increase in muscle fatigue over the last 30 days. We recommend reviewing this trend with Dr. Patel during your next appointment.
                      </p>
                      <button 
                        onClick={() => setCurrentTab('journey')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-2 flex items-center"
                      >
                        View Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Records summary */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-800 text-sm">Recent Vault Files</h4>
                      <button onClick={() => setCurrentTab('records')} className="text-brand-600 text-xs font-bold hover:underline">
                        View All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {state.uploadedFiles.slice(0, 2).map(file => (
                        <div key={file.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <FileText className="w-4.5 h-4.5 text-slate-500 flex-shrink-0" />
                            <span className="text-xs font-medium text-slate-800 truncate">{file.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase shrink-0">{file.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scheduled Appointment card */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <h4 className="font-bold text-slate-800 text-xs mb-3">Upcoming Consultation</h4>
                    <div className="flex items-center space-x-3 p-3 bg-brand-50/50 border border-brand-50 rounded-xl">
                      <Calendar className="w-8 h-8 text-brand-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Genetic Counseling</p>
                        <p className="text-[10px] text-slate-500">Dr. Meera Nair • May 24, 2024 at 10:30 AM</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Symptom checkin sub-view */}
              {isCheckingIn && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 animate-fade-in space-y-5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="font-display font-bold text-lg text-slate-800">Symptom Check-in</h3>
                    <button 
                      onClick={() => setIsCheckingIn(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  {checkinSaved ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
                      <h4 className="font-bold text-slate-850">Logs Saved!</h4>
                      <p className="text-xs text-slate-500">AI analysis is updating in the background.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500">Rate your current symptoms from 0 (none) to 10 (severe):</p>
                      
                      {[
                        { label: 'Muscle Pain', val: checkinPain, setVal: setCheckinPain },
                        { label: 'Fatigue / Weakness', val: checkinFatigue, setVal: setCheckinFatigue },
                        { label: 'Mobility Impairment', val: checkinMobility, setVal: setCheckinMobility },
                        { label: 'Sleep Disruption', val: checkinSleep, setVal: setCheckinSleep },
                        { label: 'Mood / Well-being', val: checkinMood, setVal: setCheckinMood }
                      ].map((slider, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>{slider.label}</span>
                            <span className="text-brand-600">{slider.val}/10</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="10" 
                            value={slider.val}
                            onChange={(e) => slider.setVal(Number(e.target.value))}
                            className="w-full accent-brand-500 bg-slate-150 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      ))}

                      <button
                        onClick={handleSaveCheckin}
                        className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/10 hover:bg-brand-600 transition text-sm flex justify-center items-center"
                      >
                        Save Check-in
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: JOURNEY TIMELINE */}
              {currentTab === 'journey' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h3 className="font-display font-bold text-xl text-slate-800">Your Diagnostic Journey</h3>
                    <p className="text-xs text-slate-500">Timeline of clinical events and diagnostic markers.</p>
                  </div>

                  {/* Vertical Stepper timeline */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs relative">
                    <div className="absolute left-[33px] top-8 bottom-8 w-0.5 bg-slate-200" />
                    
                    <div className="space-y-6">
                      
                      {/* Current Stage */}
                      <div className="flex items-start space-x-4 relative z-10">
                        <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs ring-4 ring-brand-100 flex-shrink-0 animate-pulse">
                          ●
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wide">Current Stage</span>
                          <h4 className="font-bold text-slate-800 text-sm mt-0.5">Variant Prioritization Pipeline</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Your exome sequencing VCF file is queued for variant prioritisation against structured HPO phenotypes.
                          </p>
                        </div>
                      </div>

                      {/* Genetic Test upload */}
                      <div className="flex items-start space-x-4 relative z-10">
                        <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {state.genomicData.status === 'completed' ? '✓' : 'G'}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">May 2026</span>
                          <h4 className="font-bold text-slate-800 text-sm mt-0.5">Whole Exome Sequencing (WES)</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Genomic sample collected at Stanford Rare Disease Lab. Upload status:{' '}
                            <span className="font-semibold text-indigo-700 capitalize">
                              {state.genomicData.status === 'completed' ? 'processed' : 'pending upload'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* MRI scan */}
                      <div className="flex items-start space-x-4 relative z-10">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          ✓
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Apr 2026</span>
                          <h4 className="font-bold text-slate-800 text-sm mt-0.5">Lower Limb Muscle MRI</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Showed early fatty replacement of pelvic girdle muscles, a hallmark phenotype matching congenital muscle disorders.
                          </p>
                        </div>
                      </div>

                      {/* Symptoms Started */}
                      <div className="flex items-start space-x-4 relative z-10">
                        <div className="w-7 h-7 rounded-full bg-slate-400 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          ✓
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Jan 2025</span>
                          <h4 className="font-bold text-slate-800 text-sm mt-0.5">Onset of Proximal Muscle Weakness</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Initial observation of difficulty climbing stairs and Gowers' sign. Daily logs initialized.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Symptom Trend Line Graph placeholder */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <h4 className="font-bold text-slate-800 text-xs mb-3">Symptom Severity Logs</h4>
                    <div className="h-32 flex items-end justify-between space-x-2 pt-4 px-2 bg-slate-50 rounded-xl">
                      {state.symptomLogs.length > 0 ? (
                        state.symptomLogs.slice().reverse().map((log, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center space-y-1">
                            <div className="flex space-x-0.5 w-full items-end justify-center h-16">
                              <div className="w-1.5 bg-red-400 rounded-t-sm" style={{ height: `${log.pain * 10}%` }} title="Pain" />
                              <div className="w-1.5 bg-amber-400 rounded-t-sm" style={{ height: `${log.fatigue * 10}%` }} title="Fatigue" />
                              <div className="w-1.5 bg-blue-400 rounded-t-sm" style={{ height: `${log.mobility * 10}%` }} title="Mobility" />
                            </div>
                            <span className="text-[8px] text-slate-400 font-semibold">{log.date}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs h-full pb-4">
                          No symptom logs recorded yet.
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center space-x-4 mt-3 text-[9px] font-bold text-slate-500">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-red-400 rounded-full" />
                        <span>Pain</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-amber-400 rounded-full" />
                        <span>Fatigue</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full" />
                        <span>Mobility</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RECORDS VAULT */}
              {currentTab === 'records' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h3 className="font-display font-bold text-xl text-slate-800">Medical Vault</h3>
                    <p className="text-xs text-slate-500">Secure end-to-end encrypted clinical reports.</p>
                  </div>

                  {/* Upload Form */}
                  <form onSubmit={handleFileUpload} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs">Add New Record</h4>
                    <div className="flex space-x-2">
                      <input 
                        type="text"
                        placeholder="Milli Report, Lab Results..."
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-500"
                      />
                      <select 
                        value={uploadType} 
                        onChange={(e) => setUploadType(e.target.value)}
                        className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                      >
                        <option>PDF</option>
                        <option>JPG</option>
                        <option>PNG</option>
                        <option>DICOM</option>
                      </select>
                      <button 
                        type="submit" 
                        disabled={isUploading || !uploadName}
                        className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:bg-slate-350 transition flex items-center justify-center"
                      >
                        {isUploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </form>

                  {/* List of Files */}
                  <div className="space-y-2">
                    {state.uploadedFiles.map(file => (
                      <div key={file.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center shadow-xs">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100 flex-shrink-0">
                            <FileText className="w-5 h-5 text-brand-500" />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-800 text-xs truncate">{file.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{file.date} • {file.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wide">
                            {file.type}
                          </span>
                          <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Medical Vault Storage Meter */}
                  <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                      <span>Encrypted Vault Space</span>
                      <span>14.2 MB / 250 MB</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-brand-500 h-full rounded-full" style={{ width: '5.6%' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: COMMUNITY MATCHING */}
              {currentTab === 'community' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h3 className="font-display font-bold text-xl text-slate-800">Support Communities</h3>
                    <p className="text-xs text-slate-500">Connect with patient groups of similar phenotypes.</p>
                  </div>

                  {/* Joined Community Card */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Muscular Dystrophy Support Network</h4>
                        <p className="text-xs text-slate-500 mt-0.5">4,321 Members Active</p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold border border-emerald-100">
                        Joined
                      </span>
                    </div>

                    <div className="flex -space-x-2 overflow-hidden mt-3">
                      {[
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=50&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80'
                      ].map((img, idx) => (
                        <img key={idx} src={img} className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-white" alt="member" />
                      ))}
                      <div className="inline-block h-6.5 w-6.5 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-[9px] text-slate-500 font-bold font-display">
                        +4k
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Recent Discussions</p>
                      
                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">Living with DMD</span>
                          <span className="text-[9px] text-slate-400">2h ago</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          Sharing some helpful orthotics tips we found useful duringSarah's recent check-up. Feel free to read our post...
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">Physiotherapy tips</span>
                          <span className="text-[9px] text-slate-400">5h ago</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          Gentle exercises recommended by our neuromuscular clinic that target pelvic belt weakness without overexertion.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Trial Finder */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-800 text-sm">Matched Clinical Trials</h4>
                      <Award className="w-4.5 h-4.5 text-brand-500" />
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 bg-brand-50/30 border border-brand-100 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 text-xs">Trial A: Duchenne Gene Therapy</span>
                          <span className="px-2 py-0.5 bg-brand-100 text-brand-600 rounded text-[9px] font-bold">
                            92% Match
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">Phase 2 • Recruiting • Nationwide Children's Hospital</p>
                      </div>

                      <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 text-xs">Trial B: Exon Skipping Therapy</span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px] font-bold">
                            81% Match
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">Phase 3 • Recruiting • Stanford Medical Center</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PROFILE */}
              {currentTab === 'profile' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <h3 className="font-display font-bold text-xl text-slate-800">Patient Profile</h3>
                    <p className="text-xs text-slate-500">Your registered clinical data profile.</p>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-sm">
                      <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80" alt="Sarah" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base text-slate-800">{state.patientProfile.name}</h4>
                      <p className="text-xs text-slate-500">{state.patientProfile.age} years • {state.patientProfile.gender}</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                      {state.patientProfile.status}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-55 bg-slate-50/50 px-2 rounded-lg">
                      <span className="text-slate-500 font-medium">Location</span>
                      <span className="font-bold text-slate-850">{state.patientProfile.country}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-55 bg-slate-50/50 px-2 rounded-lg">
                      <span className="text-slate-500 font-medium">Phenotype Terms (HPO)</span>
                      <span className="font-bold text-brand-650">HP:0003707, HP:0001256</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-55 bg-slate-50/50 px-2 rounded-lg">
                      <span className="text-slate-500 font-medium">Genomic Sample</span>
                      <span className="font-bold text-slate-850">sample_SJ.vcf ({state.genomicData.status})</span>
                    </div>
                    <div className="flex justify-between py-2 bg-slate-50/50 px-2 rounded-lg">
                      <span className="text-slate-500 font-medium">Consent Status</span>
                      <span className="font-bold text-emerald-600 flex items-center">
                        <Compass className="w-3.5 h-3.5 mr-1" /> Active Research Consent
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        patientProfile: {
                          name: '',
                          age: 12,
                          gender: 'Female',
                          country: 'United States',
                          status: 'Undiagnosed',
                          isCompleted: false
                        }
                      }));
                      setStep(2);
                    }}
                    className="w-full py-3 border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 font-bold rounded-xl text-xs transition"
                  >
                    Reset Profile
                  </button>
                </div>
              )}

            </div>

            {/* Bottom Tab Bar Navigation */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex justify-around items-center px-4 z-20">
              <button 
                onClick={() => { setCurrentTab('home'); setIsCheckingIn(false); }}
                className={`flex flex-col items-center space-y-1 ${currentTab === 'home' ? 'text-brand-500' : 'text-slate-400 hover:text-slate-650'}`}
              >
                <Heart className="w-5 h-5" />
                <span className="text-[9px] font-bold tracking-wide">Home</span>
              </button>

              <button 
                onClick={() => { setCurrentTab('journey'); setIsCheckingIn(false); }}
                className={`flex flex-col items-center space-y-1 ${currentTab === 'journey' ? 'text-brand-500' : 'text-slate-400 hover:text-slate-650'}`}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-[9px] font-bold tracking-wide">Journey</span>
              </button>

              <button 
                onClick={() => { setCurrentTab('records'); setIsCheckingIn(false); }}
                className={`flex flex-col items-center space-y-1 ${currentTab === 'records' ? 'text-brand-500' : 'text-slate-400 hover:text-slate-650'}`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-[9px] font-bold tracking-wide">Records</span>
              </button>

              <button 
                onClick={() => { setCurrentTab('community'); setIsCheckingIn(false); }}
                className={`flex flex-col items-center space-y-1 ${currentTab === 'community' ? 'text-brand-500' : 'text-slate-400 hover:text-slate-650'}`}
              >
                <Users className="w-5 h-5" />
                <span className="text-[9px] font-bold tracking-wide">Community</span>
              </button>

              <button 
                onClick={() => { setCurrentTab('profile'); setIsCheckingIn(false); }}
                className={`flex flex-col items-center space-y-1 ${currentTab === 'profile' ? 'text-brand-500' : 'text-slate-400 hover:text-slate-650'}`}
              >
                <User className="w-5 h-5" />
                <span className="text-[9px] font-bold tracking-wide">Profile</span>
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
