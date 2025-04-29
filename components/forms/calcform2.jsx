'use client';

import { useState, useEffect } from 'react';
import FinancialHealthReportModal from '@/components/modals/finhealth';

const FinancialHealthCalculator = () => {
    const [formData, setFormData] = useState({
        clientName: '',
        plannerName: 'Yogendra Malik',
        date: '',
        familyMembers: '',
        annualIncome: 0,
        monthlyExpenses: 0,
        childEducationFundGoal: 0,
        debtManagementEmi: 0,
        monthlySavings: 0,
        housingCost: 0,
        marriageFundGoal: 50000,
        taxPlanning: '',
        hufAccount: '',
        familyGoals: '',
        budgetPlanning: '',
        estatePlanning: '',
        legacyFund: '',
        checklist: [
            {
                item: 'Income Protection',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'annualIncome',
            },
            {
                item: 'Emergency Fund',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'monthlyExpenses',
            },
            {
                item: 'Health Insurance',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'annualIncome',
                isDisabled: true, // Disabled for user input
            },
            {
                item: 'Critical Illness Cover',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'annualIncome',
            },
            {
                item: 'Disability Insurance',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'annualIncome',
            },
            {
                item: 'Retirement Goals',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'monthlyExpenses',
            },
            {
                item: 'Child Education Fund',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'childEducationFundGoal',
                isDisabled: false, // Disabled for user input
            },
            {
                item: 'Debt Management',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'debtManagementEmi',
                isDisabled: false, // Disabled for user input
            },
            {
                item: 'Wealth Planning',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'monthlySavings',
            },
            {
                item: 'Home Loan or Rent',
                target: 0,
                currentStatus: 0,
                score: 0,
                calculationInput: 'housingCost', // Input field for housing cost
            },
            {
                item: 'CIBIL Score',
                target: 750, // Fixed target
                currentStatus: 0, // Input for current CIBIL score
                score: 0, // Score to be calculated
            },
            {
                item: 'Marriage Fund',
                target: 50000, // This will be the goal input by the user
                currentStatus: 0, // This will be the current value input by the user
                score: 0, // Score to be calculated based on currentStatus and target
                calculationInput: 'marriageFundGoal', // Input for marriage fund goal
            },
            {
                item: 'Budget Planning',
                target: 'Yes', // The expected answer
                currentStatus: '', // User's answer (Yes/No)
                score: 0, // Score will be 100 if "Yes", 0 if "No"
            },
            {
                item: 'Estate Planning',
                target: 'Yes', // Set the target to 'Yes'
                currentStatus: '', // Initially empty, will be updated via dropdown
                score: 0, // Default score
            },
            {
                item: 'Legacy Fund',
                target: 'Yes', // Set the target to 'Yes'
                currentStatus: '', // Initially empty, will be updated via dropdown
                score: 0, // Default score
            },
            {
                item: "Spouse's Coverage",
                target: 0, // Will be calculated dynamically
                currentStatus: 0, // User inputs this value
                score: 0, // Will be calculated based on target and currentStatus
                calculationInput: 'annualIncome', // References totalAnnualIncome for calculation
            },
            {
                item: 'Tax Planning',
                target: 200000, // Fixed target
                currentStatus: 0, // Input for current status
                score: 0, // Calculated score
            },
            {
                item: 'Investment Diversification',
                options: {
                    equity: false,
                    property: false,
                    mf: false,
                    gold: false,
                    fd: false,
                    traditionalInsurance: false,
                },
                risk: 0, // Calculated risk percentage
                guaranteed: 0, // Calculated guaranteed percentage
                score: 0, // Calculated score
            },
            {
                item: 'HUF Account',
                target: 'Yes', // Set the target to 'Yes'
                currentStatus: '', // Initially empty, will be updated via dropdown
                score: 0, // Default score
            },
            {
                item: 'Family Goals',
                target: 'Yes', // Set the target to 'Yes'
                currentStatus: '', // Initially empty, will be updated via dropdown
                score: 0, // Default score
            },
        ],
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formDataForReport, setFormDataForReport] = useState(null);

    const handleSubmit = () => {
        // Prepare the data for submission (you can structure it however you want)
        const formDataForSubmission = {
            clientName: formData.clientName,
            plannerName: formData.plannerName,
            date: formData.date,
            familyMembers: formData.familyMembers,
            annualIncome: formData.annualIncome,
            monthlyExpenses: formData.monthlyExpenses,
            childEducationFundGoal: formData.childEducationFundGoal,
            debtManagementEmi: formData.debtManagementEmi,
            monthlySavings: formData.monthlySavings,
            housingCost: formData.housingCost,
            marriageFundGoal: formData.marriageFundGoal,
            taxPlanning: formData.taxPlanning,
            hufAccount: formData.hufAccount,
            budgetPlanning: formData.budgetPlanning,
            estatePlanning: formData.estatePlanning,
            legacyFund: formData.legacyFund,
            checklist: formData.checklist.map((item) => ({
                item: item.item,
                target: item.target,
                currentStatus: item.currentStatus,
                score: item.score,
            })),
        };

        // Optionally, you can submit the data to a backend
        // axios.post('/your-api-endpoint', formDataForSubmission)
        //     .then(response => alert("Data submitted successfully"))
        //     .catch(error => alert("Error submitting data"));

        // Now, generate the report
        setFormDataForReport(formDataForSubmission);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const calculateScoreToScale = (percentage) => {
        if (percentage >= 100) return 5;
        if (percentage >= 80) return 4;
        if (percentage >= 60) return 3;
        if (percentage >= 30) return 2;
        return 1; // Below 30% returns 1
    };

    const handleInvestmentDiversificationChange = (e, option) => {
        const isChecked = e.target.checked;

        setFormData((prev) => {
            const updatedChecklist = [...prev.checklist];
            const index = updatedChecklist.findIndex((row) => row.item === 'Investment Diversification');

            // Update the specific option based on checkbox change
            updatedChecklist[index].options[option] = isChecked;

            // Recalculate risk, guaranteed, and score
            const { risk, guaranteed, score } = calculateInvestmentDiversificationScore(updatedChecklist[index].options);
            updatedChecklist[index].risk = risk;
            updatedChecklist[index].guaranteed = guaranteed;
            updatedChecklist[index].score = calculateScoreToScale(score);

            return { ...prev, checklist: updatedChecklist };
        });
    };

    // Function to calculate risk, guaranteed, and score
    const calculateInvestmentDiversificationScore = (options) => {
        const riskOptions = ['equity', 'property', 'mf'];
        const guaranteedOptions = ['gold', 'fd', 'traditionalInsurance'];

        const riskCount = riskOptions.filter((option) => options[option]).length;
        const guaranteedCount = guaranteedOptions.filter((option) => options[option]).length;

        const totalCount = riskCount + guaranteedCount;

        // Calculate percentages
        const riskPercentage = totalCount > 0 ? (riskCount / totalCount) * 100 : 0;
        const guaranteedPercentage = totalCount > 0 ? (guaranteedCount / totalCount) * 100 : 0;

        // Calculate score
        const score = Math.min(riskPercentage, guaranteedPercentage) * 2;

        return {
            risk: riskPercentage,
            guaranteed: guaranteedPercentage,
            score,
        };
    };

    // Helper functions for specific calculations
    const calculateDebtManagementScore = (currentStatus, target) => {
        return currentStatus <= target ? 100 : Math.max(0, (target / currentStatus) * 100);
    };

    const calculateWealthPlanningScore = (currentStatus, target) => {
        return currentStatus >= target ? 100 : Math.max(0, (currentStatus / target) * 100);
    };

    useEffect(() => {
        const calculateChecklist = () => {
            // Make a shallow copy of the checklist and return the updated checklist
            return formData.checklist.map((row) => {
                // Recalculate the target based on formData inputs
                if (row.item === 'Income Protection') {
                    row.target = formData.annualIncome * 20;
                } else if (row.item === 'Emergency Fund') {
                    row.target = formData.monthlyExpenses * 3;
                } else if (row.item === 'Health Insurance') {
                    row.target = formData.annualIncome * 8;
                } else if (row.item === 'Critical Illness Cover') {
                    row.target = formData.annualIncome * 3;
                } else if (row.item === 'Disability Insurance') {
                    row.target = formData.annualIncome * 3;
                } else if (row.item === 'Retirement Goals') {
                    row.target = formData.monthlyExpenses * 300;
                } else if (row.item === 'Child Education Fund') {
                    row.target = formData.childEducationFundGoal;
                } else if (row.item === 'Debt Management') {
                    row.target = (formData.annualIncome * 0.4) / 12; // 40% of annual income divided monthly
                } else if (row.item === 'Wealth Planning') {
                    row.target = (formData.annualIncome / 12) * 0.2; // 20% of monthly income
                } else if (row.item === 'Home Loan or Rent') {
                    row.target = (formData.annualIncome / 12) * 0.3; // 30% of monthly income
                } else if (row.item === 'CIBIL Score') {
                    row.target = 750; // Fixed target for CIBIL score
                } else if (row.item === 'Marriage Fund') {
                    row.target = formData.marriageFundGoal;
                } else if (row.item === "Spouse's Coverage") {
                    row.target = formData.annualIncome * 10;
                } else if (row.item === 'Tax Planning') {
                    row.target = 200000;
                }

                // General score calculation for each item
                if (row.item === 'CIBIL Score') {
                    const percent = row.currentStatus >= 750 ? 100 : row.currentStatus >= 300 ? Math.max(0, Math.pow((row.currentStatus - 300) / 450, 2) * 100) : 0;
                    row.score = calculateScoreToScale(percent);
                } else if (row.item === 'Budget Planning') {
                    const percent = row.currentStatus === 'Yes' ? 100 : 0; // Yes = 100, No = 0
                    row.score = calculateScoreToScale(percent);
                } else if (row.item === 'Estate Planning') {
                    const percent = row.currentStatus === 'Yes' ? 100 : 0;
                    row.score = calculateScoreToScale(percent);
                } else if (row.item === 'Legacy Fund') {
                    const percent = row.currentStatus === 'Yes' ? 100 : 0;
                    row.score = calculateScoreToScale(percent);
                } else if (row.item === 'Huf Account') {
                    const percent = row.currentStatus === 'Yes' ? 100 : 0;
                    row.score = calculateScoreToScale(percent);
                } else if (row.item === 'Family Goals') {
                    const percent = row.currentStatus === 'Yes' ? 100 : 0;
                    row.score = calculateScoreToScale(percent);
                } else if (row.item === 'Home Loan or Rent') {
                    // Special case: lower current value than target is better
                    const percent =
                        row.currentStatus <= row.target
                            ? 100 // Assign a score of 100% if currentStatus is less than or equal to the target
                            : Math.max(0, (row.target / row.currentStatus) * 100); // Apply inverse score for exceeding target
                    row.score = calculateScoreToScale(percent); // Use the existing scale function to convert to 5-point score
                } else if(row.item === 'Debt Management') {
                    // Special case: lower current value than target is better
                    const percent =
                        row.currentStatus <= row.target
                            ? 100
                            : Math.max(0, (row.target / row.currentStatus) * 100);
                    row.score = calculateScoreToScale(percent);
                } else {
                    // For other checklist items
                    const percent = row.target > 0 ? Math.min(100, (row.currentStatus / row.target) * 100) : 0;
                    row.score = calculateScoreToScale(percent);
                }

                return row;
            });
        };

        // Ensure to create a copy of formData before setting state
        const updatedChecklist = calculateChecklist();

        setFormData((prev) => ({
            ...prev,
            checklist: updatedChecklist,
        }));
    }, [
        formData.annualIncome,
        formData.monthlyExpenses,
        formData.childEducationFundGoal,
        formData.debtManagementEmi,
        formData.monthlySavings,
        formData.housingCost,
        formData.marriageFundGoal,
        formData.budgetPlanning,
        formData.estatePlanning,
        formData.legacyFund,
        formData.spouseCoverage,
        formData.taxPlanning,
        // Ensure this dependency is correctly included
    ]);

    // Recalculate targets based on annualIncome and monthlyExpenses
    // useEffect(() => {
    //     const updatedChecklist = [...formData.checklist];

    //     // Income Protection - target is calculated from annualIncome * 20
    //     updatedChecklist[0].target = formData.annualIncome * 20;
    //     // Emergency Fund - target is calculated from monthlyExpenses * 3
    //     updatedChecklist[1].target = formData.monthlyExpenses * 3;
    //     // Health Insurance - target is calculated from annualIncome * 0.1
    //     updatedChecklist[2].target = formData.annualIncome * 8;
    //     // Critical Illness Cover - target is calculated from annualIncome * 3
    //     updatedChecklist[3].target = formData.annualIncome * 3;
    //     // Disability Insurance - target is calculated from annualIncome * 3
    //     updatedChecklist[4].target = formData.annualIncome * 3;
    //     // Retirement Goals - target is calculated from monthlyExpenses * 300
    //     updatedChecklist[5].target = formData.monthlyExpenses * 300;
    //     // Child Education Fund - target is calculated from childEducationFundGoal
    //     updatedChecklist[6].target = formData.childEducationFundGoal;
    //     // Debt Management - target is calculated from debtManagementEmi
    //     updatedChecklist[7].target = (formData.annualIncome * 0.4) / 12;
    //     // Wealth Planning - target is calculated from monthlySavings
    //     updatedChecklist[8].target = (formData.annualIncome / 12) * 0.2;

    //     updatedChecklist.forEach((row, index) => {
    //         if (index === 7) {
    //             // Special case for Debt Management
    //             if (row.currentStatus <= row.target) {
    //                 row.score = 100; // Full score if EMI is within 40% of monthly income
    //             } else {
    //                 row.score = Math.max(0, (row.target / row.currentStatus) * 100); // Decreasing score for exceeding EMI
    //             }
    //         } else if (index === 8) {
    //             // Special case for Wealth Planning
    //             if (row.currentStatus >= row.target) {
    //                 row.score = 100; // Full score if monthly savings is at least 20% of monthly income
    //             } else {
    //                 row.score = Math.max(0, (row.currentStatus / row.target) * 100); // Decreasing score for lower savings
    //             }
    //         } else {
    //             // Normal score calculation for other items
    //             row.score = row.currentStatus > 0 ? (row.currentStatus / row.target) * 100 : 0;
    //         }
    //     });

    //     setFormData((prev) => ({ ...prev, checklist: updatedChecklist }));
    // }, [formData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleChecklistChange = (index, field, value) => {
        const updatedChecklist = [...formData.checklist];

        // Update the specified field
        updatedChecklist[index][field] = parseFloat(value) || 0;

        // Recalculate the score for the updated row
        const row = updatedChecklist[index];
        if (row.item === 'CIBIL Score') {
            // Special calculation for CIBIL Score
            const percent = row.currentStatus >= 750 ? 100 : row.currentStatus >= 300 ? Math.max(0, Math.pow((row.currentStatus - 300) / 450, 2) * 100) : 0;
            row.score = calculateScoreToScale(percent); // Calculate score based on percent;
        } else {
            // General calculation for other items
            const percent = row.target > 0 ? Math.min(100, (row.currentStatus / row.target) * 100) : 0;
            row.score = calculateScoreToScale(percent);
        }

        // Update the state with the recalculated checklist
        setFormData((prev) => ({ ...prev, checklist: updatedChecklist }));
    };

    return (
        <>
        <div className="form-container p-6 bg-white rounded shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Financial Health Calculator</h2>

            {/* User Details Form */}
            <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {/* Basic Information Inputs */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name of the Client</label>
                    <input type="text" name="clientName" placeholder="Enter Client Name" value={formData.clientName} onChange={handleInputChange} className="form-input w-full" required />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name of Financial Planner</label>
                    <input type="text" name="plannerName" placeholder="Enter Planner Name" value={formData.plannerName} onChange={handleInputChange} className="form-input w-full" required />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-input w-full" required />
                </div>

                <div className="relative">
                                <input type="number" name="annualIncome" value={formData.annualIncome} onChange={handleInputChange} className="form-input w-full" />
                                {!formData.annualIncome && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Annual Income</span>}
                </div>

                <div className="relative">
                                <input type="number" name="childEducationFundGoal" value={formData.childEducationFundGoal} className="form-input w-full" onChange={handleInputChange} />
                                {!formData.childEducationFundGoal && (
                                    <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Child Education Fund Goal</span>
                                )}
                </div>
                <div className="relative">
                                <input
                                    type="number"
                                    name="monthlyExpenses"
                                    placeholder=""
                                    value={formData.monthlyExpenses}
                                    onChange={handleInputChange}
                                    className="form-input w-full"
                                />
                                {!formData.monthlyExpenses && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Monthly Expenses</span>}
                            </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Family Members</label>
                    <input
                        type="text"
                        name="familyMembers"
                        placeholder="e.g., Two Sisters, 4 Brothers"
                        value={formData.familyMembers}
                        onChange={handleInputChange}
                        className="form-input w-full"
                        required
                    />
                </div>
            </form>
            </div>

            <div className='form-container p-6 bg-white rounded shadow-md mt-4'>

            {/* Checklist Table */}
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Checklist</h3>
            <table className="table-auto w-full border border-gray-300">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border px-4 py-2">Checklist Item</th>
                        <th className="border px-4 py-2">Input</th>
                        <th className="border px-4 py-2">Target</th>
                        <th className="border px-4 py-2">Current Status</th>
                        <th className="border px-4 py-2">Gap</th>
                        <th className="border px-4 py-2">Score</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Income Protection Row */}
                    <tr>
                        <td className="border px-4 py-2">Income Protection</td>
                        <td className="border px-4 py-2">
                           
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[0].target}</td>
                        <td className="border px-4 py-2">
                            <input
                                type="number"
                                value={formData.checklist[0].currentStatus}
                                onChange={(e) => handleChecklistChange(0, 'currentStatus', e.target.value)}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[0].target - formData.checklist[0].currentStatus}</td>
                        <td className="border px-4 py-2">{formData.checklist[0].score}</td>
                    </tr>

                    {/* Emergency Fund Row */}
                    <tr>
                        <td className="border px-4 py-2">Emergency Fund</td>
                        <td className="border px-4 py-2">
                          
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[1].target}</td>
                        <td className="border px-4 py-2">
                            <input
                                type="number"
                                value={formData.checklist[1].currentStatus}
                                onChange={(e) => handleChecklistChange(1, 'currentStatus', e.target.value)}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[1].target - formData.checklist[1].currentStatus}</td>
                        <td className="border px-4 py-2">{formData.checklist[1].score}</td>
                    </tr>

                    {/* Health Insurance Row */}
                    <tr>
                        <td className="border px-4 py-2">Health Insurance</td>
                        <td className="border px-4 py-2">
                            <div className="relative">
                                <input type="number" value={formData.annualIncome} disabled className="form-input w-full" />
                                {!formData.annualIncome && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Annual Income</span>}
                            </div>
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[2].target}</td>
                        <td className="border px-4 py-2">
                            <input
                                type="number"
                                value={formData.checklist[2].currentStatus}
                                onChange={(e) => handleChecklistChange(2, 'currentStatus', e.target.value)}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[2].target - formData.checklist[2].currentStatus}</td>
                        <td className="border px-4 py-2">{formData.checklist[2].score}</td>
                    </tr>

                    {/* Other Rows (Critical Illness Cover, Disability Insurance, Retirement Goals) */}
                    <tr>
                        <td className="border px-4 py-2">Critical Illness</td>
                        <td className="border px-4 py-2">
                            <div className="relative">
                                <input type="number" value={formData.annualIncome} disabled className="form-input w-full" />
                                {!formData.annualIncome && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Annual Income</span>}
                            </div>
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[3].target}</td>
                        <td className="border px-4 py-2">
                            <input
                                type="number"
                                value={formData.checklist[3].currentStatus}
                                onChange={(e) => handleChecklistChange(3, 'currentStatus', e.target.value)}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[3].target - formData.checklist[3].currentStatus}</td>
                        <td className="border px-4 py-2">{formData.checklist[3].score}</td>
                    </tr>
                    {/* disability Insurnace */}

                    <tr>
                        <td className="border px-4 py-2">Disability Insurance</td>
                        <td className="border px-4 py-2">
                            <div className="relative">
                                <input type="number" value={formData.annualIncome} disabled className="form-input w-full" />
                                {!formData.annualIncome && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Annual Income</span>}
                            </div>
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[4].target}</td>
                        <td className="border px-4 py-2">
                            <input
                                type="number"
                                value={formData.checklist[4].currentStatus}
                                onChange={(e) => handleChecklistChange(4, 'currentStatus', e.target.value)}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[4].target - formData.checklist[4].currentStatus}</td>
                        <td className="border px-4 py-2">{formData.checklist[4].score}</td>
                    </tr>

                    {/* Retirement Goals */}

                    <tr>
                        <td className="border px-4 py-2">Retirement Goals</td>
                        <td className="border px-4 py-2">
                            <div className="relative">
                                <input type="number" value={formData.monthlyExpenses} disabled className="form-input w-full" />
                                {!formData.monthlyExpenses && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Monthly Expenses</span>}
                            </div>
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[5].target}</td>
                        <td className="border px-4 py-2">
                            <input
                                type="number"
                                value={formData.checklist[5].currentStatus}
                                onChange={(e) => handleChecklistChange(5, 'currentStatus', e.target.value)}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[5].target - formData.checklist[5].currentStatus}</td>
                        <td className="border px-4 py-2">{formData.checklist[5].score}</td>
                    </tr>

                    {/* Child Education */}

                    <tr>
                        <td className="border px-4 py-2">Child Education Fund</td>
                        <td className="border px-4 py-2">
                           
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[6].target}</td>
                        <td className="border px-4 py-2">
                            <input
                                type="number"
                                value={formData.checklist[6].currentStatus}
                                onChange={(e) => handleChecklistChange(6, 'currentStatus', e.target.value)}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[6].target - formData.checklist[6].currentStatus}</td>
                        <td className="border px-4 py-2">{formData.checklist[6].score}</td>
                    </tr>
                    {/* debt management */}
                    <tr>
                        <td className="border px-4 py-2">Debt Management</td>
                        <td className="border px-4 py-2">
                          
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[7].target}</td>
                        <td className="border px-4 py-2">
                              {/* Input for debtManagementEmi */}
                              <div className="relative">
                                <input
                                    type="number"
                                    name="debtManagementEmi"
                                    value={formData.debtManagementEmi}
                                    className="form-input w-full"
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        // Update debtManagementEmi and sync it with checklist[7].currentStatus
                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            updatedChecklist[7].currentStatus = parseInt(value) || 0; // Sync currentStatus
                                            return { ...prev, debtManagementEmi: parseInt(value) || 0, checklist: updatedChecklist };
                                        });
                                    }}
                                />
                                {!formData.debtManagementEmi && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter EMI</span>}
                            </div>
                        </td>
                        <td className="border px-4 py-2">{Math.max(0, formData.checklist[7].target - formData.checklist[7].currentStatus).toFixed(2)}</td>
                        <td className="border px-4 py-2">{formData.checklist[7].score}</td>
                    </tr>

                    {/* wealth Planning */}

                    <tr>
                        <td className="border px-4 py-2">Wealth Planning</td>
                        <td className="border px-4 py-2">
                            {/* Input for monthly savings */}
                           
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[8].target.toFixed(2)}</td>
                        <td className="border px-4 py-2">
                        <div className="relative">
                                <input
                                    type="number"
                                    name="monthlySavings"
                                    value={formData.monthlySavings}
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        // Update monthlySavings and sync it with checklist[8].currentStatus
                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            updatedChecklist[8].currentStatus = parseInt(value) || 0; // Sync currentStatus
                                            return { ...prev, monthlySavings: parseInt(value) || 0, checklist: updatedChecklist };
                                        });
                                    }}
                                    className="form-input w-full"
                                />
                                {!formData.monthlySavings && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Monthly Savings </span>}
                            </div>
                        </td>
                        <td className="border px-4 py-2">{Math.max(0, formData.checklist[8].target - formData.checklist[8].currentStatus).toFixed(2)}</td>
                        <td className="border px-4 py-2">{formData.checklist[8].score}</td>
                    </tr>
                    {/* housing cost */}
                    <tr>
                        <td className="border px-4 py-2">Home Loan or Rent</td>
                        <td className="border px-4 py-2">
                           
                        </td>
                        <td className="border px-4 py-2">{formData.checklist[9].target.toFixed(2)}</td>
                        <td className="border px-4 py-2">
                             {/* Input for housing cost */}
                             <div className="relative">
                                <input
                                    type="number"
                                    name="housingCost"
                                    value={formData.housingCost || 0}
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        // Update housing cost and sync it with checklist[9].currentStatus
                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            updatedChecklist[9].currentStatus = parseInt(value) || 0; // Sync currentStatus
                                            return { ...prev, housingCost: parseInt(value) || 0, checklist: updatedChecklist };
                                        });
                                    }}
                                    className="form-input w-full"
                                />
                                {!formData.housingCost && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Housing Cost</span>}
                            </div>
                        </td>
                        <td className="border px-4 py-2">{Math.max(0, formData.checklist[9].target - formData.checklist[9].currentStatus).toFixed(2)}</td>
                        <td className="border px-4 py-2">{formData.checklist[9].score}</td>
                    </tr>

                    {/* cibil */}
                    <tr>
                        <td className="border px-4 py-2">CIBIL Score</td>
                        <td className="border px-4 py-2">
                           
                        </td>
                        <td className="border px-4 py-2">750</td>
                        <td className="border px-4 py-2">
                            {/* Input for current CIBIL score */}
                            <div className="relative">
                                <input
                                    type="number"
                                    name="cibilScore"
                                    value={formData.checklist[10]?.currentStatus || 0}
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        // Update currentStatus for CIBIL Score
                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            updatedChecklist[10].currentStatus = parseInt(value) || 0; // Sync currentStatus
                                            return { ...prev, checklist: updatedChecklist };
                                        });
                                    }}
                                    className="form-input w-full"
                                />
                                {!formData.checklist[10]?.currentStatus && (
                                    <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter CIBIL</span>
                                )}
                            </div>
                        </td>
                        <td className="border px-4 py-2">{Math.max(0, 750 - (formData.checklist[10]?.currentStatus || 0)).toFixed(2)}</td>
                        <td className="border px-4 py-2">{formData.checklist[10]?.score || 0}</td>
                    </tr>

                    {/* marriage fund */}
                    <tr>
                        <td className="border px-4 py-2">Marriage Fund</td>
                        <td className="border px-4 py-2">
                            {/* Input for marriage fund goal */}
                            {/* <div className="relative">
                                <input
                                    type="number"
                                    name="marriageFundGoal"
                                    value={formData.marriageFundGoal || 0}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        setFormData((prev) => ({
                                            ...prev,
                                            marriageFundGoal: parseInt(value) || 0, // Update goal (target)
                                        }));
                                    }}
                                    className="form-input w-full"
                                />
                                {!formData.marriageFundGoal && (
                                    <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Enter Marriage Fund Goal</span>
                                )}
                            </div> */}
                        </td>
                        <td className="border px-4 py-2">
                            {/* Display the target (Marriage Fund Goal) */}
                            {formData.marriageFundGoal || 0}
                        </td>
                        <td className="border px-4 py-2">
                            {/* Input for current value */}
                            <input
                                type="number"
                                value={formData.checklist[formData.checklist.findIndex((row) => row.item === 'Marriage Fund')].currentStatus || 0}
                                onChange={(e) => {
                                    const { value } = e.target;

                                    // Update current value for Marriage Fund
                                    setFormData((prev) => {
                                        const updatedChecklist = [...prev.checklist];
                                        const index = updatedChecklist.findIndex((row) => row.item === 'Marriage Fund');
                                        updatedChecklist[index].currentStatus = parseInt(value) || 0; // Update current value
                                        return { ...prev, checklist: updatedChecklist };
                                    });
                                }}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">
                            {/* Display the gap */}
                            {Math.max(0, formData.marriageFundGoal - (formData.checklist.find((row) => row.item === 'Marriage Fund').currentStatus || 0)).toFixed(2)}
                        </td>
                        <td className="border px-4 py-2">
                            {/* Display the score */}
                            {formData.checklist.find((row) => row.item === 'Marriage Fund').score}
                        </td>
                    </tr>

                    {/* Budget Planning */}
                    <tr>
                        <td className="border px-4 py-2">Budget Planning</td>
                        <td className="border px-4 py-2">
                           
                        </td>
                        <td className="border px-4 py-2">Yes</td> {/* Target is always "Yes" */}
                        <td className="border px-4 py-2">
                            {/* Dropdown for budget planning */}
                            <div className="relative">
                                <select
                                    name="budgetPlanning"
                                    value={formData.budgetPlanning}
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        // Update the checklist for Budget Planning based on user input
                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            const index = updatedChecklist.findIndex((row) => row.item === 'Budget Planning');

                                            // Update currentStatus to "Yes" or "No"
                                            updatedChecklist[index].currentStatus = value;

                                            // Calculate score based on user selection ("Yes" = 100, "No" = 0)
                                            updatedChecklist[index].score = value === 'Yes' ? 100 : 0;

                                            return { ...prev, budgetPlanning: value, checklist: updatedChecklist };
                                        });
                                    }}
                                    className="form-select w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                        </td>
                        <td className="border px-4 py-2">N/A</td> {/* Gap is not applicable */}
                        <td className="border px-4 py-2">
                            {/* Display the calculated score */}
                            {formData.checklist.find((row) => row.item === 'Budget Planning')?.score || 0}
                        </td>
                    </tr>

                    {/* wealth planning */}
                    <tr>
                        <td className="border px-4 py-2">Estate Planning</td>
                        <td className="border px-4 py-2">
                           
                        </td>
                        <td className="border px-4 py-2">Yes</td> {/* Target is always "Yes" */}
                        <td className="border px-4 py-2">
                            {/* Dropdown for Estate Planning */}
                            <div className="relative">
                                <select
                                    name="estatePlanning"
                                    value={formData.estatePlanning}
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        // Update the checklist for Estate Planning based on user input
                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            const index = updatedChecklist.findIndex((row) => row.item === 'Estate Planning');
                                            updatedChecklist[index].currentStatus = value; // Update currentStatus to "Yes" or "No"
                                            updatedChecklist[index].score = value === 'Yes' ? 100 : 0; // Calculate score
                                            return { ...prev, estatePlanning: value, checklist: updatedChecklist };
                                        });
                                    }}
                                    className="form-select w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                        </td>
                        <td className="border px-4 py-2">N/A</td> {/* Gap is not applicable */}
                        <td className="border px-4 py-2">
                            {/* Display the calculated score */}
                            {formData.checklist.find((row) => row.item === 'Estate Planning')?.score || 0}
                        </td>
                    </tr>

                    {/* Leagcy Fund */}
                    <tr>
                        <td className="border px-4 py-2">Legacy Fund</td>
                        <td className="border px-4 py-2">
                          
                        </td>
                        <td className="border px-4 py-2">Yes</td> {/* Target is always "Yes" */}
                        <td className="border px-4 py-2">
                             {/* Dropdown for Legacy Fund */}
                             <div className="relative">
                                <select
                                    name="legacyFund"
                                    value={formData.legacyFund}
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        // Update the checklist for Legacy Fund based on user input
                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            const index = updatedChecklist.findIndex((row) => row.item === 'Legacy Fund');
                                            updatedChecklist[index].currentStatus = value; // Update currentStatus to "Yes" or "No"
                                            updatedChecklist[index].score = value === 'Yes' ? 100 : 0; // Calculate score
                                            return { ...prev, legacyFund: value, checklist: updatedChecklist };
                                        });
                                    }}
                                    className="form-select w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                        </td>
                        <td className="border px-4 py-2">N/A</td> {/* Gap is not applicable */}
                        <td className="border px-4 py-2">
                            {/* Display the calculated score */}
                            {formData.checklist.find((row) => row.item === 'Legacy Fund')?.score || 0}
                        </td>
                    </tr>
                    {/* spouse coverage  */}
                    <tr>
                        <td className="border px-4 py-2">Spouse's Coverage</td>
                        <td className="border px-4 py-2">
                            {/* Display Annual Income (used for calculation) */}
                            <input type="number" value={formData.annualIncome} disabled className="form-input w-full bg-gray-100" />
                        </td>
                        <td className="border px-4 py-2">
                            {/* Display the dynamically calculated target */}
                            {formData.checklist.find((row) => row.item === "Spouse's Coverage")?.target.toFixed(2)}
                        </td>
                        <td className="border px-4 py-2">
                            {/* Input for Current Status */}
                            <input
                                type="number"
                                value={formData.checklist.find((row) => row.item === "Spouse's Coverage")?.currentStatus || 0}
                                onChange={(e) => {
                                    const { value } = e.target;

                                    // Update currentStatus for Spouse's Coverage
                                    setFormData((prev) => {
                                        const updatedChecklist = [...prev.checklist];
                                        const index = updatedChecklist.findIndex((row) => row.item === "Spouse's Coverage");
                                        updatedChecklist[index].currentStatus = parseFloat(value) || 0; // Update currentStatus
                                        updatedChecklist[index].score =
                                            updatedChecklist[index].target > 0
                                                ? calculateScoreToScale(Math.min(100, (updatedChecklist[index].currentStatus / updatedChecklist[index].target) * 100))
                                                : 0; // Recalculate score
                                        return { ...prev, checklist: updatedChecklist };
                                    });
                                }}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">
                            {/* Gap = target - currentStatus */}
                            {Math.max(
                                0,
                                formData.checklist.find((row) => row.item === "Spouse's Coverage")?.target - formData.checklist.find((row) => row.item === "Spouse's Coverage")?.currentStatus,
                            ).toFixed(2)}
                        </td>
                        <td className="border px-4 py-2">
                            {/* Display the calculated score */}
                            {formData.checklist.find((row) => row.item === "Spouse's Coverage")?.score || 0}
                        </td>
                    </tr>

                    {/* tax planning  */}
                    <tr>
                        <td className="border px-4 py-2">Tax Planning</td>
                        <td className="border px-4 py-2">Fixed Target</td>
                        <td className="border px-4 py-2">
                            {/* Display the fixed target */}
                            200,000
                        </td>
                        <td className="border px-4 py-2">
                            {/* Input for Current Status */}
                            <input
                                type="number"
                                value={formData.checklist.find((row) => row.item === 'Tax Planning')?.currentStatus || 0}
                                onChange={(e) => {
                                    const { value } = e.target;

                                    // Update currentStatus for Tax Planning
                                    setFormData((prev) => {
                                        const updatedChecklist = [...prev.checklist];
                                        const index = updatedChecklist.findIndex((row) => row.item === 'Tax Planning');
                                        updatedChecklist[index].currentStatus = parseFloat(value) || 0; // Update currentStatus
                                        updatedChecklist[index].score =
                                            updatedChecklist[index].target > 0
                                                ? calculateScoreToScale(Math.min(100, (updatedChecklist[index].currentStatus / updatedChecklist[index].target) * 100))
                                                : 0; // Recalculate score
                                        return { ...prev, checklist: updatedChecklist };
                                    });
                                }}
                                className="form-input w-full"
                            />
                        </td>
                        <td className="border px-4 py-2">
                            {/* Gap = target - currentStatus */}
                            {Math.max(0, 200000 - (formData.checklist.find((row) => row.item === 'Tax Planning')?.currentStatus || 0)).toFixed(2)}
                        </td>
                        <td className="border px-4 py-2">
                            {/* Display the calculated score */}
                            {formData.checklist.find((row) => row.item === 'Tax Planning')?.score || 0}
                        </td>
                    </tr>

                    {/* investment diversification */}
                    <tr>
                        <td className="border px-4 py-2">Investment Diversification</td>
                        <td className="border px-4 py-2">
                          
                        </td>
                        <td className="border px-4 py-2">
                            {/* Display Target (Balanced 50% Risk / 50% Guaranteed) */}
                            Balanced (50% - 50% )
                        </td>
                        <td className="border px-4 py-2">
                            {/* Display Current Status */}
                            {`Risk: ${formData.checklist.find((row) => row.item === 'Investment Diversification').risk}%, Guaranteed: ${
                                formData.checklist.find((row) => row.item === 'Investment Diversification').guaranteed
                            }%`}
                              {/* Options for Investment Diversification */}
                              <div className="grid grid-cols-2 gap-2">
                                {/* Risk Options */}
                                <label>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.checklist.find((row) => row.item === 'Investment Diversification').options.equity}
                                        onChange={(e) => handleInvestmentDiversificationChange(e, 'equity')}
                                    />
                                    Equity
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.checklist.find((row) => row.item === 'Investment Diversification').options.property}
                                        onChange={(e) => handleInvestmentDiversificationChange(e, 'property')}
                                    />
                                    Property
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.checklist.find((row) => row.item === 'Investment Diversification').options.mf}
                                        onChange={(e) => handleInvestmentDiversificationChange(e, 'mf')}
                                    />
                                    Mutual Fund
                                </label>

                                {/* Guaranteed Options */}
                                <label>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.checklist.find((row) => row.item === 'Investment Diversification').options.gold}
                                        onChange={(e) => handleInvestmentDiversificationChange(e, 'gold')}
                                    />
                                    Gold
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.checklist.find((row) => row.item === 'Investment Diversification').options.fd}
                                        onChange={(e) => handleInvestmentDiversificationChange(e, 'fd')}
                                    />
                                    Fix Deposit
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={formData.checklist.find((row) => row.item === 'Investment Diversification').options.traditionalInsurance}
                                        onChange={(e) => handleInvestmentDiversificationChange(e, 'traditionalInsurance')}
                                    />
                                    Td Insurance
                                </label>
                            </div>
                        </td>
                        <td className="border px-4 py-2">N/A</td>
                        <td className="border px-4 py-2">
                            {/* Display Calculated Score */}
                            {formData.checklist.find((row) => row.item === 'Investment Diversification').score}
                        </td>
                    </tr>

                    <tr>
                        <td className="border px-4 py-2">HUF Account</td>
                        <td className="border px-4 py-2">
                          
                        </td>
                        <td className="border px-4 py-2">Yes</td> {/* Target is always "Yes" */}
                        <td className="border px-4 py-2">  {/* Dropdown for HUF Account */}
                            <div className="relative">
                                <select
                                    name="hufAccount"
                                    value={formData.hufAccount}
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            const index = updatedChecklist.findIndex((row) => row.item === 'HUF Account');
                                            updatedChecklist[index].currentStatus = value;
                                            updatedChecklist[index].score = value === 'Yes' ? 5 : 1; // Calculate score
                                            return { ...prev, hufAccount: value, checklist: updatedChecklist };
                                        });
                                    }}
                                    className="form-select w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                                {/* {!formData.hufAccount && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Select Yes or No</span>} */}
                            </div></td>
                        <td className="border px-4 py-2">N/A</td> {/* No gap for Yes/No */}
                        <td className="border px-4 py-2">{formData.checklist.find((row) => row.item === 'HUF Account')?.score}</td>
                    </tr>

                    <tr>
                        <td className="border px-4 py-2">Family Goals</td>
                        <td className="border px-4 py-2">
                          
                        </td>
                        <td className="border px-4 py-2">Yes</td> {/* Target is always "Yes" */}
                        <td className="border px-4 py-2">  {/* Dropdown for Family Goals */}
                            <div className="relative">
                                <select
                                    name="familyGoals"
                                    value={formData.familyGoals}
                                    onChange={(e) => {
                                        const { value } = e.target;

                                        setFormData((prev) => {
                                            const updatedChecklist = [...prev.checklist];
                                            const index = updatedChecklist.findIndex((row) => row.item === 'Family Goals');
                                            updatedChecklist[index].currentStatus = value;
                                            updatedChecklist[index].score = value === 'Yes' ? 5 : 1; // Calculate score
                                            return { ...prev, familyGoals: value, checklist: updatedChecklist };
                                        });
                                    }}
                                    className="form-select w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                                {/* {!formData.familyGoals && <span className="absolute ms-8 top-1/2 left-2 transform -translate-y-1/2 text-gray-500 pointer-events-none">Select Yes or No</span>} */}
                            </div></td>
                        <td className="border px-4 py-2">N/A</td> {/* No gap for Yes/No */}
                        <td className="border px-4 py-2">{formData.checklist.find((row) => row.item === 'Family Goals')?.score}</td>
                    </tr>

                    {/* Repeat similarly for other rows */}
                </tbody>
            </table>
            <button onClick={handleSubmit}>Submit and Generate Report</button>

            {isModalOpen && <FinancialHealthReportModal data={formDataForReport} onClose={handleModalClose} />}
        </div>
        </>
    );
};

export default FinancialHealthCalculator;
