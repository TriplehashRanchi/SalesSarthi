'use client';

import { useState, useEffect, useCallback } from 'react';
import FinancialHealthReportModal from '@/components/modals/finhealth2'; // Assuming this path is correct
import { Button, Checkbox, NumberInput, Popover, Progress, ScrollArea } from '@mantine/core';

// --- Helper Functions ---

// Converts a percentage score (0-100) to a 1-5 scale
const calculateScoreToScale = (percentage) => {
    const p = Math.max(0, Math.min(100, percentage)); // Clamp percentage between 0 and 100
    if (p >= 100) return 5;
    if (p >= 80) return 4;
    if (p >= 60) return 3;
    if (p >= 30) return 2;
    return 1; // Below 30% returns 1
};

// Calculates score for Investment Diversification
const calculateInvestmentDiversificationScore = (options) => {
    // Updated arrays to match the new keys in formData.checklist[...].options
    const riskOptions = [
        'equityDirectStocks',
        'cryptoAssets',
        'realEstateProperty',
        'ownBusinessStartups',
        'equityMutualFunds',
        'derivatives',
        'commoditiesForex',
        'p2pLending',
        'unlistedSharesPreIPO',
        'reitsInvitsThematicETFs',
    ];
    const safeOptions = [
        // Renamed from guaranteedOptions
        'fixedDepositsRDs',
        'ppf',
        'epf',
        'nps',
        'govtBondsAAACorpBonds',
        'postOfficeSchemes',
        'sukanyaSamriddhiYojana',
        'ulipSavingInsurance',
        'gold',
        'debtMutualFundsIndexETFs',
    ];

    const riskCount = riskOptions.filter((option) => options[option]).length;
    const safeCount = safeOptions.filter((option) => options[option]).length; // Use safeOptions
    const totalCount = riskCount + safeCount;

    const riskPercentage = totalCount > 0 ? (riskCount / totalCount) * 100 : 0;
    const safePercentage = totalCount > 0 ? (safeCount / totalCount) * 100 : 0; // Use safeCount

    // Score based on balance
    const balanceScorePercent = Math.min(riskPercentage, safePercentage) * 2;

    return {
        risk: riskPercentage,
        guaranteed: safePercentage, // Renamed from guaranteed
        scaledScore: calculateScoreToScale(balanceScorePercent),
    };
};

// Mapping from state keys to display names for Investment Diversification
const investmentDisplayNames = {
    // Risky Investments
    equityDirectStocks: 'Equity (Direct Stocks)',
    cryptoAssets: 'Crypto Assets',
    realEstateProperty: 'Real Estate / Property',
    ownBusinessStartups: 'Own Business / Startups',
    equityMutualFunds: 'Equity Mutual Funds',
    derivatives: 'Derivatives (Futures & Options)',
    commoditiesForex: 'Commodities & Forex Trading',
    p2pLending: 'Peer-to-Peer Lending (P2P)',
    unlistedSharesPreIPO: 'Unlisted Shares / Pre-IPO',
    reitsInvitsThematicETFs: 'REITs, InvITs & Thematic ETFs',
    // Safe Investments
    fixedDepositsRDs: 'Fixed Deposits (FDs) & Recurring Deposits (RDs)',
    ppf: 'Public Provident Fund (PPF)',
    epf: "Employees' Provident Fund (EPF)",
    nps: 'National Pension Scheme (NPS)',
    govtBondsAAACorpBonds: 'Government Bonds & AAA-rated Corporate Bonds',
    postOfficeSchemes: 'Post Office Savings Schemes',
    sukanyaSamriddhiYojana: 'Sukanya Samriddhi Yojana',
    ulipSavingInsurance: 'ULIP & Saving Insurance Plans',
    gold: 'Gold (Sovereign/Digital/Physical)', // Combined name
    debtMutualFundsIndexETFs: 'Debt Mutual Funds & Index ETFs',
};

// --- Main Component ---

const FinancialHealthCalculator = () => {
    const [formData, setFormData] = useState({
        // Basic Info
        clientName: '',
        financialDoctorName: 'Yogendra Malik', // Default value
        date: new Date().toISOString().split('T')[0], // Default to today's date
        emailId: '',
        mobileNumber: '',
        age: '',
        dateOfBirth: '',
        familyMembers: '',

        // Core Financial Inputs
        annualIncome: 0,
        monthlyExpenses: 0,
        childEducationFundGoal: 0,
        debtManagementEmi: 0, // User inputs this directly
        monthlySavings: 0, // User inputs this directly
        housingCost: 0, // User inputs this directly
        marriageFundGoal: 50000,
        wealthTarget: 0, // Default, user can override if needed (or remove if not meant to be input)
        // Yes/No & Specific Inputs (mirrored in checklist for consistency)
        cibilScoreCurrent: 0, // User input for CIBIL
        marriageFundCurrent: 0, // User input for current marriage fund
        spouseCoverageCurrent: 0, // User input for current spouse coverage
        taxPlanningCurrent: 0, // User input for current tax planning savings
        budgetPlanning: '', // 'Yes' or 'No'
        estatePlanning: '', // 'Yes' or 'No'
        legacyFund: '', // 'Yes' or 'No'
        hufAccount: '', // 'Yes' or 'No'
        familyGoals: '', // 'Yes' or 'No'
        // Checklist State
        checklist: [
            // --- Risk Protection ---
            { item: 'Income Protection', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Annual Income × 20' },
            { item: 'Emergency Fund', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Monthly Expenses × 3' },
            { item: 'Health Insurance', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Annual Income × 8' },
            { item: 'Critical Illness Cover', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Annual Income × 3' },
            { item: 'Disability Insurance', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Annual Income × 3' },
            { item: 'Retirement Goals', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Monthly Expenses × 300' },
            { item: 'Child Education Fund', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Today Expenses + Future Inflation' },
            { item: 'Marriage Fund', target: 50000, currentStatus: 0, score: 0, type: 'standard', formula: 'According to Inflation Adjusted' },
            { item: 'Debt Management', target: 0, currentStatus: 0, score: 0, type: 'inverse', formula: 'Total EMI ≤ 40% of Monthly Income' },
            { item: 'Wealth Planning', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Savings ≥ 20% of Monthly Income' },
            { item: 'Home Loan or Rent', target: 0, currentStatus: 0, score: 0, type: 'inverse', formula: 'Rent ≤ 30% of Monthly Income' },
            { item: 'CIBIL Score', target: 750, currentStatus: 0, score: 0, type: 'cibil', formula: '750+ Good, 800+ Very Good' },
            { item: "Spouse's Coverage", target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Annual Income × 10' },
            { item: 'Tax Planning', target: 200000, currentStatus: 0, score: 0, type: 'standard', formula: 'Up to ₹ 1.5L–2L Deductions' },

            // For Yes/No and Investment Diversification (no real formula):
            { item: 'Budget Planning', target: 'Yes', currentStatus: '', score: 0, type: 'yesno', formula: 'Do you plan your monthly or quarterly budget?' },
            { item: 'Estate Planning', target: 'Yes', currentStatus: '', score: 0, type: 'yesno', formula: 'Create Will For Property' },
            { item: 'Legacy Fund', target: 'Yes', currentStatus: '', score: 0, type: 'yesno', formula: 'Give Donations and wealth successor' },
            { item: 'HUF Account', target: 'Yes', currentStatus: '', score: 0, type: 'yesno', formula: 'Open an HUF Account' },
            { item: 'Family Goals', target: 'Yes', currentStatus: '', score: 0, type: 'yesno', formula: 'Identify major milestones' }, // CurrentStatus linked to taxPlanningCurrent input
            {
                item: 'Investment Diversification',
                target: 'Balanced (50/50)',
                currentStatus: { risk: 0, guaranteed: 0 },
                score: 0,
                type: 'investment',
                options: {
                    // Risky Investments
                    equityDirectStocks: false,
                    cryptoAssets: false,
                    realEstateProperty: false,
                    ownBusinessStartups: false,
                    equityMutualFunds: false,
                    derivatives: false,
                    commoditiesForex: false,
                    p2pLending: false,
                    unlistedSharesPreIPO: false,
                    reitsInvitsThematicETFs: false,
                    // Safe Investments
                    fixedDepositsRDs: false,
                    ppf: false,
                    epf: false,
                    nps: false,
                    govtBondsAAACorpBonds: false,
                    postOfficeSchemes: false,
                    sukanyaSamriddhiYojana: false,
                    ulipSavingInsurance: false,
                    gold: false, // Combined Gold options for simplicity, or create separate ones if needed
                    debtMutualFundsIndexETFs: false,
                },
            },
            // CurrentStatus linked to familyGoals select
        ],
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formDataForReport, setFormDataForReport] = useState(null);

    // --- Input Handlers ---

    // Handles changes for top-level form inputs (text, number, date)
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        const parsedValue = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData((prev) => ({ ...prev, [name]: parsedValue }));
    };

    // Handles changes for numeric inputs within the checklist table (Current Status)
    // Also syncs specific inputs (like debt, savings) back to the main formData
    const handleChecklistNumericChange = (index, value) => {
        const newValue = parseFloat(value) || 0;
        setFormData((prev) => {
            const updatedChecklist = [...prev.checklist];
            const item = updatedChecklist[index];
            item.currentStatus = newValue;

            // Sync back to top-level state if needed
            const updatedFormData = { ...prev };
            if (item.item === 'Debt Management') updatedFormData.debtManagementEmi = newValue;
            if (item.item === 'Wealth Planning') updatedFormData.monthlySavings = newValue;
            if (item.item === 'Home Loan or Rent') updatedFormData.housingCost = newValue;
            if (item.item === 'CIBIL Score') updatedFormData.cibilScoreCurrent = newValue;
            if (item.item === 'Marriage Fund') updatedFormData.marriageFundCurrent = newValue;
            if (item.item === "Spouse's Coverage") updatedFormData.spouseCoverageCurrent = newValue;
            if (item.item === 'Tax Planning') updatedFormData.taxPlanningCurrent = newValue;
            // Add other syncs if necessary

            updatedChecklist[index] = calculateItemScore(item); // Recalculate score for this item

            return { ...updatedFormData, checklist: updatedChecklist };
        });
    };

    // Handles Yes/No dropdown changes
    const handleYesNoChange = (index, value) => {
        setFormData((prev) => {
            const updatedChecklist = [...prev.checklist];
            const item = updatedChecklist[index];
            item.currentStatus = value; // 'Yes' or 'No'

            // Sync back to top-level state
            const updatedFormData = { ...prev };
            if (item.item === 'Budget Planning') updatedFormData.budgetPlanning = value;
            if (item.item === 'Estate Planning') updatedFormData.estatePlanning = value;
            if (item.item === 'Legacy Fund') updatedFormData.legacyFund = value;
            if (item.item === 'HUF Account') updatedFormData.hufAccount = value;
            if (item.item === 'Family Goals') updatedFormData.familyGoals = value;

            updatedChecklist[index] = calculateItemScore(item); // Recalculate score

            return { ...updatedFormData, checklist: updatedChecklist };
        });
    };

    // Handles Investment Diversification checkbox changes
    // Handles Investment Diversification checkbox changes
    const handleInvestmentDiversificationChange = (option, isChecked) => {
        setFormData((prev) => {
            const updatedChecklist = [...prev.checklist];
            const index = updatedChecklist.findIndex((row) => row.item === 'Investment Diversification');
            if (index === -1) return prev;

            const item = updatedChecklist[index];
            item.options[option] = isChecked;

            // Recalculate risk, safe, and score
            const { risk, guaranteed, scaledScore } = calculateInvestmentDiversificationScore(item.options); // Get 'safe' instead of 'guaranteed'
            item.currentStatus = { risk, guaranteed }; // Update current status object with 'safe'
            item.score = scaledScore;

            updatedChecklist[index] = item;

            return { ...prev, checklist: updatedChecklist };
        });
    };

    // --- Calculation Logic ---

    // Recalculates all Targets based on primary inputs (Income, Expenses, Goals)
    const recalculateTargets = useCallback(() => {
        setFormData((prev) => {
            const { annualIncome, monthlyExpenses, childEducationFundGoal, marriageFundGoal } = prev;

            const updatedChecklist = prev.checklist.map((item) => {
                let newTarget = item.target; // Keep existing target by default

                switch (item.item) {
                    case 'Income Protection':
                        newTarget = annualIncome * 20;
                        break;
                    case 'Emergency Fund':
                        newTarget = monthlyExpenses * 3;
                        break;
                    case 'Health Insurance':
                        newTarget = annualIncome * 8;
                        break;
                    case 'Critical Illness Cover':
                        newTarget = annualIncome * 3;
                        break;
                    case 'Disability Insurance':
                        newTarget = annualIncome * 3;
                        break;
                    case 'Retirement Goals':
                        newTarget = monthlyExpenses * 300;
                        break;
                    case 'Child Education Fund':
                        newTarget = childEducationFundGoal;
                        break;
                    case 'Debt Management':
                        newTarget = (annualIncome * 0.4) / 12;
                        break; // 40% of monthly income
                    case 'Wealth Planning':
                        newTarget = (annualIncome / 12) * 0.2;
                        break; // 20% of monthly income
                    case 'Home Loan or Rent':
                        newTarget = (annualIncome / 12) * 0.3;
                        break; // 30% of monthly income
                    case 'Marriage Fund':
                        newTarget = marriageFundGoal;
                        break;
                    case "Spouse's Coverage":
                        newTarget = annualIncome * 10;
                        break;
                    case 'CIBIL Score':
                        newTarget = 750;
                        break; // Fixed
                    case 'Tax Planning':
                        newTarget = 200000;
                        break; // Fixed
                    // Yes/No types don't have numeric targets
                    case 'Budget Planning':
                    case 'Estate Planning':
                    case 'Legacy Fund':
                    case 'HUF Account':
                    case 'Family Goals':
                    case 'Investment Diversification':
                        newTarget = item.target; // Keep 'Yes' or 'Balanced (50/50)'
                        break;
                    default:
                        break; // No change for unknown items
                }
                // Return the item with the potentially updated target
                // Recalculate score immediately after target changes
                return calculateItemScore({ ...item, target: newTarget });
            });

            // Also sync relevant currentStatus fields from top-level inputs after target recalc
            const finalChecklist = updatedChecklist.map((item) => {
                let syncedItem = { ...item };
                switch (item.item) {
                    case 'Debt Management':
                        syncedItem.currentStatus = prev.debtManagementEmi;
                        break;
                    case 'Wealth Planning':
                        syncedItem.currentStatus = prev.monthlySavings;
                        break;
                    case 'Home Loan or Rent':
                        syncedItem.currentStatus = prev.housingCost;
                        break;
                    case 'CIBIL Score':
                        syncedItem.currentStatus = prev.cibilScoreCurrent;
                        break;
                    case 'Marriage Fund':
                        syncedItem.currentStatus = prev.marriageFundCurrent;
                        break;
                    case "Spouse's Coverage":
                        syncedItem.currentStatus = prev.spouseCoverageCurrent;
                        break;
                    case 'Tax Planning':
                        syncedItem.currentStatus = prev.taxPlanningCurrent;
                        break;
                    // Sync Yes/No dropdowns
                    case 'Budget Planning':
                        syncedItem.currentStatus = prev.budgetPlanning;
                        break;
                    case 'Estate Planning':
                        syncedItem.currentStatus = prev.estatePlanning;
                        break;
                    case 'Legacy Fund':
                        syncedItem.currentStatus = prev.legacyFund;
                        break;
                    case 'HUF Account':
                        syncedItem.currentStatus = prev.hufAccount;
                        break;
                    case 'Family Goals':
                        syncedItem.currentStatus = prev.familyGoals;
                        break;
                    // Investment diversification currentStatus is handled separately
                }
                // Recalculate score again after syncing currentStatus
                return calculateItemScore(syncedItem);
            });

            return { ...prev, checklist: finalChecklist };
        });
    }, []); // Empty dependency array - this function is stable and only needs to be created once

    // Calculates the score for a single checklist item based on its type, target, and current status
    const calculateItemScore = (item) => {
        let percentage = 0;
        let score = 1; // Default score

        // Ensure currentStatus is numeric for calculations where needed
        const currentNumeric = typeof item.currentStatus === 'number' ? item.currentStatus : 0;
        const targetNumeric = typeof item.target === 'number' ? item.target : 0;

        switch (item.type) {
            case 'standard': // Higher current status is better (up to target)
                percentage = targetNumeric > 0 ? Math.min(100, (currentNumeric / targetNumeric) * 100) : currentNumeric > 0 ? 100 : 0;
                score = calculateScoreToScale(percentage);
                break;
            case 'inverse': // Lower current status is better (compared to target)
                percentage = currentNumeric <= targetNumeric ? 100 : currentNumeric > 0 ? Math.max(0, (targetNumeric / currentNumeric) * 100) : 100;
                score = calculateScoreToScale(percentage);
                break;
            case 'cibil':
                // More nuanced CIBIL score calculation
                percentage = currentNumeric >= 800 ? 100 : currentNumeric >= 300 ? Math.max(0, Math.pow((currentNumeric - 350) / 450, 2) * 100) : 0;
                score = calculateScoreToScale(percentage);
                break;
            case 'yesno':
                // Yes = 5, No = 1 (or based on scale of 100% vs 0%)
                percentage = item.currentStatus === 'Yes' ? 100 : 0;
                score = calculateScoreToScale(percentage); // Will result in 5 for Yes, 1 for No
                break;
            case 'investment':
                // Score is pre-calculated during checkbox handling
                score = item.score; // Already scaled (1-5)
                break;
            default:
                score = 1; // Default score for unknown types
        }

        return { ...item, score: isNaN(score) ? 1 : score }; // Return item with updated score
    };

    // --- Effects ---

    // Recalculate targets whenever core financial inputs change
    useEffect(() => {
        recalculateTargets();
    }, [
        formData.annualIncome,
        formData.monthlyExpenses,
        formData.childEducationFundGoal,
        formData.marriageFundGoal,
        recalculateTargets, // Include the memoized function in dependencies
    ]);

    // Sync checklist currentStatus from specific top-level inputs when they change
    // This is important if user types directly into top-level inputs AFTER initial load/target recalc
    useEffect(() => {
        setFormData((prev) => {
            let needsUpdate = false;
            const updatedChecklist = prev.checklist.map((item) => {
                let currentValToCheck;
                let itemCurrentStatus = item.currentStatus;
                let changed = false;

                switch (item.item) {
                    case 'Debt Management':
                        currentValToCheck = prev.debtManagementEmi;
                        break;
                    case 'Wealth Planning':
                        currentValToCheck = prev.monthlySavings;
                        break;
                    case 'Home Loan or Rent':
                        currentValToCheck = prev.housingCost;
                        break;
                    case 'CIBIL Score':
                        currentValToCheck = prev.cibilScoreCurrent;
                        break;
                    case 'Marriage Fund':
                        currentValToCheck = prev.marriageFundCurrent;
                        break;
                    case "Spouse's Coverage":
                        currentValToCheck = prev.spouseCoverageCurrent;
                        break;
                    case 'Tax Planning':
                        currentValToCheck = prev.taxPlanningCurrent;
                        break;
                    // Yes/No fields linked via specific handlers, usually don't need this sync
                    default:
                        return item; // No sync needed for this item type
                }

                // Check if the checklist's currentStatus differs from the form's value
                if (typeof itemCurrentStatus === 'number' && itemCurrentStatus !== currentValToCheck) {
                    itemCurrentStatus = currentValToCheck;
                    changed = true;
                }

                if (changed) {
                    needsUpdate = true;
                    // Recalculate score if currentStatus was updated
                    return calculateItemScore({ ...item, currentStatus: itemCurrentStatus });
                } else {
                    return item;
                }
            });

            // Only update state if any item actually changed
            return needsUpdate ? { ...prev, checklist: updatedChecklist } : prev;
        });
    }, [
        formData.debtManagementEmi,
        formData.monthlySavings,
        formData.housingCost,
        formData.cibilScoreCurrent,
        formData.marriageFundCurrent,
        formData.spouseCoverageCurrent,
        formData.taxPlanningCurrent,
        // No need to depend on Yes/No form data here as they trigger updates directly
    ]);

    // --- Submission ---
    const handleSubmit = () => {
        // Prepare data for the report modal
        const reportData = {
            // Updated/Added Fields
            clientName: formData.clientName,
            financialDoctorName: formData.financialDoctorName, // Use the new name
            emailId: formData.emailId,
            mobileNumber: formData.mobileNumber,
            dateOfBirth: formData.dateOfBirth,
            age: formData.age,
            wealthTarget: formData.wealthTarget,
            date: formData.date,
            familyMembers: formData.familyMembers,
            // Include core financial details
            annualIncome: formData.annualIncome,
            monthlyExpenses: formData.monthlyExpenses,
            childEducationFundGoal: formData.childEducationFundGoal,
            marriageFundGoal: formData.marriageFundGoal,
            wealthTarget: formData.wealthTarget,
            // Add other relevant top-level data if needed by the report
            // ...
            // Map checklist data for the report
            checklist: formData.checklist.map((item) => ({
                item: item.item,
                target: item.target,
                // Handle different currentStatus types for display
                currentStatus: typeof item.currentStatus === 'object' ? `Risk: ${item.currentStatus.risk.toFixed(0)}%, Guaranteed: ${item.currentStatus.guaranteed.toFixed(0)}%` : item.currentStatus,
                // Calculate Gap (handle non-numeric targets/status appropriately)
                gap: typeof item.target === 'number' && typeof item.currentStatus === 'number' ? (item.target - item.currentStatus).toFixed(2) : 'N/A',
                score: item.score,
            })),
        };

        setFormDataForReport(reportData);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setFormDataForReport(null);
    };

    // --- Rendering ---
    return (
        <>
            {/* Form Section */}
            <div className="form-container p-6 md:p-8 bg-white rounded-lg dark:bg-gray-800 shadow-lg border border-gray-200 mb-8">
                <h2 className="text-2xl font-semibold dark:text-gray-100 text-gray-800 mb-6 border-b pb-3">Financial Health Assessment</h2>

                {/* User Details & Core Financials Form */}
                <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    {/* Basic Information */}
                    <div>
                        {/* Renamed Label */}
                        <label htmlFor="financialDoctorName" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                            Financial Doctor Name
                        </label>
                        {/* Updated name and value */}
                        <input
                            id="financialDoctorName"
                            type="text"
                            name="financialDoctorName"
                            placeholder="Enter Doctor Name"
                            value={formData.financialDoctorName}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50"
                            readOnly
                        />
                    </div>

                    <div>
                        <label htmlFor="clientName" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Client Name
                        </label>
                        <input
                            id="clientName"
                            type="text"
                            name="clientName"
                            placeholder="Enter Client Name"
                            value={formData.clientName}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    {/* Added Email ID */}
                    <div>
                        <label htmlFor="emailId" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Email ID
                        </label>
                        <input
                            id="emailId"
                            type="email"
                            name="emailId"
                            placeholder="e.g., user@example.com"
                            value={formData.emailId}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Added Mobile Number */}
                    <div>
                        <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Mobile Number
                        </label>
                        <input
                            id="mobileNumber"
                            type="tel"
                            name="mobileNumber"
                            placeholder="e.g., 9876543210"
                            value={formData.mobileNumber}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Added Date of Birth */}
                    <div>
                        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Date of Birth
                        </label>
                        <input
                            id="dateOfBirth"
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Added Age */}
                    <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Age
                        </label>
                        <input
                            id="age"
                            type="number"
                            name="age"
                            placeholder="e.g., 35"
                            value={formData.age === 0 ? '' : formData.age}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            min="0"
                        />
                    </div>

                    <div>
                        <label htmlFor="familyMembers" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Family Members
                        </label>
                        <input
                            id="familyMembers"
                            type="text"
                            name="familyMembers"
                            placeholder="e.g., 7"
                            value={formData.familyMembers}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Assessment Date
                        </label>{' '}
                        {/* Slightly clearer label */}
                        <input
                            id="date"
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    {/* Core Financial Inputs */}
                    <div>
                        <label htmlFor="annualIncome" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Total Annual Income (₹)
                        </label>
                        <input
                            id="annualIncome"
                            type="number"
                            name="annualIncome"
                            placeholder="e.g., 1200000"
                            value={formData.annualIncome === 0 ? '' : formData.annualIncome}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            min="0"
                        />
                    </div>
                    <div>
                        <label htmlFor="monthlyExpenses" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Avg. Monthly Expenses (₹)
                        </label>
                        <input
                            id="monthlyExpenses"
                            type="number"
                            name="monthlyExpenses"
                            placeholder="e.g., 50000"
                            value={formData.monthlyExpenses === 0 ? '' : formData.monthlyExpenses}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            min="0"
                        />
                    </div>
                    <div>
                        <label htmlFor="childEducationFundGoal" className="block text-sm font-medium text-gray-700  dark:text-gray-400 mb-1">
                            Child Education Goal (₹)
                        </label>
                        <input
                            id="childEducationFundGoal"
                            type="number"
                            name="childEducationFundGoal"
                            placeholder="e.g., 2500000"
                            value={formData.childEducationFundGoal === 0 ? '' : formData.childEducationFundGoal}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            min="0"
                        />
                    </div>
                    <div>
                        <label htmlFor="marriageFundGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                            Marriage Fund Goal (₹)
                        </label>
                        <input
                            id="marriageFundGoal"
                            type="number"
                            name="marriageFundGoal"
                            placeholder="e.g., 1000000"
                            value={formData.marriageFundGoal === 0 ? '' : formData.marriageFundGoal}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            min="0"
                        />
                    </div>

                    {/* Added Wealth Target */}
                    <div>
                        <label htmlFor="wealthTarget" className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                            Wealth Target (₹)
                        </label>
                        <input
                            id="wealthTarget"
                            type="number"
                            name="wealthTarget"
                            placeholder="e.g., 100000000"
                            value={formData.wealthTarget === 0 ? '' : formData.wealthTarget}
                            onChange={handleInputChange}
                            className="form-input w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            min="0"
                        />
                    </div>
                </form>
            </div>

            {/* Checklist Table Section */}
            <div className="form-container p-6 md:p-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-5 text-gray-800 dark:text-gray-300">Financial Checklist & Scores</h3>
                <div className="overflow-x-auto">
                    <table className="table-auto w-full border-collapse border border-gray-300 text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase">
                            <tr>
                                <th className="border px-3 py-3 text-left">Checklist Item</th>
                                <th className="border px-3 py-3 text-left">Formula</th>
                                <th className="border px-3 py-3 text-right">Target</th>
                                <th className="border px-3 py-3 text-center">Current Status / Input</th>
                                <th className="border px-3 py-3 text-right">Gap</th>
                                <th className="border px-3 py-3 text-center">Score (1-5)</th>
                            </tr>
                        </thead>

                        <tbody className="text-gray-700">
                            {formData.checklist.map((row, index) => {
                                const isNumericInput = ['standard', 'inverse', 'cibil'].includes(row.type);
                                const isYesNoInput = row.type === 'yesno';
                                const isInvestmentInput = row.type === 'investment';

                                // Format Target
                                let displayTarget = row.target;
                                if (typeof row.target === 'number') {
                                    displayTarget = `₹ ${row.target.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                                } else if (row.item === 'CIBIL Score') {
                                    displayTarget = '750+';
                                }

                                // Format Gap
                                let displayGap = 'N/A';
                                if (typeof row.target === 'number' && typeof row.currentStatus === 'number' && !isNaN(row.target) && !isNaN(row.currentStatus)) {
                                    const gapValue = row.target - row.currentStatus;
                                    // For inverse types, gap is negative if over target, positive if under. We show 0 if current is better than target.
                                    const relevantGap = row.type === 'inverse' || row.type === 'cibil' ? Math.max(0, gapValue) : gapValue;
                                    displayGap = `₹ ${relevantGap.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                                    if (relevantGap < 0 && row.type !== 'inverse') displayGap = `- ₹ ${Math.abs(relevantGap).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; // Show negative for standard goals if overachieved
                                    if (row.item === 'CIBIL Score') displayGap = `${Math.max(0, 750 - row.currentStatus)}`; // CIBIL gap is just the difference to 750
                                }

                                return (
                                    <tr key={index} className="hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                                        <td className="border px-3 py-2 font-medium">{row.item}</td>
                                        <td className="border px-3 py-2">{row.formula || '-'}</td> {/* 🔥 Display Formula */}
                                        <td className="border px-3 py-2 text-right">{displayTarget}</td>
                                        <td className="border px-3 py-2 text-center">
                                            {isNumericInput && (
                                               <NumberInput
                                               value={row.currentStatus === 0 ? '' : row.currentStatus}
                                               onChange={(val) => handleChecklistNumericChange(index, val ?? 0)}
                                               min={0}
                                               placeholder="Enter Value"
                                               size="xs"
                                               hideControls
                                               classNames={{
                                                 input: 'text-sm text-right bg-dark-6 text-dark dark:text-gray-100 form-input',
                                               }}
                                              
                                             />
                                             
                                            )}
                                            {isYesNoInput && (
                                                <select
                                                    value={row.currentStatus}
                                                    onChange={(e) => handleYesNoChange(index, e.target.value)}
                                                    className="form-select w-full mx-auto border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            )}

                                            {isInvestmentInput && (
                                                <Popover width={300} position="bottom" withArrow shadow="md">
                                                    <Popover.Target>
                                                        <Button size="xs" variant="light" color="indigo" className="text-xs">
                                                            Manage Investments
                                                        </Button>
                                                    </Popover.Target>
                                                    <Popover.Dropdown>
                                                        <ScrollArea h={250}>
                                                            <div className="flex flex-col gap-2">
                                                                {Object.entries(investmentDisplayNames).map(
                                                                    ([optionKey, displayName]) =>
                                                                        row.options.hasOwnProperty(optionKey) && (
                                                                            <Checkbox
                                                                                key={optionKey}
                                                                                label={displayName}
                                                                                checked={row.options[optionKey]}
                                                                                onChange={(e) => handleInvestmentDiversificationChange(optionKey, e.target.checked)}
                                                                                size="xs"
                                                                                radius="sm"
                                                                            />
                                                                        ),
                                                                )}
                                                            </div>
                                                        </ScrollArea>
                                                        <div className="mt-4">
                                                            <Progress
                                                                transitionDuration={500}
                                                                sections={[
                                                                    { value: row.currentStatus.risk, color: 'red', label: `Risk ${row.currentStatus.risk.toFixed(0)}%` },
                                                                    { value: row.currentStatus.guaranteed, color: 'green', label: `Safe ${row.currentStatus.guaranteed.toFixed(0)}%` },
                                                                ]}
                                                                size={20}
                                                                radius="xl"
                                                                striped
                                                                animate
                                                            />
                                                        </div>
                                                    </Popover.Dropdown>
                                                </Popover>
                                            )}
                                        </td>
                                        <td className="border px-3 py-2 text-right">{displayGap}</td>
                                        <td className="border px-3 py-2 text-center font-semibold text-lg">
                                            <span
                                                className={`px-2 py-0.5 rounded ${
                                                    row.score === 5
                                                        ? 'bg-green-100 text-green-800'
                                                        : row.score === 4
                                                          ? 'bg-lime-100 text-lime-800'
                                                          : row.score === 3
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : row.score === 2
                                                              ? 'bg-orange-100 text-orange-800'
                                                              : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {row.score}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Submit Button */}
                <div className="mt-8 text-center">
                    <button
                        onClick={handleSubmit}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        disabled={!formData.clientName || !formData.date} // Basic validation example
                    >
                        Generate Financial Health Report
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && formDataForReport && <FinancialHealthReportModal data={formDataForReport} onClose={handleModalClose} />}
        </>
    );
};

export default FinancialHealthCalculator;
