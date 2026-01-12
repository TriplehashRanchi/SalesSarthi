import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- UTILS ---
const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return 'Rs. 0';
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, "")) : val;
  const absVal = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (absVal >= 10000000) return `${sign}Rs. ${(absVal / 10000000).toFixed(2)} Cr`;
  if (absVal >= 100000) return `${sign}Rs. ${(absVal / 100000).toFixed(2)} L`;
  if (absVal >= 1000) return `${sign}Rs. ${(absVal / 1000).toFixed(1)} K`;
  return `${sign}Rs. ${absVal.toFixed(0)}`;
};

const sanitizePdfText = (s = "") => {
  return String(s)
    .normalize("NFKC")
    .replaceAll("₹", "Rs. ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
};

export const generateFullAdvisorKundli = (rawResponse) => {
  //   const { data } = rawResponse;
  //   console.log("Generating PDF for Advisor Kundli:", rawResponse);

  const { identity, metrics, effort, graha_scores, ai_report, meta } = rawResponse;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  const colors = {
    primary: [74, 46, 31],     // Dark manuscript brown
    secondary: [139, 94, 60],  // Sepia headings
    accent: [200, 155, 60],    // Antique gold
    text: [60, 45, 35],        // Body ink
    lightText: [122, 106, 90], // Faded ink
    bg: [244, 230, 207],       // Parchment paper
    border: [214, 191, 166]    // Paper edge
  };


  // Helper: Page Setup
  const applyTemplate = () => {
    doc.setFillColor(...colors.bg);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
  };

  // Helper: Section Headers
  const sectionTitle = (title, y) => {
    doc.setFillColor(...colors.primary);
    doc.rect(margin, y - 5, pageWidth - (2 * margin), 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 4, y + 2);
    return y + 10;
  };

  // --- PAGE 1: COVER & CORE METRICS ---
  applyTemplate();
  doc.setTextColor(...colors.primary);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("ADVISOR KUNDLI", pageWidth / 2, 35, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...colors.secondary);
  doc.text(`REPORT ID: ${meta.report_id} | STATUS: ${meta.status.toUpperCase()}`, pageWidth / 2, 42, { align: 'center' });

  let yPos = 55;
  yPos = sectionTitle("IDENTITY & PROFESSIONAL PROFILE", yPos);

  autoTable(doc, {
    startY: yPos,
    body: [
      ["Advisor Name", identity.name, "Experience", `${identity.experience_years} Years`],
      ["City", identity.city, "Employment", identity.employment_type],
      ["Age", identity.age, "Report Date", new Date(meta.created_at).toLocaleDateString()]
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } }
  });

  yPos = doc.lastAutoTable.finalY + 10;
  yPos = sectionTitle("90-DAY PERFORMANCE METRICS", yPos);

  autoTable(doc, {
    startY: yPos,
    body: [
      ["Total Income (12m)", formatCurrency(metrics.total_income_12m), "Avg Ticket Size", formatCurrency(metrics.avg_ticket_90)],
      ["Commission (90d)", formatCurrency(metrics.commission_90), "Leads Generated", metrics.leads_90],
      ["Sales Count", metrics.sales_count_90, "Meetings Held", metrics.meetings_90],
      ["Active Clients", metrics.active_clients, "Sales Closed", metrics.sales_closed_90],
      ["Best Month", formatCurrency(metrics.best_month_income), "Worst Month", formatCurrency(metrics.worst_month_income)]
    ],
    theme: 'striped',
    styles: { fontSize: 9 },
    columnStyles: { 1: { textColor: colors.primary, fontStyle: 'bold' } }
  });

  yPos = doc.lastAutoTable.finalY + 10;
  yPos = sectionTitle("EFFORT & SOURCE ANALYSIS", yPos);

  autoTable(doc, {
    startY: yPos,
    body: [
      ["Work Hours/Week", effort.hours_per_week, "Calls/Day", effort.calls_per_day],
      ["Meetings/Week", effort.meetings_per_week, "Lead Sources", effort.prospecting_sources.join(", ")]
    ],
    theme: 'grid',
    styles: { fontSize: 9 }
  });

  // --- PAGE 2: ASTRO-LOGICAL SCOREBOARD ---
  doc.addPage();
  applyTemplate();
  yPos = 30;
  yPos = sectionTitle("GRAHA SCORES & DOSHA ANALYSIS", yPos);

  // Score Circle
  const score = graha_scores.overall_score;
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1.5);
  doc.circle(pageWidth / 2, yPos + 20, 15);
  doc.setFontSize(22);
  doc.setTextColor(...colors.primary);
  doc.text(`${score}`, pageWidth / 2, yPos + 23, { align: 'center' });
  doc.setFontSize(8);
  doc.text("OVERALL SCORE", pageWidth / 2, yPos + 30, { align: 'center' });

  yPos += 40;
  const grahaRows = Object.keys(graha_scores.graha_scores).map(key => [
    key,
    graha_scores.graha_scores[key],
    graha_scores.graha_strengths[key]
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Graha', 'Score', 'Strength Status']],
    body: grahaRows,
    theme: 'grid',
    headStyles: { fillColor: colors.primary },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    didParseCell: (d) => {
      if (d.column.index === 2 && d.cell.raw === 'STRONG') d.cell.styles.textColor = [0, 150, 0];
      if (d.column.index === 2 && d.cell.raw === 'WEAK') d.cell.styles.textColor = [200, 0, 0];
    }
  });

  yPos = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.secondary);
  doc.text(`PRIMARY DOSHA: ${graha_scores.primary_dosha}`, margin, yPos);
  doc.setTextColor(...colors.text);
  doc.setFont("helvetica", "normal");
  doc.text(`Secondary Doshas: ${graha_scores.secondary_doshas.join(", ")}`, margin, yPos + 6);

  yPos += 20;
  yPos = sectionTitle("ADVISOR SNAPSHOT", yPos);
  autoTable(doc, {
    startY: yPos,
    body: [
      ["Current Stage", ai_report.advisor_snapshot.stage],
      ["Core Strength", ai_report.advisor_snapshot.core_strength],
      ["Core Risk", ai_report.advisor_snapshot.core_risk],
      ["Summary", ai_report.advisor_snapshot.one_line_summary]
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    styles: { fontSize: 9 }
  });

  // --- PAGE 3: DETAILED GRAHA REPORT ---
  doc.addPage();
  applyTemplate();
  yPos = 30;
  yPos = sectionTitle("GRAHA INSIGHTS & SPECIFIC ACTIONS", yPos);

  Object.entries(ai_report.graha_report).forEach(([name, data]) => {
    if (yPos > pageHeight - 50) { doc.addPage(); applyTemplate(); yPos = 30; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text(`${name} - Score: ${data.score} (${data.status})`, margin, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    const insight = doc.splitTextToSize(`Insight: ${data.insight}`, pageWidth - (2 * margin));
    doc.text(insight, margin, yPos + 5);

    yPos += (insight.length * 5) + 8;

    data.actions.forEach(act => {
      doc.setFont("helvetica", "bold");
      doc.text(`• ${act.title}:`, margin + 5, yPos);
      doc.setFont("helvetica", "normal");
      const desc = doc.splitTextToSize(act.description, pageWidth - (2 * margin) - 15);
      doc.text(desc, margin + 10, yPos + 4);
      yPos += (desc.length * 4) + 6;
    });
    yPos += 5;
  });

  // --- PAGE 4: 90-DAY REPAIR PLAN ---
  doc.addPage();
  applyTemplate();
  yPos = 30;
  yPos = sectionTitle("90-DAY REMEDIAL REPAIR PLAN", yPos);

  const repairRows = ai_report.ninety_day_repair_plan.map(p => [
    p.week_range,
    p.focus_graha,
    p.actions.join("\n"),
    p.kpi,
    p.proof
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Timeline', 'Graha', 'Action Steps', 'KPI', 'Proof Required']],
    body: repairRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: colors.secondary },
    columnStyles: { 2: { cellWidth: 50 } }
  });

  yPos = doc.lastAutoTable.finalY + 15;
  yPos = sectionTitle("MANDATORY KPIs FOR SUCCESS", yPos);
  doc.setFontSize(9);
  doc.setTextColor(...colors.text);
  ai_report.mandatory_kpis.forEach((kpi, i) => {
    doc.text(`${i + 1}. ${kpi}`, margin + 5, yPos + (i * 6));
  });

  // --- PAGE 5: 12-MONTH STRATEGIC ROADMAP ---
  doc.addPage();
  applyTemplate();
  yPos = 30;
  yPos = sectionTitle("12-MONTH GROWTH SYSTEMS", yPos);

  Object.entries(ai_report.roadmap_12_months).forEach(([q, data]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text(`${q}: Theme - ${data.theme}`, margin, yPos);
    yPos += 6;

    const outcomeText = data.outcomes.map(o => `${o.metric} (${o.target})`).join(" | ");
    doc.setFontSize(8);
    doc.setTextColor(...colors.lightText);
    doc.text(`Outcomes: ${outcomeText}`, margin, yPos);
    yPos += 6;

    const sysRows = data.systems.map(s => [
      s.name,
      s.purpose,
      s.implementation_steps.join(", "),
      s.maturity_target
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['System', 'Purpose', 'Steps', 'Maturity']],
      body: sysRows,
      styles: { fontSize: 7 },
      margin: { left: margin + 5 },
      headStyles: { fillColor: [100, 100, 100] }
    });
    yPos = doc.lastAutoTable.finalY + 10;
  });

  // --- PAGE 6: 3-YEAR EVOLUTION & PROJECTIONS ---
  doc.addPage();
  applyTemplate();
  yPos = 30;
  yPos = sectionTitle("3-YEAR BUSINESS EVOLUTION", yPos);

  Object.entries(ai_report.roadmap_3_years).forEach(([year, data]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text(`${year.replace("_", " ")}: ${data.focus}`, margin, yPos);
    yPos += 6;

    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    doc.text(`Focus Areas: ${data.advisor_role_evolution.primary_focus.join(", ")}`, margin + 5, yPos);
    doc.text(`Income: ${data.income_evolution.income_type} (Predictability: ${data.income_evolution.predictability})`, margin + 5, yPos + 4);

    yPos += 12;
  });

  yPos = sectionTitle("INCOME & RISK PROJECTIONS", yPos);
  autoTable(doc, {
    startY: yPos,
    head: [['Scenario', 'Income Range (90D)', 'Risk', 'Bottleneck']],
    body: [
      ["Unchanged Path", ai_report.projections.unchanged_90_days.income_range, ai_report.projections.unchanged_90_days.risk_level, ai_report.projections.unchanged_90_days.bottleneck],
      ["With Remedies", ai_report.projections.with_remedies_90_days.income_range, ai_report.projections.with_remedies_90_days.risk_level, ai_report.projections.with_remedies_90_days.bottleneck]
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: colors.accent }
  });

  yPos = doc.lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.secondary);
  doc.text("FINAL ADVICE:", margin, yPos);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...colors.text);
  const closing = doc.splitTextToSize(ai_report.closing_message, pageWidth - (2 * margin));
  doc.text(closing, margin, yPos + 8);

  // Footer - Page Numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages} | ${identity.name} | Business Kundli`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`Advisor_Full_Kundli_${identity.name.replace(/\s+/g, '_')}.pdf`);
};