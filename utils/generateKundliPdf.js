import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- FORMATTER ---
const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return 'Rs 0';
  const absVal = Math.abs(val);
  if (absVal >= 10000000) return `Rs ${(absVal / 10000000).toFixed(2)} Cr`;
  if (absVal >= 100000) return `Rs ${(absVal / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export const generateFinancialReport = (data) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  // --- PALETTE ---
  const colors = {
    primary: [15, 118, 110],    // Deep Teal
    accent: [217, 119, 6],      // Saffron/Gold
    bg: [255, 252, 245],        // Very Light Cream
    textMain: [30, 41, 59],     // Slate 800
    textLight: [100, 116, 139], // Slate 500
    success: [21, 128, 61],     // Green
    danger: [185, 28, 28],      // Red
    white: [255, 255, 255]
  };

  // --- BACKGROUND HELPER ---
  const applyPageBackground = () => {
    doc.setFillColor(...colors.bg);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Main Border
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
    
    // Decorative Corners
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(1.5);
    doc.line(margin, margin, margin + 10, margin); // Top Left H
    doc.line(margin, margin, margin, margin + 10); // Top Left V
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - 10, pageHeight - margin); // Bot Right H
    doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - 10); // Bot Right V
  };

  // --- INITIALIZE PAGE 1 ---
  applyPageBackground();

  let yPos = 30;

  // --- HEADER ---
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("FINANCIAL KUNDLI", pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setTextColor(...colors.accent);
  doc.text("WEALTH & PROTECTION BLUEPRINT", pageWidth / 2, yPos, { align: 'center' });

  // --- CLIENT INFO BAR ---
  yPos += 20;
  doc.setFontSize(10);
  doc.setTextColor(...colors.textMain);
  doc.setFont("helvetica", "bold");
  doc.text(`Client: ${data.identity.name}`, margin + 10, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 10, yPos, { align: 'right' });

  // --- HERO SECTION: DIAMOND SCORE & VITALS ---
  yPos += 15;
  const centerX = pageWidth / 2;
  const diamondCenterY = yPos + 40;
  const size = 35; // Size of the diamond

  // 1. Draw Diamond
  doc.setFillColor(...colors.white);
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(1.5);
  
  doc.lines(
    [[size, size], [-size, size], [-size, -size], [size, -size]], 
    centerX, diamondCenterY - size, 
    [1, 1], 'FD', true
  );

  // Inner Decorative Line
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.lines(
    [[size - 6, size - 6], [-(size - 6), size - 6], [-(size - 6), -(size - 6)], [size - 6, -(size - 6)]],
    centerX, diamondCenterY - (size - 6),
    [1, 1], 'S', true
  );

  // 2. Score Text (Inside Diamond)
  const scoreColor = data.score < 50 ? colors.danger : colors.primary;
  doc.setTextColor(...scoreColor);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.score}`, centerX, diamondCenterY + 4, { align: 'center' });
  
  doc.setTextColor(...colors.textLight);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("HEALTH SCORE", centerX, diamondCenterY + 14, { align: 'center' });

  // 3. Vitals (Left & Right of Diamond)
  // Left: Net Worth
  doc.setFontSize(9);
  doc.setTextColor(...colors.textLight);
  doc.text("NET WORTH", margin + 15, diamondCenterY - 8);
  
  doc.setFontSize(16);
  doc.setTextColor(...colors.textMain);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.netWorth), margin + 15, diamondCenterY + 2);

  // Right: Savings Rate
  doc.setFontSize(9);
  doc.setTextColor(...colors.textLight);
  doc.setFont("helvetica", "normal");
  doc.text("SAVINGS RATE", pageWidth - margin - 15, diamondCenterY - 8, { align: 'right' });
  
  doc.setFontSize(16);
  doc.setTextColor(...colors.textMain);
  doc.setFont("helvetica", "bold");
  doc.text(`${Math.round(data.cashflow.savings_rate)}%`, pageWidth - margin - 15, diamondCenterY + 2, { align: 'right' });

  yPos = diamondCenterY + 50;

  // --- HELPER: SECTION TITLE ---
  const drawSectionTitle = (title, y) => {
    doc.setFillColor(...colors.primary);
    doc.rect(margin, y, 3, 10, 'F'); // Accent bar
    doc.setFontSize(12);
    doc.setTextColor(...colors.primary);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin + 8, y + 7);
  };

  // --- SECTION 1: PERFORMANCE BREAKDOWN ---
  drawSectionTitle("Performance Breakdown", yPos);
  yPos += 12;

  const scoreBody = Object.entries(data.scores).map(([k, v]) => {
    const val = Math.round(v);
    let status = 'Good';
    if(val < 40) status = 'Critical';
    else if(val < 75) status = 'Average';
    else status = 'Excellent';

    return [
      k.replace(/_/g, ' ').toUpperCase(),
      `${val} / 100`,
      status
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Parameter', 'Score', 'Status']],
    body: scoreBody,
    theme: 'grid',
    styles: { 
      font: 'helvetica', 
      fontSize: 9, 
      cellPadding: 4, 
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: colors.primary, 
      textColor: colors.white, 
      fontStyle: 'bold' 
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 90 },
      2: { fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 2) {
        if (data.cell.raw === 'Critical') data.cell.styles.textColor = colors.danger;
        else if (data.cell.raw === 'Excellent') data.cell.styles.textColor = colors.success;
        else data.cell.styles.textColor = colors.accent;
      }
    },
    margin: { left: margin, right: margin }
  });

  yPos = doc.lastAutoTable.finalY + 20;

  // --- SECTION 2: PROTECTION SHIELD ---
  drawSectionTitle("Protection Shield", yPos);
  yPos += 12;

  const protectionBody = ['life', 'health', 'critical', 'accident'].map(type => {
    const rec = data.protection[type].rec;
    const act = data.protection[type].act;
    const gap = Math.max(rec - act, 0);
    return [
      type.charAt(0).toUpperCase() + type.slice(1) + " Cover",
      formatCurrency(rec),
      formatCurrency(act),
      gap <= 0 ? "SECURE" : `GAP: ${formatCurrency(gap)}`
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Type', 'Target', 'Actual', 'Analysis']],
    body: protectionBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: colors.textMain, textColor: colors.white },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw.startsWith('GAP')) {
          data.cell.styles.textColor = colors.danger;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = colors.success;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: margin, right: margin }
  });

  yPos = doc.lastAutoTable.finalY + 20;

  // --- SECTION 3: GOALS (Auto-Paging) ---
  if (pageHeight - yPos < 60) {
    doc.addPage();
    applyPageBackground();
    yPos = margin + 20;
  }

  drawSectionTitle("Goal Roadmap", yPos);
  yPos += 12;

  if (data.goals.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...colors.textLight);
    doc.text("No specific goals defined.", margin + 5, yPos + 10);
    yPos += 20;
  } else {
    const goalsBody = data.goals.map(g => [
      g.goal_name,
      g.target_year || '-',
      formatCurrency(g.future_cost),
      formatCurrency(g.sip_required) + '/m',
      `${Math.round(g.readiness || 0)}%`,
      g.feasibility
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Goal', 'Year', 'Cost', 'SIP Req.', 'Ready', 'Status']],
      body: goalsBody,
      theme: 'grid',
      styles: { fontSize: 9, valign: 'middle' },
      headStyles: { fillColor: colors.accent, textColor: colors.white },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 5) {
           data.cell.styles.fontStyle = 'bold';
           if (data.cell.raw === 'UNREALISTIC') data.cell.styles.textColor = colors.danger;
           else if (data.cell.raw === 'FEASIBLE') data.cell.styles.textColor = colors.success;
        }
      },
      margin: { left: margin, right: margin }
    });
    yPos = doc.lastAutoTable.finalY + 25;
  }

  // --- SECTION 4: FIRE NUMBER ---
  if (pageHeight - yPos < 50) {
    doc.addPage();
    applyPageBackground();
    yPos = margin + 20;
  }

  doc.setFillColor(...colors.textMain);
  doc.setDrawColor(...colors.accent);
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 35, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(...colors.accent);
  doc.setFont("helvetica", "bold");
  doc.text("FINANCIAL INDEPENDENCE (FIRE) TARGET", pageWidth / 2, yPos + 12, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(data.fire.fire_number), pageWidth / 2, yPos + 25, { align: 'center' });

  // --- PAGE NUMBERS ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 10, pageHeight - 8, { align: 'right' });
    doc.text("Generated by Financial Kundli", margin + 10, pageHeight - 8);
  }

  // SAVE
  doc.save(`Financial_Kundli_${data.identity.name.replace(/\s+/g, '_')}.pdf`);
};