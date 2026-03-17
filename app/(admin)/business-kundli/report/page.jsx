
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getAuth } from 'firebase/auth';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart, Bar, Cell
} from 'recharts';
import { 
  ShieldCheck, Zap, Target, TrendingUp, ChevronRight, Download, 
  Box, LayoutDashboard, Map, Calendar, ArrowUpRight, AlertCircle, 
  Rocket, User, Clock, CheckCircle2, Star, ZapOff, Users, 
  Workflow, Trophy, Globe, Briefcase, Eye, ShieldAlert, FileSearch,
  ArrowRightLeft, BadgePercent, Coins, BarChart3, Loader, Share2
} from 'lucide-react';
import OverviewSection from '../../../../components/kundli/Overview';
import { generateFullAdvisorKundli } from '../../../../utils/businessKundliPdf';

// --- CONFIG ---
const PLANET_THEMES = {
  SURYA: { label: 'Surya', name: 'Advisor Mindset Graha', trait: 'Discipline', icon: '☀️', color: '#FDB813', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  CHANDRA: { label: 'Chandra',name: 'Client Behaviour Graha', trait: 'Engagement', icon: '🌙', color: '#94A3B8', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  BUDHA: { label: 'Budha', name: 'Client Behaviour Graha', trait: 'Positioning', icon: '☿', color: '#10B981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  MANGAL: { label: 'Mangal', name: 'Competition Graha', trait: 'Execution', icon: '♂', color: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  SHANI: { label: 'Shani', name: 'Technology Graha', trait: 'Systems', icon: '♄', color: '#8B5CF6', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  GURU: { label: 'Guru', name: 'Compliance Graha', trait: 'Process', icon: '♃', color: '#EAB308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  SHUKRA: { label: 'Shukra', name: 'Branding and Social Media Graha', trait: 'Branding', icon: '♀', color: '#EC4899', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
};

export default function ComprehensiveBusinessKundli() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileAction, setFileAction] = useState('download');
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | processing | success | error
  const [downloadError, setDownloadError] = useState(null);
  const [downloadMessage, setDownloadMessage] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      const id = searchParams.get('id');
      if (!id) { setLoading(false); return; }
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kundli/report/${id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setReport(data.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchReport();
  }, [searchParams]);

  const getPdfFilename = () => `${report?.identity?.name || 'Report'}_Business_Kundli.pdf`;

  const resetFileActionState = (delay = 2500) => {
    window.setTimeout(() => {
      setDownloadStatus('idle');
      setIsDownloading(false);
      setDownloadMessage('');
      setDownloadError(null);
    }, delay);
  };

  const saveBlobToDevice = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const fetchPdfBlob = async () => {
    const id = searchParams.get("id");
    if (!id) {
      throw new Error('Invalid report ID');
    }

    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/kundli/report/${id}/pdf`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    if (blob.size === 0) throw new Error('Empty PDF received');

    return blob;
  };

  const downloadPdf = async () => {
    setFileAction('download');
    setIsDownloading(true);
    setDownloadStatus('processing');
    setDownloadError(null);
    setDownloadMessage('Preparing your Business Kundli PDF for download...');

    try {
      const blob = await fetchPdfBlob();
      const filename = getPdfFilename();

      if (Capacitor.isNativePlatform()) {
        const base64Data = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: filename,
          data: base64Data.split(',')[1],
          directory: Directory.Documents,
        });
      } else {
        saveBlobToDevice(blob, filename);
      }

      setDownloadStatus('success');
      setDownloadMessage(
        Capacitor.isNativePlatform()
          ? 'Your PDF has been saved to device documents.'
          : 'Your PDF has been saved to downloads.'
      );
      resetFileActionState(2000);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadStatus('error');
      setDownloadError(err.message || 'Failed to download PDF');
      setDownloadMessage('');
      resetFileActionState(3000);
    }
  };

  const sharePdf = async () => {
    setFileAction('share');
    setIsDownloading(true);
    setDownloadStatus('processing');
    setDownloadError(null);
    setDownloadMessage('Preparing your Business Kundli PDF for sharing...');

    try {
      const blob = await fetchPdfBlob();
      const filename = getPdfFilename();

      if (Capacitor.isNativePlatform()) {
        const base64Data = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: filename,
          data: base64Data.split(',')[1],
          directory: Directory.Cache,
        });
        const { uri } = await Filesystem.getUri({
          directory: Directory.Cache,
          path: filename,
        });
        await Share.share({
          title: `${report?.identity?.name || 'Business Kundli'} Report`,
          text: 'Business Kundli PDF report',
          files: [uri],
          dialogTitle: 'Share Business Kundli',
        });
        setDownloadStatus('success');
        setDownloadMessage('Native share sheet opened successfully.');
      } else {
        const pdfFile = new File([blob], filename, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
          await navigator.share({
            title: `${report?.identity?.name || 'Business Kundli'} Report`,
            text: 'Business Kundli PDF report',
            files: [pdfFile],
          });
          setDownloadStatus('success');
          setDownloadMessage('Native share sheet opened successfully.');
        } else {
          saveBlobToDevice(blob, filename);
          setDownloadStatus('success');
          setDownloadMessage('Share is not supported here, so the PDF was saved to downloads.');
        }
      }

      resetFileActionState(2200);
    } catch (err) {
      if (err?.name === 'AbortError') {
        setDownloadStatus('idle');
        setIsDownloading(false);
        setDownloadMessage('');
        return;
      }

      console.error('Share error:', err);
      setDownloadStatus('error');
      setDownloadError(err.message || 'Failed to share PDF');
      setDownloadMessage('');
      resetFileActionState(3000);
    }
  };


  if (loading) return <LoadingScreen />;
  if (!report) return <ErrorScreen />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans pb-24">
      {/* Dynamic Cosmic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-8">
        
        {/* --- TOP IDENTITY BAR --- */}
        <header className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[1rem] p-6 md:p-8 mb-8 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full" />
          <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
            <div className="flex items-start gap-4 md:gap-6 md:items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-indigo-500 to-fuchsia-600 rounded-[1rem] flex items-center justify-center text-white shadow-2xl transform shrink-0">
                <User size={48} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight break-words">{report.identity.name}</h1>
                <div className="flex flex-wrap gap-2 md:gap-3 mt-3">
                   <Badge label={`${report.identity.age} Years`} icon={<Calendar size={12}/>} />
                   <Badge label={report.identity.city} icon={<Globe size={12}/>} />
                   <Badge label={`${report.identity.experience_years}Y Experience`} icon={<Briefcase size={12}/>} color="text-indigo-400" />
                   <Badge label={report.identity.employment_type} icon={<Clock size={12}/>} />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-center gap-4 md:gap-6">
               <div className="text-left md:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 md:mb-1">Kundli Alignment</p>
                  <p className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
                    {report.graha_scores.overall_score}<span className="text-lg md:text-xl text-slate-600">/100</span>
                  </p>
               </div>
               <div className="flex md:hidden w-full gap-3">
                 <button
                   onClick={downloadPdf}
                   disabled={isDownloading}
                   className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-900 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-400"
                 >
                   <Download size={16} />
                   Save
                 </button>
                 <button
                   onClick={sharePdf}
                   disabled={isDownloading}
                   className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-indigo-100 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                 >
                   <Share2 size={16} />
                   Share
                 </button>
               </div>
               <div className="hidden md:block h-16 w-px bg-white/10" />
               <div className="hidden md:flex items-center gap-3">
                 <button
                   onClick={sharePdf}
                   disabled={isDownloading}
                   className="inline-flex items-center gap-2 px-5 py-4 bg-white/10 hover:bg-white/15 disabled:bg-slate-400/30 text-white rounded-xl transition-all border border-white/10 active:scale-95 disabled:cursor-not-allowed"
                 >
                   <Share2 size={18} />
                   <span className="text-xs font-black uppercase tracking-[0.2em]">Share</span>
                 </button>
                 <button 
                   onClick={downloadPdf}
                   disabled={isDownloading}
                   className="inline-flex items-center gap-2 px-5 py-4 bg-white hover:bg-slate-200 disabled:bg-slate-400 text-slate-900 rounded-xl transition-all shadow-xl shadow-white/5 active:scale-95 disabled:cursor-not-allowed"
                 >
                    <Download size={18} />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Save PDF</span>
                 </button>
               </div>
            </div>
          </div>
        </header>

        {/* --- NAVIGATION --- */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 bg-slate-950/50 p-2 rounded-xl border border-white/5 backdrop-blur-md">
          <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="Instant Remedies" />
          <NavBtn active={activeTab === 'grahas'} onClick={() => setActiveTab('grahas')} icon={<Zap size={20}/>} label="Planetary Map" />
          <NavBtn active={activeTab === 'strategy'} onClick={() => setActiveTab('strategy')} icon={<Workflow size={20}/>} label="Execution" />
          <NavBtn active={activeTab === 'legacy'} onClick={() => setActiveTab('legacy')} icon={<Trophy size={20}/>} label="3-Year Legacy" />
          {/* <NavBtn active={activeTab === 'projections'} onClick={() => setActiveTab('projections')} icon={<TrendingUp size={20}/>} label="The Oracle" /> */}
        </div>

        {/* --- MAIN VIEWS --- */}
        <main>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <OverviewSection report={report} />}
            {activeTab === 'grahas' && <GrahasView report={report} />}
            {activeTab === 'strategy' && <StrategyView report={report} />}
            {activeTab === 'legacy' && <LegacyView report={report} />}
            {activeTab === 'projections' && <ProjectionsView report={report} />}
          </AnimatePresence>
        </main>
      </div>

      {/* --- DOWNLOAD MODAL --- */}
      <AnimatePresence>
        {(isDownloading || downloadStatus !== 'idle') && (
          <DownloadModal status={downloadStatus} error={downloadError} message={downloadMessage} action={fileAction} />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- VIEW COMPONENTS ---

function DashboardView({ report }) {
  const mainMetrics = [
    { label: '90D Commission', value: `₹${parseInt(report.metrics.commission_90).toLocaleString()}`, icon: <Coins size={20} className="text-emerald-400"/> },
    { label: 'Total Income (12M)', value: `₹${parseInt(report.metrics.total_income_12m).toLocaleString()}`, icon: <TrendingUp size={20} className="text-indigo-400"/> },
    { label: 'Best Month', value: `₹${parseInt(report.metrics.best_month_income).toLocaleString()}`, icon: <Star size={20} className="text-amber-400"/> },
    { label: 'Worst Month', value: `₹${parseInt(report.metrics.worst_month_income).toLocaleString()}`, icon: <ZapOff size={20} className="text-red-400"/> },
    { label: 'Closing Count', value: report.metrics.sales_closed_90, icon: <CheckCircle2 size={20} className="text-fuchsia-400"/> },
    { label: 'Active Clients', value: report.metrics.active_clients, icon: <Users size={20} className="text-blue-400"/> },
  ];

  const effortData = [
    { name: 'Hours/Wk', val: report.effort.hours_per_week, max: 60 },
    { name: 'Calls/Day', val: report.effort.calls_per_day, max: 40 },
    { name: 'Meetings/Wk', val: report.effort.meetings_per_week, max: 40 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Snapshot & One Liner */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600/20 to-transparent border border-indigo-500/20 rounded-[1rem] p-10 flex flex-col justify-center">
          <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.4em] mb-4">{report.ai_report.advisor_snapshot.stage} Stage Advisor</p>
          <h2 className="text-4xl font-bold leading-tight mb-8">"{report.ai_report.advisor_snapshot.one_line_summary}"</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl">
               <p className="text-[10px] font-black uppercase text-emerald-500 mb-1 tracking-widest">Core Strength</p>
               <p className="text-sm font-bold">{report.ai_report.advisor_snapshot.core_strength}</p>
             </div>
             <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
               <p className="text-[10px] font-black uppercase text-red-500 mb-1 tracking-widest">Core Risk</p>
               <p className="text-sm font-bold">{report.ai_report.advisor_snapshot.core_risk}</p>
             </div>
          </div>
        </div>

        {/* Effort Pulse */}
        <div className="bg-white/5 border border-white/10 rounded-[1rem] p-8 flex flex-col justify-between">
           <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6">Effort vs. Intensity</h3>
           <div className="space-y-6">
              {effortData.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500">{d.name}</span>
                    <span>{d.val}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(d.val/d.max)*100}%` }} className="h-full bg-indigo-500 rounded-full" />
                  </div>
                </div>
              ))}
           </div>
           <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Prospecting Channels</p>
              <div className="flex flex-wrap gap-2">
                {report.effort.prospecting_sources.map(s => (
                  <span key={s} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest">{s}</span>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* Metrics Hexagon Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {mainMetrics.map((m, i) => (
          <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[1rem] hover:bg-white/10 transition-all">
            <div className="mb-4">{m.icon}</div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">{m.label}</p>
            <p className="text-xl font-black">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Mandatory KPIs Block */}
      <div className="bg-white/5 border border-white/10 rounded-[1rem] p-8">
        <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-6 text-indigo-400">Mandatory Growth KPIs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.ai_report.mandatory_kpis.map((kpi, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">{idx+1}</div>
              <span className="text-xs font-bold text-slate-300 tracking-tight">{kpi}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function GrahasView({ report }) {
  const scores = report.ai_report.graha_report;
  const radarData = Object.entries(scores).map(([key, val]) => ({
    subject: PLANET_THEMES[key].trait,
    A: val.score,
    fullMark: 100,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Radar Chart Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-white/5 border border-white/10 rounded-[1rem] p-10">
        <div className="h-[300px] w-full col-span-1">
           <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <Radar name="Kunal" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.4} />
              </RadarChart>
           </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2">
           <div className="flex items-center gap-4 mb-6">
              <ShieldAlert className="text-red-500" size={32} />
              <h3 className="text-2xl font-black">Primary Blockage: {report.graha_scores.primary_dosha}</h3>
           </div>
           <p className="text-slate-400 leading-relaxed text-lg mb-6">
             {report.ai_report.graha_report[report.graha_scores.primary_dosha].insight}
           </p>
           <div className="flex flex-wrap gap-3">
              {report.graha_scores.secondary_doshas.map(d => (
                <div key={d} className="px-6 py-2 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-2">
                  <ZapOff size={14} className="text-red-500" />
                  <span className="text-xs font-black uppercase text-red-500">{d} Impact</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Detailed Planet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(scores).map(([key, planet]) => {
          const theme = PLANET_THEMES[key];
          const isStrong = planet.status === 'STRONG';
          return (
            <div key={key} className={`${theme.bg} ${theme.border} border p-8 rounded-[1rem] flex flex-col h-full group hover:bg-white/5 transition-all`}>
              <div className="flex justify-between items-start mb-6">
                <div className="text-5xl group-hover:scale-110 transition-transform">{theme.icon}</div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{theme.label}</p>
                  <p className="text-sm font-bold mb-2">{theme.name}</p>
                  <p className="text-3xl font-black" style={{ color: theme.color }}>{planet.score}</p>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isStrong ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    {planet.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 italic mb-6 leading-relaxed">"{planet.insight}"</p>
              <div className="space-y-4 mt-auto pt-6 border-t border-white/5">
                {planet.actions.map((act, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle2 size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-white leading-tight uppercase mb-1 tracking-tight">{act.title}</p>
                      <p className="text-[10px] text-slate-500 leading-snug">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function StrategyView({ report }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      
      {/* 90 DAY REPAIR PLAN (With Proofs) */}
      <section>
        <div className="flex items-center gap-4 mb-8">
           <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg"><Clock size={24}/></div>
           <h2 className="text-3xl font-black">90-Day Corrective Sprint</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {report.ai_report.ninety_day_repair_plan.map((phase, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[1rem] relative overflow-hidden group">
               <div className="absolute -top-6 -right-6 text-9xl font-black text-white/5 group-hover:text-white/10 transition-all">0{i+1}</div>
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{phase.week_range}</p>
               <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                 Focus: {PLANET_THEMES[phase.focus_graha]?.icon} {phase.focus_graha}
               </h4>
               <ul className="space-y-3 mb-8">
                  {phase.actions.map((act, ai) => (
                    <li key={ai} className="text-xs text-slate-400 flex gap-2">
                      <ArrowUpRight size={14} className="text-indigo-500 shrink-0"/> {act}
                    </li>
                  ))}
               </ul>
               <div className="space-y-4 pt-6 border-t border-white/10 relative z-10">
                  <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Target KPI</p>
                    <p className="text-sm font-bold text-white">{phase.kpi}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <FileSearch size={12}/> Required Proof
                    </p>
                    <p className="text-xs text-indigo-300 font-medium italic leading-relaxed">{phase.proof}</p>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* 12 MONTH SYSTEMS ARCHITECT */}
      <section className="pt-12 border-t border-white/10">
        <h2 className="text-3xl font-black mb-10 text-center">12 Month Execution Plan</h2>
        <div className="space-y-8">
           {Object.entries(report.ai_report.roadmap_12_months).map(([q, data]) => (
             <div key={q} className="bg-slate-900/50 border border-white/5 rounded-[1rem] p-10 lg:p-14">
               <div className="flex flex-col lg:flex-row gap-12">
                 <div className="lg:w-1/4">
                    <div className="text-7xl font-black text-indigo-500 opacity-20 mb-2">{q}</div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-widest underline decoration-indigo-500 decoration-4 underline-offset-8">
                      {data.theme}
                    </h3>
                    <div className="mt-10 space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Quarterly Milestones</p>
                      {data.outcomes.map((o, oi) => (
                        <div key={oi} className="flex justify-between items-end border-b border-white/5 pb-2">
                          <span className="text-xs text-slate-400 font-bold">{o.metric}</span>
                          <span className="text-xs font-black text-indigo-400">{o.target}</span>
                        </div>
                      ))}
                    </div>
                 </div>
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {data.systems.map((sys, si) => (
                      <div key={si} className="bg-white/5 border border-white/5 p-8 rounded-[1rem] hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><Workflow size={20}/></div>
                          <h4 className="text-lg font-bold">{sys.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 italic mb-6 leading-relaxed">"Goal: {sys.purpose}"</p>
                        <div className="space-y-3 mb-8">
                          {sys.implementation_steps.map((step, sidx) => (
                            <div key={sidx} className="flex gap-3 text-xs text-slate-300">
                               <span className="text-indigo-500 font-black tracking-tighter">STEP {sidx+1}</span>
                               <span>{step}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
                           <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Maturity Target</p>
                           <p className="text-xs font-bold text-white leading-relaxed">{sys.maturity_target}</p>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
             </div>
           ))}
        </div>
      </section>
    </motion.div>
  );
}

function LegacyView({ report }) {
  const years = report.ai_report.roadmap_3_years;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      {Object.entries(years).map(([yearKey, data], i) => (
        <div key={yearKey} className="relative">
          <div className="bg-white/5 border border-white/10 rounded-[1rem] p-12 overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
               <Trophy size={200} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
              {/* Year Focus */}
              <div className="lg:col-span-4">
                <div className="inline-block px-6 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest mb-6 shadow-lg">
                  Year {i+1}
                </div>
                <h3 className="text-2xl font-black text-white leading-tight mb-8">{data.focus}</h3>
                <div className="bg-indigo-500/10 p-6 rounded-[1rem] border border-indigo-500/20">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Financial Structure</p>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Type</span>
                        <span className="text-xs font-black text-white">{data.income_evolution.income_type}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Predictability</span>
                        <span className="text-xs font-black text-white">{data.income_evolution.predictability}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Dependency</span>
                        <span className="text-xs font-black text-white">{data.income_evolution.dependency}</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Outcomes & Milestones */}
              <div className="lg:col-span-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Strategic Milestones</p>
                 <div className="space-y-4">
                    {data.outcomes.map((o, oi) => (
                      <div key={oi} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                        <span className="text-xs text-slate-300 font-medium">{o.metric}</span>
                        <span className="text-xs font-black text-emerald-400">{o.target}</span>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Role Evolution */}
              <div className="lg:col-span-4 space-y-8">
                 <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Your Primary Focus</p>
                    <div className="flex flex-wrap gap-2">
                      {data.advisor_role_evolution.primary_focus.map(f => (
                        <span key={f} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold rounded-xl">{f}</span>
                      ))}
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">Eliminate / Delegate</p>
                    <div className="flex flex-wrap gap-2">
                      {data.advisor_role_evolution.reduced_involvement.map(f => (
                        <span key={f} className="px-4 py-2 bg-red-500/5 border border-red-500/10 text-slate-500 text-xs font-bold rounded-xl line-through decoration-red-500/50">{f}</span>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function ProjectionsView({ report }) {
  const proj = report.ai_report.projections;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Unchanged Path */}
        <div className="bg-red-500/5 border border-red-500/10 p-10 rounded-[1rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-red-500 transform group-hover:rotate-12 transition-transform">
             <ShieldAlert size={120} />
          </div>
          <p className="text-xs font-black text-red-500 uppercase tracking-[0.4em] mb-4">Scenario: As Is</p>
          <h3 className="text-5xl font-black text-slate-400 mb-6">{proj.unchanged_90_days.income_range}</h3>
          <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase mb-8">
             <AlertCircle size={14} /> Risk Level: {proj.unchanged_90_days.risk_level}
          </div>
          <div className="bg-black/20 p-6 rounded-xl border border-red-500/10">
             <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Primary Bottleneck</p>
             <p className="text-sm font-medium text-slate-300 leading-relaxed italic">"{proj.unchanged_90_days.bottleneck}"</p>
          </div>
        </div>

        {/* Growth Path */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/20 p-10 rounded-[1rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-500 transform group-hover:scale-110 transition-transform">
             <Rocket size={120} />
          </div>
          <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Scenario: Post Remedy</p>
          <h3 className="text-5xl font-black text-white mb-6">{proj.with_remedies_90_days.income_range}</h3>
          <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase mb-8 tracking-widest">
             <CheckCircle2 size={14} /> Systems Corrected
          </div>
          <div className="bg-emerald-500/5 p-6 rounded-xl border border-emerald-500/10">
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Strategy Unlock</p>
             <p className="text-sm font-bold text-white leading-relaxed italic">"{proj.with_remedies_90_days.bottleneck}"</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 p-10 rounded-[1rem] text-center">
         <p className="text-lg italic text-slate-400 max-w-2xl mx-auto">
           "{report.ai_report.closing_message}"
         </p>
      </div>
    </motion.div>
  );
}

// --- HELPER COMPONENTS ---

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-8 py-4 rounded-xl whitespace-nowrap transition-all duration-300 ${active ? 'bg-white text-slate-900 shadow-xl scale-105 font-black' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
      {icon} <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function Badge({ label, icon, color="text-slate-400" }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest ${color}`}>
      {icon} {label}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full mb-8 shadow-2xl shadow-indigo-500/20" />
      <h2 className="text-white font-black text-xl tracking-[0.5em] animate-pulse">ALIGINING COSMIC FORCES</h2>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
       <div className="text-center bg-white/5 p-12 rounded-[1rem] border border-white/10">
          <ShieldAlert size={64} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black mb-4">Report Not Found</h2>
          <p className="text-slate-500 mb-8">The ID requested does not exist or access is restricted.</p>
          <button onClick={() => window.history.back()} className="px-8 py-3 bg-white text-slate-900 font-black rounded-xl">Return Home</button>
       </div>
    </div>
  );
}

// --- DOWNLOAD MODAL COMPONENT ---
function DownloadModal({ status, error, message, action }) {
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
            {isProcessing && (action === 'share' ? 'Preparing Share' : 'Generating PDF')}
            {isSuccess && (action === 'share' ? 'Ready to Share' : 'Download Complete!')}
            {isError && (action === 'share' ? 'Share Failed' : 'Download Failed')}
          </h3>

          {/* Description */}
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {message || (isProcessing
              ? 'Your Business Kundli report is being generated. This may take a moment...'
              : isSuccess
              ? 'Your Business Kundli PDF is ready.'
              : isError && error
              ? `${error}. Please try again.`
              : '')}
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
