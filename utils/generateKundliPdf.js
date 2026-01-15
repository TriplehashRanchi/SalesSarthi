import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// --- IMPROVED FORMATTER ---
const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return 'Rs. 0';
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  
  if (absVal >= 10000000) {
    return `${sign}Rs. ${(absVal / 10000000).toFixed(2)} Cr`;
  }
  if (absVal >= 100000) {
    return `${sign}Rs. ${(absVal / 100000).toFixed(2)} L`;
  }
  if (absVal >= 1000) {
    return `${sign}Rs. ${(absVal / 1000).toFixed(1)} K`;
  }
  return `${sign}Rs. ${absVal.toFixed(0)}`;
};

const formatPercent = (val) => `${val.toFixed(1)}%`;

const sanitizePdfText = (s = "") => {
  return String(s)
    .normalize("NFKC")                     // fix weird unicode forms
    .replaceAll("₹", "Rs. ")               // IMPORTANT: jsPDF default fonts can't render ₹
    .replace(/\u00B9/g, "")                // removes ¹ (often appears when ₹ breaks)
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/\u00A0/g, " ")               // non-breaking space → space
    .replace(/[^\S\r\n]+/g, " ")           // collapse extra spaces but keep new lines
    .trim();
};


export const generateFinancialReport = (rawResponse) => {
  const { identity, output, ai_report, input } = rawResponse;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;

 const colors = {
  primary: [74, 46, 31],     // Dark brown ink
  secondary: [139, 94, 60],  // Sepia
  accent: [200, 155, 60],    // Antique gold
  accentLight: [232, 215, 190], // Highlight parchment
  bg: [244, 230, 207],       // Paper background
  textMain: [60, 45, 35],
  textLight: [122, 106, 90],
  white: [255, 255, 255],
  success: [88, 140, 90],     // Muted green
  warning: [180, 140, 60],    // Gold warning
  danger: [150, 60, 50],      // Soft red
  border: [214, 191, 166]
};


  // Enhanced page background with subtle grid
  const applyPageBackground = () => {
  // Paper
  doc.setFillColor(...colors.bg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer aged border
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner manuscript frame
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.4);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);
};


  const addSectionHeader = (title, yPos) => {
  doc.setFillColor(...colors.accentLight);
  doc.rect(margin, yPos - 5, pageWidth - (2 * margin), 10, 'F');

  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), margin + 5, yPos + 2);

  return yPos + 12;
};


  const addDivider = (yPos) => {
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    return yPos + 8;
  };

  // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
  applyPageBackground();
  let yPos = 50;

  // Header logo area (placeholder)
doc.setFillColor(232, 215, 190); // parchment strip
doc.rect(margin, 30, pageWidth - (2 * margin), 25, 'F');

doc.setDrawColor(...colors.primary);
doc.setLineWidth(0.3);
doc.rect(margin, 30, pageWidth - (2 * margin), 25);

  
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FINANCIAL KUNDLI", pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Comprehensive Wealth & Protection Analysis", pageWidth / 2, 49, { align: 'center' });

  yPos = 70;
  
  // Client Information Box
  doc.setFillColor(...colors.white);
  doc.setDrawColor(...colors.border);
  doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 30, 2, 2, 'FD');
  
  doc.setTextColor(...colors.textMain);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CLIENT INFORMATION", margin + 5, yPos + 7);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...colors.textLight);
  
  const clientInfo = [
    [`Name: ${identity.name}`, `Age: ${input.client.age} years`],
    [`Location: ${input.client.city}`, `Report Date: ${new Date().toLocaleDateString('en-IN')}`],
    [`Status: ${input.client.marital_status}`, `Family Size: ${input.client.family_members} members`]
  ];
  
  let infoY = yPos + 15;
  clientInfo.forEach(([left, right]) => {
    doc.text(left, margin + 5, infoY);
    doc.text(right, pageWidth / 2 + 10, infoY);
    infoY += 5;
  });

  // Overall Score Dashboard
  yPos += 40;
  
  doc.setFillColor(248, 238, 220);
  doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 50, 3, 3, 'F');
  
  // Score circle
  const centerX = pageWidth / 2;
  const circleY = yPos + 25;
  
  doc.setDrawColor(...(output.overall_score >= 60 ? colors.success : output.overall_score >= 40 ? colors.warning : colors.danger));
  doc.setLineWidth(3);
  // doc.circle(centerX, circleY, 18);
  
  doc.setFontSize(28);
  doc.setTextColor(...(output.overall_score >= 60 ? colors.success : output.overall_score >= 40 ? colors.warning : colors.danger));
  doc.setFont("helvetica", "bold");
  doc.text(`${output.overall_score}`, centerX, circleY + 3, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(...colors.textLight);
  doc.text("FINANCIAL HEALTH SCORE", centerX, circleY + 10, { align: 'center' });

  // Key Metrics Row
  yPos += 60;
  const metrics = [
    { label: "Net Worth", value: formatCurrency(output.net_worth.net_worth), color: output.net_worth.net_worth >= 0 ? colors.success : colors.danger },
    { label: "Savings Rate", value: formatPercent(output.cashflow.savings_rate), color: colors.success },
    { label: "EMI-to-Income", value: formatPercent(output.cashflow.emi_ratio_total), color: output.cashflow.emi_ratio_total > 40 ? colors.danger : colors.success }
  ];
  
  const metricWidth = (pageWidth - (2 * margin)) / 3;
  metrics.forEach((metric, idx) => {
    const xPos = margin + (idx * metricWidth);
    
    doc.setTextColor(...colors.textLight);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(metric.label, xPos + (metricWidth / 2), yPos, { align: 'center' });
    
    doc.setTextColor(...metric.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(metric.value, xPos + (metricWidth / 2), yPos + 8, { align: 'center' });
  });

  // Financial Snapshot
  yPos += 20;
  yPos = addSectionHeader("FINANCIAL SNAPSHOT", yPos);

  const snapshotData = [
    ["Total Assets", formatCurrency(output.net_worth.total_assets)],
    ["Total Liabilities", formatCurrency(output.net_worth.total_liabilities)],
    ["Net Worth", formatCurrency(output.net_worth.net_worth)],
    ["Monthly Income", formatCurrency(input.cashflow.monthly_income)],
    ["Monthly Expenses", formatCurrency(input.cashflow.monthly_expenses)],
    ["Monthly Savings", formatCurrency(input.cashflow.monthly_savings)]
  ];

  autoTable(doc, {
    startY: yPos,
    body: snapshotData,
    theme: 'plain',
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      textColor: colors.textMain
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

   // --- PAGE 5: GRAHA ANALYSIS ---
  doc.addPage();
  applyPageBackground();
  yPos = 40;

  doc.setFillColor(...colors.accent);
  doc.rect(margin, yPos - 10, pageWidth - (2 * margin), 18, 'F');
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("GRAHA ANALYSIS: PLANETARY WEALTH POSITIONS", pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  doc.setFontSize(9);
  doc.setTextColor(...colors.textLight);
  doc.setFont("helvetica", "italic");
  const advisorNote = doc.splitTextToSize(`Advisor's Note: ${sanitizePdfText(ai_report.summary.advisor_note)}`, pageWidth - (2 * margin));
  doc.text(advisorNote, margin, yPos);
  yPos += (advisorNote.length * 5) + 10;

  // Graha Cards
  const grahaEntries = Object.entries(ai_report.grahas);
  
  grahaEntries.forEach(([key, val]) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      applyPageBackground();
      yPos = 40;
    }

    // Card background
    const cardHeight = 45;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colors.border);
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), cardHeight, 2, 2, 'FD');

    // Graha header with color indicator
    const scoreColor = val.score >= 70 ? colors.success : val.score >= 40 ? colors.warning : colors.danger;
    doc.setFillColor(...scoreColor);
    doc.circle(margin + 8, yPos + 8, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.primary);
    doc.text(key.toUpperCase(), margin + 14, yPos + 9);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.textLight);
    doc.text(`Strength: ${val.strength}`, margin + 14, yPos + 14);

    // Score badge
    doc.setFontSize(16);
    doc.setTextColor(...scoreColor);
    doc.setFont("helvetica", "bold");
    doc.text(`${val.score.toFixed(0)}`, pageWidth - margin - 15, yPos + 10, { align: 'right' });

    // Interpretation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.textMain);
    const interpretation = doc.splitTextToSize(sanitizePdfText(val.interpretation), pageWidth - (2 * margin) - 20);
    doc.text(interpretation, margin + 8, yPos + 20);

    // Primary remedy
    if (val.remedies && val.remedies.length > 0) {
      const remedyY = yPos + 20 + (interpretation.length * 4) + 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...colors.accent);
      doc.text(`Action: ${sanitizePdfText(val.remedies[0].title)}`, margin + 8, remedyY);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.textLight);
      const remedyDesc = doc.splitTextToSize(sanitizePdfText(val.remedies[0].description), pageWidth - (2 * margin) - 20);
      doc.text(remedyDesc, margin + 8, remedyY + 4);
    }

    yPos += cardHeight + 8;
  });

  // --- PAGE 2: EFFICIENCY ANALYSIS ---
  doc.addPage();
  applyPageBackground();
  yPos = 40;

  yPos = addSectionHeader("EFFICIENCY PARAMETERS", yPos);

  const efficiencyData = [
    ["Liquidity (Emergency Fund)", `${output.scores.emergency.toFixed(0)}/100`, output.emergency.status, `${output.emergency.months_covered.toFixed(1)} months covered`],
    ["Risk Protection Cover", `${output.scores.protection.toFixed(0)}/100`, output.scores.protection > 50 ? "Adequate" : "Critical Gap", "Requires immediate attention"],
    ["Goal Readiness", `${output.scores.goals.toFixed(0)}/100`, output.scores.goals > 70 ? "On Track" : "Behind Schedule", "Needs strategic planning"]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Parameter', 'Score', 'Status', 'Remarks']],
    body: efficiencyData,
    theme: 'grid',
    headStyles: { 
      fillColor: colors.primary,
      textColor: colors.white,
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'center', fontStyle: 'bold' },
      2: { halign: 'center' }
    },
    margin: { left: margin, right: margin }
  });

  yPos = doc.lastAutoTable.finalY + 15;
  yPos = addSectionHeader("CASH FLOW & DEBT ANALYSIS", yPos);

  const cashflowData = [
    ["Annual Income", formatCurrency(input.cashflow.annual_income)],
    ["Annual Expenses", formatCurrency(output.cashflow.annual_expenses)],
    ["Annual Savings", formatCurrency(input.cashflow.monthly_savings * 12)],
    ["Savings Rate", formatPercent(output.cashflow.savings_rate)],
    ["", ""],
    ["Total Loan Outstanding", formatCurrency(output.loans.total_loan_amount)],
    ["Monthly EMI Burden", formatCurrency(output.loans.total_monthly_emi)],
    ["Average Interest Rate", formatPercent(output.loans.avg_interest_rate)],
    ["EMI-to-Income Ratio", formatPercent(output.cashflow.emi_ratio_total)]
  ];

  autoTable(doc, {
    startY: yPos,
    body: cashflowData,
    theme: 'striped',
    styles: { 
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  // --- PAGE 3: PROTECTION GAP ANALYSIS ---
  doc.addPage();
  applyPageBackground();
  yPos = 40;

  yPos = addSectionHeader("RISK PROTECTION GAP ANALYSIS", yPos);

  doc.setFontSize(9);
  doc.setTextColor(...colors.textLight);
  doc.setFont("helvetica", "italic");
  doc.text("Insurance coverage is critical for financial security. Below is your current coverage vs. recommended levels.", margin, yPos);
  yPos += 10;

  const protectionData = [
    ["Life Insurance (Term)", formatCurrency(output.protection.recommended.life), formatCurrency(output.protection.actual.life), formatCurrency(output.protection.recommended.life - output.protection.actual.life)],
    ["Health Insurance", formatCurrency(output.protection.recommended.health), formatCurrency(output.protection.actual.health), formatCurrency(output.protection.recommended.health - output.protection.actual.health)],
    ["Critical Illness Cover", formatCurrency(output.protection.recommended.critical), formatCurrency(output.protection.actual.critical), formatCurrency(output.protection.recommended.critical - output.protection.actual.critical)],
    ["Accident Cover", formatCurrency(output.protection.recommended.accident), formatCurrency(output.protection.actual.accident), formatCurrency(output.protection.recommended.accident - output.protection.actual.accident)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Insurance Type', 'Recommended', 'Current', 'Gap']],
    body: protectionData,
    theme: 'grid',
    headStyles: { 
      fillColor: colors.accent,
      textColor: colors.white,
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: { fontSize: 9 },
    columnStyles: {
      3: { textColor: colors.danger, fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  yPos = doc.lastAutoTable.finalY + 15;
  yPos = addSectionHeader("EMERGENCY FUND STATUS", yPos);

  const emergencyBox = [
    ["Required Emergency Fund", formatCurrency(output.emergency.required)],
    ["Current Emergency Fund", formatCurrency(output.emergency.current)],
    ["Gap", formatCurrency(output.emergency.gap)],
    ["Months Covered", `${output.emergency.months_covered.toFixed(1)} months`],
    ["Status", output.emergency.status]
  ];

  autoTable(doc, {
    startY: yPos,
    body: emergencyBox,
    theme: 'plain',
    styles: { 
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  // --- PAGE 4: GOAL PLANNING ---
  doc.addPage();
  applyPageBackground();
  yPos = 40;

  yPos = addSectionHeader("GOAL ROADMAP & FEASIBILITY", yPos);

  const goalData = output.goals.map(g => [
    g.goal_name,
    g.target_year.toString(),
    formatCurrency(g.future_cost),
    formatCurrency(g.sip_required) + "/month",
    `${g.readiness.toFixed(1)}%`,
    g.feasibility
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Goal Name', 'Target Year', 'Future Cost', 'Required SIP', 'Readiness', 'Feasibility']],
    body: goalData,
    theme: 'grid',
    headStyles: { 
      fillColor: colors.accentLight,
      textColor: colors.textMain,
      fontSize: 8,
      fontStyle: 'bold'
    },
    styles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.cell.raw === 'UNREALISTIC') {
        data.cell.styles.textColor = colors.danger;
      } else if (data.column.index === 5 && data.cell.raw === 'FEASIBLE') {
        data.cell.styles.textColor = colors.success;
      }
    },
    margin: { left: margin, right: margin }
  });

  yPos = doc.lastAutoTable.finalY + 15;
  yPos = addSectionHeader("RETIREMENT (FIRE) PLANNING", yPos);

  doc.setFontSize(9);
  doc.setTextColor(...colors.textMain);
  doc.setFont("helvetica", "normal");
  doc.text(`Target Retirement Age: ${input.client.wanted_retirement_age} years`, margin, yPos);
  doc.text(`Years to Retirement: ${output.fire.retirement_years} years`, margin, yPos + 6);
  yPos += 18;

  doc.setFont("helvetica", "bold");
  doc.text("Required FIRE Corpus (to maintain current lifestyle):", margin, yPos);
  doc.setFontSize(18);
  doc.setTextColor(...colors.accent);
  doc.text(formatCurrency(output.fire.fire_number), margin, yPos + 10);

  doc.setFontSize(9);
  doc.setTextColor(...colors.textMain);
  doc.setFont("helvetica", "normal");
  yPos += 18;
  doc.text(`Future Monthly Expense: ${formatCurrency(output.fire.future_monthly_expense)}`, margin, yPos);
  doc.text(`Current Financial Independence Ratio: ${output.net_worth.fi_ratio.toFixed(2)}`, margin, yPos + 6);

 

  // --- FINAL PAGE: ACTION PLAN ---
  doc.addPage();
  applyPageBackground();
  yPos = 40;

  yPos = addSectionHeader("EXECUTIVE ACTION PLAN", yPos);

  // Strengths and Vulnerabilities
  const boxWidth = (pageWidth - (2 * margin) - 10) / 2;
  
  // Strengths
  doc.setFillColor(232, 245, 233);
  doc.setDrawColor(...colors.success);
  doc.roundedRect(margin, yPos, boxWidth, 50, 2, 2, 'FD');
  
  doc.setTextColor(...colors.success);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DOMINANT STRENGTHS", margin + 5, yPos + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.textMain);
  ai_report.summary.dominant_strengths.forEach((s, i) => {
    doc.text(`${i + 1}. ${s}`, margin + 5, yPos + 18 + (i * 6));
  });

  // Vulnerabilities
  doc.setFillColor(255, 235, 238);
  doc.setDrawColor(...colors.danger);
  doc.roundedRect(margin + boxWidth + 10, yPos, boxWidth, 50, 2, 2, 'FD');
  
  doc.setTextColor(...colors.danger);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("KEY VULNERABILITIES", margin + boxWidth + 15, yPos + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.textMain);
  ai_report.summary.key_vulnerabilities.forEach((v, i) => {
    doc.text(`${i + 1}. ${v}`, margin + boxWidth + 15, yPos + 18 + (i * 6));
  });

  yPos += 65;
  yPos = addSectionHeader("IMMEDIATE RECOMMENDATIONS", yPos);

// Generate dynamic recommendations based on actual data
const recommendations = [];

// 1. Life Insurance Gap (Critical Priority)
if (output.protection.actual.life < output.protection.recommended.life) {
  const gap = output.protection.recommended.life - output.protection.actual.life;
  recommendations.push(`CRITICAL: Increase life insurance coverage by ${formatCurrency(gap)} to reach recommended level of ${formatCurrency(output.protection.recommended.life)}`);
}

// 2. Health Insurance Gap
if (output.protection.actual.health < output.protection.recommended.health) {
  const gap = output.protection.recommended.health - output.protection.actual.health;
  recommendations.push(`Purchase health insurance of ${formatCurrency(gap)} for family protection (Recommended: ${formatCurrency(output.protection.recommended.health)})`);
}

// 3. Emergency Fund
if (output.emergency.status !== "EXCELLENT") {
  recommendations.push(`Build emergency fund to ${output.emergency.months_covered.toFixed(1)} months. Add ${formatCurrency(output.emergency.gap)} to reach ${input.cashflow.desired_emergency_months}-month target`);
}

// 4. Critical Illness & Accident Cover
if (output.protection.actual.critical < output.protection.recommended.critical) {
  recommendations.push(`Add critical illness cover of ${formatCurrency(output.protection.recommended.critical - output.protection.actual.critical)}`);
}
if (output.protection.actual.accident === 0) {
  recommendations.push(`Purchase accident insurance of ${formatCurrency(output.protection.recommended.accident)}`);
}

// 5. EMI Burden
if (output.cashflow.emi_ratio_total > 40) {
  recommendations.push(`EMI ratio at ${output.cashflow.emi_ratio_total.toFixed(0)}% is high. Consider debt consolidation to reduce interest rate from ${output.loans.avg_interest_rate.toFixed(1)}%`);
} else if (output.cashflow.emi_ratio_total > 50) {
  recommendations.push(`URGENT: EMI burden at ${output.cashflow.emi_ratio_total.toFixed(0)}% is critical. Prioritize debt reduction immediately`);
}

// 6. Unrealistic Goals
const unrealisticGoals = output.goals.filter(g => g.feasibility === "UNREALISTIC");
if (unrealisticGoals.length > 0) {
  unrealisticGoals.forEach(goal => {
    recommendations.push(`Goal "${goal.goal_name}" requires ${formatCurrency(goal.sip_required)}/month. Consider extending timeline or revising target amount`);
  });
}

// 7. Weak Grahas (Top 3 Critical Areas)
const weakGrahas = Object.entries(ai_report.grahas)
  .filter(([_, val]) => val.strength === "WEAK" || val.score < 30)
  .sort((a, b) => a[1].score - b[1].score)
  .slice(0, 3);

weakGrahas.forEach(([key, val]) => {
  if (val.remedies && val.remedies.length > 0) {
    const remedy = val.remedies.find(r => r.type === "IMMEDIATE") || val.remedies[0];
    recommendations.push(`${key.toUpperCase()} (Score: ${val.score.toFixed(0)}): ${remedy.title} - ${remedy.description}`);
  }
});

// 8. Savings Rate
if (output.cashflow.savings_rate < 20) {
  recommendations.push(`Savings rate at ${output.cashflow.savings_rate.toFixed(1)}% is low. Target minimum 20% by reducing discretionary expenses`);
}

// 9. FIRE Gap (if retirement is soon)
if (output.fire.retirement_years <= 10) {
  const monthlyRequired = (output.fire.fire_number - output.net_worth.net_worth) / (output.fire.retirement_years * 12);
  if (monthlyRequired > 0) {
    recommendations.push(`Retirement in ${output.fire.retirement_years} years requires additional ${formatCurrency(monthlyRequired)}/month investment to reach FIRE corpus`);
  }
}

// 10. Net Worth Growth
if (output.net_worth.net_worth < (input.cashflow.annual_income * 1)) {
  recommendations.push(`Net worth should be at least 1x annual income. Focus on asset accumulation and debt reduction`);
}

// Limit to top 8 most critical recommendations
const finalRecommendations = recommendations.slice(0, 8);

  doc.setFontSize(9);
  doc.setTextColor(...colors.textMain);
  doc.setFont("helvetica", "normal");
  let recY = yPos;
  finalRecommendations.forEach(rec => {
    const lines = doc.splitTextToSize(rec, pageWidth - (2 * margin) - 10);
    doc.text(lines, margin + 5, recY);
    recY += (lines.length * 5) + 3;
  });

  // Disclaimer
  yPos = pageHeight - 40;
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, yPos, pageWidth - (2 * margin), 20, 'F');
  
  doc.setFontSize(7);
  doc.setTextColor(...colors.textLight);
  doc.setFont("helvetica", "italic");
  const disclaimer = doc.splitTextToSize("Disclaimer: This report is for informational purposes only and does not constitute financial advice. Please consult with a qualified financial advisor before making investment decisions.", pageWidth - (2 * margin) - 10);
  doc.text(disclaimer, margin + 5, yPos + 5);

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...colors.textLight);
    doc.text(` Financial Kundli Report | ${identity.name} | Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  doc.save(`Financial_Kundli_${identity.name.replace(/\s+/g, '_')}.pdf`);
};