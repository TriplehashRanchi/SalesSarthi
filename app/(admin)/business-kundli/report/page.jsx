'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Activity, Layers, Download, Lock, ChevronRight, X } from 'lucide-react';
import { getAuth } from 'firebase/auth';

// --- COSMIC BACKGROUND ---
const CosmicBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none bg-[#02040a]">
    <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[150px]"></div>
    <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-fuchsia-900/20 rounded-full blur-[150px]"></div>
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
  </div>
);

export default function KundliReportPage() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | grahas | blueprint
  const [selectedGraha, setSelectedGraha] = useState(null); // For Screen 13 Modal

  useEffect(() => {
    const fetchReport = async () => {
      const id = searchParams.get('id');
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kundli/report/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (data.success) setReport(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [searchParams]);


  // --- PDF GENERATION ---
  const generatePDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- 1. AESTHETICS & COLORS ---
    const colors = {
      saffron: [255, 153, 51],  // #FF9933
      deepRed: [139, 0, 0],     // #8B0000
      gold: [212, 175, 55],     // #D4AF37
      cream: [255, 253, 208],   // #FFFDD0
      textBlack: [20, 20, 20]
    };

    // --- 2. BACKGROUND (PARCHMENT LOOK) ---
    doc.setFillColor(...colors.cream);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative Border (Double Line)
    doc.setDrawColor(...colors.deepRed);
    doc.setLineWidth(1.5);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10); // Outer Red

    doc.setDrawColor(...colors.gold);
    doc.setLineWidth(0.5);
    doc.rect(7, 7, pageWidth - 14, pageHeight - 14); // Inner Gold

    // --- 3. HEADER (MANDALA STYLE) ---
    // Top Om/Ganesh Placeholder (Circle)
    doc.setFillColor(...colors.saffron);
    doc.circle(pageWidth / 2, 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Shree", pageWidth / 2, 22, { align: 'center' }); // Simulated Symbol

    // Title
    doc.setTextColor(...colors.deepRed);
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.text("Business Kundli", pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(...colors.textBlack);
    doc.text(`Advisor: ${report.identity.name.toUpperCase()}`, pageWidth / 2, 42, { align: 'center' });
    doc.text(`Role: ${report.identity.type} | Score: ${report.overall_score}/100`, pageWidth / 2, 48, { align: 'center' });

    // --- 4. DRAWING THE NORTH INDIAN KUNDLI CHART (THE DIAMOND) ---
    const cx = pageWidth / 2; // Center X
    const cy = 110;           // Center Y
    const size = 60;          // Half-size (radius equivalent)

    doc.setDrawColor(...colors.deepRed);
    doc.setLineWidth(1);

    // The Outer Box
    doc.rect(cx - size, cy - size, size * 2, size * 2);

    // The Diagonals (Cross)
    doc.line(cx - size, cy - size, cx + size, cy + size);
    doc.line(cx + size, cy - size, cx - size, cy + size);

    // The Inner Diamond (Midpoints)
    doc.line(cx, cy - size, cx - size, cy); // Top to Left
    doc.line(cx - size, cy, cx, cy + size); // Left to Bottom
    doc.line(cx, cy + size, cx + size, cy); // Bottom to Right
    doc.line(cx + size, cy, cx, cy - size); // Right to Top

    // --- 5. PLACING GRAHAS INTO HOUSES (MAPPING) ---
    doc.setFontSize(9);
    doc.setTextColor(...colors.deepRed);
    doc.setFont("helvetica", "bold");

    const drawHouseText = (label, score, x, y) => {
      doc.text(label, x, y, { align: 'center' });
      doc.setTextColor(...colors.textBlack);
      doc.text(`${score}`, x, y + 4, { align: 'center' });
      doc.setTextColor(...colors.deepRed); // Reset
    };

    // House 1 (Top Center - Ascendant): MINDSET (Manobal)
    drawHouseText("MINDSET", report.scores.MANOBAL, cx, cy - 25);

    // House 4 (Left - Happiness/Assets): KNOWLEDGE (Gyaan)
    drawHouseText("KNOWLEDGE", report.scores.GYAAN, cx - 22, cy);

    // House 7 (Bottom Center - Partnership): MEETINGS (Milan)
    drawHouseText("MEETINGS", report.scores.MILAN, cx, cy + 28);

    // House 10 (Right - Karma/Career): TIME (Samay)
    drawHouseText("TIME", report.scores.SAMAY, cx + 22, cy);

    // House 2 (Top Left - Wealth): SALES (Vikray)
    drawHouseText("SALES", report.scores.VIKRAY, cx - 40, cy - 40);

    // House 11 (Top Right - Gains): LEADS (Prospecting)
    drawHouseText("LEADS", report.scores.LEAD, cx + 40, cy - 40);

    // House 5 (Bottom Left - Intellect): SKILLS (Kaushal)
    drawHouseText("SKILLS", report.scores.KAUSHAL, cx - 40, cy + 40);

    // House 9 (Bottom Right - Luck/Trust): TRUST (Vishwas)
    drawHouseText("TRUST", report.scores.VISHWAS, cx + 40, cy + 40);

    // Center Text (Ganesh Area)
    doc.setFontSize(14);
    doc.setTextColor(...colors.saffron);
    doc.text("LABH", cx, cy, { align: 'center' }); // Labh means Profit

    // --- 6. PRIMARY DOSHA SECTION ---
    const startY = 185;

    // Decorative Box for Dosha
    doc.setDrawColor(...colors.gold);
    doc.setFillColor(255, 245, 230); // Lighter cream
    doc.roundedRect(15, startY, pageWidth - 30, 40, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.setTextColor(...colors.deepRed);
    doc.text("PRIMARY DOSHA (MAIN BLOCKAGE)", 20, startY + 8);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.text(`${report.primaryDosha.title}`, 20, startY + 16);

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(`Problem: ${report.primaryDosha.description}`, 170), 20, startY + 24);

    doc.setTextColor(...colors.deepRed);
    doc.setFont("times", "bold");
    doc.text(`Remedy: ${report.primaryDosha.remedy_simple}`, 20, startY + 34);

    // --- 7. 90-DAY PLAN TABLE ---
    doc.setFontSize(14);
    doc.setTextColor(...colors.deepRed);
    doc.text("90-Day Correction Plan", 15, startY + 50);

    const planData = report.primaryDosha.plan_90_days.map(p => [p.phase, p.task]);

    autoTable(doc, {
      startY: startY + 55,
      body: planData,
      theme: 'grid',
      head: [['Phase', 'Task / Ritual']],
      styles: {
        font: "times",
        fillColor: false,
        textColor: colors.textBlack,
        lineColor: colors.gold,
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: colors.saffron,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40, textColor: colors.deepRed },
      },
      margin: { left: 15, right: 15 }
    });

    // --- 8. FOOTER ---
    const footerY = pageHeight - 15;
    doc.setFontSize(10);
    doc.setTextColor(...colors.gold);
    doc.text("Generated by REBORN Business Kundli™", pageWidth / 2, footerY, { align: 'center' });
    doc.setDrawColor(...colors.gold);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

    // Save
    doc.save(`${report.identity.name}_Business_Kundli_Vedic.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
      <p className="text-indigo-300 animate-pulse">Aligning Stars...</p>
    </div>
  );

  if (!report) return <div className="min-h-screen bg-black text-white p-10">Report not found.</div>;

  // --- CHART DATA ---
  const chartData = [
    { subject: 'Time', A: report.scores.SAMAY, fullMark: 100 },
    { subject: 'Know', A: report.scores.GYAAN, fullMark: 100 },
    { subject: 'Skill', A: report.scores.KAUSHAL, fullMark: 100 },
    { subject: 'Lead', A: report.scores.LEAD, fullMark: 100 },
    { subject: 'Meet', A: report.scores.MILAN, fullMark: 100 },
    { subject: 'Sale', A: report.scores.VIKRAY, fullMark: 100 },
    { subject: 'Trust', A: report.scores.VISHWAS, fullMark: 100 },
    { subject: 'Mind', A: report.scores.MANOBAL, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen relative text-slate-50 pb-24 font-sans selection:bg-indigo-500/30">
      <CosmicBackground />

      {/* --- HEADER --- */}
      <div className="sticky top-0 z-50 bg-[#02040a]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-fuchsia-200 to-white">Business Kundli</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">{report.identity.name}</p>
        </div>
        <div className="bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 text-indigo-200 shadow-inner">
          Score: {report.overall_score}
        </div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto p-4 space-y-6">

        {/* =======================
              TAB 1: DASHBOARD
            ======================= */}
        {activeTab === 'dashboard' && (
          <div className="animate-fadeIn space-y-6">


        {/* =======================
            IDENTITY SNAPSHOT
        ======================= */}
        <div className="bg-[#0B0F19]/60 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md shadow-2xl space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
            Kundli Identity
          </p>

          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">
                {report.identity.name}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {report.identity.type} Advisor · {report.identity.employment_type}
              </p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">
                Experience
              </p>
              <p className="text-lg font-black text-indigo-300">
                {report.identity.experience} yrs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Age
              </p>
              <p className="text-base font-bold text-white">
                {report.identity.age}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                City
              </p>
              <p className="text-base font-bold text-white">
                {report.identity.city}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Generated
              </p>
              <p className="text-xs font-semibold text-white">
                {new Date(report.identity.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

            {/* RADAR CHART */}
            <div className="bg-[#0B0F19]/60 border border-white/5 rounded-[2rem] p-4 relative backdrop-blur-md shadow-2xl">
              <ResponsiveContainer width="100%" height="100%">
                {/* GRAHA STRENGTH BARS */}
                  <div className="bg-[#0B0F19]/60 border border-white/5 rounded-[2rem] p-6 space-y-5 backdrop-blur-md shadow-2xl">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
                      Business Energy Levels
                    </h3>

                    {chartData.map((g) => {
                      const isStrong = g.A >= 70;
                      const isMedium = g.A >= 40 && g.A < 70;

                      return (
                        <div key={g.subject}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-200">
                              {g.subject}
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                isStrong
                                  ? 'text-green-400'
                                  : isMedium
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {g.A}/100
                            </span>
                          </div>

                          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isStrong
                                  ? 'bg-green-400'
                                  : isMedium
                                  ? 'bg-yellow-400'
                                  : 'bg-red-400'
                              }`}
                              style={{ width: `${g.A}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[11px] text-slate-500 mt-3 italic">
                      Green = Strong • Yellow = Needs Focus • Red = Blockage
                    </p>
                  </div>
              </ResponsiveContainer>
              <div className="absolute bottom-3 right-5 text-[10px] font-bold uppercase tracking-widest text-slate-600">Graha Mandal</div>
            </div>

            {/* 🔥 MAIN DOSHA CARD */}
            <div className="bg-gradient-to-br from-red-950/40 to-[#0B0F19] border border-red-500/20 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(239,68,68,0.1)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px] rounded-full group-hover:bg-red-500/20 transition-all"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Primary Blockage</p>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">{report.primaryDosha.title}</h2>
                <p className="text-slate-300 leading-relaxed text-sm italic border-l-2 border-red-500/30 pl-3">"{report.primaryDosha.description}"</p>

                <div className="mt-5 pt-4 border-t border-white/5">
                  <p className="text-[10px] text-red-300 font-bold uppercase mb-1 tracking-wider">Impact</p>
                  <p className="text-sm text-slate-400">{report.primaryDosha.impact}</p>
                </div>
              </div>
            </div>

            {/* SECONDARY DOSHAS LIST */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Supporting Doshas</h3>
              <div className="space-y-3">
                {report.secondaryDoshas.map((graha, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-[#0B0F19]/50 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400 border border-white/5">
                        {idx + 2}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">{graha.title}</p>
                        <p className="text-[11px] text-red-400 font-medium">{graha.dosha_title}</p>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-500">{graha.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* =======================
              TAB 2: GRAHAS
            ======================= */}
        {activeTab === 'grahas' && (
          <div className="animate-fadeIn space-y-4">
            <h2 className="text-xl font-bold text-white mb-6 px-2">Detailed Graha Report</h2>
            {report.allGrahas.map((graha) => {
              // Determine Logic
              const isStrong = graha.score >= 70;
              const colorClass = isStrong ? 'text-green-400' : 'text-red-400';
              const bgClass = isStrong ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20';

              return (
                <button
                  key={graha.key}
                  onClick={() => setSelectedGraha(graha)}
                  className="w-full flex items-center justify-between p-5 bg-[#0B0F19]/60 border border-white/5 rounded-2xl hover:bg-white/5 hover:border-white/10 transition-all text-left group shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold border ${bgClass} ${colorClass}`}>
                      {graha.score}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{graha.title}</h3>
                      <p className={`text-[10px] uppercase tracking-widest mt-1 ${isStrong ? 'text-green-500' : 'text-red-500'}`}>
                        {isStrong ? 'Strong (Yoga)' : 'Weak (Dosha)'}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <ChevronRight size={16} className="text-slate-500 group-hover:text-white" />
                  </div>
                </button>
              )
            })}
          </div>
        )}


        {/* =======================
              TAB 3: BLUEPRINT
            ======================= */}
        {activeTab === 'blueprint' && (
          <div className="animate-fadeIn space-y-8">

            {/* REMEDY SUMMARY CARD */}
            <div className="bg-gradient-to-br from-indigo-900/20 to-[#0B0F19] border border-indigo-500/20 p-6 rounded-[2rem] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500"></div>
              <h3 className="text-indigo-300 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">Immediate Remedy</h3>
              <p className="text-lg font-bold text-white mb-2 leading-snug">{report.primaryDosha.remedy_simple}</p>
              <p className="text-sm text-slate-400">Focus on this single habit for the next 7 days.</p>
            </div>

            {/* 90 DAY TIMELINE */}
            <div>
              <h3 className="text-white font-bold text-xl mb-6 px-2">90-Day REBORN Blueprint</h3>
              <div className="relative border-l border-white/10 ml-4 space-y-8 pb-4">
                {report.primaryDosha.plan_90_days.map((phase, i) => (
                  <div key={i} className="relative pl-8 group">
                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-[#02040a] border border-fuchsia-500 group-hover:scale-125 transition-transform"></div>
                    <p className="text-[10px] font-bold text-fuchsia-400 uppercase mb-2 tracking-widest">{phase.phase}</p>
                    <div className="bg-[#0B0F19] border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-colors shadow-sm">
                      <p className="text-slate-300 text-sm leading-relaxed">{phase.task}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SCREEN 16: PDF EXPORT */}
            <button
              onClick={generatePDF}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all hover:bg-slate-100"
            >
              <Download size={20} /> Download PDF Report
            </button>

            {/* SCREEN 17: UPSELL */}
            <div className="mt-8 p-[1px] rounded-[2rem] bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700">
              <div className="bg-[#0B0F19] rounded-[calc(2rem-1px)] p-6 text-center h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-yellow-500/5"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-yellow-500/20">
                    <Lock className="text-white" size={24} />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">Unlock REBORN 2026</h3>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">This reading showed your issues. Our mentorship program gives you the exact scripts, templates, and systems to fix them.</p>
                  <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/25">
                    Join Waitlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- BOTTOM TAB NAVIGATION --- */}
      <div className="fixed md:bottom-6 bottom-20 left-1/2 -translate-x-1/2 md:translate-x-0 bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl z-40 flex gap-1">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Activity size={18} />} label="Dash" />
        <NavButton active={activeTab === 'grahas'} onClick={() => setActiveTab('grahas')} icon={<Layers size={18} />} label="Grahas" />
        <NavButton active={activeTab === 'blueprint'} onClick={() => setActiveTab('blueprint')} icon={<FileText size={18} />} label="Plan" />
      </div>

      {/* --- MODAL: GRAHA DETAILS --- */}
      {/* --- MODAL: GRAHA DETAILS --- */}
      {selectedGraha && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0F172A] border border-white/10 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative">
            {/* Close Button */}
            <button onClick={() => setSelectedGraha(null)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors z-20">
              <X size={20} />
            </button>

            <div className="p-8 relative">
              {/* Dynamic Background Gradient based on Score */}
              <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b pointer-events-none ${selectedGraha.score >= 70 ? 'from-green-500/10' : 'from-red-500/10'} to-transparent`}></div>

              <div className="flex items-center gap-5 mb-8 relative z-10">
                <div className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br ${selectedGraha.score >= 70 ? 'from-green-400 to-emerald-600' : 'from-red-400 to-orange-600'}`}>
                  {selectedGraha.score}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedGraha.title}</h3>
                  <p className={`text-xs font-bold uppercase tracking-wider ${selectedGraha.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedGraha.dosha_title}
                  </p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {/* SECTION 1: DESCRIPTION */}
                <div>
                  <h4 className={`text-[10px] font-bold uppercase mb-2 tracking-widest ${selectedGraha.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedGraha.score >= 70 ? 'Your Strength (Yoga)' : 'The Problem (Dosha)'}
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-white/10 pl-3">
                    "{selectedGraha.description}"
                  </p>
                </div>

                {/* SECTION 2: IMPACT */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2 tracking-widest">Business Impact</h4>
                  <p className="text-slate-400 text-sm italic">"{selectedGraha.impact}"</p>
                </div>

                {/* SECTION 3: ACTION PLAN */}
                <div className={`p-5 rounded-2xl border ${selectedGraha.score >= 70 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <h4 className={`text-[10px] font-bold uppercase mb-2 tracking-widest ${selectedGraha.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedGraha.score >= 70 ? 'Growth Strategy' : 'The Remedy'}
                  </h4>
                  <p className="text-white text-sm font-medium leading-relaxed">
                    {selectedGraha.remedy_advanced}
                  </p>
                </div>
              </div>

              <button onClick={() => setSelectedGraha(null)} className="mt-8 w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-colors border border-white/5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        `}</style>
    </div>
  );
}

// Helper Component for Bottom Nav
const NavButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 ${active
      ? 'bg-white text-black shadow-lg shadow-white/10'
      : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
  >
    {icon}
    {active && <span className="text-xs font-bold uppercase tracking-wide animate-fadeIn">{label}</span>}
  </button>
);