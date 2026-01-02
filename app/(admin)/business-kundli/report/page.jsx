// 'use client';

// import { useEffect, useState, useRef } from 'react';
// import { useSearchParams } from 'next/navigation';
// import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import { FileText, Activity, Layers, Download, Lock, ChevronRight, X } from 'lucide-react';
// import { getAuth } from 'firebase/auth';

// // --- COSMIC BACKGROUND ---
// const CosmicBackground = () => (
//   <div className="fixed inset-0 z-0 pointer-events-none bg-[#02040a]">
//     <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[150px]"></div>
//     <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-fuchsia-900/20 rounded-full blur-[150px]"></div>
//     <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
//   </div>
// );

// export default function KundliReportPage() {
//   const searchParams = useSearchParams();
//   const [report, setReport] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | grahas | blueprint
//   const [selectedGraha, setSelectedGraha] = useState(null); // For Screen 13 Modal

//   useEffect(() => {
//     const fetchReport = async () => {
//       const id = searchParams.get('id');
//       if (!id) {
//         setLoading(false);
//         return;
//       }

//       try {
//         const auth = getAuth();
//         const token = await auth.currentUser?.getIdToken();

//         const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kundli/report/${id}`, {
//           method: 'GET',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`
//           }
//         });

//         const data = await res.json();

//         if (data.success) setReport(data.data);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchReport();
//   }, [searchParams]);


//   // --- PDF GENERATION ---
//   const generatePDF = () => {
//     if (!report) return;

//     const doc = new jsPDF();
//     const pageWidth = doc.internal.pageSize.width;
//     const pageHeight = doc.internal.pageSize.height;

//     // --- 1. AESTHETICS & COLORS ---
//     const colors = {
//       saffron: [255, 153, 51],  // #FF9933
//       deepRed: [139, 0, 0],     // #8B0000
//       gold: [212, 175, 55],     // #D4AF37
//       cream: [255, 253, 208],   // #FFFDD0
//       textBlack: [20, 20, 20]
//     };

//     // --- 2. BACKGROUND (PARCHMENT LOOK) ---
//     doc.setFillColor(...colors.cream);
//     doc.rect(0, 0, pageWidth, pageHeight, 'F');

//     // Decorative Border (Double Line)
//     doc.setDrawColor(...colors.deepRed);
//     doc.setLineWidth(1.5);
//     doc.rect(5, 5, pageWidth - 10, pageHeight - 10); // Outer Red

//     doc.setDrawColor(...colors.gold);
//     doc.setLineWidth(0.5);
//     doc.rect(7, 7, pageWidth - 14, pageHeight - 14); // Inner Gold

//     // --- 3. HEADER (MANDALA STYLE) ---
//     // Top Om/Ganesh Placeholder (Circle)
//     doc.setFillColor(...colors.saffron);
//     doc.circle(pageWidth / 2, 20, 8, 'F');
//     doc.setTextColor(255, 255, 255);
//     doc.setFont("times", "bold");
//     doc.setFontSize(14);
//     doc.text("Shree", pageWidth / 2, 22, { align: 'center' }); // Simulated Symbol

//     // Title
//     doc.setTextColor(...colors.deepRed);
//     doc.setFont("times", "bold");
//     doc.setFontSize(26);
//     doc.text("Business Kundli", pageWidth / 2, 35, { align: 'center' });

//     doc.setFontSize(12);
//     doc.setTextColor(...colors.textBlack);
//     doc.text(`Advisor: ${report.identity.name.toUpperCase()}`, pageWidth / 2, 42, { align: 'center' });
//     doc.text(`Role: ${report.identity.type} | Score: ${report.overall_score}/100`, pageWidth / 2, 48, { align: 'center' });

//     // --- 4. DRAWING THE NORTH INDIAN KUNDLI CHART (THE DIAMOND) ---
//     const cx = pageWidth / 2; // Center X
//     const cy = 110;           // Center Y
//     const size = 60;          // Half-size (radius equivalent)

//     doc.setDrawColor(...colors.deepRed);
//     doc.setLineWidth(1);

//     // The Outer Box
//     doc.rect(cx - size, cy - size, size * 2, size * 2);

//     // The Diagonals (Cross)
//     doc.line(cx - size, cy - size, cx + size, cy + size);
//     doc.line(cx + size, cy - size, cx - size, cy + size);

//     // The Inner Diamond (Midpoints)
//     doc.line(cx, cy - size, cx - size, cy); // Top to Left
//     doc.line(cx - size, cy, cx, cy + size); // Left to Bottom
//     doc.line(cx, cy + size, cx + size, cy); // Bottom to Right
//     doc.line(cx + size, cy, cx, cy - size); // Right to Top

//     // --- 5. PLACING GRAHAS INTO HOUSES (MAPPING) ---
//     doc.setFontSize(9);
//     doc.setTextColor(...colors.deepRed);
//     doc.setFont("helvetica", "bold");

//     const drawHouseText = (label, score, x, y) => {
//       doc.text(label, x, y, { align: 'center' });
//       doc.setTextColor(...colors.textBlack);
//       doc.text(`${score}`, x, y + 4, { align: 'center' });
//       doc.setTextColor(...colors.deepRed); // Reset
//     };

//     // House 1 (Top Center - Ascendant): MINDSET (Manobal)
//     drawHouseText("MINDSET", report.scores.MANOBAL, cx, cy - 25);

//     // House 4 (Left - Happiness/Assets): KNOWLEDGE (Gyaan)
//     drawHouseText("KNOWLEDGE", report.scores.GYAAN, cx - 22, cy);

//     // House 7 (Bottom Center - Partnership): MEETINGS (Milan)
//     drawHouseText("MEETINGS", report.scores.MILAN, cx, cy + 28);

//     // House 10 (Right - Karma/Career): TIME (Samay)
//     drawHouseText("TIME", report.scores.SAMAY, cx + 22, cy);

//     // House 2 (Top Left - Wealth): SALES (Vikray)
//     drawHouseText("SALES", report.scores.VIKRAY, cx - 40, cy - 40);

//     // House 11 (Top Right - Gains): LEADS (Prospecting)
//     drawHouseText("LEADS", report.scores.LEAD, cx + 40, cy - 40);

//     // House 5 (Bottom Left - Intellect): SKILLS (Kaushal)
//     drawHouseText("SKILLS", report.scores.KAUSHAL, cx - 40, cy + 40);

//     // House 9 (Bottom Right - Luck/Trust): TRUST (Vishwas)
//     drawHouseText("TRUST", report.scores.VISHWAS, cx + 40, cy + 40);

//     // Center Text (Ganesh Area)
//     doc.setFontSize(14);
//     doc.setTextColor(...colors.saffron);
//     doc.text("LABH", cx, cy, { align: 'center' }); // Labh means Profit

//     // --- 6. PRIMARY DOSHA SECTION ---
//     const startY = 185;

//     // Decorative Box for Dosha
//     doc.setDrawColor(...colors.gold);
//     doc.setFillColor(255, 245, 230); // Lighter cream
//     doc.roundedRect(15, startY, pageWidth - 30, 40, 3, 3, 'FD');

//     doc.setFontSize(12);
//     doc.setTextColor(...colors.deepRed);
//     doc.text("PRIMARY DOSHA (MAIN BLOCKAGE)", 20, startY + 8);

//     doc.setFontSize(14);
//     doc.setTextColor(0, 0, 0);
//     doc.setFont("times", "bold");
//     doc.text(`${report.primaryDosha.title}`, 20, startY + 16);

//     doc.setFont("times", "normal");
//     doc.setFontSize(10);
//     doc.text(doc.splitTextToSize(`Problem: ${report.primaryDosha.description}`, 170), 20, startY + 24);

//     doc.setTextColor(...colors.deepRed);
//     doc.setFont("times", "bold");
//     doc.text(`Remedy: ${report.primaryDosha.remedy_simple}`, 20, startY + 34);

//     // --- 7. 90-DAY PLAN TABLE ---
//     doc.setFontSize(14);
//     doc.setTextColor(...colors.deepRed);
//     doc.text("90-Day Correction Plan", 15, startY + 50);

//     const planData = report.primaryDosha.plan_90_days.map(p => [p.phase, p.task]);

//     autoTable(doc, {
//       startY: startY + 55,
//       body: planData,
//       theme: 'grid',
//       head: [['Phase', 'Task / Ritual']],
//       styles: {
//         font: "times",
//         fillColor: false,
//         textColor: colors.textBlack,
//         lineColor: colors.gold,
//         lineWidth: 0.1
//       },
//       headStyles: {
//         fillColor: colors.saffron,
//         textColor: [255, 255, 255],
//         fontStyle: 'bold'
//       },
//       columnStyles: {
//         0: { fontStyle: 'bold', cellWidth: 40, textColor: colors.deepRed },
//       },
//       margin: { left: 15, right: 15 }
//     });

//     // --- 8. FOOTER ---
//     const footerY = pageHeight - 15;
//     doc.setFontSize(10);
//     doc.setTextColor(...colors.gold);
//     doc.text("Generated by REBORN Business Kundli™", pageWidth / 2, footerY, { align: 'center' });
//     doc.setDrawColor(...colors.gold);
//     doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

//     // Save
//     doc.save(`${report.identity.name}_Business_Kundli_Vedic.pdf`);
//   };

//   if (loading) return (
//     <div className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center text-center">
//       <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
//       <p className="text-indigo-300 animate-pulse">Aligning Stars...</p>
//     </div>
//   );

//   if (!report) return <div className="min-h-screen bg-black text-white p-10">Report not found.</div>;

//   // --- CHART DATA ---
//   const chartData = [
//     { subject: 'Time', A: report.scores.SAMAY, fullMark: 100 },
//     { subject: 'Know', A: report.scores.GYAAN, fullMark: 100 },
//     { subject: 'Skill', A: report.scores.KAUSHAL, fullMark: 100 },
//     { subject: 'Lead', A: report.scores.LEAD, fullMark: 100 },
//     { subject: 'Meet', A: report.scores.MILAN, fullMark: 100 },
//     { subject: 'Sale', A: report.scores.VIKRAY, fullMark: 100 },
//     { subject: 'Trust', A: report.scores.VISHWAS, fullMark: 100 },
//     { subject: 'Mind', A: report.scores.MANOBAL, fullMark: 100 },
//   ];

//   return (
//     <div className="min-h-screen relative text-slate-50 pb-24 font-sans selection:bg-indigo-500/30">
//       <CosmicBackground />

//       {/* --- HEADER --- */}
//       <div className="sticky top-0 z-50 bg-[#02040a]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex justify-between items-center shadow-lg">
//         <div>
//           <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-fuchsia-200 to-white">Business Kundli</h1>
//           <p className="text-xs text-slate-400 font-medium tracking-wide">{report.identity.name}</p>
//         </div>
//         <div className="bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 text-indigo-200 shadow-inner">
//           Score: {report.overall_score}
//         </div>
//       </div>

//       <div className="relative z-10 max-w-lg mx-auto p-4 space-y-6">

//         {/* =======================
//               TAB 1: DASHBOARD
//             ======================= */}
//         {activeTab === 'dashboard' && (
//           <div className="animate-fadeIn space-y-6">


//         {/* =======================
//             IDENTITY SNAPSHOT
//         ======================= */}
//         <div className="bg-[#0B0F19]/60 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md shadow-2xl space-y-4">
//           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
//             Kundli Identity
//           </p>

//           <div className="flex items-start justify-between">
//             <div>
//               <h2 className="text-2xl font-bold text-white leading-tight">
//                 {report.identity.name}
//               </h2>
//               <p className="text-sm text-slate-400 mt-1">
//                 {report.identity.type} Advisor · {report.identity.employment_type}
//               </p>
//             </div>

//             <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
//               <p className="text-[10px] uppercase tracking-widest text-slate-400">
//                 Experience
//               </p>
//               <p className="text-lg font-black text-indigo-300">
//                 {report.identity.experience} yrs
//               </p>
//             </div>
//           </div>

//           <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
//             <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
//               <p className="text-[10px] uppercase tracking-widest text-slate-500">
//                 Age
//               </p>
//               <p className="text-base font-bold text-white">
//                 {report.identity.age}
//               </p>
//             </div>

//             <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
//               <p className="text-[10px] uppercase tracking-widest text-slate-500">
//                 City
//               </p>
//               <p className="text-base font-bold text-white">
//                 {report.identity.city}
//               </p>
//             </div>

//             <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
//               <p className="text-[10px] uppercase tracking-widest text-slate-500">
//                 Generated
//               </p>
//               <p className="text-xs font-semibold text-white">
//                 {new Date(report.identity.date).toLocaleDateString()}
//               </p>
//             </div>
//           </div>
//         </div>

//             {/* RADAR CHART */}
//             <div className="bg-[#0B0F19]/60 border border-white/5 rounded-[2rem] p-4 relative backdrop-blur-md shadow-2xl">
//               <ResponsiveContainer width="100%" height="100%">
//                 {/* GRAHA STRENGTH BARS */}
//                   <div className="bg-[#0B0F19]/60 border border-white/5 rounded-[2rem] p-6 space-y-5 backdrop-blur-md shadow-2xl">
//                     <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
//                       Business Energy Levels
//                     </h3>

//                     {chartData.map((g) => {
//                       const isStrong = g.A >= 70;
//                       const isMedium = g.A >= 40 && g.A < 70;

//                       return (
//                         <div key={g.subject}>
//                           <div className="flex justify-between mb-1">
//                             <span className="text-sm font-semibold text-slate-200">
//                               {g.subject}
//                             </span>
//                             <span
//                               className={`text-sm font-bold ${
//                                 isStrong
//                                   ? 'text-green-400'
//                                   : isMedium
//                                   ? 'text-yellow-400'
//                                   : 'text-red-400'
//                               }`}
//                             >
//                               {g.A}/100
//                             </span>
//                           </div>

//                           <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
//                             <div
//                               className={`h-full rounded-full transition-all ${
//                                 isStrong
//                                   ? 'bg-green-400'
//                                   : isMedium
//                                   ? 'bg-yellow-400'
//                                   : 'bg-red-400'
//                               }`}
//                               style={{ width: `${g.A}%` }}
//                             />
//                           </div>
//                         </div>
//                       );
//                     })}
//                     <p className="text-[11px] text-slate-500 mt-3 italic">
//                       Green = Strong • Yellow = Needs Focus • Red = Blockage
//                     </p>
//                   </div>
//               </ResponsiveContainer>
//               <div className="absolute bottom-3 right-5 text-[10px] font-bold uppercase tracking-widest text-slate-600">Graha Mandal</div>
//             </div>

//             {/* 🔥 MAIN DOSHA CARD */}
//             <div className="bg-gradient-to-br from-red-950/40 to-[#0B0F19] border border-red-500/20 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(239,68,68,0.1)] relative overflow-hidden group">
//               <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px] rounded-full group-hover:bg-red-500/20 transition-all"></div>

//               <div className="relative z-10">
//                 <div className="flex items-center gap-2.5 mb-3">
//                   <span className="relative flex h-2.5 w-2.5">
//                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
//                     <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
//                   </span>
//                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Primary Blockage</p>
//                 </div>
//                 <h2 className="text-2xl font-bold text-white mb-3">{report.primaryDosha.title}</h2>
//                 <p className="text-slate-300 leading-relaxed text-sm italic border-l-2 border-red-500/30 pl-3">"{report.primaryDosha.description}"</p>

//                 <div className="mt-5 pt-4 border-t border-white/5">
//                   <p className="text-[10px] text-red-300 font-bold uppercase mb-1 tracking-wider">Impact</p>
//                   <p className="text-sm text-slate-400">{report.primaryDosha.impact}</p>
//                 </div>
//               </div>
//             </div>

//             {/* SECONDARY DOSHAS LIST */}
//             <div>
//               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Supporting Doshas</h3>
//               <div className="space-y-3">
//                 {report.secondaryDoshas.map((graha, idx) => (
//                   <div key={idx} className="flex items-center justify-between p-4 bg-[#0B0F19]/50 border border-white/5 rounded-2xl hover:bg-white/5 transition-colors">
//                     <div className="flex items-center gap-4">
//                       <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400 border border-white/5">
//                         {idx + 2}
//                       </div>
//                       <div>
//                         <p className="font-semibold text-slate-200 text-sm">{graha.title}</p>
//                         <p className="text-[11px] text-red-400 font-medium">{graha.dosha_title}</p>
//                       </div>
//                     </div>
//                     <div className="text-sm font-bold text-slate-500">{graha.score}</div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}


//         {/* =======================
//               TAB 2: GRAHAS
//             ======================= */}
//         {activeTab === 'grahas' && (
//           <div className="animate-fadeIn space-y-4">
//             <h2 className="text-xl font-bold text-white mb-6 px-2">Detailed Graha Report</h2>
//             {report.allGrahas.map((graha) => {
//               // Determine Logic
//               const isStrong = graha.score >= 70;
//               const colorClass = isStrong ? 'text-green-400' : 'text-red-400';
//               const bgClass = isStrong ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20';

//               return (
//                 <button
//                   key={graha.key}
//                   onClick={() => setSelectedGraha(graha)}
//                   className="w-full flex items-center justify-between p-5 bg-[#0B0F19]/60 border border-white/5 rounded-2xl hover:bg-white/5 hover:border-white/10 transition-all text-left group shadow-sm"
//                 >
//                   <div className="flex items-center gap-5">
//                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold border ${bgClass} ${colorClass}`}>
//                       {graha.score}
//                     </div>
//                     <div>
//                       <h3 className="font-bold text-white text-base">{graha.title}</h3>
//                       <p className={`text-[10px] uppercase tracking-widest mt-1 ${isStrong ? 'text-green-500' : 'text-red-500'}`}>
//                         {isStrong ? 'Strong (Yoga)' : 'Weak (Dosha)'}
//                       </p>
//                     </div>
//                   </div>
//                   <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
//                     <ChevronRight size={16} className="text-slate-500 group-hover:text-white" />
//                   </div>
//                 </button>
//               )
//             })}
//           </div>
//         )}


//         {/* =======================
//               TAB 3: BLUEPRINT
//             ======================= */}
//         {activeTab === 'blueprint' && (
//           <div className="animate-fadeIn space-y-8">

//             {/* REMEDY SUMMARY CARD */}
//             <div className="bg-gradient-to-br from-indigo-900/20 to-[#0B0F19] border border-indigo-500/20 p-6 rounded-[2rem] relative overflow-hidden">
//               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500"></div>
//               <h3 className="text-indigo-300 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">Immediate Remedy</h3>
//               <p className="text-lg font-bold text-white mb-2 leading-snug">{report.primaryDosha.remedy_simple}</p>
//               <p className="text-sm text-slate-400">Focus on this single habit for the next 7 days.</p>
//             </div>

//             {/* 90 DAY TIMELINE */}
//             <div>
//               <h3 className="text-white font-bold text-xl mb-6 px-2">90-Day REBORN Blueprint</h3>
//               <div className="relative border-l border-white/10 ml-4 space-y-8 pb-4">
//                 {report.primaryDosha.plan_90_days.map((phase, i) => (
//                   <div key={i} className="relative pl-8 group">
//                     <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-[#02040a] border border-fuchsia-500 group-hover:scale-125 transition-transform"></div>
//                     <p className="text-[10px] font-bold text-fuchsia-400 uppercase mb-2 tracking-widest">{phase.phase}</p>
//                     <div className="bg-[#0B0F19] border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-colors shadow-sm">
//                       <p className="text-slate-300 text-sm leading-relaxed">{phase.task}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* SCREEN 16: PDF EXPORT */}
//             <button
//               onClick={generatePDF}
//               className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all hover:bg-slate-100"
//             >
//               <Download size={20} /> Download PDF Report
//             </button>

//             {/* SCREEN 17: UPSELL */}
//             <div className="mt-8 p-[1px] rounded-[2rem] bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700">
//               <div className="bg-[#0B0F19] rounded-[calc(2rem-1px)] p-6 text-center h-full relative overflow-hidden">
//                 <div className="absolute inset-0 bg-yellow-500/5"></div>
//                 <div className="relative z-10">
//                   <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-yellow-500/20">
//                     <Lock className="text-white" size={24} />
//                   </div>
//                   <h3 className="text-white font-bold text-xl mb-2">Unlock REBORN 2026</h3>
//                   <p className="text-slate-400 text-sm mb-6 leading-relaxed">This reading showed your issues. Our mentorship program gives you the exact scripts, templates, and systems to fix them.</p>
//                   <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/25">
//                     Join Waitlist
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//       </div>

//       {/* --- BOTTOM TAB NAVIGATION --- */}
//       <div className="fixed md:bottom-6 bottom-20 left-1/2 -translate-x-1/2 md:translate-x-0 bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl z-40 flex gap-1">
//         <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Activity size={18} />} label="Dash" />
//         <NavButton active={activeTab === 'grahas'} onClick={() => setActiveTab('grahas')} icon={<Layers size={18} />} label="Grahas" />
//         <NavButton active={activeTab === 'blueprint'} onClick={() => setActiveTab('blueprint')} icon={<FileText size={18} />} label="Plan" />
//       </div>

//       {/* --- MODAL: GRAHA DETAILS --- */}
//       {/* --- MODAL: GRAHA DETAILS --- */}
//       {selectedGraha && (
//         <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
//           <div className="bg-[#0F172A] border border-white/10 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative">
//             {/* Close Button */}
//             <button onClick={() => setSelectedGraha(null)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors z-20">
//               <X size={20} />
//             </button>

//             <div className="p-8 relative">
//               {/* Dynamic Background Gradient based on Score */}
//               <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b pointer-events-none ${selectedGraha.score >= 70 ? 'from-green-500/10' : 'from-red-500/10'} to-transparent`}></div>

//               <div className="flex items-center gap-5 mb-8 relative z-10">
//                 <div className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br ${selectedGraha.score >= 70 ? 'from-green-400 to-emerald-600' : 'from-red-400 to-orange-600'}`}>
//                   {selectedGraha.score}
//                 </div>
//                 <div>
//                   <h3 className="text-2xl font-bold text-white">{selectedGraha.title}</h3>
//                   <p className={`text-xs font-bold uppercase tracking-wider ${selectedGraha.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
//                     {selectedGraha.dosha_title}
//                   </p>
//                 </div>
//               </div>

//               <div className="space-y-6 relative z-10">
//                 {/* SECTION 1: DESCRIPTION */}
//                 <div>
//                   <h4 className={`text-[10px] font-bold uppercase mb-2 tracking-widest ${selectedGraha.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
//                     {selectedGraha.score >= 70 ? 'Your Strength (Yoga)' : 'The Problem (Dosha)'}
//                   </h4>
//                   <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-white/10 pl-3">
//                     "{selectedGraha.description}"
//                   </p>
//                 </div>

//                 {/* SECTION 2: IMPACT */}
//                 <div>
//                   <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2 tracking-widest">Business Impact</h4>
//                   <p className="text-slate-400 text-sm italic">"{selectedGraha.impact}"</p>
//                 </div>

//                 {/* SECTION 3: ACTION PLAN */}
//                 <div className={`p-5 rounded-2xl border ${selectedGraha.score >= 70 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
//                   <h4 className={`text-[10px] font-bold uppercase mb-2 tracking-widest ${selectedGraha.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
//                     {selectedGraha.score >= 70 ? 'Growth Strategy' : 'The Remedy'}
//                   </h4>
//                   <p className="text-white text-sm font-medium leading-relaxed">
//                     {selectedGraha.remedy_advanced}
//                   </p>
//                 </div>
//               </div>

//               <button onClick={() => setSelectedGraha(null)} className="mt-8 w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-colors border border-white/5">
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <style jsx global>{`
//           @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
//           .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
//         `}</style>
//     </div>
//   );
// }

// // Helper Component for Bottom Nav
// const NavButton = ({ active, onClick, icon, label }) => (
//   <button
//     onClick={onClick}
//     className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 ${active
//       ? 'bg-white text-black shadow-lg shadow-white/10'
//       : 'text-slate-400 hover:text-white hover:bg-white/5'
//       }`}
//   >
//     {icon}
//     {active && <span className="text-xs font-bold uppercase tracking-wide animate-fadeIn">{label}</span>}
//   </button>
// );
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowRightLeft, BadgePercent, Coins, BarChart3
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
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | grahas | strategy | legacy | projections

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
        <header className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 mb-8 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full" />
          <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
            <div className="flex gap-6 items-center">
              <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-fuchsia-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transform rotate-3">
                <User size={48} />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">{report.identity.name}</h1>
                <div className="flex flex-wrap gap-3 mt-3">
                   <Badge label={`${report.identity.age} Years`} icon={<Calendar size={12}/>} />
                   <Badge label={report.identity.city} icon={<Globe size={12}/>} />
                   <Badge label={`${report.identity.experience_years}Y Experience`} icon={<Briefcase size={12}/>} color="text-indigo-400" />
                   <Badge label={report.identity.employment_type} icon={<Clock size={12}/>} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Kundli Alignment</p>
                  <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
                    {report.graha_scores.overall_score}<span className="text-xl text-slate-600">/100</span>
                  </p>
               </div>
               <div className="h-16 w-px bg-white/10" />
               <button onClick={() => generateFullAdvisorKundli(report)} className="p-4 bg-white hover:bg-slate-200 text-slate-900 rounded-3xl transition-all shadow-xl shadow-white/5 active:scale-95">
                  <Download size={24} />
               </button>
            </div>
          </div>
        </header>

        {/* --- NAVIGATION --- */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 bg-slate-950/50 p-2 rounded-3xl border border-white/5 backdrop-blur-md">
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
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600/20 to-transparent border border-indigo-500/20 rounded-[2.5rem] p-10 flex flex-col justify-center">
          <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.4em] mb-4">{report.ai_report.advisor_snapshot.stage} Stage Advisor</p>
          <h2 className="text-4xl font-bold leading-tight mb-8">"{report.ai_report.advisor_snapshot.one_line_summary}"</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
               <p className="text-[10px] font-black uppercase text-emerald-500 mb-1 tracking-widest">Core Strength</p>
               <p className="text-sm font-bold">{report.ai_report.advisor_snapshot.core_strength}</p>
             </div>
             <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl">
               <p className="text-[10px] font-black uppercase text-red-500 mb-1 tracking-widest">Core Risk</p>
               <p className="text-sm font-bold">{report.ai_report.advisor_snapshot.core_risk}</p>
             </div>
          </div>
        </div>

        {/* Effort Pulse */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between">
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
          <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all">
            <div className="mb-4">{m.icon}</div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">{m.label}</p>
            <p className="text-xl font-black">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Mandatory KPIs Block */}
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
        <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-6 text-indigo-400">Mandatory Growth KPIs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.ai_report.mandatory_kpis.map((kpi, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-white/5 border border-white/10 rounded-[3rem] p-10">
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
            <div key={key} className={`${theme.bg} ${theme.border} border p-8 rounded-[2.5rem] flex flex-col h-full group hover:bg-white/5 transition-all`}>
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
           <div className="p-3 bg-indigo-500 rounded-2xl text-white shadow-lg"><Clock size={24}/></div>
           <h2 className="text-3xl font-black">90-Day Corrective Sprint</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {report.ai_report.ninety_day_repair_plan.map((phase, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
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
             <div key={q} className="bg-slate-900/50 border border-white/5 rounded-[3.5rem] p-10 lg:p-14">
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
                      <div key={si} className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Workflow size={20}/></div>
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
                        <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
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
          <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-12 overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
               <Trophy size={200} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
              {/* Year Focus */}
              <div className="lg:col-span-4">
                <div className="inline-block px-6 py-2 bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest mb-6 shadow-lg">
                  Year {i+1}
                </div>
                <h3 className="text-2xl font-black text-white leading-tight mb-8">{data.focus}</h3>
                <div className="bg-indigo-500/10 p-6 rounded-[2rem] border border-indigo-500/20">
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
                      <div key={oi} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
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
        <div className="bg-red-500/5 border border-red-500/10 p-10 rounded-[3.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-red-500 transform group-hover:rotate-12 transition-transform">
             <ShieldAlert size={120} />
          </div>
          <p className="text-xs font-black text-red-500 uppercase tracking-[0.4em] mb-4">Scenario: As Is</p>
          <h3 className="text-5xl font-black text-slate-400 mb-6">{proj.unchanged_90_days.income_range}</h3>
          <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase mb-8">
             <AlertCircle size={14} /> Risk Level: {proj.unchanged_90_days.risk_level}
          </div>
          <div className="bg-black/20 p-6 rounded-2xl border border-red-500/10">
             <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Primary Bottleneck</p>
             <p className="text-sm font-medium text-slate-300 leading-relaxed italic">"{proj.unchanged_90_days.bottleneck}"</p>
          </div>
        </div>

        {/* Growth Path */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/20 p-10 rounded-[3.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-500 transform group-hover:scale-110 transition-transform">
             <Rocket size={120} />
          </div>
          <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Scenario: Post Remedy</p>
          <h3 className="text-5xl font-black text-white mb-6">{proj.with_remedies_90_days.income_range}</h3>
          <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase mb-8 tracking-widest">
             <CheckCircle2 size={14} /> Systems Corrected
          </div>
          <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10">
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Strategy Unlock</p>
             <p className="text-sm font-bold text-white leading-relaxed italic">"{proj.with_remedies_90_days.bottleneck}"</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center">
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
    <button onClick={onClick} className={`flex items-center gap-3 px-8 py-4 rounded-2xl whitespace-nowrap transition-all duration-300 ${active ? 'bg-white text-slate-900 shadow-xl scale-105 font-black' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
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
       <div className="text-center bg-white/5 p-12 rounded-[3rem] border border-white/10">
          <ShieldAlert size={64} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black mb-4">Report Not Found</h2>
          <p className="text-slate-500 mb-8">The ID requested does not exist or access is restricted.</p>
          <button onClick={() => window.history.back()} className="px-8 py-3 bg-white text-slate-900 font-black rounded-2xl">Return Home</button>
       </div>
    </div>
  );
}