'use client';

import { useState, useMemo, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// --- Icons ---
const Icons = {
  ChevronRight: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>,
  ChevronLeft: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Briefcase: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  CreditCard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Target: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
};

// --- Components ---

const InputGroup = ({ label, value, onChange, type = "text", placeholder, prefix, suffix, className = "" }) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-0.5">{label}</label>
    <div className="flex items-center w-full bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-slate-800 focus-within:border-transparent transition-all duration-200 shadow-sm overflow-hidden h-11 lg:h-10">
      {prefix && <div className="pl-3 pr-2 text-slate-400 text-sm font-medium bg-slate-50 h-full flex items-center border-r border-slate-100">{prefix}</div>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        // Text base on mobile (prevent zoom), text-sm on desktop (cleaner)
        className="w-full h-full bg-transparent border-none px-3 text-base lg:text-sm text-slate-900 placeholder:text-slate-300 focus:ring-0"
      />
      {suffix && <div className="pr-3 pl-2 text-slate-400 text-xs font-medium h-full flex items-center bg-slate-50 border-l border-slate-100">{suffix}</div>}
    </div>
  </div>
);

// Desktop Sidebar Item
const StepItem = ({ step, index, current, onClick }) => {
  const isActive = current === index;
  const isPast = index < current;
  
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left group
        ${isActive ? 'bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
      `}
    >
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
        ${isActive ? 'bg-slate-900 text-white' : isPast ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'}
      `}>
        {isPast ? <Icons.Check /> : step.icon}
      </div>
      <div className="flex-1">
        <span className={`block text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
          {step.title}
        </span>
        <span className="text-xs text-slate-400 hidden lg:block">{step.desc}</span>
      </div>
    </button>
  );
};

export default function FinancialKundliPage() {
  const router = useRouter();
  const auth = getAuth();
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [data, setData] = useState({
    client: { name: '', age: '', city: '', family_members: 1 },
    cashflow: { annual_income: '', monthly_expenses: '', monthly_savings: '' },
    assets: { cash: '', equity: '', debt: '', epf: '', real_estate: '' },
    liabilities: { home: '', vehicle: '', credit: '', other: '', emi: '' },
    emergency: { fund: '', months: 6 },
    insurance: { life: '', health: '', critical: '', accident: '' },
    goals: [],
    assumptions: {
        inflation_goals_yearly: 0.06,
        inflation_expenses_yearly: 0.06,
        expected_roi_yearly: 0.10
    }

  });

  const metrics = useMemo(() => {
    const monthlyIncome = Number(data.cashflow.annual_income || 0) / 12;
    const savingsRate = monthlyIncome
      ? Math.round((Number(data.cashflow.monthly_savings) / monthlyIncome) * 100)
      : 0;

    const totalAssets = Object.values(data.assets).reduce((a, b) => Number(a) + Number(b), 0);
    const totalLiabilities = Object.values(data.liabilities).reduce((a, b) => Number(a) + Number(b), 0);
    const netWorth = totalAssets - totalLiabilities;
    const emergencyMonthsCovered = Number(data.cashflow.monthly_expenses)
      ? (Number(data.emergency.fund) / Number(data.cashflow.monthly_expenses)).toFixed(1)
      : 0;

    return { savingsRate, netWorth, totalAssets, totalLiabilities, emergencyMonthsCovered };
  }, [data]);

  const update = (section, field, value) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const addGoal = () => setData(prev => ({ ...prev, goals: [...prev.goals, { goal_name: '', current_cost: '', existing_corpus: '', target_year: '' }] }));
  const removeGoal = (index) => setData(prev => ({ ...prev, goals: prev.goals.filter((_, i) => i !== index) }));
  const updateGoal = (index, field, value) => {
    const newGoals = [...data.goals];
    newGoals[index][field] = value;
    setData(prev => ({ ...prev, goals: newGoals }));
  };

  const steps = [
    { id: 'profile', title: 'Profile & Cashflow', desc: 'Personal details', icon: <Icons.User /> },
    { id: 'assets', title: 'Assets', desc: 'What you own', icon: <Icons.Briefcase /> },
    { id: 'liabilities', title: 'Liabilities', desc: 'What you owe', icon: <Icons.CreditCard /> },
    { id: 'risk', title: 'Risk & Safety', desc: 'Insurance & Fund', icon: <Icons.Shield /> },
    { id: 'goals', title: 'Future Goals', desc: 'Milestones', icon: <Icons.Target /> },
  ];

  const handleNext = () => { if (currentStep < steps.length - 1) setCurrentStep(c => c + 1); };
  const handleBack = () => { if (currentStep > 0) setCurrentStep(c => c - 1); };

  const submit = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/financial-kundli/submit`, { method: 'POST', headers, body: JSON.stringify(data) });
      const json = await res.json();
      if (json.success) router.push(`/financial-kundli/report/${json.reportId}`);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const formatK = (num) => {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(num);
  };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentStep]);

  return (
    <div className="lg:flex lg:h-screen lg:overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-slate-200">
      
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 h-full z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-orange-500 rounded-sm"></span>
            Financial Kundli
          </h1>
          <p className="text-xs text-slate-400 mt-1 pl-4">Advisor-grade diagnosis</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {steps.map((s, idx) => (
            <StepItem key={s.id} step={s} index={idx} current={currentStep} onClick={() => setCurrentStep(idx)} />
          ))}
        </nav>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
           <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Session Progress</div>
           <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
             <div className="bg-slate-900 h-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
           </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* --- Header (Shared Logic, Adaptive UI) --- */}
        <header className="bg-white border-b border-slate-200 z-10 lg:px-8 lg:py-4">
          
          {/* Mobile Only Header Content */}
          <div className="lg:hidden flex items-center justify-between px-4 h-14 sticky top-0">
             <h1 className="text-lg font-bold text-slate-800">Financial Kundli</h1>
             <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">Step {currentStep + 1}/{steps.length}</span>
          </div>

          {/* Desktop CRM Status Bar / Mobile Stats Strip */}
          <div className="px-4 pb-4 lg:p-0">
            <div className="grid grid-cols-3 gap-2 lg:gap-8 lg:flex lg:items-center">
               
               {/* Stat Item */}
               <div className="lg:flex lg:flex-col p-2 lg:p-0 bg-slate-50 lg:bg-transparent rounded border lg:border-none border-slate-100 text-center lg:text-left">
                  <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Net Worth</span>
                  <span className={`text-sm lg:text-2xl font-bold block ${metrics.netWorth < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatK(metrics.netWorth)}
                  </span>
               </div>
               
               {/* Vertical Divider Desktop */}
               <div className="hidden lg:block w-px h-8 bg-slate-200"></div>

               <div className="lg:flex lg:flex-col p-2 lg:p-0 bg-slate-50 lg:bg-transparent rounded border lg:border-none border-slate-100 text-center lg:text-left">
                  <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Savings Rate</span>
                  <div className="flex items-center justify-center lg:justify-start gap-2">
                    <span className={`text-sm lg:text-2xl font-bold ${metrics.savingsRate < 20 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {metrics.savingsRate}%
                    </span>
                    {metrics.savingsRate < 20 && <span className="hidden lg:inline-block text-[10px] font-bold text-white bg-amber-500 px-1.5 rounded">LOW</span>}
                  </div>
               </div>

               <div className="hidden lg:block w-px h-8 bg-slate-200"></div>

               <div className="lg:flex lg:flex-col p-2 lg:p-0 bg-slate-50 lg:bg-transparent rounded border lg:border-none border-slate-100 text-center lg:text-left">
                  <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider">Runway</span>
                  <span className={`text-sm lg:text-2xl font-bold block ${metrics.emergencyMonthsCovered < 3 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {metrics.emergencyMonthsCovered} <span className="text-xs lg:text-sm font-medium text-slate-400">Months</span>
                  </span>
               </div>

            </div>
          </div>
        </header>

        {/* --- Scrollable Form Area --- */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 pb-32 lg:p-10 lg:pb-24">
          <div className="max-w-md lg:max-w-6xl mx-auto space-y-6">
            
            {/* Step Title for Desktop (Large) */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-3xl font-light text-slate-900">{steps[currentStep].title}</h2>
              <p className="text-slate-500 mt-1">{steps[currentStep].desc}</p>
            </div>

            {/* STEP 1: Profile */}
            {currentStep === 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 lg:space-y-8">
                {/* Desktop: Grid Card */}
                <div className="bg-white p-5 lg:p-8 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="hidden lg:block text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">Personal Details</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
                      <InputGroup label="Full Name" value={data.client.name} onChange={e => update('client', 'name', e.target.value)} placeholder="e.g. Rahul Sharma" className="lg:col-span-2" />
                      <InputGroup label="Age" type="number" value={data.client.age} onChange={e => update('client', 'age', e.target.value)} />
                      <InputGroup label="Dependents" type="number" value={data.client.family_members} onChange={e => update('client', 'family_members', e.target.value)} />
                      <InputGroup label="City" value={data.client.city} onChange={e => update('client', 'city', e.target.value)} className="lg:col-span-2" />
                   </div>
                </div>

                <div className="bg-white p-5 lg:p-8 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 lg:mb-6 border-b border-slate-100 pb-2 lg:border-none lg:pb-0">Cashflow</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-8">
                      <InputGroup label="Annual Income" type="number" prefix="₹" value={data.cashflow.annual_income} onChange={e => update('cashflow', 'annual_income', e.target.value)} placeholder="Pre-tax" />
                      <InputGroup label="Monthly Expenses" type="number" prefix="₹" value={data.cashflow.monthly_expenses} onChange={e => update('cashflow', 'monthly_expenses', e.target.value)} placeholder="Spending" />
                      <InputGroup label="Monthly Savings" type="number" prefix="₹" value={data.cashflow.monthly_savings} onChange={e => update('cashflow', 'monthly_savings', e.target.value)} placeholder="Investments" />
                   </div>
                </div>
              </div>
            )}

            {/* STEP 2: Assets */}
            {currentStep === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-5 lg:p-8 rounded-xl shadow-sm border border-slate-200">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8">
                      <InputGroup label="Liquid Cash" type="number" prefix="₹" value={data.assets.cash} onChange={e => update('assets', 'cash', e.target.value)} placeholder="Savings Acc" />
                      <InputGroup label="Equity / MF" type="number" prefix="₹" value={data.assets.equity} onChange={e => update('assets', 'equity', e.target.value)} placeholder="Stocks + MF" />
                      <InputGroup label="Debt Instruments" type="number" prefix="₹" value={data.assets.debt} onChange={e => update('assets', 'debt', e.target.value)} placeholder="FDs + PPF" />
                      <InputGroup label="EPF Corpus" type="number" prefix="₹" value={data.assets.epf} onChange={e => update('assets', 'epf', e.target.value)} />
                      <InputGroup label="Real Estate" type="number" prefix="₹" value={data.assets.real_estate} onChange={e => update('assets', 'real_estate', e.target.value)} className="lg:col-span-2" />
                   </div>
                </div>
              </div>
            )}

            {/* STEP 3: Liabilities */}
            {currentStep === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-5 lg:p-8 rounded-xl shadow-sm border border-slate-200">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8">
                      <InputGroup label="Home Loan" type="number" prefix="₹" value={data.liabilities.home} onChange={e => update('liabilities', 'home', e.target.value)} placeholder="Outstanding Principal" />
                      <InputGroup label="Vehicle Loan" type="number" prefix="₹" value={data.liabilities.vehicle} onChange={e => update('liabilities', 'vehicle', e.target.value)} />
                      <InputGroup label="Credit Card Dues" type="number" prefix="₹" value={data.liabilities.credit} onChange={e => update('liabilities', 'credit', e.target.value)} />
                      <InputGroup label="Personal Loans" type="number" prefix="₹" value={data.liabilities.other} onChange={e => update('liabilities', 'other', e.target.value)} />
                      <InputGroup label="Total Monthly EMI" type="number" prefix="₹" value={data.liabilities.emi} onChange={e => update('liabilities', 'emi', e.target.value)} placeholder="All loans combined" />

                   </div>
                </div>
              </div>
            )}

            {/* STEP 4: Risk */}
            {currentStep === 3 && (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6 lg:space-y-8">
                  <div className="bg-white p-5 lg:p-8 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 lg:mb-6">Emergency Fund</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8">
                        <InputGroup label="Current Amount" type="number" prefix="₹" value={data.emergency.fund} onChange={e => update('emergency', 'fund', e.target.value)} />
                        <InputGroup label="Target Coverage" type="number" suffix="Months" value={data.emergency.months} onChange={e => update('emergency', 'months', e.target.value)} />
                    </div>
                  </div>

                  <div className="bg-white p-5 lg:p-8 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 lg:mb-6">Insurance Coverage (Sum Assured)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
                      <InputGroup label="Term Life" type="number" prefix="₹" value={data.insurance.life} onChange={e => update('insurance', 'life', e.target.value)} />
                      <InputGroup label="Health" type="number" prefix="₹" value={data.insurance.health} onChange={e => update('insurance', 'health', e.target.value)} />
                      <InputGroup label="Critical Illness" type="number" prefix="₹" value={data.insurance.critical} onChange={e => update('insurance', 'critical', e.target.value)} />
                      <InputGroup label="Accident" type="number" prefix="₹" value={data.insurance.accident} onChange={e => update('insurance', 'accident', e.target.value)} />
                    </div>
                  </div>
               </div>
            )}

            {/* STEP 5: Goals */}
            {currentStep === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium lg:hidden">Your Goals</h3>
                  <button 
                      onClick={addGoal}
                      className="hidden lg:flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-md"
                  >
                    <Icons.Plus /> <span>Add Goal</span>
                  </button>
                  {/* Mobile Add Button */}
                  <button onClick={addGoal} className="lg:hidden p-2 bg-slate-100 rounded-full"><Icons.Plus /></button>
                </div>

                {data.goals.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="bg-white p-3 rounded-full shadow-sm mb-3 text-slate-400"><Icons.Target /></div>
                    <p className="text-slate-500 font-medium">No goals added yet</p>
                    <button onClick={addGoal} className="mt-2 text-sm text-blue-600 font-semibold hover:underline">Add your first goal</button>
                  </div>
                )}
                
                {/* Responsive Grid for Goals */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {data.goals.map((goal, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative group transition-all hover:shadow-md hover:border-slate-300">
                      <div className="absolute top-3 right-3 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => removeGoal(i)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md"><Icons.Trash /></button>
                      </div>
                      
                      <div className="space-y-4 mt-2">
                        <InputGroup label={`Goal ${i+1}`} placeholder="e.g. Retirement" value={goal.goal_name} onChange={e => updateGoal(i, 'goal_name', e.target.value)} />
                        
                        <div className="grid grid-cols-2 gap-3">
                          <InputGroup label="Cost Today" type="number" prefix="₹" value={goal.current_cost} onChange={e => updateGoal(i, 'current_cost', e.target.value)} />
                          <InputGroup label="Saved" type="number" prefix="₹" value={goal.existing_corpus} onChange={e => updateGoal(i, 'existing_corpus', e.target.value)} />
                        </div>
                        
                        <InputGroup label="Target Year" type="number" placeholder="YYYY" value={goal.target_year} onChange={e => updateGoal(i, 'target_year', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* --- Footer Actions (Responsive) --- */}
        <footer className="bg-white border-t border-slate-200 p-4 lg:p-6 lg:bg-slate-50 z-20 absolute bottom-0 w-full lg:static">
          <div className="max-w-md lg:max-w-6xl mx-auto flex items-center justify-between gap-4">
            
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || loading}
              className={`flex items-center justify-center space-x-2 px-6 py-3 lg:py-2.5 rounded-xl lg:rounded-lg border border-slate-200 bg-white text-slate-600 font-medium transition-all
                ${currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-slate-300 active:scale-95'}
              `}
            >
              <Icons.ChevronLeft /> <span className="hidden lg:inline">Back</span>
            </button>

            {currentStep === steps.length - 1 ? (
               <button
                onClick={submit}
                disabled={loading}
                className="flex-1 lg:flex-none lg:w-64 bg-slate-900 text-white px-6 py-3 lg:py-2.5 rounded-xl lg:rounded-lg font-bold text-base lg:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
              >
                {loading ? <span>Analyzing...</span> : <><span>Generate Report</span><Icons.Check /></>}
              </button>
            ) : (
               <button
                onClick={handleNext}
                className="flex-1 lg:flex-none lg:w-48 bg-slate-900 text-white px-6 py-3 lg:py-2.5 rounded-xl lg:rounded-lg font-bold text-base lg:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
              >
                <span>Next Step</span><Icons.ChevronRight />
              </button>
            )}
          </div>
        </footer>

      </div>
    </div>
  );
}