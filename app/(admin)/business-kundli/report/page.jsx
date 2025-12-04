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
  <div className="fixed inset-0 z-0 pointer-events-none bg-[#050914]">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e1b4b] via-[#050914] to-black"></div>
    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
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


  // --- 2. PDF GENERATION (Screen 16) ---
// --- IMPORT THIS AT THE TOP ---
// Ensure you have jspdf and jspdf-autotable installed
// npm install jspdf jspdf-autotable

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
    // This draws the specific geometry shown in your image
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
    // We map your Business Grahas to astrological houses for visual impact
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
    // We use autotable but style it to look like a scripture list
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

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-yellow-500">Connecting to Cosmos...</div>;
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
    <div className="h-screen relative text-slate-50 font-sans selection:bg-yellow-500/30 overflow-hidden grid grid-rows-[auto_1fr_auto]">
      <CosmicBackground />

      {/* --- HEADER --- */}
      <div className="z-20 bg-[#050914]/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">Business Kundli</h1>
          <p className="text-xs text-slate-400">{report.identity.name}</p>
        </div>
        <div className="bg-white/10 px-3 py-1 rounded-full text-sm font-bold border border-white/20">
          Score: {report.overall_score}
        </div>
      </div>

      <div className="relative z-10 overflow-y-auto min-h-0 px-4 py-4 lg:px-8 lg:py-6">
        <div className="max-w-5xl mx-auto space-y-6">

        {/* =======================
            TAB 1: DASHBOARD (Screen 11) 
           ======================= */}
        {activeTab === 'dashboard' && (
          <div className="animate-fadeIn space-y-6">
            
            {/* RADAR CHART */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 h-72 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Radar name="Score" dataKey="A" stroke="#EAB308" strokeWidth={2} fill="#EAB308" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="absolute bottom-2 right-4 text-xs text-slate-500">Graha Mandal</div>
            </div>

            {/* 🔥 MAIN DOSHA CARD */}
            <div className="bg-gradient-to-br from-red-900/40 to-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-lg shadow-red-900/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span>
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">Primary Blockage</p>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{report.primaryDosha.title}</h2>
              <p className="text-slate-300 leading-relaxed text-sm italic">"{report.primaryDosha.description}"</p>
              
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-red-300 font-bold uppercase mb-1">Impact</p>
                <p className="text-sm text-slate-400">{report.primaryDosha.impact}</p>
              </div>
            </div>

            {/* SECONDARY DOSHAS LIST */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Supporting Doshas</h3>
              <div className="space-y-3">
                {report.secondaryDoshas.map((graha, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {idx + 2}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{graha.title}</p>
                        <p className="text-xs text-red-400">{graha.dosha_title}</p>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-slate-500">{graha.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* =======================
            TAB 2: GRAHAS (Screen 12 & 13)
           ======================= */}
        {activeTab === 'grahas' && (
          <div className="animate-fadeIn space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Detailed Graha Report</h2>
            {report.allGrahas.map((graha) => (
              <button 
                key={graha.key}
                onClick={() => setSelectedGraha(graha)}
                className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  {/* Planet Icon Visual */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${graha.score > 60 ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                    {graha.score}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{graha.title}</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">{graha.score > 60 ? 'Strong' : 'Weakness Detected'}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        )}


        {/* =======================
            TAB 3: BLUEPRINT (Screen 14 & 15)
           ======================= */}
        {activeTab === 'blueprint' && (
          <div className="animate-fadeIn space-y-8">
            
            {/* REMEDY SUMMARY CARD */}
            <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-3xl">
              <h3 className="text-indigo-300 font-bold uppercase tracking-widest text-xs mb-4">Immediate Remedy</h3>
              <p className="text-xl font-bold text-white mb-2">{report.primaryDosha.remedy_simple}</p>
              <p className="text-sm text-slate-400">Focus on this single habit for the next 7 days.</p>
            </div>

            {/* 90 DAY TIMELINE */}
            <div>
              <h3 className="text-white font-bold text-xl mb-6">90-Day REBORN Blueprint</h3>
              <div className="relative border-l-2 border-white/10 ml-4 space-y-8 pb-4">
                {report.primaryDosha.plan_90_days.map((phase, i) => (
                  <div key={i} className="relative pl-8">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-yellow-500"></div>
                    <p className="text-xs font-bold text-yellow-500 uppercase mb-1">{phase.phase}</p>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                      <p className="text-slate-200 text-sm leading-relaxed">{phase.task}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SCREEN 16: PDF EXPORT */}
            <button 
              onClick={generatePDF}
              className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <Download size={20} /> Download PDF Report
            </button>

            {/* SCREEN 17: UPSELL */}
            <div className="mt-8 bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-3xl p-1">
              <div className="bg-[#0B0F1A] rounded-[22px] p-6 text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Lock className="text-yellow-500" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Unlock REBORN 2026</h3>
                <p className="text-slate-400 text-sm mb-6">This reading showed your issues. Our mentorship program gives you the exact scripts, templates, and systems to fix them.</p>
                <button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition-colors">
                  Join Waitlist
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* --- BOTTOM TAB NAVIGATION --- */}
      <div className="bg-[#050914]/90 backdrop-blur-lg border-t lg:border border-white/10 p-2 z-20 lg:w-auto lg:max-w-5xl lg:mx-auto w-full shadow-[0_18px_60px_rgba(0,0,0,0.4)]">
        <div className="flex justify-around max-w-lg mx-auto lg:max-w-none">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Activity size={20} />} label="Dashboard" />
          <NavButton active={activeTab === 'grahas'} onClick={() => setActiveTab('grahas')} icon={<Layers size={20} />} label="Grahas" />
          <NavButton active={activeTab === 'blueprint'} onClick={() => setActiveTab('blueprint')} icon={<FileText size={20} />} label="Blueprint" />
        </div>
      </div>

      {/* --- MODAL: GRAHA DETAILS (Screen 13) --- */}
      {selectedGraha && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0F172A] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Close Button */}
            <button onClick={() => setSelectedGraha(null)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white">
              <X size={20} />
            </button>
            
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl font-bold text-yellow-500">{selectedGraha.score}</div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedGraha.title}</h3>
                  <p className="text-slate-400 text-sm">{selectedGraha.dosha_title}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase text-red-400 mb-2">The Problem</h4>
                  <p className="text-slate-200 text-sm leading-relaxed">{selectedGraha.description}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Business Impact</h4>
                  <p className="text-slate-400 text-sm italic">{selectedGraha.impact}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <h4 className="text-xs font-bold uppercase text-green-400 mb-2">The Remedy</h4>
                  <p className="text-white text-sm font-medium">{selectedGraha.remedy_advanced}</p>
                </div>
              </div>
              
              <button onClick={() => setSelectedGraha(null)} className="mt-8 w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

// Helper Component for Bottom Nav
const NavButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl w-20 transition-all ${active ? 'text-yellow-500 bg-yellow-500/10' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
  </button>
);
