'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { generateFinancialReport } from '../../../../../utils/generateKundliPdf';

// --- Icons (Elegant & Minimalist) ---
const Icons = {
  Print: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
  ArrowLeft: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
  CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  AlertCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Target: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  TrendingUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
};

// --- Formatters ---
const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  
  if (absVal >= 10000000) return `${isNegative ? '-' : ''}₹${(absVal / 10000000).toFixed(2)} Cr`;
  if (absVal >= 100000) return `${isNegative ? '-' : ''}₹${(absVal / 100000).toFixed(2)} L`;
  
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

// --- Components ---

const ScoreDonut = ({ score }) => {
  let theme = { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'stroke-rose-500' };
  if (score >= 40) theme = { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'stroke-amber-500' };
  if (score >= 75) theme = { text: 'text-emerald-800', bg: 'bg-emerald-50', ring: 'stroke-emerald-600' };

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center w-40 h-40 rounded-full ${theme.bg}`}>
      <svg className="transform -rotate-90 w-40 h-40 drop-shadow-sm">
        <circle cx="80" cy="80" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white opacity-50" />
        <circle cx="80" cy="80" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round" 
          className={`${theme.ring} transition-all duration-1000 ease-out`} 
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-light tracking-tight ${theme.text}`}>{score}</span>
        <span className={`text-[10px] uppercase font-bold tracking-widest ${theme.text} opacity-60`}>Score</span>
      </div>
    </div>
  );
};

const VitalCard = ({ label, value, sub, status = 'neutral' }) => {
  const styles = {
    neutral: 'bg-white border-stone-100 text-stone-800',
    good: 'bg-emerald-50/50 border-emerald-100 text-emerald-900',
    bad: 'bg-rose-50/50 border-rose-100 text-rose-900',
    warning: 'bg-amber-50/50 border-amber-100 text-amber-900',
  };
  
  return (
    <div className={`p-5 rounded-2xl border ${styles[status]} shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-center min-h-[110px]`}>
      <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-1">{label}</span>
      <span className="text-2xl font-light tracking-tight">{value}</span>
      {sub && <span className="text-xs font-medium opacity-70 mt-1">{sub}</span>}
    </div>
  );
};

const ScoreBar = ({ label, value }) => {
  // FIX: Force value to be a number, default to 0 if NaN/undefined
  const safeValue = isNaN(value) || value === undefined ? 0 : value;
  
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
        <span>{label}</span>
        <span>{Math.round(safeValue)}/100</span>
      </div>
      <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-stone-700 rounded-full" style={{ width: `${Math.min(safeValue, 100)}%` }} />
      </div>
    </div>
  );
};

const ProtectionDetail = ({ label, recommended, actual }) => {
  const gap = Math.max(recommended - actual, 0);
  const isSecure = gap <= 0;
  const coverage = recommended > 0 ? Math.min((actual / recommended) * 100, 100) : (actual > 0 ? 100 : 0);

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-1 h-full ${isSecure ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      
      <div className="flex justify-between items-start mb-4 pl-2">
        <div>
          <h4 className="font-bold text-stone-800">{label}</h4>
          <p className="text-xs text-stone-400 mt-0.5">Target: {formatCurrency(recommended)}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isSecure ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {isSecure ? 'SECURE' : `GAP: ${formatCurrency(gap)}`}
        </div>
      </div>

      <div className="pl-2">
         <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full ${isSecure ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${coverage}%` }} />
         </div>
         <div className="flex justify-between text-xs text-stone-500">
            <span>Actual: {formatCurrency(actual)}</span>
            <span>{Math.round(coverage)}% Covered</span>
         </div>
      </div>
    </div>
  );
};

const GoalDetail = ({ goal }) => {
  const readiness = typeof goal.readiness === 'number' 
    ? Math.min(goal.readiness, 100) 
    : 0;

  const isFeasible = goal.feasibility === 'FEASIBLE' || goal.feasibility === 'ACHIEVED';

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
       <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-bold text-lg text-stone-800 capitalize">{goal.goal_name || 'Goal'}</h4>
            <span className="text-xs text-stone-400">Target: {goal.target_year || 'Not Set'}</span>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isFeasible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
             {goal.feasibility}
          </span>
       </div>

       <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
             <span className="block text-[10px] font-bold text-stone-400 uppercase">Future Cost</span>
             <span className="block text-sm font-semibold text-stone-800">{formatCurrency(goal.future_cost)}</span>
          </div>
          <div>
             <span className="block text-[10px] font-bold text-stone-400 uppercase">SIP Required</span>
             <span className="block text-sm font-semibold text-stone-800">{formatCurrency(goal.sip_required)}/m</span>
          </div>
       </div>

       <div className="pt-3 border-t border-stone-50">
          <div className="flex justify-between text-xs font-bold text-stone-500 mb-1">
             <span>Goal Readiness</span>
             <span>{Math.round(readiness)}%</span>
          </div>
          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
             <div className="h-full bg-stone-700" style={{ width: `${readiness}%` }} />
          </div>
       </div>
    </div>
  );
};


export default function FinancialKundliReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const auth = getAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  

  useEffect(() => {
    const load = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/financial-kundli/report/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success) setReport(json.data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    load();
  }, [id]);
  

  const ui = useMemo(() => {
    if (!report?.output) return null;
    const out = JSON.parse(report.output);

    // FIX: Calculate missing scores if Backend didn't provide them
    const scores = out.scores || {};
    
    // 1. Calculate Cashflow Score if missing
    if (scores.cashflow === undefined) {
      scores.cashflow = out.cashflow.disposable_income > 0 ? 100 : (out.cashflow.disposable_income === 0 ? 50 : 0);
    }
    
    // 2. Calculate Debt Score if missing
    if (scores.debt === undefined) {
      const emi = out.cashflow.emi_ratio || 0;
      if (emi <= 30) scores.debt = 100;
      else if (emi <= 50) scores.debt = 60;
      else if (emi <= 75) scores.debt = 30;
      else scores.debt = 0;
    }
    
    // 3. Calculate Net Worth Score if missing
    if (scores.net_worth === undefined) {
      scores.net_worth = (out.net_worth.net_worth || 0) > 0 ? 100 : 40;
    }

    return {
      identity: report.identity,
      score: out.overall_score || 0,
      cashflow: {
        savings_rate: out.cashflow.savings_rate,
        emi_ratio: out.cashflow.emi_ratio,
        disposable_income: out.cashflow.disposable_income
      },
      netWorth: out.net_worth.net_worth,
      scores: scores,
      protection: {
        life: { rec: out.protection.recommended.life, act: out.protection.actual.life_cover || 0 },
        health: { rec: out.protection.recommended.health, act: out.protection.actual.health_cover || 0 },
        critical: { rec: out.protection.recommended.critical, act: out.protection.actual.critical_illness_cover || 0 },
        accident: { rec: out.protection.recommended.accident, act: out.protection.actual.accident_cover || 0 },
      },
      goals: out.goals || [],
      fire: {
        fire_number: out.fire.fire_number
      },
      flags: out.flags || []
    };
  }, [report]);

    // Handler for PDF Download
  const handleDownloadPDF = () => {
    if (ui) {
      generateFinancialReport(ui);
    }
  };


  if (loading || !ui) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-stone-400">Loading Report...</div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800 font-sans pb-20 print:bg-white print:p-0">
      
      {/* HEADER */}
      <nav className="max-w-5xl mx-auto px-6 py-6 flex justify-between items-center print:hidden">
        <button onClick={() => router.back()} className="flex items-center space-x-2 text-stone-500 hover:text-stone-900 transition-colors">
          <Icons.ArrowLeft /> <span className="text-sm font-medium">Back</span>
        </button>
        <button onClick={handleDownloadPDF} className="flex items-center space-x-2 bg-stone-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-stone-800 shadow-xl shadow-stone-200">
           <Icons.Print /> <span>Download Report</span>
        </button>
      </nav>

      {/* PRINT HEADER */}
      <div className="hidden print:block max-w-5xl mx-auto px-8 pt-8 pb-4 border-b border-stone-200">
        <h1 className="text-2xl font-bold text-stone-900">Financial Wellness Report</h1>
        <p className="text-stone-500 text-sm">Prepared for {ui.identity.name} • {new Date().toLocaleDateString()}</p>
      </div>

      <main className="max-w-5xl mx-auto px-4 lg:px-6 space-y-8 mt-4">
        
        {/* HERO SECTION */}
        <section className="bg-white rounded-[2rem] p-8 lg:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-stone-100">
           <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start gap-8 text-center lg:text-left">
                 <ScoreDonut score={ui.score} />
                 <div>
                    <span className="inline-block px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-[10px] font-bold tracking-widest uppercase mb-3">Status Update</span>
                    <h1 className="text-3xl font-serif text-stone-900 mb-2">Hello, {ui.identity.name}</h1>
                    <p className="text-stone-500 leading-relaxed max-w-sm">
                       {ui.score < 50 
                         ? "Your financial health requires immediate attention. Key metrics indicate potential risks in liquidity or debt." 
                         : "You have a solid financial foundation. A few optimizations in protection and goal planning will get you to 100."}
                    </p>
                 </div>
              </div>
              <div className="w-full lg:w-auto grid grid-cols-2 gap-3 min-w-[300px]">
                 <VitalCard label="Savings Rate" value={`${Math.round(ui.cashflow.savings_rate)}%`} sub="Target: 20%+" status={ui.cashflow.savings_rate < 20 ? 'warning' : 'good'} />
                 <VitalCard label="EMI Stress" value={`${Math.round(ui.cashflow.emi_ratio)}%`} sub="Max Limit: 40%" status={ui.cashflow.emi_ratio > 40 ? 'bad' : 'neutral'} />
                 <div className="col-span-2">
                    <VitalCard label="Net Worth" value={formatCurrency(ui.netWorth)} sub="Assets - Liabilities" status={ui.netWorth < 0 ? 'bad' : 'good'} />
                 </div>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* LEFT: SCORECARD */}
           <div className="lg:col-span-4 space-y-8">
              <section className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm">
                 <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2"><Icons.TrendingUp /> Performance</h3>
                 <ScoreBar label="Cashflow Discipline" value={ui.scores.cashflow} />
                 <ScoreBar label="Emergency Safety" value={ui.scores.emergency} />
                 <ScoreBar label="Debt Management" value={ui.scores.debt} />
                 <ScoreBar label="Protection Cover" value={ui.scores.protection} />
                 <ScoreBar label="Goal Readiness" value={ui.scores.goals} />
                 <ScoreBar label="Net Worth Growth" value={ui.scores.net_worth} />
              </section>

              <section className="bg-stone-800 rounded-[2rem] p-8 text-center text-white relative overflow-hidden">
                 <div className="relative z-10">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Financial Freedom</h3>
                    <p className="text-3xl font-serif mb-1">{formatCurrency(ui.fire.fire_number)}</p>
                    <p className="text-[10px] text-stone-400">Target corpus required</p>
                 </div>
                 <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-stone-700 rounded-full opacity-50 blur-2xl"></div>
              </section>
           </div>

           {/* RIGHT: DEEP DIVE */}
           <div className="lg:col-span-8 space-y-8">
              <section>
                 <div className="flex items-center justify-between px-2 mb-4">
                    <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Icons.Shield /> Risk Protection</h3>
                    <span className="text-xs font-medium text-stone-400">Gap Analysis</span>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProtectionDetail label="Life Insurance" recommended={ui.protection.life.rec} actual={ui.protection.life.act} />
                    <ProtectionDetail label="Health Insurance" recommended={ui.protection.health.rec} actual={ui.protection.health.act} />
                    <ProtectionDetail label="Critical Illness" recommended={ui.protection.critical.rec} actual={ui.protection.critical.act} />
                    <ProtectionDetail label="Accident Cover" recommended={ui.protection.accident.rec} actual={ui.protection.accident.act} />
                 </div>
              </section>

              <section>
                 <div className="flex items-center justify-between px-2 mb-4">
                    <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Icons.Target /> Goal Roadmap</h3>
                    <span className="text-xs font-medium text-stone-400">{ui.goals.length} Goals Defined</span>
                 </div>
                 
                 {ui.goals.length === 0 ? (
                    <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-8 text-center">
                       <p className="text-stone-400">No goals added to this plan.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {ui.goals.map((g, i) => <GoalDetail key={i} goal={g} />)}
                    </div>
                 )}
              </section>
           </div>
        </div>
      </main>

      <div className="hidden print:block text-center mt-12 pt-8 border-t border-stone-200 text-xs text-stone-400">
        Generated via Financial Kundli Engine
      </div>
    </div>
  );
}       