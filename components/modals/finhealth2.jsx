import React, { useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, CartesianGrid
} from 'recharts';
import { FaShieldAlt, FaPiggyBank, FaHeartbeat, FaHome, FaUserFriends, FaRegCalendarAlt, FaUsers, FaHeart, FaBalanceScale, FaChartLine, FaFileInvoiceDollar, FaUniversity, FaGift, FaTasks, FaLandmark, FaSeedling } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// --- Helper Functions (Keep previous helpers: calculateGrade, formatValue, calculateGap, getItemCategory, generateSummaryInsights) ---
// (Assuming the helper functions from the previous response are here)
// Calculates overall grade and color
const calculateGrade = (percentage) => {
    const p = Math.max(0, Math.min(100, percentage)); // Clamp percentage
    if (p >= 90) return { grade: 'A+', remarks: 'Excellent', color: '#10b981', rgb: [16, 185, 129] };
    if (p >= 80) return { grade: 'A', remarks: 'Very Good', color: '#22c55e', rgb: [34, 197, 94] };
    if (p >= 70) return { grade: 'B+', remarks: 'Good', color: '#84cc16', rgb: [132, 204, 22] };
    if (p >= 60) return { grade: 'B', remarks: 'Above Average', color: '#facc15', rgb: [250, 204, 21] };
    if (p >= 50) return { grade: 'C', remarks: 'Average', color: '#fbbf24', rgb: [251, 191, 36] };
    if (p >= 40) return { grade: 'D', remarks: 'Needs Improvement', color: '#f97316', rgb: [249, 115, 22] };
    return { grade: 'F', remarks: 'Critical Attention Needed', color: '#ef4444', rgb: [239, 68, 68] };
};

// Formats numeric values, handles non-numeric gracefully
const formatValue = (value, type = 'currency') => {
    // Added check for object type (like investment currentStatus)
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value); // Or a more specific format for investment object
    }
    if (typeof value !== 'number' || isNaN(value)) {
        return value || 'N/A';
    }
    if (type === 'currency') {
        // Format with comma separators, no decimal places for currency
        return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    if (type === 'score') {
        return `${value}/5`;
    }
    // Default number formatting
    return value.toLocaleString('en-IN');
};


// Calculates the gap, considering item type
// *** NEW HELPER: Format numbers specifically for PDF output ***
const formatNumberForPdf = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        // Return non-numeric values (like 'Yes', 'Balanced (50/50)') as is, or 'N/A'
        // Handle Investment object specifically if needed
        if (typeof value === 'object' && value !== null && value.hasOwnProperty('risk') && value.hasOwnProperty('guaranteed')) {
             return `R:${value.risk.toFixed(0)}% G:${value.guaranteed.toFixed(0)}%`; // Special format for investment
        }
        return (value === null || typeof value === 'undefined') ? 'N/A' : String(value);
    }
    // Simple comma formatting, no currency symbol
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 }); // Use en-US for simple comma separation
};

// *** REVISED HELPER: Calculate Gap - Returns NUMBER or NULL ***
const calculateGap = (item) => {
    const { target, currentStatus, type } = item;

    // Handle non-numeric types or where gap doesn't apply
    if (type === 'yesno' || type === 'investment' || typeof target !== 'number' || typeof currentStatus !== 'number' || isNaN(target) || isNaN(currentStatus)) {
        return null; // Return null for N/A cases
    }

    let gapValue;
    if (type === 'inverse' || item.item === 'CIBIL Score') {
        if (item.item === 'CIBIL Score') {
            // Shortfall from target 750 (Target - Current). Result >= 0
            gapValue = Math.max(0, target - currentStatus);
        } else { // Inverse (Debt, Housing)
             // Excess over target (Current - Target). Result >= 0
             gapValue = Math.max(0, currentStatus - target);
        }
    } else {
        // Standard: Shortfall (Target - Current). Result >= 0
        gapValue = Math.max(0, target - currentStatus);
    }
    // Return the calculated gap number (or 0 if met/exceeded)
    return Math.round(gapValue); // Return as a number
};


// Maps item names to categories and icons
const getItemCategory = (itemName) => {
    const categories = {
        'Risk Protection': { icon: FaShieldAlt, color: 'text-red-500', items: ['Income Protection', 'Health Insurance', 'Critical Illness Cover', 'Disability Insurance', "Spouse's Coverage"] },
        'Emergency & Debt': { icon: FaBalanceScale, color: 'text-orange-500', items: ['Emergency Fund', 'Debt Management', 'CIBIL Score'] },
        'Goal Planning': { icon: FaTasks, color: 'text-blue-500', items: ['Retirement Goals', 'Child Education Fund', 'Marriage Fund', 'Family Goals'] },
        'Wealth & Investment': { icon: FaChartLine, color: 'text-green-500', items: ['Wealth Planning', 'Investment Diversification', 'Legacy Fund'] },
        'Financial Management': { icon: FaPiggyBank, color: 'text-purple-500', items: ['Home Loan or Rent', 'Budget Planning', 'Tax Planning', 'HUF Account', 'Estate Planning'] },
    };
    for (const categoryName in categories) {
        if (categories[categoryName].items.includes(itemName)) {
            return { name: categoryName, ...categories[categoryName] };
        }
    }
    return { name: 'Other', icon: FaSeedling, color: 'text-gray-500', items: [] }; // Default category
};


// Generates summary insights based on scores
const generateSummaryInsights = (overallPercentage, categoryScores) => {
    let insights = [];
    const { remarks: overallRemarks } = calculateGrade(overallPercentage);

    insights.push(`Overall Financial Health Score is ${overallPercentage}%, which is considered ${overallRemarks}.`);

    const lowScoreThreshold = 3.0;
    const midScoreThreshold = 3.5;

    if (categoryScores['Risk Protection'] < lowScoreThreshold) insights.push("Risk protection strategies (Insurances) appear weak. Reviewing coverage amounts is crucial to protect against potential financial shocks.");
    if (categoryScores['Emergency & Debt'] < lowScoreThreshold) insights.push("Focus on increasing the Emergency Fund and actively managing debt. A high CIBIL score is also vital for favorable loan terms.");
    if (categoryScores['Goal Planning'] < midScoreThreshold) insights.push("Progress towards long-term goals like Retirement and Education seems slow. Re-evaluate savings rate and investment choices for these specific goals.");
    if (categoryScores['Wealth & Investment'] < lowScoreThreshold) insights.push("Wealth creation and investment diversification need attention. Explore suitable investment avenues aligned with risk profile.");
    if (categoryScores['Financial Management'] < midScoreThreshold) insights.push("Review core financial habits including Budgeting, Tax Planning effectiveness, and ensuring housing costs are manageable relative to income.");

    if (insights.length === 1 && overallPercentage >= 70) { // Only the overall score insight and score is good
        insights.push("The current financial standing appears robust across most categories. Maintain disciplined financial habits and conduct periodic reviews to stay on track.");
    } else if (insights.length > 1) {
        insights.push("Address the highlighted areas with lower scores first to build a stronger financial foundation.");
    }

    return insights;
};

// --- Main Component ---

const FinancialHealthReport = ({ data, onClose }) => {
    const reportRef = useRef(null);

    if (!data || !data.checklist) {
        return <div className="p-6 text-center text-red-500">Error: Report data is missing or invalid.</div>;
    }

    // --- Calculations (Assume these are correct as per previous step) ---
    const totalScore = data.checklist.reduce((acc, item) => acc + (item.score || 0), 0);
    const maxScore = (data.checklist.length || 1) * 5;
    const overallPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const { grade, remarks, color: gradeColor, rgb: gradeRgbColor } = calculateGrade(overallPercentage); // Get RGB color too

    const categoryData = data.checklist.reduce((acc, item) => {
        const categoryInfo = getItemCategory(item.item);
        if (!acc[categoryInfo.name]) {
            acc[categoryInfo.name] = { ...categoryInfo, items: [], totalScore: 0, count: 0 };
        }
        acc[categoryInfo.name].items.push({ ...item, gap: calculateGap(item) });
        acc[categoryInfo.name].totalScore += item.score || 0;
        acc[categoryInfo.name].count++;
        return acc;
    }, {});

    const categoryScores = Object.entries(categoryData).map(([name, cat]) => ({
        name: name,
        averageScore: cat.count > 0 ? (cat.totalScore / cat.count) : 0,
        icon: cat.icon,
        color: cat.color,
    }));

    const radarData = categoryScores.map(cat => ({ category: cat.name, score: parseFloat(cat.averageScore.toFixed(1)) }));
    const barChartData = data.checklist.map(item => ({ name: item.item, score: item.score || 0 }));
    const summaryInsights = generateSummaryInsights(
        overallPercentage,
        categoryScores.reduce((acc, cat) => { acc[cat.name] = cat.averageScore; return acc; }, {})
    );
    // --- PDF Export ---
    const handleExportPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        const margin = 12; // Increased margin
        const contentWidth = pdfWidth - 2 * margin;
        let currentY = margin;
        const lineSpacing = 5; // Consistent line spacing
        const sectionSpacing = 10; // Consistent spacing between sections

        // Default styles
        const defaultFontSize = 10;
        const titleFontSize = 16;
        const headingFontSize = 12;
        const defaultTextColor = [40, 40, 40]; // Dark Gray
        const headingColor = [0, 0, 0]; // Black
        const brandColorRGB = [79, 70, 229]; // Indigo-600

        doc.setFont('helvetica', 'normal'); // Set a standard font
        doc.setFontSize(defaultFontSize);
        doc.setTextColor(defaultTextColor[0], defaultTextColor[1], defaultTextColor[2]);

        // Helper to add page if needed
        const checkAndAddPage = (heightNeeded) => {
            if (currentY + heightNeeded > pdfHeight - margin) {
                doc.addPage();
                currentY = margin;
                 // Optional: Add header/footer to new pages
                 // doc.setFontSize(8);
                 // doc.setTextColor(150);
                 // doc.text(`Page ${doc.internal.getNumberOfPages()}`, pdfWidth - margin, pdfHeight - margin / 2);
                 // doc.text(`Financial Health Report - ${data.clientName || 'Client'}`, margin, pdfHeight - margin / 2);
                 // doc.setFontSize(defaultFontSize);
                 // doc.setTextColor(defaultTextColor[0], defaultTextColor[1], defaultTextColor[2]);
            }
        };

        // --- 1. PDF Header ---
        doc.setFontSize(titleFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text('Financial Health Report', pdfWidth / 2, currentY, { align: 'center' });
        currentY += titleFontSize * 0.7; // Adjust spacing based on font size

        doc.setFontSize(defaultFontSize);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(defaultTextColor[0], defaultTextColor[1], defaultTextColor[2]);
        doc.text(`Client: ${data.clientName || 'N/A'}`, margin, currentY);
        doc.text(`Date: ${data.date || 'N/A'}`, pdfWidth - margin, currentY, { align: 'right' });
        currentY += lineSpacing;
        doc.text(`Planner: ${data.plannerName || 'N/A'}`, margin, currentY);
        currentY += sectionSpacing * 0.8;
        doc.setDrawColor(220, 220, 220); // Lighter Gray border
        doc.line(margin, currentY, pdfWidth - margin, currentY);
        currentY += sectionSpacing;

        // --- 2. PDF Overall Assessment ---
        checkAndAddPage(30); // Estimate height needed
        doc.setFontSize(headingFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text('Overall Assessment', margin, currentY);
        currentY += headingFontSize * 0.6;

        // Score Display (Large Percentage + Grade)
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(gradeRgbColor[0], gradeRgbColor[1], gradeRgbColor[2]);
        doc.text(`${overallPercentage}%`, margin + contentWidth * 0.3, currentY + 10, { align: 'center' }); // Position Percentage

        doc.setFontSize(18);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(defaultTextColor[0], defaultTextColor[1], defaultTextColor[2]);
        doc.text(`${grade} (${remarks})`, margin + contentWidth * 0.7, currentY + 10, { align: 'center' }); // Position Grade

        currentY += 25; // Space after assessment block

        // --- 3. PDF Key Insights ---
        checkAndAddPage(30); // Estimate height
        doc.setFontSize(headingFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text('Key Insights & Recommendations', margin, currentY);
        currentY += headingFontSize * 0.6;

        doc.setFontSize(defaultFontSize);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(defaultTextColor[0], defaultTextColor[1], defaultTextColor[2]);
        const insightLines = doc.splitTextToSize(summaryInsights.join('\n\n'), contentWidth); // Add more space between insights
        checkAndAddPage(insightLines.length * lineSpacing * 0.8 + 5); // Check height
        doc.text(insightLines, margin, currentY);
        currentY += insightLines.length * lineSpacing * 0.8 + sectionSpacing; // Update Y

        // --- 4. PDF Category Performance Table ---
         checkAndAddPage(20 + categoryScores.length * 8); // Estimate height
         doc.setFontSize(headingFontSize);
         doc.setFont('helvetica', 'bold');
         doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
         doc.text('Category Performance Summary', margin, currentY);
         currentY += headingFontSize * 0.6;

         doc.autoTable({
            startY: currentY,
            head: [['Category', 'Average Score (out of 5)', 'Assessment']],
            body: categoryScores.map(cat => {
                const catGrade = calculateGrade((cat.averageScore / 5) * 100);
                return [cat.name, cat.averageScore.toFixed(1), catGrade.remarks];
            }),
            theme: 'grid', // Simple grid theme
            headStyles: {
                fillColor: brandColorRGB, // Use brand color
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10,
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 2.5, // Increased padding
                valign: 'middle', // Center vertically
                 lineColor: [220, 220, 220], // Lighter grid lines
                 lineWidth: 0.1,
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Category Name
                1: { halign: 'center' }, // Score
                2: { halign: 'center' }  // Remarks
            },
            didDrawPage: (hookData) => { currentY = hookData.cursor.y + sectionSpacing; } // Update Y after table
         });
         // Y is updated by hook

        // --- 5. PDF Detailed Checklist Table (REVISED) ---
        checkAndAddPage(20 + data.checklist.length * 9); // Allow slightly more height per row
        doc.setFontSize(headingFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text('Detailed Checklist Analysis', margin, currentY);
        currentY += headingFontSize * 0.6;

        const tableHeaders = ['Item', 'Target', 'Current Status', 'Gap', 'Score (1-5)'];

        // *** Prepare body with PDF-specific formatting using helpers ***
        const tableBody = data.checklist.map(item => {
            const rawGap = calculateGap(item); // Get raw gap number or null
            return [
                item.item,
                formatNumberForPdf(item.target),           // Format Target for PDF
                formatNumberForPdf(item.currentStatus),    // Format Current Status for PDF
                formatNumberForPdf(rawGap),                // Format Gap for PDF (handles null as 'N/A')
                item.score || 0,
            ];
        });

        doc.autoTable({
            startY: currentY,
            head: [tableHeaders],
            body: tableBody,
            theme: 'striped', // Or 'grid' if you prefer borders
            headStyles: {
                fillColor: brandColorRGB, // Use brand color [79, 70, 229]
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9.5,
                halign: 'center',
                cellPadding: 2.5
            },
            styles: {
                fontSize: 8.5,
                cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 }, // Fine-tune padding
                valign: 'middle',
                lineColor: [230, 230, 230],
                lineWidth: 0.1,
                textColor: defaultTextColor, // Ensure default text color [40, 40, 40]
            },
            columnStyles: {
                // Adjusted widths for better fit with simple number formats
                0: { cellWidth: 65, fontStyle: 'bold' }, // Item Name
                1: { halign: 'right', cellWidth: 25 },  // Target
                2: { halign: 'right', cellWidth: 30 },  // Current Status
                3: { halign: 'right', cellWidth: 25 },  // Gap
                4: { halign: 'center', cellWidth: 18 }  // Score
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Light stripe color
            },
            didDrawCell: (data) => {
                 // Reset text color before drawing next cell content
                 doc.setTextColor(defaultTextColor[0], defaultTextColor[1], defaultTextColor[2]);
                 // Optional: Color positive gaps red
                 if (data.column.index === 3 && data.cell.raw !== 'N/A') { // Gap column
                     const gapString = String(data.cell.raw).replace(/,/g, ''); // Remove commas
                     const gapValue = parseFloat(gapString);
                    if (!isNaN(gapValue) && gapValue > 0) {
                        doc.setTextColor(220, 38, 38); // Red text color for positive gaps
                    }
                 }
                 // Optional: Special handling for Yes/No if needed
                 // if (data.column.index === 2 || data.column.index === 1) { // Target or Current Status
                 //    if (data.cell.raw === 'Yes') doc.setTextColor(34, 197, 94); // Green for Yes
                 //    if (data.cell.raw === 'No') doc.setTextColor(239, 68, 68); // Red for No
                 // }
            },
             didDrawPage: (hookData) => {
                 // Reset text color after page is drawn and update Y
                 doc.setTextColor(defaultTextColor[0], defaultTextColor[1], defaultTextColor[2]);
                 currentY = hookData.cursor.y + sectionSpacing; // Use sectionSpacing
             }
        });
        // Ensure text color is reset after the table finishes on the final page
        doc.setTextColor(defaultTextColor[0], defaultTextColor[1], defaultTextColor[2]);

        // Ensure currentY is correctly updated if the table didn't trigger didDrawPage on the last page
        if (doc.previousAutoTable && doc.previousAutoTable.finalY) {
            currentY = Math.max(currentY, doc.previousAutoTable.finalY + sectionSpacing);
        }

        // --- Continue with Chart generation etc. ---
        // ...
        // Y updated by hook

        // --- 6. PDF Charts ---
        const captureChart = async (elementId, title) => {
            const chartElement = document.getElementById(elementId);
            if (!chartElement) {
                console.warn(`Chart element not found: ${elementId}`);
                return;
            }

            try {
                // Temporarily add padding for capture, if needed
                // chartElement.style.padding = '10px';
                const canvas = await html2canvas(chartElement, {
                    scale: 2.5, // Increase scale for sharpness
                    backgroundColor: '#ffffff', // Ensure white background
                    logging: false, // Reduce console noise
                    useCORS: true // If using external resources/fonts in chart
                });
                // chartElement.style.padding = ''; // Remove temporary padding

                const imgData = canvas.toDataURL('image/png');
                // Make charts wider, taking up more page width
                const imgWidth = contentWidth * 0.95; // Use 95% of content width
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                checkAndAddPage(imgHeight + 15 + sectionSpacing); // Check space for title + chart + padding

                doc.setFontSize(headingFontSize);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
                doc.text(title, pdfWidth / 2, currentY, { align: 'center' });
                currentY += headingFontSize * 0.6 + 5; // Add space after title

                doc.addImage(imgData, 'PNG', margin + (contentWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
                currentY += imgHeight + sectionSpacing; // Add spacing after chart

            } catch (error) {
                console.error(`Error capturing chart ${elementId}:`, error);
                checkAndAddPage(15); // Add space even if chart fails
                doc.setFontSize(defaultFontSize);
                doc.setTextColor(200, 0, 0); // Red for error
                doc.text(`Error rendering chart: ${title}`, margin, currentY);
                currentY += lineSpacing + sectionSpacing;
            }
        };

        // Add charts (ensure IDs match the elements in your JSX)
        await captureChart('report-radar-chart', 'Category Score Overview');
        await captureChart('report-bar-chart', 'Individual Item Scores');

        // --- 7. Save PDF ---
        doc.save(`Financial_Health_Report_${(data.clientName || 'Client').replace(/\s+/g, '_')}.pdf`);
    };


    // --- Render (JSX remains largely the same as previous version) ---
    return (
        <div ref={reportRef} className="max-w-7xl mx-auto mt-8 p-6 bg-gray-50 rounded-lg shadow-xl border border-gray-200 space-y-10 font-sans">

            {/* --- Header & Overall Score --- */}
            <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-center">
                {/* Left Side: Client Info */}
                <div className="mb-4 md:mb-0">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{data.clientName || 'N/A'}</h1>
                    <p className="text-sm text-gray-600">
                        Planner: <span className="font-medium">{data.financialDoctorName || 'N/A'}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                        Date: <span className="font-medium">{data.date || 'N/A'}</span>
                    </p>
                </div>

                {/* Right Side: Score & Grade */}
                <div className="text-center md:text-right">
                    <div className="text-5xl font-extrabold" style={{ color: gradeColor }}>
                        {overallPercentage}%
                    </div>
                    <div className="text-xl font-semibold mt-1" style={{ color: gradeColor }}>
                        {grade} <span className="text-gray-600 font-normal">({remarks})</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Overall Score: {totalScore} / {maxScore}
                    </div>
                </div>
            </div>

            {/* --- Export Button --- */}
            <div className="text-center">
                 <button
                    onClick={handleExportPDF}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    Export Report to PDF
                </button>
                 <button
                    onClick={onClose} // Use the onClose prop passed from the modal
                    className="ml-4 px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                >
                    Close Report
                </button>
            </div>

             {/* --- Summary Insights --- */}
             <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
                 <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Key Insights & Recommendations</h2>
                 <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm md:text-base"> {/* Slightly larger text on medium screens */}
                     {summaryInsights.map((insight, index) => (
                         <li key={index}>{insight}</li>
                     ))}
                 </ul>
             </div>


            {/* --- Category Performance --- */}
            <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Category Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryScores.map((cat) => {
                        const catGrade = calculateGrade((cat.averageScore / 5) * 100);
                        return (
                            <div key={cat.name} className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow duration-150">
                                <cat.icon className={`w-6 h-6 mr-3 flex-shrink-0 ${cat.color}`} />
                                <div className="flex-grow">
                                    <span className="font-medium text-gray-700">{cat.name}</span>
                                </div>
                                <div className="text-right ml-2">
                                    <span className="text-lg font-semibold" style={{ color: catGrade.color }}>
                                        {cat.averageScore.toFixed(1)}/5
                                    </span>
                                    <div className="text-xs text-gray-500">{catGrade.remarks}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- Charts --- */}
            {/* Added fixed height and overflow hidden to parent div to help control chart rendering space */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Radar Chart - Category Overview */}
                <div id="report-radar-chart" className="p-4 bg-white rounded-lg shadow-md border border-gray-200 h-[450px] overflow-hidden"> {/* Increased height */}
                    <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">Category Overview</h2>
                     <ResponsiveContainer width="100%" height="95%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}> {/* Adjusted radius */}
                            <PolarGrid stroke="#d1d5db" />
                            {/* Increased font size slightly */}
                            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#4b5563' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} tick={{ fontSize: 10, fill: '#6b7280' }} />
                            <Radar name="Avg Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#4f46e5', borderRadius: '8px', padding: '5px 10px' }} />
                             <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} /> {/* More padding */}
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar Chart - Individual Item Scores */}
                 <div id="report-bar-chart" className="p-4 bg-white rounded-lg shadow-md border border-gray-200 h-[450px] overflow-hidden"> {/* Increased height */}
                    <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">Individual Item Scores</h2>
                     <ResponsiveContainer width="100%" height="95%">
                         {/* Adjusted margins for labels */}
                         <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 35, left: 110, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false}/>
                             <XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 10, fill: '#6b7280' }} />
                             <YAxis
                                dataKey="name"
                                type="category"
                                width={110} // Increased width for Y-axis labels
                                tick={{ fontSize: 9.5, fill: '#4b5563' }} // Slightly larger font
                                interval={0}
                             />
                             <Tooltip
                                cursor={{ fill: 'rgba(79, 70, 229, 0.08)' }} // Lighter cursor fill
                                contentStyle={{ fontSize: 11, borderColor: '#4f46e5', borderRadius: '8px', padding: '5px 10px' }}
                                formatter={(value) => [`${value}/5`, 'Score']}
                             />
                              {/* Adjusted bar size and label position */}
                             <Bar dataKey="score" fill="#6366f1" barSize={12} radius={[0, 5, 5, 0]}>
                                <LabelList dataKey="score" position="right" offset={5} style={{ fontSize: 9, fill: '#374151' }} formatter={(value) => `${value}`}/>
                             </Bar>
                         </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>


            {/* --- Detailed Checklist Table --- */}
            <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Detailed Checklist Analysis</h2>
                {/* Using min-w-full ensures table takes at least full width, allowing horizontal scroll if needed */}
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                     <thead className="bg-gray-100">
                        <tr>
                            {/* Adjusted padding and text alignment */}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Target</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Current Status</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Gap</th>
                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Score</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Removed category grouping for simplicity in table, category info is above */}
                         {data.checklist.map((item) => {
                             const itemGrade = calculateGrade((item.score / 5) * 100); // Get grade color for score
                             const categoryInfo = getItemCategory(item.item); // Get category for potential styling (optional)
                             return (
                                 <tr key={item.item} className="hover:bg-gray-50">
                                     <td className="px-4 py-2 whitespace-normal font-medium text-gray-800 text-left">{item.item}</td> {/* Allow item name to wrap */}
                                     <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">{formatValue(item.target)}</td>
                                     <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">{formatValue(item.currentStatus)}</td>
                                     {/* Make gap red only if > 0 (and not N/A) */}
                                     <td className={`px-4 py-2 whitespace-nowrap text-right font-medium ${item.gap !== 'N/A' && parseFloat(item.gap.replace(/[^0-9.-]+/g, "")) > 0 ? 'text-red-600' : 'text-gray-600'}`}>{item.gap}</td>
                                     <td className="px-4 py-2 whitespace-nowrap text-center">
                                         <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full" style={{ backgroundColor: itemGrade.color + '20', color: itemGrade.color }}>
                                             {item.score || 0}/5
                                         </span>
                                     </td>
                                 </tr>
                             );
                         })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinancialHealthReport;