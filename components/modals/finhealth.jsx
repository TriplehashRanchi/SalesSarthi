import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LabelList,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    LineChart,
    Line,
    AreaChart,
    CartesianGrid,
    Area,
    Legend,
} from 'recharts';
import { FaShieldAlt, FaMoneyBillAlt, FaHeartbeat, FaHome, FaUserFriends, FaRegCalendarAlt, FaUsers, FaHeart } from 'react-icons/fa'; // Category Icons
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const FinancialHealthReport = ({ data }) => {
    const totalScore = data?.checklist?.reduce((acc, item) => acc + item.score, 0);
    const maxScore = (data?.checklist?.length || 0) * 5;
    const overallPercentage = ((totalScore / maxScore) * 100).toFixed(2);

    const calculateGrade = (percentage) => {
        if (percentage >= 90) return { grade: 'A+', color: '#22c55e' };
        if (percentage >= 80) return { grade: 'A', color: '#34d399' };
        if (percentage >= 70) return { grade: 'B+', color: '#60a5fa' };
        if (percentage >= 60) return { grade: 'B', color: '#818cf8' };
        if (percentage >= 50) return { grade: 'C', color: '#fbbf24' };
        if (percentage >= 40) return { grade: 'D', color: '#f87171' };
        return { grade: 'F', color: '#ef4444' };
    };

    const { grade, color: gradeColor } = calculateGrade(overallPercentage);

    const radarData = data?.checklist?.map((item) => ({
        category: item.item,
        score: item.score,
    }));

    const scoreComparisonData = data?.checklist?.map((item) => ({
        name: item.item,
        score: item.score,
        target: item.target,
    }));

    const gapAnalysisData = data?.checklist?.map((item) => {
        let currentStatus = item.currentStatus;
        let targetStatus = item.target;

        if (targetStatus === 'Yes') targetStatus = 100;
        if (targetStatus === 'No') targetStatus = 0;
        if (currentStatus === 'Yes') currentStatus = 100;
        if (currentStatus === 'No') currentStatus = 0;

        return {
            name: item.item,
            currentStatusPercentage: (currentStatus / targetStatus) * 100,
            targetStatusPercentage: 100,
            currentStatus,
            targetStatus,
        };
    });

    const renderProgressBar = (progress) => {
        const progressColor = progress >= 80 ? '#22c55e' : progress >= 50 ? '#fbbf24' : '#ef4444';
        return (
            <div
                className="h-2 w-full bg-gray-300 rounded-full"
                style={{
                    backgroundColor: '#e5e7eb',
                }}
            >
                <div
                    className="h-2 rounded-full"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: progressColor,
                    }}
                />
            </div>
        );
    };

    const renderCircularProgress = (score) => {
        const percentage = (score / 5) * 100;
        const radius = 30;
        const circumference = 2 * Math.PI * radius;
        const progress = ((100 - percentage) / 100) * circumference;
        const color = score >= 4 ? '#22c55e' : score >= 3 ? '#60a5fa' : score >= 2 ? '#fbbf24' : '#ef4444';

        return (
            <div className="relative inline-flex items-center justify-center">
                <svg className="transform -rotate-90 w-24 h-24">
                    <circle className="text-gray-200" strokeWidth="6" stroke="currentColor" fill="transparent" r={radius} cx="48" cy="48" />
                    <circle
                        className="text-blue-600"
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={progress}
                        strokeLinecap="round"
                        stroke={color}
                        fill="transparent"
                        r={radius}
                        cx="48"
                        cy="48"
                    />
                </svg>
                <div className="absolute text-2xl font-bold text-white">{score}/5</div>
            </div>
        );
    };

    // Map item names to specific icons
    const getCategoryIcon = (itemName) => {
        switch (itemName) {
            case 'Income Protection':
                return <FaShieldAlt className="text-green-500 mr-2" />;
            case 'Emergency Fund':
                return <FaMoneyBillAlt className="text-blue-500 mr-2" />;
            case 'Health Insurance':
                return <FaHeartbeat className="text-red-500 mr-2" />;
            case 'Critical Illness Cover':
                return <FaShieldAlt className="text-orange-500 mr-2" />;
            case 'Disability Insurance':
                return <FaShieldAlt className="text-yellow-500 mr-2" />;
            case 'Retirement Goals':
                return <FaRegCalendarAlt className="text-purple-500 mr-2" />;
            case 'Child Education Fund':
                return <FaUserFriends className="text-blue-500 mr-2" />;
            case 'Debt Management':
                return <FaMoneyBillAlt className="text-green-500 mr-2" />;
            case 'Wealth Planning':
                return <FaMoneyBillAlt className="text-green-500 mr-2" />;
            case 'Home Loan or Rent':
                return <FaHome className="text-yellow-500 mr-2" />;
            case 'CIBIL Score':
                return <FaRegCalendarAlt className="text-indigo-500 mr-2" />;
            case 'Marriage Fund':
                return <FaHeart className="text-red-500 mr-2" />;
            case 'Budget Planning':
                return <FaRegCalendarAlt className="text-purple-500 mr-2" />;
            case 'Estate Planning':
                return <FaRegCalendarAlt className="text-teal-500 mr-2" />;
            case 'Legacy Fund':
                return <FaUsers className="text-pink-500 mr-2" />;
            case "Spouse's Coverage":
                return <FaHeart className="text-red-500 mr-2" />;
            case 'Tax Planning':
                return <FaRegCalendarAlt className="text-orange-500 mr-2" />;
            case 'Investment Diversification':
                return <FaMoneyBillAlt className="text-green-500 mr-2" />;
            case 'HUF Account':
                return <FaHome className="text-yellow-500 mr-2" />;
            case 'Family Goals':
                return <FaUserFriends className="text-blue-500 mr-2" />;
            default:
                return null;
        }
    };

    // Function to export the report to PDF
    const handleExportPDF = async () => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight(); // Height of the page
        const margin = 10;
        let currentY = margin;

        // Utility function to check if the content fits in the current page
        const checkAndAddPage = (height) => {
            if (currentY + height > pdfHeight - margin) {
                doc.addPage();
                currentY = margin;
            }
        };

        // Render and Add Header Section
        const headerElement = document.getElementById('pdf-header');
        const headerCanvas = await html2canvas(headerElement, { scale: 3 });
        const headerImgData = headerCanvas.toDataURL('image/png');
        const headerHeight = (headerCanvas.height / headerCanvas.width) * (pdfWidth - 2 * margin);

        checkAndAddPage(headerHeight); // Check if the header fits in the current page
        doc.addImage(headerImgData, 'PNG', margin, currentY, pdfWidth - 2 * margin, headerHeight);
        currentY += headerHeight + 10;

        // Add Personal Info Section
        doc.setFontSize(14);
        doc.setTextColor('#333333');
        doc.text('Client Information', margin, currentY);
        currentY += 8;

        const personalInfo = [
            { label: 'Annual Income', value: `${data?.annualIncome || 'N/A'}` },
            { label: 'Monthly Expenses', value: `${data?.monthlyExpenses || 'N/A'}` },
            { label: 'Child Education Fund Goal', value: `${data?.childEducationFundGoal || 'N/A'}` },
            { label: 'Marriage Fund Goal', value: `${data?.marriageFundGoal || 'N/A'}` },
            { label: 'Debt Management EMI', value: `${data?.debtManagementEmi || 'N/A'}` },
            { label: 'Monthly Savings', value: `${data?.monthlySavings || 'N/A'}` },
        ];

        // Format Personal Info Section as a Table
        const personalInfoRows = personalInfo.map((info) => [info.label, info.value]);

        checkAndAddPage(50); // Check if there's enough space for the table
        doc.autoTable({
            startY: currentY,
            head: [['Attribute', 'Value']],
            body: personalInfoRows,
            styles: {
                fontSize: 10,
                halign: 'left',
                valign: 'middle',
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [33, 150, 243],
                textColor: [255, 255, 255],
                fontSize: 11,
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            tableWidth: 'auto',
        });

        currentY = doc.previousAutoTable.finalY + 10;

        // Add Table Section for Checklist
        const headers = ['Item', 'Target', 'Current Status', 'Score'];
        const rows = data?.checklist?.map((item) => [item.item, item.target || 'N/A', item.currentStatus || 'N/A', item.score]);

        doc.text('Checklist Details', margin, currentY);
        currentY += 8;

        checkAndAddPage(50); // Check if there's enough space for the checklist table
        doc.autoTable({
            startY: currentY,
            head: [headers],
            body: rows,
            margin: { left: margin },
            styles: {
                fontSize: 10,
                halign: 'center',
                valign: 'middle',
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [33, 150, 243],
                textColor: [255, 255, 255],
                fontSize: 11,
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            tableWidth: 'auto',
        });

        currentY = doc.previousAutoTable.finalY + 10;

        // Add Bar Chart Section
        const chartElement = document.getElementById('bar-chart');
        const chartCanvas = await html2canvas(chartElement, { scale: 3 });
        const chartImgData = chartCanvas.toDataURL('image/png');
        const chartHeight = (chartCanvas.height / chartCanvas.width) * (pdfWidth - 2 * margin);

        checkAndAddPage(chartHeight); // Check if the bar chart fits
        doc.text('Category Score Comparison', margin, currentY);
        currentY += 8;
        doc.addImage(chartImgData, 'PNG', margin, currentY, pdfWidth - 2 * margin, chartHeight);
        currentY += chartHeight + 10;

        // Add Radar Chart Section
        const radarElement = document.getElementById('radar-chart');
        const radarCanvas = await html2canvas(radarElement, { scale: 3 });
        const radarImgData = radarCanvas.toDataURL('image/png');
        const radarHeight = (radarCanvas.height / radarCanvas.width) * (pdfWidth - 2 * margin);

        checkAndAddPage(radarHeight); // Check if the radar chart fits
        doc.text('Category Radar Chart', margin, currentY);
        currentY += 8;
        doc.addImage(radarImgData, 'PNG', margin, currentY, pdfWidth - 2 * margin, radarHeight);
        currentY += radarHeight + 10;

        // Add Area Chart Section (Gap Analysis)
        const areaElement = document.getElementById('gap-analysis');
        const areaCanvas = await html2canvas(areaElement, { scale: 3 });
        const areaImgData = areaCanvas.toDataURL('image/png');
        const areaHeight = (areaCanvas.height / areaCanvas.width) * (pdfWidth - 2 * margin);

        checkAndAddPage(areaHeight); // Check if the area chart fits
        doc.text('Gap Analysis', margin, currentY);
        currentY += 8;
        doc.addImage(areaImgData, 'PNG', margin, currentY, pdfWidth - 2 * margin, areaHeight);
        currentY += areaHeight + 10;

        // Add Checklist Cards Section
        const cardsElement = document.getElementById('card-report'); // The ID of the cards container in your HTML
        const cardsCanvas = await html2canvas(cardsElement, { scale: 3 }); // Capture the section as an image
        const cardsImgData = cardsCanvas.toDataURL('image/png'); // Convert the canvas to image data
        const cardsHeight = (cardsCanvas.height / cardsCanvas.width) * (pdfWidth - 2 * margin); // Calculate height for the cards image

        // Check if the cards section fits in the current page
        checkAndAddPage(cardsHeight); // Use the checkAndAddPage function to handle page breaks

        // Add the captured image of the cards to the PDF
        doc.text('Checklist Cards', margin, currentY); // Title for the cards section
        currentY += 8;
        doc.addImage(cardsImgData, 'PNG', margin, currentY, pdfWidth - 2 * margin, cardsHeight); // Add the cards image
        currentY += cardsHeight + 10; // Adjust the currentY for the next content

        // Save the PDF
        doc.save('financial_health_report.pdf');
    };

    return (
        <div className="max-w-7xl mx-auto mt-16 p-6 bg-white rounded-lg shadow-lg space-y-8">
            {/* Header */}
            <div id="pdf-header" className="flex justify-between items-center p-6 bg-white border-b border-gray-300">
                <div className="w-2/3 pr-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{data?.clientName || 'N/A'}</h1>
                    <p className="text-lg text-gray-600 mb-1">
                        <strong>Planner:</strong> {data?.plannerName || 'N/A'}
                    </p>
                    <p className="text-lg text-gray-600 mb-1">
                        <strong>Date:</strong> {data?.date || 'N/A'}
                    </p>
                    <p className="text-lg text-gray-600">
                        <strong>Percentage Score:</strong> {overallPercentage}%
                    </p>
                </div>

                <div className="w-1/3 text-center">
                    <div className="text-6xl font-bold mb-2" style={{ color: gradeColor }}>
                        {grade}
                    </div>
                    <div className="text-xl font-semibold text-gray-600">({Math.round(totalScore / data?.checklist?.length)})</div>
                </div>
            </div>

            {/* Export Button */}
            <button onClick={handleExportPDF} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg">
                Export Report
            </button>

            {/* Charts Section */}
            <div id="charts-container" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Radar Chart */}
                <div id="radar-chart" className="p-4 bg-gray-50 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Category Score Comparison</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="category" />
                                <PolarRadiusAxis />
                                <Radar name="Score" dataKey="score" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.6} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart for Score Comparison */}
                {/* Bar Chart for Score Comparison */}
                <div id="bar-chart" className="p-4 bg-gray-50 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Category Score Comparison</h2>
                    <div className="h-80">
                        {' '}
                        {/* Reduced height for better fit */}
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={scoreComparisonData}
                                margin={{ top: 20, right: 20, left: 20, bottom: 20 }} // Reduced bottom margin
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    height={80} // Adjusted height for labels
                                    tick={{ fontSize: 10, fill: '#555555' }}
                                />
                                <YAxis
                                    domain={[0, 5]}
                                    tick={{ fontSize: 12, fill: '#555555' }}
                                    label={{
                                        value: 'Score',
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: { fontSize: 14, fill: '#333333' },
                                    }}
                                />
                                <Tooltip cursor={{ fill: 'rgba(96, 165, 250, 0.2)' }} contentStyle={{ fontSize: 12, borderColor: '#60a5fa' }} />
                                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: 12, marginBottom: 110 }} />
                                <Bar
                                    dataKey="score"
                                    fill="#60a5fa"
                                    name="Score"
                                    radius={[15, 15, 0, 0]}
                                    barSize={25} // Reduced bar size for better spacing
                                >
                                    <LabelList dataKey="score" position="top" style={{ fontSize: 10, fill: '#333333' }} />
                                </Bar>
                                <Line type="monotone" dataKey="target" stroke="#f87171" strokeWidth={2} dot={{ stroke: '#f87171', r: 4 }} activeDot={{ r: 6, strokeWidth: 2 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gap Analysis */}
            </div>

            <div id="gap-analysis" className="p-4 bg-gray-50 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Gap Analysis</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={gapAnalysisData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip
                                formatter={(value, name) => {
                                    if (name === 'currentStatus') {
                                        return [`₹${value.toLocaleString()}`, 'Current Status'];
                                    } else if (name === 'targetStatus') {
                                        return [`₹${value.toLocaleString()}`, 'Target'];
                                    } else {
                                        return [`${value}%`, name];
                                    }
                                }}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="currentStatusPercentage" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
                            <Area type="monotone" dataKey="targetStatusPercentage" stroke="#f87171" fill="#f87171" fillOpacity={0.3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Individual Cards Section */}
            <div id="card-report" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data?.checklist?.map((item, index) => (
                    <div key={index} className="p-4 bg-white rounded-lg shadow-md border">
                        <div className="flex items-center mb-2">
                            {/* Dynamic Icons for categories */}
                            {getCategoryIcon(item.item)}
                            <h3 className="font-bold">{item.item}</h3>
                        </div>
                        <div className="mb-4">{renderCircularProgress(item.score)}</div>
                        <div className="mb-4">{renderProgressBar((item.currentStatus / item.target) * 100)}</div>
                        <div className="text-center">
                            <p className="text-lg font-semibold">Score: {item.score}/5</p>
                            <p className={`text-sm ${item.score >= 4 ? 'text-green-600' : item.score >= 3 ? 'text-blue-600' : item.score >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {item.score >= 4 ? 'Excellent' : item.score >= 3 ? 'Good - Keep it up' : item.score >= 2 ? 'Needs Improvement' : 'Critical - Immediate Action Required'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FinancialHealthReport;
