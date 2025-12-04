'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { showNotification } from '@mantine/notifications';
import { getAuth } from 'firebase/auth';

// --- ICONS (SVG) ---
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);
const IconArrowRight = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);
const IconChevronLeft = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
  </svg>
);

// --- UI HELPERS (defined outside to keep stable identity and prevent focus loss) ---
const Label = ({ children }) => (
  <label className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200/80 mb-1 ml-1">
    {children}
  </label>
);

const InputText = ({ value, onChange, type = 'text', placeholder = '' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-slate-50 placeholder:text-slate-500 focus:bg-slate-900/30 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200/30 outline-none transition-all shadow-md shadow-indigo-950/30"
  />
);

const SelectChip = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-all shadow-sm flex items-center justify-center gap-2 ${
      selected
        ? 'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 border-transparent text-white shadow-[0_20px_80px_rgba(99,102,241,0.35)]'
        : 'bg-white/5 border-white/10 text-slate-200 hover:border-white/20 hover:bg-white/10'
    }`}
  >
    {selected && <IconCheck />}
    {label}
  </button>
);

const RangeSlider = ({ label, value, onChange, min = 1, max = 10 }) => (
  <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
    <div className="flex justify-between mb-2">
      <span className="text-sm font-semibold text-slate-100">{label}</span>
      <span className="text-sm font-bold text-cyan-300">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={Number(value)}
      onChange={e => onChange(e.target.value)}
      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-300"
    />
  </div>
);

export default function BusinessKundliWizard() {
  const router = useRouter();
  const { user } = useAuth(); // Assuming you have this context
  const [step, setStep] = useState(3); // Starting at Screen 3 as per doc
  const [loading, setLoading] = useState(false);
  const progress = step >= 10 ? 100 : ((Math.min(step, 9) - 3) / 6) * 100;

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    // Screen 3
    personal: {
      name: user?.name || '',
      age: '',
      city: '',
      advisor_type: 'Life Insurance', // Default
      employment_type: 'Full-Time',
      experience_years: '',
      education: ''
    },
    // Screen 4
    business: {
      income_last_30: '',
      income_last_90: '',
      avg_case_size: '',
      active_clients: '',
      product_mix: [] // Multi-select
    },
    // Screen 5
    success_formula: {
      hours_per_week: 30,
      knowledge: { products: 5, planning: 5, comparison: 5, market: 5, taxation: 5 },
      skills: { communication: 5, marketing: 5, selling: 5, closing: 5, followup: 5 }
    },
    // Screen 6
    metrics: {
      leads_90_days: '',
      meetings_done: '',
      sales_completed: ''
    },
    // Screen 7
    tools: {
      use_financial_kundli: false,
      has_ppt: false,
      collect_data_professionally: false,
      social_platforms: false,
      take_testimonials: false,
      customer_events: false
    },
    // Screen 8
    mindset: {
      confidence: 5,
      consistency: 5,
      learning: 5,
      track_goals: 5,
      fear_rejection: 5
    },
    // Screen 9
    tripwire: 'None'
  });

  // --- CALCULATION HELPERS ---
  const calculateConversion = () => {
    const meetings = Number(formData.metrics.meetings_done) || 0;
    const sales = Number(formData.metrics.sales_completed) || 0;
    if (meetings === 0) return 0;
    return Math.round((sales / meetings) * 100);
  };

  // --- INPUT HANDLERS ---
  const update = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const updateNested = (section, subsection, field, value) => {
    const parsedValue = value === '' ? '' : parseInt(value, 10);
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...(subsection
          ? { [subsection]: { ...prev[section][subsection], [field]: parsedValue } }
          : { [field]: parsedValue })
      }
    }));
  };

  const toggleProductMix = (product) => {
    setFormData(prev => {
      const list = prev.business.product_mix;
      const newList = list.includes(product)
        ? list.filter(p => p !== product)
        : [...list, product];
      return { ...prev, business: { ...prev.business, product_mix: newList } };
    });
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    setStep(10); // Show Processing Screen
    setLoading(true);

    try {
       const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
      console.log('Submitting Business Kundli Data:', formData); // Debug log
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kundli/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' , Authorization: `Bearer ${token}`,},
        body: JSON.stringify(formData)
      }); 
      const result = await response.json();

      if (result.success) {
        setTimeout(() => {
          router.push(`/business-kundli/report?id=${result.reportId}`);
        }, 2000);
      }
    } catch (e) {
      setStep(9); // Go back if error
      setLoading(false);
      showNotification({ title: 'Error', message: 'Could not generate report.', color: 'red' });
    }
  };

  // --- UI COMPONENTS ---
  // UI helpers are defined above the component to keep identity stable.

  // --- SCREEN RENDERER ---
  const renderScreen = () => {
    switch (step) {
      // SCREEN 3 — Basic Details
      case 3:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-white">Let's start with You.</h2>
              <p className="text-slate-300">Basic professional details.</p>
            </div>

            <div>
              <Label>Full Name</Label>
              <InputText value={formData.personal.name} onChange={e => update('personal', 'name', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Age</Label>
                <InputText type="number" value={formData.personal.age} onChange={e => update('personal', 'age', e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <InputText value={formData.personal.city} onChange={e => update('personal', 'city', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Advisor Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Life Insurance', 'Health Insurance', 'Mutual Fund', 'Leader', 'Hybrid'].map(t => (
                  <SelectChip key={t} label={t} selected={formData.personal.advisor_type === t} onClick={() => update('personal', 'advisor_type', t)} />
                ))}
              </div>
            </div>

            <div>
              <Label>Employment</Label>
              <div className="flex gap-2 mt-1">
                {['Full-Time', 'Part-Time'].map(t => (
                  <SelectChip key={t} label={t} selected={formData.personal.employment_type === t} onClick={() => update('personal', 'employment_type', t)} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Experience (Yrs)</Label>
                <InputText type="number" value={formData.personal.experience_years} onChange={e => update('personal', 'experience_years', e.target.value)} />
              </div>
              <div>
                <Label>Education</Label>
                <InputText value={formData.personal.education} onChange={e => update('personal', 'education', e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
        );

      // SCREEN 4 — Business Snapshot
      case 4:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-white">Business Health</h2>
              <p className="text-slate-300">Your current financial numbers.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Last 30 Days Income</Label>
                <InputText type="number" value={formData.business.income_last_30} onChange={e => update('business', 'income_last_30', e.target.value)} />
              </div>
              <div>
                <Label>Last 90 Days Income</Label>
                <InputText type="number" value={formData.business.income_last_90} onChange={e => update('business', 'income_last_90', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                {/* ✅ FIXED: Label updated to reflect Money/Amount */}
                <Label>Avg Ticket Size (₹)</Label>
                {/* ✅ FIXED: Bound to avg_case_size */}
                <InputText 
                    type="number" 
                    placeholder="e.g. 25000"
                    value={formData.business.avg_case_size} 
                    onChange={e => update('business', 'avg_case_size', e.target.value)} 
                />
              </div>
              <div>
                <Label>Active Clients</Label>
                <InputText type="number" value={formData.business.active_clients} onChange={e => update('business', 'active_clients', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Product Mix (Select all that apply)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Life Insurance', 'Health Insurance', 'SIP/MF', 'Term', 'ULIP', 'Policy Review', 'Group Insurance'].map(p => (
                  <SelectChip key={p} label={p} selected={formData.business.product_mix.includes(p)} onClick={() => toggleProductMix(p)} />
                ))}
              </div>
            </div>
          </div>
        );

      // SCREEN 5 — Success Formula Inputs
      case 5:
        return (
          <div className="space-y-6 animate-fadeIn pb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Success Formula</h2>
              <p className="text-slate-300">Time, Knowledge & Skills.</p>
            </div>

            {/* Time */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
              <Label>Time Investment (Hours/Week)</Label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={formData.success_formula.hours_per_week}
                  onChange={e => updateNested('success_formula', null, 'hours_per_week', e.target.value)}
                  className="flex-1 h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-fuchsia-300"
                />
                <span className="text-xl font-bold text-fuchsia-200 w-12 text-center">{formData.success_formula.hours_per_week}</span>
              </div>
            </div>

            {/* Knowledge */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Knowledge (Self-Rate 1-10)</h3>
              <div className="space-y-3">
                <RangeSlider label="Product Knowledge" value={formData.success_formula.knowledge.products} onChange={v => updateNested('success_formula', 'knowledge', 'products', v)} />
                <RangeSlider label="Financial Planning" value={formData.success_formula.knowledge.planning} onChange={v => updateNested('success_formula', 'knowledge', 'planning', v)} />
                <RangeSlider label="Comparison Skills" value={formData.success_formula.knowledge.comparison} onChange={v => updateNested('success_formula', 'knowledge', 'comparison', v)} />
                <RangeSlider label="Market Awareness" value={formData.success_formula.knowledge.market} onChange={v => updateNested('success_formula', 'knowledge', 'market', v)} />
                <RangeSlider label="Taxation Basics" value={formData.success_formula.knowledge.taxation} onChange={v => updateNested('success_formula', 'knowledge', 'taxation', v)} />
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Skills (Self-Rate 1-10)</h3>
              <div className="space-y-3">
                <RangeSlider label="Communication" value={formData.success_formula.skills.communication} onChange={v => updateNested('success_formula', 'skills', 'communication', v)} />
                <RangeSlider label="Marketing" value={formData.success_formula.skills.marketing} onChange={v => updateNested('success_formula', 'skills', 'marketing', v)} />
                <RangeSlider label="Selling" value={formData.success_formula.skills.selling} onChange={v => updateNested('success_formula', 'skills', 'selling', v)} />
                <RangeSlider label="Closing" value={formData.success_formula.skills.closing} onChange={v => updateNested('success_formula', 'skills', 'closing', v)} />
                <RangeSlider label="Follow-up" value={formData.success_formula.skills.followup} onChange={v => updateNested('success_formula', 'skills', 'followup', v)} />
              </div>
            </div>
          </div>
        );

      // SCREEN 6 — Lead & Sales Metrics
      case 6:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-white">The Funnel</h2>
              <p className="text-slate-300">Metrics for the last 90 days.</p>
            </div>

            <div>
              <Label>Leads Generated</Label>
              <InputText type="number" value={formData.metrics.leads_90_days} onChange={e => update('metrics', 'leads_90_days', e.target.value)} />
            </div>
            <div>
              <Label>Meetings Conducted</Label>
              <InputText type="number" value={formData.metrics.meetings_done} onChange={e => update('metrics', 'meetings_done', e.target.value)} />
            </div>
            <div>
              <Label>Sales Completed</Label>
              <InputText type="number" value={formData.metrics.sales_completed} onChange={e => update('metrics', 'sales_completed', e.target.value)} />
            </div>

            {/* Auto Calculated Conversion */}
            <div className="bg-gradient-to-r from-indigo-900/80 via-slate-900/80 to-cyan-900/50 text-white p-6 rounded-2xl flex items-center justify-between shadow-[0_18px_60px_rgba(15,23,42,0.45)] border border-white/10">
              <div>
                <p className="text-indigo-100 text-sm uppercase tracking-wider">Conversion Rate</p>
                <p className="text-xs text-indigo-200/70">(Sales / Meetings)</p>
              </div>
              <div className="text-4xl font-bold text-amber-300 drop-shadow-lg">
                {calculateConversion()}%
              </div>
            </div>
          </div>
        );

      // SCREEN 7 — Tools & Digital Presence
      case 7:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-white">Tools & Trust</h2>
              <p className="text-slate-300">Building the 'Vishwas Graha'.</p>
            </div>

            <div className="space-y-3">
              {[
                { k: 'use_financial_kundli', l: 'Do you use Financial Kundli with clients?' },
                { k: 'has_ppt', l: 'Do you have a proper presentation/PPT?' },
                { k: 'collect_data_professionally', l: 'Do you collect client data professionally?' },
                { k: 'social_platforms', l: 'Are you active on Social Media?' },
                { k: 'take_testimonials', l: 'Do you take testimonials?' },
                { k: 'customer_events', l: 'Do you do customer events?' },
              ].map(item => (
                <div
                  key={item.k}
                  onClick={() => update('tools', item.k, !formData.tools[item.k])}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    formData.tools[item.k]
                      ? 'bg-white/10 border-cyan-300/60 shadow-[0_12px_50px_rgba(34,211,238,0.25)]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className={`font-semibold ${formData.tools[item.k] ? 'text-white' : 'text-slate-100'}`}>{item.l}</span>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${formData.tools[item.k] ? 'bg-cyan-300 border-cyan-300 text-slate-900' : 'border-white/40 text-white/70'}`}>
                    {formData.tools[item.k] && <IconCheck className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // SCREEN 8 — Mindset & Growth Check
      case 8:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-white">Mindset Check</h2>
              <p className="text-slate-300">The 'Manobal Graha'.</p>
            </div>
            <div className="space-y-4">
              <RangeSlider label="Confidence in Calling" value={formData.mindset.confidence} onChange={v => updateNested('mindset', null, 'confidence', v)} />
              <RangeSlider label="Weekly Consistency" value={formData.mindset.consistency} onChange={v => updateNested('mindset', null, 'consistency', v)} />
              <RangeSlider label="Investment in Learning" value={formData.mindset.learning} onChange={v => updateNested('mindset', null, 'learning', v)} />
              <RangeSlider label="Goal Tracking" value={formData.mindset.track_goals} onChange={v => updateNested('mindset', null, 'track_goals', v)} />
              <RangeSlider label="Fear of Rejection (1=High Fear, 10=No Fear)" value={formData.mindset.fear_rejection} onChange={v => updateNested('mindset', null, 'fear_rejection', v)} />
            </div>
          </div>
        );

      // SCREEN 9 — Tripwire Clarity
      case 9:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-white">The Tripwire</h2>
              <p className="text-slate-300">What product do you use to open conversations with strangers?</p>
            </div>

            <div className="grid gap-3">
              {['Health Insurance', 'Term Insurance', 'SIP / Mutual Fund', 'Policy Review', 'None'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setFormData(p => ({ ...p, tripwire: opt }))}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    formData.tripwire === opt
                      ? 'border-fuchsia-400/80 bg-fuchsia-400/10 shadow-[0_16px_50px_rgba(232,121,249,0.2)]'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-semibold ${formData.tripwire === opt ? 'text-white' : 'text-slate-100'}`}>{opt}</span>
                    {formData.tripwire === opt && (
                      <div className="w-5 h-5 bg-fuchsia-400 rounded-full flex items-center justify-center text-slate-900">
                        <IconCheck className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      // SCREEN 10 - Processing
      case 10:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fadeIn">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-fuchsia-400 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">*</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Reading Your Business Kundli...</h2>
            <p className="text-slate-300">Analyzing your 7 Business Grahas</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-50 pb-28 pt-[-40] lg:pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(129,140,248,0.25),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.25),transparent_20%),radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.25),transparent_25%)]"></div>
      <div className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(60deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:120px_120px]"></div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8">
        {/* HEADER */}
        <div className="bg-white/10 border border-white/15 rounded-2xl px-4 sm:px-5 py-3 sticky top-4 z-20 flex items-center justify-between gap-3 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.4)]">
          {step > 3 && step < 10 ? (
            <button onClick={() => setStep(s => s - 1)} className="p-2 text-indigo-100 hover:bg-white/10 rounded-full border border-white/10 transition">
              <IconChevronLeft />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <div className="flex items-center gap-3 flex-1 justify-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100">
              {step < 10 ? `Step ${step - 2} of 7` : 'Processing'}
            </span>
            <div className="hidden sm:block h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[13px] font-semibold text-cyan-100 shadow-inner">
            Cosmic Mode
          </div>
        </div>

          {/* <div className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-2xl shadow-[0_22px_80px_rgba(0,0,0,0.45)]">
            <p className="text-sm font-semibold text-indigo-100 uppercase tracking-[0.25em]">Business Kundli</p>
            <h1 className="mt-3 text-3xl lg:text-4xl font-extrabold leading-tight text-white">Map your 7 Business Grahas</h1>
            <p className="mt-3 text-slate-200/80 leading-relaxed">
              A cosmic-inspired, mobile-first journey that now stretches comfortably on desktop. Track your growth vectors while staying in flow.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs uppercase tracking-widest text-indigo-200/80">Current Step</p>
                <p className="text-2xl font-bold text-white mt-1">{step < 10 ? `${step - 2} / 7` : 'Finalizing'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/40 via-fuchsia-500/30 to-cyan-400/30 border border-white/15 shadow-[0_18px_60px_rgba(236,72,153,0.25)]">
                <p className="text-xs uppercase tracking-widest text-white/80">Focus</p>
                <p className="text-base font-semibold text-white mt-1">Aligned actions, stellar clarity.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Responsive', 'Cosmic Glow', 'Guided Flow'].map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[13px] text-indigo-100">
                  {tag}
                </span>
              ))}
            </div>
          </div> */}


        {/* HERO + CONTENT */}
        <div className="grid gap-6 lg:gap-8 mt-6">
        
          <div className="bg-white/10 border border-white/15 rounded-3xl p-5 sm:p-6 lg:p-8 backdrop-blur-2xl shadow-[0_22px_80px_rgba(0,0,0,0.55)] relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.04),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.05),transparent_25%)]"></div>
            <div className="relative">{renderScreen()}</div>
          </div>
           {step < 10 && (
        <div className=" bottom-0 left-0 right-0 lg:left-64 lg:right-6 lg:bottom-4 lg:rounded-2xl p-4  z-20 lg:w-auto">
          <div className="max-w-6xl mx-auto lg:max-w-none">
            <button
              onClick={() => (step < 9 ? setStep(s => s + 1) : handleSubmit())}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 hover:from-indigo-400 hover:via-fuchsia-400 hover:to-cyan-300 text-white font-bold py-4 rounded-2xl shadow-[0_18px_60px_rgba(99,102,241,0.45)] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-70"
            >
              {step === 9 ? 'Reveal My Kundli' : 'Next Step'}
              <IconArrowRight />
            </button>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* BOTTOM NAV */}
      {/* {step < 10 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 lg:right-6 lg:bottom-4 lg:rounded-2xl p-4 bg-gradient-to-r from-slate-950/90 via-indigo-950/90 to-slate-950/90 border-t lg:border border-white/10 backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.35)] lg:shadow-[0_18px_60px_rgba(0,0,0,0.4)] z-20 lg:w-auto">
          <div className="max-w-6xl mx-auto lg:max-w-none">
            <button
              onClick={() => (step < 9 ? setStep(s => s + 1) : handleSubmit())}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 hover:from-indigo-400 hover:via-fuchsia-400 hover:to-cyan-300 text-white font-bold py-4 rounded-2xl shadow-[0_18px_60px_rgba(99,102,241,0.45)] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-70"
            >
              {step === 9 ? 'Reveal My Kundli' : 'Next Step'}
              <IconArrowRight />
            </button>
          </div>
        </div>
      )} */}

      {/* GLOBAL STYLES FOR ANIMATION */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
