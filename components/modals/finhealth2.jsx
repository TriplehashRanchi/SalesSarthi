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

// 1. Import Capacitor plugins
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// --- Helper Functions ---
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
    if (typeof value !== 'number' || isNaN(value)) {
        return value || 'N/A';
    }
    if (type === 'currency') {
        return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    if (type === 'score') {
        return `${value}/5`;
    }
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
        if (categories[categoryName].items.includes(itemName)) {
            return { name: categoryName, ...categories[categoryName] };
        }
    }
    return { name: 'Other', icon: FaSeedling, color: 'text-gray-500', items: [] };
};

const generateSummaryInsights = (overallPercentage, categoryScores) => {
    let insights = [`Overall Financial Health Score is ${overallPercentage}%, which is considered ${calculateGrade(overallPercentage).remarks}.`];
    const lowScoreThreshold = 3.0;
    const midScoreThreshold = 3.5;
    if (categoryScores['Risk Protection'] < lowScoreThreshold) insights.push("Risk protection strategies (Insurances) appear weak. Reviewing coverage amounts is crucial.");
    if (categoryScores['Emergency & Debt'] < lowScoreThreshold) insights.push("Focus on increasing the Emergency Fund and actively managing debt.");
    if (categoryScores['Goal Planning'] < midScoreThreshold) insights.push("Progress towards long-term goals like Retirement and Education seems slow.");
    if (categoryScores['Wealth & Investment'] < lowScoreThreshold) insights.push("Wealth creation and investment diversification need attention.");
    if (categoryScores['Financial Management'] < midScoreThreshold) insights.push("Review core financial habits including Budgeting, Tax Planning, and housing costs.");
    if (insights.length === 1 && overallPercentage >= 70) {
        insights.push("The current financial standing appears robust. Maintain disciplined financial habits.");
    } else if (insights.length > 1) {
        insights.push("Address the highlighted areas with lower scores first to build a stronger financial foundation.");
    }
    return insights;
};

// --- Main Component ---
const FinancialHealthReport = ({ data, onClose }) => {
    const reportRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const isMobileDevice = window.innerWidth < 768 || Capacitor.isNativePlatform();
        setIsMobile(isMobileDevice);
    }, []);

    if (!data || !data.checklist) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="rounded-lg bg-white p-6 text-center text-red-500 shadow-lg">
                    Error: Report data is missing or invalid.
                </div>
            </div>
        );
    }

    // --- Calculations ---
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

    // --- Image & Share Functionality ---
    const getReportBlob = async () => {
        if (!reportRef.current) return null;
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#f9fafb', // Match parent bg color
                ignoreElements: (element) => element.classList.contains('export-buttons'),
            });
            return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        } catch (error) {
            console.error('Error generating report image:', error);
            alert('Could not create report image. Please try again.');
            return null;
        }
    };

    const handleExportImage = async () => {
        const blob = await getReportBlob();
        if (!blob) return;

        if (Capacitor.isNativePlatform()) {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                try {
                    await Filesystem.writeFile({
                        path: `financial-report-${Date.now()}.png`,
                        data: reader.result,
                        directory: Directory.Documents,
                    });
                    alert('Report saved to your Documents!');
                } catch (e) {
                    console.error('File save error', e);
                    alert('Error: Could not save report.');
                }
            };
        } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'financial-health-report.png';
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const handleShareImage = async () => {
        const blob = await getReportBlob();
        if (!blob) return;

        try {
            if (Capacitor.isNativePlatform()) {
                const base64Data = await blobToBase64(blob);
                const fileName = `report-${Date.now()}.png`;
                await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Cache });
                const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
                await Share.share({
                    text: `Here is the Financial Health Report for ${data.clientName}.`,
                    files: [uri],
                    dialogTitle: 'Share Report',
                });
            } else if (navigator.share) {
                const file = new File([blob], 'report.png', { type: 'image/png' });
                await navigator.share({
                    title: 'Financial Health Report',
                    text: `Here is the report for ${data.clientName}.`,
                    files: [file],
                });
            } else {
                alert('Sharing is not supported on this browser.');
            }
        } catch (error) {
            if (error.name !== 'AbortError' && error.message !== 'Share canceled') {
                console.error('Share failed:', error);
                alert('An error occurred while sharing.');
            }
        }
    };
    
    // --- PDF Export ---
    const handleExportPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

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

        // --- PDF Header ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Financial Health Report', pdfWidth / 2, currentY, { align: 'center' });
        currentY += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Client: ${data.clientName || 'N/A'}`, margin, currentY);
        doc.text(`Date: ${data.date || 'N/A'}`, pdfWidth - margin, currentY, { align: 'right' });
        currentY += 5;
        doc.text(`Planner: ${data.financialDoctorName || 'N/A'}`, margin, currentY);
        currentY += 7;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, currentY, pdfWidth - margin, currentY);
        currentY += 10;

        // --- Overall Assessment ---
        checkAndAddPage(30);
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(gradeRgbColor[0], gradeRgbColor[1], gradeRgbColor[2]);
        doc.text(`${overallPercentage}%`, margin + contentWidth * 0.3, currentY + 10, { align: 'center' });
        doc.setFontSize(18);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.text(`${grade} (${remarks})`, margin + contentWidth * 0.7, currentY + 10, { align: 'center' });
        currentY += 25;

        // --- Key Insights ---
        checkAndAddPage(40);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Insights & Recommendations', margin, currentY);
        currentY += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const insightLines = doc.splitTextToSize(summaryInsights.join('\n\n'), contentWidth);
        doc.text(insightLines, margin, currentY);
        currentY += insightLines.length * 5 + 10;

        // --- Category Performance Table ---
        checkAndAddPage(20 + categoryScores.length * 8);
        doc.autoTable({
            startY: currentY,
            head: [['Category', 'Average Score (out of 5)', 'Assessment']],
            body: categoryScores.map(cat => [cat.name, cat.averageScore.toFixed(1), calculateGrade((cat.averageScore / 5) * 100).remarks]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            didDrawPage: (hookData) => { currentY = hookData.cursor.y + 10; }
        });
        currentY = doc.previousAutoTable.finalY + 10;

        // --- Detailed Checklist Table ---
        checkAndAddPage(20 + data.checklist.length * 9);
        doc.autoTable({
            startY: currentY,
            head: [['Item', 'Target', 'Current Status', 'Gap', 'Score (1-5)']],
            body: data.checklist.map(item => [
                item.item,
                formatNumberForPdf(item.target),
                formatNumberForPdf(item.currentStatus),
                formatNumberForPdf(calculateGap(item)),
                item.score || 0,
            ]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            columnStyles: { 0: { cellWidth: 65 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
            didDrawPage: (hookData) => { currentY = hookData.cursor.y + 10; }
        });
        currentY = doc.previousAutoTable.finalY + 10;

        // --- Charts ---
        const captureChart = async (elementId, title) => {
            const chartElement = document.getElementById(elementId);
            if (!chartElement) return;
            try {
                const canvas = await html2canvas(chartElement, { scale: 2.5, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = contentWidth * 0.95;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                checkAndAddPage(imgHeight + 20);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(title, pdfWidth / 2, currentY, { align: 'center' });
                currentY += 10;
                doc.addImage(imgData, 'PNG', margin + (contentWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 10;
            } catch (error) {
                console.error(`Error capturing chart ${elementId}:`, error);
            }
        };

        await captureChart('report-radar-chart', 'Category Score Overview');
        await captureChart('report-bar-chart', 'Individual Item Scores');

        doc.save(`Financial_Health_Report_${data.clientName.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900 bg-opacity-75 p-4">
            <div className="relative my-8 w-full max-w-5xl rounded-lg bg-gray-50 shadow-2xl">
                {/* --- Report Content to be Captured --- */}
                <div ref={reportRef} className="space-y-10 p-6 font-sans md:p-8">
                    {/* Header & Overall Score */}
                    <div className="flex flex-col items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-md md:flex-row">
                        <div className="mb-4 text-center md:mb-0 md:text-left">
                            <h1 className="mb-2 text-3xl font-bold text-gray-800">{data.clientName || 'N/A'}</h1>
                            <p className="text-sm text-gray-600">Planner: <span className="font-medium">{data.financialDoctorName || 'N/A'}</span></p>
                            <p className="text-sm text-gray-600">Date: <span className="font-medium">{data.date || 'N/A'}</span></p>
                        </div>
                        <div className="text-center md:text-right">
                            <div className="text-5xl font-extrabold" style={{ color: gradeColor }}>{overallPercentage}%</div>
                            <div className="mt-1 text-xl font-semibold" style={{ color: gradeColor }}>{grade} <span className="font-normal text-gray-600">({remarks})</span></div>
                            <div className="mt-1 text-xs text-gray-500">Overall Score: {totalScore} / {maxScore}</div>
                        </div>
                    </div>

                    {/* Summary Insights */}
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                        <h2 className="mb-3 border-b pb-2 text-xl font-semibold text-gray-800">Key Insights & Recommendations</h2>
                        <ul className="list-inside list-disc space-y-2 text-sm text-gray-700 md:text-base">
                            {summaryInsights.map((insight, index) => <li key={index}>{insight}</li>)}
                        </ul>
                    </div>

                    {/* Category Performance */}
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                        <h2 className="mb-4 border-b pb-2 text-xl font-semibold text-gray-800">Category Performance</h2>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {categoryScores.map((cat) => (
                                <div key={cat.name} className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow duration-150 hover:shadow-sm">
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

                    {/* Charts */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div id="report-radar-chart" className="h-[450px] overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-md">
                            <h2 className="mb-2 text-center text-xl font-semibold text-gray-800">Category Overview</h2>
                            <ResponsiveContainer width="100%" height="95%"><RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}><PolarGrid stroke="#d1d5db" /><PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#4b5563' }} /><PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} /><Radar name="Avg Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} /><Tooltip /><Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} /></RadarChart></ResponsiveContainer>
                        </div>
                        <div id="report-bar-chart" className="h-[450px] overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-md">
                            <h2 className="mb-2 text-center text-xl font-semibold text-gray-800">Individual Item Scores</h2>
                            <ResponsiveContainer width="100%" height="95%"><BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 35, left: 110, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false}/><XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} /><YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9.5 }} interval={0} /><Tooltip formatter={(value) => [`${value}/5`, 'Score']} /><Bar dataKey="score" fill="#6366f1" barSize={12} radius={[0, 5, 5, 0]}><LabelList dataKey="score" position="right" offset={5} style={{ fontSize: 9 }} /></Bar></BarChart></ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed Checklist Table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white p-6 shadow-md">
                         <h2 className="mb-4 border-b pb-2 text-xl font-semibold text-gray-800">Detailed Checklist Analysis</h2>
                         <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100"><tr><th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Item</th><th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Target</th><th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Current Status</th><th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Gap</th><th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Score</th></tr></thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {data.checklist.map((item) => {
                                    const itemGrade = calculateGrade((item.score / 5) * 100);
                                    const gapValue = calculateGap(item);
                                    return (
                                        <tr key={item.item} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-left font-medium text-gray-800">{item.item}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">{formatValue(item.target)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-600">{formatValue(item.currentStatus, item.type)}</td>
                                            <td className={`px-4 py-2 whitespace-nowrap text-right font-medium ${gapValue > 0 ? 'text-red-600' : 'text-gray-600'}`}>{gapValue !== null ? `₹ ${gapValue.toLocaleString('en-IN')}` : 'N/A'}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-center"><span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5" style={{ backgroundColor: itemGrade.color + '20', color: itemGrade.color }}>{item.score || 0}/5</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                         </table>
                    </div>
                </div>

                {/* --- Action Buttons (Outside the captured ref) --- */}
                <div className="export-buttons flex flex-wrap items-center justify-center gap-2 px-6 pb-6 text-center md:px-8 md:gap-4">
                    <button onClick={handleExportPDF} className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white shadow-md transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        Export PDF
                    </button>
                    {isMobile && (
                        <>
                            <button onClick={handleExportImage} className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                                Save as Image
                            </button>
                            <button onClick={handleShareImage} className="rounded-lg bg-sky-600 px-5 py-2 font-semibold text-white shadow-md transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                                Share Image
                            </button>
                        </>
                    )}
                    <button onClick={onClose} className="rounded-lg bg-gray-500 px-5 py-2 font-semibold text-white shadow-md transition hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinancialHealthReport;