  'use client';

  import { useEffect, useMemo, useState } from 'react';
  import { useParams, useRouter } from 'next/navigation';
  import { getAuth } from 'firebase/auth';
  import { generateFinancialReport } from '../../../../../utils/generateKundliPdf';
  import GrahaReport from '@/components/Graha';
import { AnimatePresence,motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';

  /* =========================================================
    ICONS (Elegant & Minimalist)
  ========================================================= */
  const Icons = {
    Print: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
    ArrowLeft: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
    CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    AlertCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    Target: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    TrendingUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  };

  /* =========================================================
    FORMATTERS
  ========================================================= */
  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    if (absVal >= 10000000) return `${isNegative ? '-' : ''}₹${(absVal / 10000000).toFixed(2)} Cr`;
    if (absVal >= 100000) return `${isNegative ? '-' : ''}₹${(absVal / 100000).toFixed(2)} L`;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  /* =========================================================
    SUB-COMPONENTS
  ========================================================= */

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
          <span className={`text-[10px] uppercase font-bold tracking-widest ${theme.text} opacity-60`}>Health</span>
        </div>
      </div>
    );
  };

  const FinancialHealthSnapshot = ({ snapshot }) => {
  return (
    <section className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm">
      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">
        Financial Health Snapshot
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 text-sm">
        
        {/* LEFT COLUMN */}
        <div className="space-y-3">
          <MiniStat label="Total Loan Amount" value={formatCurrency(snapshot.total_loan_amount)} />
          <MiniStat label="Average Interest Rate" value={`${snapshot.average_interest_rate.toFixed(2)}%`} />
          <MiniStat label="Total EMI Amount" value={formatCurrency(snapshot.total_emi_amount)} />
          <MiniStat
            label="EMI-to-Income Ratio (Total EMI)"
            value={`${snapshot.emi_ratio_total.toFixed(2)}%`}
            color={snapshot.emi_warning_total === 'SAFE' ? 'text-emerald-600' : 'text-rose-600'}
          />
          <MiniStat
            label="EMI Status"
            value={snapshot.emi_warning_total}
            color={snapshot.emi_warning_total === 'SAFE' ? 'text-emerald-600' : 'text-rose-600'}
          />
          <MiniStat label="Yearly Expenses" value={formatCurrency(snapshot.yearly_expenses)} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-3">
          <MiniStat label="Yearly Savings" value={formatCurrency(snapshot.yearly_savings)} />
          <MiniStat label="Avg Monthly EMI" value={formatCurrency(snapshot.avg_monthly_emi)} />
          <MiniStat
            label="EMI-to-Income Ratio (Avg EMI)"
            value={`${snapshot.emi_ratio_avg.toFixed(2)}%`}
            color={snapshot.emi_warning_avg === 'Safe' ? 'text-emerald-600' : 'text-rose-600'}
          />
          <MiniStat
            label="EMI Status (Avg)"
            value={snapshot.emi_warning_avg}
            color={snapshot.emi_warning_avg === 'Safe' ? 'text-emerald-600' : 'text-rose-600'}
          />
          <MiniStat
            label="Savings Rate"
            value={`${snapshot.savings_rate.toFixed(2)}%`}
            color={snapshot.savings_rate >= 30 ? 'text-emerald-600' : 'text-amber-600'}
          />
          <MiniStat
            label="Financial Independence Ratio"
            value={`${snapshot.financial_independence_ratio.toFixed(2)}%`}
          />
        </div>
      </div>

    </section>
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
      <div className={`p-5 rounded-2xl border ${styles[status]} shadow-sm flex flex-col justify-center min-h-[110px]`}>
        <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-1">{label}</span>
        <span className="text-2xl font-light tracking-tight">{value}</span>
        {sub && <span className="text-xs font-medium opacity-70 mt-1">{sub}</span>}
      </div>
    );
  };

  const ScoreBar = ({ label, value }) => (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
        <span>{label}</span>
        <span>{Math.round(value || 0)}/100</span>
      </div>
      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-stone-700 rounded-full transition-all duration-1000" style={{ width: `${Math.min(value || 0, 100)}%` }} />
      </div>
    </div>
  );

  const MiniStat = ({ label, value, color = "text-stone-800" }) => (
    <div className="flex justify-between py-1.5 border-b border-stone-50 last:border-0">
      <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );

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
    const readiness = Math.min(goal.readiness || 0, 100);
    const isFeasible = goal.feasibility === 'FEASIBLE' || goal.feasibility === 'ACHIEVED';

    return (
      <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-bold text-lg text-stone-800 capitalize leading-tight">{goal.goal_name}</h4>
              <span className="text-xs text-stone-400">Target Year: {goal.target_year}</span>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isFeasible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {goal.feasibility}
            </span>
        </div>

        <div className="space-y-0.5 mb-4">
            {goal.monthly_future_cost > 0 && (
              <MiniStat label="Future Monthly Living" value={formatCurrency(goal.monthly_future_cost)} color="text-indigo-600" />
            )}
            <MiniStat label="Future Required Corpus" value={formatCurrency(goal.future_cost)} />
            <MiniStat label="Existing Fund FV" value={formatCurrency(goal.future_value_of_existing_corpus)} />
            <MiniStat label="Net Funding Gap" value={formatCurrency(goal.net_target)} color="text-rose-600" />
            <MiniStat label="Minimum SIP Needed" value={`${formatCurrency(goal.sip_required)}/m`} color="text-stone-900" />
            <MiniStat label="Recommended SIP Needed" value={`${formatCurrency(goal.sip_required*1.25)}/m`} color="text-stone-900" />       </div>

        <div className="pt-2 border-t border-stone-50">
            <div className="flex justify-between text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-widest">
              <span>Readiness</span>
              <span>{Math.round(readiness)}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-stone-800" style={{ width: `${readiness}%` }} />
            </div>
        </div>
      </div>
    );
  };

  
 /* =========================================================
   AUTHENTIC KUNDLI GEOMETRY COMPONENT
========================================================= */


/* =========================================================
   ICONS
========================================================= */
const KundliIcons = {
  Cashflow: () => <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l-3-1m3 1l3 9a5.002 5.002 0 01-6.001 0M18 7l-3 9m3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>,
  Protection: () => <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Investments: () => <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Legacy: () => <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
  Buffer: () => <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Property: () => <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
};

/* =========================================================
   LOGIC HELPERS
========================================================= */
const getStatus = (score) => {
  if (score >= 70) return { label: 'Strong', color: 'text-emerald-600' };
  if (score >= 45) return { label: 'Moderate', color: 'text-amber-600' };
  return { label: 'Weak', color: 'text-rose-600' };
};

const PillarLabel = ({ label, score, icon: Icon, className = "" }) => {
  const status = getStatus(score);
  return (
    <div className={`flex flex-col items-center justify-center text-center px-1 ${className}`}>
      {Icon && <div className="text-stone-400 mb-1 lg:mb-2"><Icon /></div>}
      <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-stone-800 leading-tight">{label}</span>
      <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-stone-800 leading-tight">{score.toFixed(1)}</span>
      <span className={`text-[9px] lg:text-[11px] font-bold mt-0.5 ${status.color}`}>{status.label}</span>
    </div>
  );
};

const FinancialKundliSeal = ({ ui }) => {
  // Map internal logic to pillars
  const data = useMemo(() => ({
    cashflow: ui.cashflow.savings_rate >= 25 ? 85 : 40,
    protection: ui.scores.protection || 0,
    investments: ui.scores.goals || 0,
    legacy: (ui.fire.fi_ratio || 0) > 5 ? 80 : 35,
    netWorth: ui.netWorth.net_worth > 0 ? 90 : 20,
    savings: ui.cashflow.savings_rate >= 20 ? 80 : 30,
    buffer: ui.emergency.months_covered >= 6 ? 90 : ui.emergency.months_covered >= 3 ? 55 : 25,
    property: (ui.netWorth.total_assets || 0) > 1000000 ? 80 : 40, // Logic for property pillar
  }), [ui]);

  return (
    <section className="w-full mx-auto py-10 lg:py-20 px-4">
      <div className="relative aspect-square w-full max-w-[450px] mx-auto group">
        
        {/* --- GEOMETRIC BACKGROUND (SVG) --- */}
        <div className="absolute inset-0 z-0">
          <svg className="w-full h-full text-stone-200" viewBox="0 0 100 100" fill="none">
            {/* Outer Box */}
            <rect x="2" y="2" width="96" height="96" stroke="currentColor" strokeWidth="2.5" />
            {/* Main Diamond */}
            <path d="M50 2 L98 50 L50 98 L2 50 Z" stroke="currentColor" strokeWidth="1" />
            {/* Corner Diagonals */}
            <line x1="2" y1="2" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" />
            <line x1="98" y1="2" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" />
            <line x1="2" y1="98" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" />
            <line x1="98" y1="98" x2="50" y2="50" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        </div>

        {/* --- CENTER BRANDING --- */}
        <div className="absolute inset-[36%] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 text-center rounded-2xl">
            <div className="text-[9px] lg:text-[11px] tracking-[0.4em] font-black text-stone-400 uppercase">Financial</div>
            <div className="text-2xl lg:text-5xl font-serif italic text-stone-900 leading-none lg:mt-1">Kundli</div>
            <div className="w-8 lg:w-16 h-0.5 bg-stone-900 mt-2 lg:mt-4"></div>
        </div>

        {/* --- MAIN HOUSES (1, 4, 7, 10) --- */}
        
        {/* House 1: Top Center */}
        <PillarLabel 
            label="Cash Flow" 
            score={data.cashflow} 
            icon={KundliIcons.Cashflow} 
            className="absolute top-[8%] left-1/2 -translate-x-1/2" 
        />

        {/* House 4: Left Center */}
        <PillarLabel 
            label="Protection" 
            score={data.protection} 
            icon={KundliIcons.Protection} 
            className="absolute top-1/2 left-[10%] -translate-y-1/2" 
        />

        {/* House 7: Bottom Center */}
        <PillarLabel 
            label="Investments" 
            score={data.investments} 
            icon={KundliIcons.Investments} 
            className="absolute bottom-[8%] left-1/2 -translate-x-1/2" 
        />

        {/* House 10: Right Center */}
        <PillarLabel 
            label="Legacy" 
            score={data.legacy} 
            icon={KundliIcons.Legacy} 
            className="absolute top-1/2 right-[10%] -translate-y-1/2" 
        />

        {/* --- CORNER PILLARS (Supporting Data) --- */}

        {/* Top Left: Net Worth */}
        <div className="absolute top-[8%] left-[8%] text-center">
          
            <span className="text-[8px] lg:text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Net Worth</span>
            <p className={`text-[9px] lg:text-[11px] font-black`}>{(data.netWorth)}</p>
            <span className={`text-[9px] lg:text-[11px] font-black ${getStatus(data.netWorth).color}`}>{getStatus(data.netWorth).label}</span>
        </div>

        {/* Top Right: Savings */}
        <div className="absolute top-[8%] right-[8%] text-center">
            <span className="text-[8px] lg:text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Savings</span>
             <p className={`text-[9px] lg:text-[11px] font-black`}>{(data.savings)}</p>
            <span className={`text-[9px] lg:text-[11px] font-black ${getStatus(data.savings).color}`}>{getStatus(data.savings).label}</span>
        </div>

        {/* Bottom Left: Buffer (Emergency Fund) */}
        <div className="absolute bottom-[8%] left-[8%] flex flex-col items-center">
            <div className="text-stone-300 mb-1"><KundliIcons.Buffer /></div>
            <span className="text-[8px] lg:text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Buffer</span>
             <p className={`text-[9px] lg:text-[11px] font-black`}>{(data.buffer)}</p>
            <span className={`text-[9px] lg:text-[11px] font-black ${getStatus(data.buffer).color}`}>{getStatus(data.buffer).label}</span>
        </div>

        {/* Bottom Right: Property (Asset Base) */}
        <div className="absolute bottom-[8%] right-[8%] flex flex-col items-center">
            <div className="text-stone-300 mb-1"><KundliIcons.Property /></div>
            <span className="text-[8px] lg:text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Property</span>
             <p className={`text-[9px] lg:text-[11px] font-black`}>{(data.property)}</p>
            <span className={`text-[9px] lg:text-[11px] font-black ${getStatus(data.property).color}`}>{getStatus(data.property).label}</span>
        </div>

      </div>

      {/* --- ACTION FOOTER --- */}
      {/* <div className="mt-10 lg:mt-16 flex flex-col md:flex-row items-center justify-between gap-6 bg-white border border-stone-100 p-6 lg:p-8 rounded-3xl shadow-sm">
         <div className="text-center md:text-left">
            <h4 className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-stone-400 mb-2">Priority Focus Areas</h4>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {Object.entries(data).filter(([_, score]) => score < 45).map(([key]) => (
                    <span key={key} className="px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase rounded-full border border-rose-100">
                        {key === 'netWorth' ? 'Capital' : key}
                    </span>
                ))}
                {Object.values(data).every(s => s >= 45) && (
                    <span className="text-stone-400 text-xs italic">All pillars are stable.</span>
                )}
            </div>
         </div>
         <div className="h-px w-full md:w-px md:h-12 bg-stone-100 hidden md:block"></div>
         <div className="text-center md:text-right">
            <span className="text-[10px] lg:text-xs font-bold text-stone-400 uppercase tracking-widest block mb-1">Overall Diagnosis Score</span>
            <span className="text-3xl lg:text-5xl font-serif italic text-stone-900">{ui.score}%</span>
         </div>
      </div> */}
    </section>
  );
};


// --- DOWNLOAD MODAL COMPONENT ---
function DownloadModal({ status, error }) {
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const isProcessing = status === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className={`w-full max-w-sm mx-4 rounded-[1.5rem] p-10 text-center overflow-hidden border shadow-2xl ${
          isSuccess
            ? 'bg-gradient-to-br from-emerald-950/40 to-[#020617] border-emerald-500/20'
            : isError
            ? 'bg-gradient-to-br from-red-950/40 to-[#020617] border-red-500/20'
            : 'bg-gradient-to-br from-indigo-950/40 to-[#020617] border-indigo-500/20'
        }`}
      >
        {/* Animated Background Gradient */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className={`absolute inset-0 opacity-20 pointer-events-none ${
            isSuccess ? 'bg-emerald-500/10' : isError ? 'bg-red-500/10' : 'bg-indigo-500/10'
          }`}
        />

        <div className="relative z-10">
          {/* Icon */}
          <motion.div
            animate={
              isProcessing
                ? { rotate: 360 }
                : isSuccess
                ? { scale: [0.8, 1.1, 1] }
                : { x: [0, -10, 10, -10, 0] }
            }
            transition={{
              duration: isProcessing ? 2 : 0.6,
              repeat: isProcessing ? Infinity : 0,
              ease: 'easeInOut',
            }}
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: isSuccess
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : isError
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            }}
          >
            {isProcessing && <Loader className="text-white" size={32} />}
            {isSuccess && <CheckCircle2 className="text-white" size={32} />}
            {isError && <AlertCircle className="text-white" size={32} />}
          </motion.div>

          {/* Title */}
          <h3 className="text-2xl font-black mb-3">
            {isProcessing && 'Generating PDF'}
            {isSuccess && 'Download Complete!'}
            {isError && 'Download Failed'}
          </h3>

          {/* Description */}
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {isProcessing && 'Your Business Kundli report is being generated. This may take a moment...'}
            {isSuccess && 'Your Business Kundli PDF has been downloaded successfully. Check your downloads folder.'}
            {isError && error && `${error}. Please try again.`}
          </p>

          {/* Loading Bars (Processing) */}
          {isProcessing && (
            <div className="space-y-2 mb-6">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, ease: 'easeInOut', repeat: Infinity }}
                className="h-1.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full"
              />
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '70%' }}
                transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity, delay: 0.2 }}
                className="h-1.5 bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full"
              />
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '40%' }}
                transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity, delay: 0.4 }}
                className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              />
            </div>
          )}

          {/* Status Message */}
          {(isSuccess || isError) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-xs font-bold py-2 px-4 rounded-lg ${
                isSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {isSuccess ? '✓ Ready in your downloads' : '✗ Please try again'}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}




  /* =========================================================
    PAGE MAIN COMPONENT
  ========================================================= */

  export default function FinancialKundliReportPage() {
    const { id } = useParams();
    const router = useRouter();
    const { profile, loading: authLoading } = useAuth();
    const hasAccess = profile?.add_ons?.includes('FINANCIAL_KUNDLI');

    if (authLoading) {
        return <div className="p-6 text-sm text-slate-500">Loading...</div>;
    }

    if (!hasAccess) {
        return (
            <PremiumGate
                title="Financial Kundli Report Locked"
                subtitle="This report is available only for admins with the Financial Kundli add-on enabled."
                features={[
                    'Full report access & download',
                    'AI summary with action plan',
                    'Client-ready PDF delivery',
                ]}
                ctaLabel="Request Access"
            />
        );
    }
    const auth = getAuth();
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | processing | success | error
    const [downloadError, setDownloadError] = useState(null); // dashboard | grahas | strategy | legacy | projections

    

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
    }, [id, auth]);

    const downloadPdf = async () => {
    
    if (!id) {
      setDownloadStatus('error');
      setDownloadError('Invalid report ID');
      setTimeout(() => setDownloadStatus('idle'), 3000);
      return;
    }

    setIsDownloading(true);
    setDownloadStatus('processing');
    setDownloadError(null);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/financial-kundli/report/${id}/download`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      if (blob.size === 0) throw new Error('Empty PDF received');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report?.identity?.name || 'Report'}_Financial_Kundli.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setDownloadStatus('success');
      setTimeout(() => {
        setDownloadStatus('idle');
        setIsDownloading(false);
      }, 2000);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadStatus('error');
      setDownloadError(err.message || 'Failed to download PDF');
      setTimeout(() => {
        setDownloadStatus('idle');
        setIsDownloading(false);
      }, 3000);
    }
  };

    const ui = useMemo(() => {
      if (!report?.output) return null;
      const out = typeof report.output === 'string' ? JSON.parse(report.output) : report.output;
      
      return {
        identity: report.identity,
        score: out.overall_score || 0,
        cashflow: out.cashflow,
        netWorth: out.net_worth,
        loans: out.loans || {},
        emergency: out.emergency,
        scores: out.scores || {},
        protection: out.protection,
        goals: out.goals || [],
        fire: out.fire || {},
        snapshot: out.financial_snapshot || {}
      };
    }, [report]);

    const parseAiReport = (input) => {
  if (!input) return null

  if (typeof input === 'object') return input

  if (typeof input === 'string') {
    try {
      return JSON.parse(input)
    } catch (e) {
      console.error('Invalid ai_report JSON', e)
      return null
    }
  }

  return null
}

const grahaData = useMemo(
  () => parseAiReport(report?.ai_report),
  [report]
)

const reportData = useMemo(() => {
  if (!report) return null;

  try {
    return {
      ...report,
      // Check if it's a string, if so parse it. Otherwise use as is.
      input: typeof report.input === 'string' ? JSON.parse(report.input) : report.input,
      output: typeof report.output === 'string' ? JSON.parse(report.output) : report.output,
      ai_report: typeof report.ai_report === 'string' ? JSON.parse(report.ai_report) : report.ai_report,
    };
  } catch (error) {
    console.error("Failed to parse report JSON strings", error);
    return report;
  }
}, [report]);


    if (loading || !ui) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-stone-400">Loading Analysis...</div>;

    return (
      <div className="min-h-screen bg-[#FDFBF7] text-stone-800 font-sans pb-20 print:bg-white print:p-0">
        
        {/* HEADER NAV */}
        <nav className="max-w-5xl mx-auto px-6 py-6 flex justify-between items-center print:hidden">
          <button onClick={() => router.back()} className="flex items-center space-x-2 text-stone-500 hover:text-stone-900 transition-colors">
            <Icons.ArrowLeft /> <span className="text-sm font-medium">Back</span>
          </button>
          <button 
          onClick={downloadPdf}
          disabled={isDownloading} 
          className="flex items-center space-x-2 bg-stone-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-stone-800 shadow-xl shadow-stone-200">
           <Icons.Print /> <span>Download Report</span>
          </button>
        </nav>

        {/* PRINT HEADER ONLY */}
        <div className="hidden print:block max-w-5xl mx-auto px-8 pt-8 pb-4 border-b border-stone-200">
          <h1 className="text-2xl font-bold text-stone-900">Financial Wellness Report</h1>
          <p className="text-stone-500 text-sm">Prepared for {ui.identity.name} • {new Date().toLocaleDateString()}</p>
        </div>

      

        <main className="max-w-5xl mx-auto px-4 lg:px-6 space-y-8 mt-4">
          
          {/* HERO SECTION */}
          <section className="bg-white rounded-[2rem] p-8 lg:p-10 shadow-sm border border-stone-100">
            <div className="flex flex-col lg:flex-row items-center gap-10">
                <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  <ScoreDonut score={ui.score} />
                  <div>
                      <span className="inline-block px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-[10px] font-bold tracking-widest uppercase mb-3">Diagnostic Summary</span>
                      <h1 className="text-3xl font-serif text-stone-900 mb-2">Hello, {ui.identity.name}</h1>
                      <p className="text-stone-500 leading-relaxed max-w-sm">
                        {ui.score < 50 
                          ? "High priority risks identified in protection and long-term goal funding. Immediate realignment is recommended." 
                          : "Solid financial foundation. Focus on optimizing high-interest liabilities and finalizing protection covers."}
                      </p>
                  </div>
                </div>
                <div className="w-full lg:w-auto grid grid-cols-2 gap-3 min-w-[320px]">
                  <VitalCard label="Savings Rate" value={`${ui.cashflow.savings_rate.toFixed(1)}%`} sub="Target: 25%+" status={ui.cashflow.savings_rate < 20 ? 'warning' : 'good'} />
                  <VitalCard label="FI Ratio" value={ui.fire.fi_ratio.toFixed(2)} sub="Asset Multiplier" status="good" />
                  <div className="col-span-2">
                      <VitalCard label="Net Worth" value={formatCurrency(ui.netWorth.net_worth)} sub={`Assets: ${formatCurrency(ui.netWorth.total_assets)} | Liabilities: ${formatCurrency(ui.loans.total_loan_amount)}`} status="neutral" />
                  </div>
                </div>
            </div>
          </section>
           <FinancialKundliSeal ui={ui} />

                   {grahaData && <GrahaReport ui={ui} data={grahaData} />}
                   
            
                         <FinancialHealthSnapshot snapshot={ui.snapshot} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: PERFORMANCE & Vitals */}
            <div className="lg:col-span-4 space-y-8">
                
                {/* Scorecard */}
                <section className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Efficiency Ratios</h3>
                  <ScoreBar label="Liquidity Buffer" value={ui.scores.emergency} />
                  <ScoreBar label="Risk Protection" value={ui.scores.protection} />
                  <ScoreBar label="Goal Readiness" value={ui.scores.goals} />
                  <ScoreBar label="Debt Health" value={100 - ui.cashflow.emi_ratio_total} />
                </section>

                {/* Debt diagnostic (New Data Point) */}
                <section className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Debt Diagnostic</h3>
                  <div className="text-center p-4 bg-rose-50/30 rounded-2xl mb-4">
                      <span className="block text-[10px] font-bold text-stone-400 uppercase">Avg Cost of Debt</span>
                      <span className="text-2xl font-serif text-rose-600">{ui.snapshot.average_interest_rate.toFixed(1)}%</span>
                  </div>
                  <MiniStat label="Total Monthly EMIs" value={formatCurrency(ui.loans.total_monthly_emi)} />
                  <MiniStat label="EMI Stress Ratio" value={`${ui.cashflow.emi_ratio_total.toFixed(1)}%`} color={ui.cashflow.emi_ratio_total > 40 ? "text-rose-600" : "text-emerald-600"} />
                  <MiniStat label="Total Liabilities" value={formatCurrency(ui.loans.total_loan_amount)} />
                </section>

                {/* Emergency Fund */}
                <section className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Emergency Runway</h3>
                  <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold">{ui.emergency.months_covered.toFixed(1)} <span className="text-stone-400 text-xs font-normal">Months</span></span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ui.emergency.status === 'GOOD' || ui.emergency.status === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {ui.emergency.status}
                      </span>
                  </div>
                  <MiniStat label="Current Buffer" value={formatCurrency(ui.emergency.current)} />
                  <MiniStat label="Gap to Target" value={formatCurrency(ui.emergency.gap)} color="text-rose-500" />
                  <MiniStat
  label="Risk Profile"
  value={reportData?.input?.tax_and_risk?.risk_profile || '—'}
  color="text-amber-600"
/>


                </section>

                {/* FIRE Visual */}
                <section className="bg-stone-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Financial Freedom</h3>
                  <p className="text-3xl font-serif mb-1 tracking-tight">{formatCurrency(ui.fire.fire_number)}</p>
                  <p className="text-[10px] text-stone-400 mb-6">Required Corpus</p>
                  <div className="pt-4 border-t border-stone-800">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-stone-500 uppercase">Est. Future Monthly Expense</span>
                        <span className="text-stone-300">{formatCurrency(ui.fire.future_annual_expense/12)}</span>
                      </div>
                  </div>
                    <div className="pt-4 border-t border-stone-800">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-stone-500 uppercase">Est. Future Yearly Expense</span>
                        <span className="text-stone-300">{formatCurrency(ui.fire.future_annual_expense)}</span>
                      </div>
                  </div>
                </section>
            </div>

            {/* RIGHT COLUMN: DEEP DIVES */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* Protection / Insurance Section */}
                <section>
                  <div className="flex items-center justify-between px-2 mb-4">
                      <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Icons.Shield /> Risk Protection Gap Analysis</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ProtectionDetail label="Term Life Insurance" recommended={ui.protection.recommended.life} actual={ui.protection.actual.life} />
                      <ProtectionDetail label="Health Insurance" recommended={ui.protection.recommended.health} actual={ui.protection.actual.health} />
                      <ProtectionDetail label="Critical Illness" recommended={ui.protection.recommended.critical} actual={ui.protection.actual.critical} />
                      <ProtectionDetail label="Accident/Disability" recommended={ui.protection.recommended.accident} actual={ui.protection.actual.accident} />
                  </div>
                </section>

                {/* Goals Section (Upgraded GoalDetail) */}
                <section>
                  <div className="flex items-center justify-between px-2 mb-4">
                      <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Icons.Target /> Goal Roadmap</h3>
                      <span className="text-xs font-medium text-stone-400">{ui.goals.length} Goals Tracked</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ui.goals.map((g, i) => <GoalDetail key={i} goal={g} />)}
                  </div>
                </section>

 

                {/* Summary Conclusion Section */}
                <section className="bg-stone-50 rounded-[2rem] p-8 border border-stone-100">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Financial Diagnosis</h3>
                  <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
                    <p>Based on the current trajectory, you have a <strong>{Math.round(ui.score)}%</strong> alignment with your financial objectives. The most significant drag on your score is the <strong>{ui.snapshot.average_interest_rate.toFixed(1)}%</strong> average cost of debt.</p>
                    <p>Action Plan: Prioritize filling the <strong>{formatCurrency(ui.emergency.gap)}</strong> emergency fund gap and review Term Life cover to protect your family's lifestyle from the total liabilities of {formatCurrency(ui.loans.total_loan_amount)}.</p>
                  </div>
                </section>
            </div>
          </div>
          


        
        </main>

        <div className="hidden print:block text-center mt-12 pt-8 border-t border-stone-200 text-[10px] text-stone-300 uppercase tracking-widest">
          Confidential Financial Diagnosis • Generated via Financial Kundli Engine
        </div>
         {/* --- DOWNLOAD MODAL --- */}
      <AnimatePresence>
        {(isDownloading || downloadStatus !== 'idle') && (
          <DownloadModal status={downloadStatus} error={downloadError} />
        )}
      </AnimatePresence>
    </div>
    );
  }