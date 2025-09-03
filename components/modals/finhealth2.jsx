'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, CartesianGrid
} from 'recharts';
import { FaShieldAlt, FaPiggyBank, FaBalanceScale, FaChartLine, FaTasks, FaSeedling } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Capacitor plugins for native functionality
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// --- Helper Functions (Unchanged) ---
const calculateGrade = (percentage) => {
    const p = Math.max(0, Math.min(100, percentage));
    if (p >= 90) return { grade: 'A+', remarks: 'Excellent', color: '#10b981', rgb: [16, 185, 129] };
    if (p >= 80) return { grade: 'A', remarks: 'Very Good', color: '#22c55e', rgb: [34, 197, 94] };
    if (p >= 70) return { grade: 'B+', remarks: 'Good', color: '#84cc16', rgb: [132, 204, 22] };
    if (p >= 60) return { grade: 'B', remarks: 'Above Average', color: '#facc15', rgb: [250, 204, 21] };
    if (p >= 50) return { grade: 'C', remarks: 'Average', color: '#fbbf24', rgb: [251, 191, 36] };
    if (p >= 40) return { grade: 'D', remarks: 'Needs Improvement', color: '#f97316', rgb: [249, 115, 22] };
    return { grade: 'F', remarks: 'Critical Attention Needed', color: '#ef4444', rgb: [239, 68, 68] };
};

const formatValue = (value, type = 'currency') => {
    if (typeof value === 'object' && value !== null) {
        return `Risk: ${value.risk.toFixed(0)}%, Safe: ${value.guaranteed.toFixed(0)}%`;
    }
    if (typeof value !== 'number' || isNaN(value)) return value || 'N/A';
    if (type === 'currency') return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    if (type === 'score') return `${value}/5`;
    return value.toLocaleString('en-IN');
};

const formatNumberForPdf = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        if (typeof value === 'object' && value !== null && value.hasOwnProperty('risk')) {
             return `R:${value.risk.toFixed(0)}% G:${value.guaranteed.toFixed(0)}%`;
        }
        return (value === null || typeof value === 'undefined') ? 'N/A' : String(value);
    }
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const calculateGap = (item) => {
    const { target, currentStatus, type } = item;
    if (type === 'yesno' || type === 'investment' || typeof target !== 'number' || typeof currentStatus !== 'number') {
        return null;
    }
    let gapValue;
    if (type === 'inverse' || item.item === 'CIBIL Score') {
        gapValue = Math.max(0, (item.item === 'CIBIL Score' ? target - currentStatus : currentStatus - target));
    } else {
        gapValue = Math.max(0, target - currentStatus);
    }
    return Math.round(gapValue);
};

const getItemCategory = (itemName) => {
    const categories = {
        'Risk Protection': { icon: FaShieldAlt, color: 'text-red-500', items: ['Income Protection', 'Health Insurance', 'Critical Illness Cover', 'Disability Insurance', "Spouse's Coverage"] },
        'Emergency & Debt': { icon: FaBalanceScale, color: 'text-orange-500', items: ['Emergency Fund', 'Debt Management', 'CIBIL Score'] },
        'Goal Planning': { icon: FaTasks, color: 'text-blue-500', items: ['Retirement Goals', 'Child Education Fund', 'Marriage Fund', 'Family Goals'] },
        'Wealth & Investment': { icon: FaChartLine, color: 'text-green-500', items: ['Wealth Planning', 'Investment Diversification', 'Legacy Fund'] },
        'Financial Management': { icon: FaPiggyBank, color: 'text-purple-500', items: ['Home Loan or Rent', 'Budget Planning', 'Tax Planning', 'HUF Account', 'Estate Planning'] },
    };
    for (const categoryName in categories) {
        if (categories[categoryName].items.includes(itemName)) return { name: categoryName, ...categories[categoryName] };
    }
    return { name: 'Other', icon: FaSeedling, color: 'text-gray-500', items: [] };
};

const generateSummaryInsights = (overallPercentage, categoryScores) => {
    let insights = [`Overall Financial Health Score is ${overallPercentage}%, which is considered ${calculateGrade(overallPercentage).remarks}.`];
    const lowScoreThreshold = 3.0;
    if (categoryScores['Risk Protection'] < lowScoreThreshold) insights.push("Risk protection strategies (Insurances) appear weak. Reviewing coverage amounts is crucial.");
    if (categoryScores['Emergency & Debt'] < lowScoreThreshold) insights.push("Focus on increasing the Emergency Fund and actively managing debt.");
    if (insights.length === 1 && overallPercentage >= 70) insights.push("The current financial standing appears robust. Maintain disciplined financial habits.");
    else if (insights.length > 1) insights.push("Address the highlighted areas with lower scores first to build a stronger financial foundation.");
    return insights;
};


// --- Main Component ---
const FinancialHealthReport = ({ data, onClose }) => {
    const reportRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768 || Capacitor.isNativePlatform());
    }, []);

    if (!data || !data.checklist) {
        // Simple error display within the modal structure
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="rounded-lg bg-white p-6 text-center text-red-500 shadow-lg">
                    Error: Report data is missing or invalid.
                    <button onClick={onClose} className="mt-4 rounded bg-gray-500 px-4 py-2 text-white">Close</button>
                </div>
            </div>
        );
    }

    // --- Data Calculations ---
    const totalScore = data.checklist.reduce((acc, item) => acc + (item.score || 0), 0);
    const maxScore = (data.checklist.length || 1) * 5;
    const overallPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const { grade, remarks, color: gradeColor, rgb: gradeRgbColor } = calculateGrade(overallPercentage);
    const categoryData = data.checklist.reduce((acc, item) => {
        const categoryInfo = getItemCategory(item.item);
        if (!acc[categoryInfo.name]) acc[categoryInfo.name] = { ...categoryInfo, items: [], totalScore: 0, count: 0 };
        acc[categoryInfo.name].items.push({ ...item, gap: calculateGap(item) });
        acc[categoryInfo.name].totalScore += item.score || 0;
        acc[categoryInfo.name].count++;
        return acc;
    }, {});
    const categoryScores = Object.values(categoryData).map(cat => ({ ...cat, averageScore: cat.count > 0 ? (cat.totalScore / cat.count) : 0 }));
    const radarData = categoryScores.map(cat => ({ category: cat.name, score: parseFloat(cat.averageScore.toFixed(1)) }));
    const barChartData = data.checklist.map(item => ({ name: item.item, score: item.score || 0 }));
    const summaryInsights = generateSummaryInsights(overallPercentage, categoryScores.reduce((acc, cat) => ({ ...acc, [cat.name]: cat.averageScore }), {}));

    /**
     * Generates the entire PDF in memory and returns it as a base64 data string.
     * This is a reusable core function for both downloading and sharing.
     */
    const generatePdfAsBase64 = async () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        const contentWidth = pdfWidth - 2 * margin;
        let currentY = margin;

        const checkAndAddPage = (heightNeeded) => {
            if (currentY + heightNeeded > pdfHeight - margin) {
                doc.addPage();
                currentY = margin;
            }
        };

        // --- PDF Content Generation ---
        doc.setFontSize(16).setFont('helvetica', 'bold').text('Financial Health Report', pdfWidth / 2, currentY, { align: 'center' });
        currentY += 10;
        doc.setFontSize(10).setFont('helvetica', 'normal');
        doc.text(`Client: ${data.clientName || 'N/A'}`, margin, currentY);
        doc.text(`Date: ${data.date || 'N/A'}`, pdfWidth - margin, currentY, { align: 'right' });
        currentY += 5;
        doc.text(`Planner: ${data.financialDoctorName || 'N/A'}`, margin, currentY);
        currentY += 7;
        doc.setDrawColor(220, 220, 220).line(margin, currentY, pdfWidth - margin, currentY);
        currentY += 10;

        doc.setFontSize(36).setFont('helvetica', 'bold').setTextColor(gradeRgbColor[0], gradeRgbColor[1], gradeRgbColor[2]);
        doc.text(`${overallPercentage}%`, margin + contentWidth * 0.3, currentY + 10, { align: 'center' });
        doc.setFontSize(18).setFont('helvetica', 'normal').setTextColor(40, 40, 40);
        doc.text(`${grade} (${remarks})`, margin + contentWidth * 0.7, currentY + 10, { align: 'center' });
        currentY += 25;

        const insightLines = doc.setFontSize(10).splitTextToSize(summaryInsights.join('\n\n'), contentWidth);
        checkAndAddPage(insightLines.length * 5 + 17);
        doc.setFontSize(12).setFont('helvetica', 'bold').text('Key Insights & Recommendations', margin, currentY);
        currentY += 7;
        doc.setFontSize(10).setFont('helvetica', 'normal').text(insightLines, margin, currentY);
        currentY += insightLines.length * 5 + 10;

        checkAndAddPage(20 + categoryScores.length * 8);
        doc.autoTable({
            startY: currentY,
            head: [['Category', 'Average Score (out of 5)', 'Assessment']],
            body: categoryScores.map(cat => [cat.name, cat.averageScore.toFixed(1), calculateGrade((cat.averageScore / 5) * 100).remarks]),
            theme: 'grid', headStyles: { fillColor: [79, 70, 229] },
            didDrawPage: (hookData) => { currentY = hookData.cursor.y + 10; }
        });
        currentY = doc.previousAutoTable.finalY + 10;

        checkAndAddPage(20 + data.checklist.length * 9);
        doc.autoTable({
            startY: currentY,
            head: [['Item', 'Target', 'Current Status', 'Gap', 'Score (1-5)']],
            body: data.checklist.map(item => [item.item, formatNumberForPdf(item.target), formatNumberForPdf(item.currentStatus), formatNumberForPdf(calculateGap(item)), item.score || 0]),
            theme: 'striped', headStyles: { fillColor: [79, 70, 229] },
            columnStyles: { 0: { cellWidth: 65 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
            didDrawPage: (hookData) => { currentY = hookData.cursor.y + 10; }
        });
        currentY = doc.previousAutoTable.finalY + 10;

        const captureChart = async (elementId) => {
            const chartElement = document.getElementById(elementId);
            if (!chartElement) return null;
            try {
                const canvas = await html2canvas(chartElement, { scale: 2.5, backgroundColor: '#ffffff' });
                return canvas.toDataURL('image/png');
            } catch (error) {
                console.error(`Error capturing chart ${elementId}:`, error);
                return null;
            }
        };

        const radarImg = await captureChart('report-radar-chart');
        if (radarImg) {
            const imgWidth = contentWidth * 0.95; const imgHeight = (281 * imgWidth) / 500; // Assuming aspect ratio
            checkAndAddPage(imgHeight + 20);
            doc.setFontSize(12).setFont('helvetica', 'bold').text('Category Score Overview', pdfWidth / 2, currentY, { align: 'center' });
            currentY += 10;
            doc.addImage(radarImg, 'PNG', margin + (contentWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
        }

        const barImg = await captureChart('report-bar-chart');
        if (barImg) {
            const imgWidth = contentWidth * 0.95; const imgHeight = (281 * imgWidth) / 500;
            checkAndAddPage(imgHeight + 20);
            doc.setFontSize(12).setFont('helvetica', 'bold').text('Individual Item Scores', pdfWidth / 2, currentY, { align: 'center' });
            currentY += 10;
            doc.addImage(barImg, 'PNG', margin + (contentWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
        }

        return doc.output('datauristring'); // Return as base64
    };

    /**
     * Handles the "Export PDF" button click for web browsers.
     */
    const handleExportPDF = async () => {
        const base64pdf = await generatePdfAsBase64();
        const link = document.createElement('a');
        link.href = base64pdf;
        link.download = `Financial_Health_Report_${data.clientName.replace(/\s+/g, '_')}.pdf`;
        link.click();
    };

    /**
     * Handles sharing the generated PDF on native devices and web.
     */
    const handleSharePDF = async () => {
        const base64Data = await generatePdfAsBase64();
        if (!base64Data) {
            alert('Could not generate PDF for sharing.');
            return;
        }

        try {
            if (Capacitor.isNativePlatform()) {
                const fileName = `report-${Date.now()}.pdf`;
                await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Cache });
                const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
                await Share.share({
                    title: 'Financial Health Report',
                    text: `Here is the financial health report for ${data.clientName}.`,
                    files: [uri],
                });
            } else if (navigator.share) {
                const response = await fetch(base64Data);
                const blob = await response.blob();
                const file = new File([blob], `report_${data.clientName}.pdf`, { type: 'application/pdf' });
                await navigator.share({
                    title: 'Financial Health Report',
                    files: [file],
                });
            } else {
                alert('Sharing is not supported on this browser. Please use the "Export PDF" button.');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                alert('An error occurred while trying to share.');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900 bg-opacity-75 p-4">
            <div className="relative my-8 w-full max-w-5xl rounded-lg bg-gray-50 shadow-2xl">
                {/* --- Report Content to be Captured for Charts --- */}
                <div ref={reportRef} className="space-y-10 p-6 font-sans md:p-8">
                    <div className="flex flex-col items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-md md:flex-row">
                        <div className="mb-4 text-center md:mb-0 md:text-left">
                            <h1 className="mb-2 text-3xl font-bold text-gray-800">{data.clientName || 'N/A'}</h1>
                            <p className="text-sm text-gray-600">Planner: <span className="font-medium">{data.financialDoctorName || 'N/A'}</span></p>
                            <p className="text-sm text-gray-600">Date: <span className="font-medium">{data.date || 'N/A'}</span></p>
                        </div>
                        <div className="text-center md:text-right">
                            <div className="text-5xl font-extrabold" style={{ color: gradeColor }}>{overallPercentage}%</div>
                            <div className="mt-1 text-xl font-semibold" style={{ color: gradeColor }}>{grade} <span className="font-normal text-gray-600">({remarks})</span></div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                        <h2 className="mb-3 border-b pb-2 text-xl font-semibold text-gray-800">Key Insights & Recommendations</h2>
                        <ul className="list-inside list-disc space-y-2 text-sm text-gray-700 md:text-base">{summaryInsights.map((insight, index) => <li key={index}>{insight}</li>)}</ul>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                        <h2 className="mb-4 border-b pb-2 text-xl font-semibold text-gray-800">Category Performance</h2>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {categoryScores.map((cat) => (
                                <div key={cat.name} className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-sm">
                                    <cat.icon className={`mr-3 h-6 w-6 flex-shrink-0 ${cat.color}`} />
                                    <div className="flex-grow"><span className="font-medium text-gray-700">{cat.name}</span></div>
                                    <div className="ml-2 text-right">
                                        <span className="text-lg font-semibold" style={{ color: calculateGrade((cat.averageScore / 5) * 100).color }}>{cat.averageScore.toFixed(1)}/5</span>
                                        <div className="text-xs text-gray-500">{calculateGrade((cat.averageScore / 5) * 100).remarks}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div id="report-radar-chart" className="h-[450px] rounded-lg border bg-white p-4 shadow-md"><ResponsiveContainer width="100%" height="95%"><RadarChart data={radarData}><PolarGrid /><PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} /><PolarRadiusAxis angle={30} domain={[0, 5]} /><Radar name="Avg Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} /><Tooltip /></RadarChart></ResponsiveContainer></div>
                        <div id="report-bar-chart" className="h-[450px] rounded-lg border bg-white p-4 shadow-md"><ResponsiveContainer width="100%" height="95%"><BarChart data={barChartData} layout="vertical" margin={{ left: 110 }}><XAxis type="number" domain={[0, 5]} /><YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9.5 }} interval={0} /><Bar dataKey="score" fill="#6366f1" barSize={12} radius={[0, 5, 5, 0]}><LabelList dataKey="score" position="right" offset={5} fontSize={9} /></Bar></BarChart></ResponsiveContainer></div>
                    </div>

                    {/* --- Detailed Table: Hidden on mobile, visible on desktop --- */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                         <h2 className="mb-4 border-b pb-2 text-xl font-semibold text-gray-800">Detailed Checklist Analysis</h2>
                         <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100"><tr><th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Item</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Target</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Current Status</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Gap</th><th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600">Score</th></tr></thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {data.checklist.map((item) => {
                                    const itemGrade = calculateGrade((item.score / 5) * 100);
                                    const gapValue = calculateGap(item);
                                    return (
                                        <tr key={item.item} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-left font-medium text-gray-800">{item.item}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">{formatValue(item.target)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">{formatValue(item.currentStatus)}</td>
                                            <td className={`px-4 py-2 whitespace-nowrap text-right font-medium ${gapValue > 0 ? 'text-red-600' : 'text-gray-600'}`}>{gapValue !== null ? `₹ ${gapValue.toLocaleString('en-IN')}` : 'N/A'}</td>
                                            <td className="px-4 py-2 text-center"><span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: itemGrade.color + '20', color: itemGrade.color }}>{item.score}/5</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                         </table>
                    </div>
                </div>

                {/* --- Action Buttons (Outside the captured ref) --- */}
                <div className="export-buttons  flex flex-wrap items-center justify-center gap-2 px-6 pb-6 text-center md:px-8 md:gap-4">
                    <button onClick={handleExportPDF} className="rounded-lg hidden md:block bg-indigo-600 px-5 py-2 font-semibold text-white shadow-md transition hover:bg-indigo-700">
                        Export PDF
                    </button>
                    {isMobile && (
                        <button onClick={handleSharePDF} className="rounded-lg bg-sky-600 px-5 py-2 font-semibold text-white shadow-md transition hover:bg-sky-700">
                            Share PDF
                        </button>
                    )}
                    <button onClick={onClose} className="rounded-lg bg-gray-500 px-5 py-2 font-semibold text-white shadow-md transition hover:bg-gray-600">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinancialHealthReport;