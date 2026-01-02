'use client';

import { motion } from 'framer-motion';
import {
  Coins, TrendingUp, Star, ZapOff, CheckCircle2, Users,
  ShieldAlert, Rocket, Activity, Fingerprint
} from 'lucide-react';

export default function AdvisorIntelligenceView({ report }) {
  /* -------------------- METRICS -------------------- */
  const metrics = [
    { label: '90D Commission', value: report.metrics.commission_90, icon: <Coins className="text-emerald-400" /> },
    { label: '12M Income', value: report.metrics.total_income_12m, icon: <TrendingUp className="text-indigo-400" /> },
    { label: 'Best Month', value: report.metrics.best_month_income, icon: <Star className="text-amber-400" /> },
    { label: 'Worst Month', value: report.metrics.worst_month_income, icon: <ZapOff className="text-red-400" /> },
    { label: 'Closings (90D)', value: report.metrics.sales_closed_90, icon: <CheckCircle2 className="text-fuchsia-400" /> },
    { label: 'Active Clients', value: report.metrics.active_clients, icon: <Users className="text-blue-400" /> },
  ];

  /* -------------------- DOSHA -------------------- */
  const primaryKey = report.graha_scores.primary_dosha;
  const primary = report.ai_report.graha_report[primaryKey];
  const projections = report.ai_report.projections;

  /* -------------------- EFFORT -------------------- */
  const effort = [
    { label: 'Hours / Week', val: report.effort.hours_per_week, max: 60 },
    { label: 'Calls / Day', val: report.effort.calls_per_day, max: 40 },
    { label: 'Meetings / Week', val: report.effort.meetings_per_week, max: 30 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >

      {/* -------------------- SNAPSHOT -------------------- */}
      <section className="bg-gradient-to-br from-indigo-900/40 to-slate-950 border border-indigo-500/20 rounded-[3rem] p-10">
        <p className="text-[10px] tracking-[0.4em] text-indigo-400 font-black uppercase mb-3">
          {report.ai_report.advisor_snapshot.stage} Stage Advisor
        </p>
        <h1 className="text-xl font-semibold leading-tight mb-6">
          “{report.ai_report.advisor_snapshot.one_line_summary}”
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          <InsightCard
            label="Core Strength"
            value={report.ai_report.advisor_snapshot.core_strength}
            tone="emerald"
          />
          <InsightCard
            label="Core Risk"
            value={report.ai_report.advisor_snapshot.core_risk}
            tone="red"
          />
        </div>
      </section>

      {/* -------------------- METRICS -------------------- */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 transition"
          >
            <div className="mb-3">{m.icon}</div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
              {m.label}
            </p>
            <p className="text-xl font-black">
              {typeof m.value === 'number' ? `₹${m.value.toLocaleString()}` : m.value}
            </p>
          </div>
        ))}
      </section>

      {/* -------------------- PROJECTIONS -------------------- */}
      <section className="grid md:grid-cols-2 gap-6">
        <ProjectionCard
          title="If Nothing Changes"
          value={projections.unchanged_90_days.income_range}
          note={projections.unchanged_90_days.bottleneck}
          tone="danger"
          icon={<ZapOff size={64} />}
        />
        <ProjectionCard
          title="With Correct Systems"
          value={projections.with_remedies_90_days.income_range}
          note={projections.with_remedies_90_days.bottleneck}
          tone="success"
          icon={<Rocket size={64} />}
        />
      </section>

      {/* -------------------- PRIMARY BLOCKAGE -------------------- */}
      <section className="bg-white/5 border border-white/10 rounded-[3rem] p-12 grid lg:grid-cols-3 gap-10">
        <div className="flex flex-col items-center text-center justify-center">
          <ShieldAlert size={72} className="text-red-500 mb-4" />
          <h2 className='text-3xl'> {primaryKey}</h2>
          <p className="text-5xl font-black">{primary.score}</p>
          <p className="text-[10px] uppercase tracking-widest text-red-400 font-black">
            Primary Blockage
          </p>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <SectionTitle icon={<Fingerprint />} title="Advisor Truth" />
        
          <div className="grid md:grid-cols-2 gap-6">
            <InsightBox title="Diagnosis" content={primary.insight} />
            <InsightBox
              title="Structural Gap"
              content="Execution Discipline vs Automation Leverage"
            />
          </div>
        </div>
      </section>

      {/* -------------------- SUPPORTING DOSHAS -------------------- */}
      <section>
        <SectionTitle icon={<Activity />} title="Supporting Blockages" />
        <div className="grid md:grid-cols-2 gap-4">
          {report.graha_scores.secondary_doshas.map(key => (
            <div
              key={key}
              className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-6 flex justify-between"
            >
              <div>
                <p className="font-black uppercase tracking-widest">{key}</p>
                <p className="text-xs text-slate-400 italic">
                  {report.ai_report.graha_report[key].insight}
                </p>
              </div>
              <p className="text-3xl font-black text-indigo-500">
                {report.ai_report.graha_report[key].score}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------- EFFORT -------------------- */}
      <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
        <SectionTitle title="Effort Reality Check" />
        <div className="space-y-4 mt-4">
          {effort.map(e => (
            <div key={e.label}>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-500">{e.label}</span>
                <span>{e.val}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(e.val / e.max) * 100}%` }}
                  className="h-full bg-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

    </motion.div>
  );
}

/* -------------------- SMALL COMPONENTS -------------------- */

function InsightCard({ label, value, tone }) {
  return (
    <div className={`bg-${tone}-500/5 border border-${tone}-500/20 rounded-2xl p-5`}>
      <p className={`text-${tone}-400 text-[10px] uppercase tracking-widest font-black mb-1`}>
        {label}
      </p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

function ProjectionCard({ title, value, note, icon, tone }) {
  return (
    <div className={`relative bg-slate-950 border border-${tone === 'danger' ? 'red' : 'emerald'}-500/30 rounded-[2.5rem] p-8`}>
      <div className="absolute top-6 right-6 opacity-20">{icon}</div>
      <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">
        {title}
      </p>
      <p className="text-xl font-black mb-4">{value}</p>
      <p className="text-sm text-slate-400 italic border-l-2 pl-4">
        {note}
      </p>
    </div>
  );
}

function SectionTitle({ title, icon }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">
        {title}
      </h3>
    </div>
  );
}

function InsightBox({ title, content }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-widest font-black text-indigo-400 mb-2">
        {title}
      </p>
      <p className="text-sm text-slate-300">{content}</p>
    </div>
  );
}
