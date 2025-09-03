'use client';

import { useState, useEffect, useCallback } from 'react';
import FinancialHealthReportModal from '@/components/modals/finhealth2'; // Assuming this path is correct
import { Button, Checkbox, NumberInput, Popover, Progress, ScrollArea, Text } from '@mantine/core';
import { useSearchParams } from 'next/navigation';

// --- Helper Functions ---

// Converts a percentage score (0-100) to a 1-5 scale
const calculateScoreToScale = (percentage) => {
    const p = Math.max(0, Math.min(100, percentage)); // Clamp percentage between 0 and 100
    if (p >= 95) return 5;
    if (p >= 80) return 4;
    if (p >= 60) return 3;
    if (p >= 30) return 2;
    return 1; // Below 30% returns 1
};

// Calculates score for Investment Diversification
// Helper function (as defined before, based on Excel's IF conditions)
const calculateInvestmentScoreFromRiskDifference = (riskDifference) => {
    const diff = Math.abs(riskDifference);
    if (diff <= 5) return 5;
    if (diff <= 10) return 4;
    if (diff <= 20) return 3;
    if (diff <= 30) return 2;
    return 1;
};

// REVISED: Calculates score for Investment Diversification
// Assumes actual percentages are based on count of selected vs. count of AVAILABLE categories
const calculateInvestmentDiversificationScore = (options, age) => {
    const riskInvestmentKeys = [
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
    const safeInvestmentKeys = [
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

    // --- Counts of AVAILABLE categories ---
    const totalRiskCategoriesAvailable = riskInvestmentKeys.length; // Should be 10
    const totalSafeCategoriesAvailable = safeInvestmentKeys.length; // Should be 10

    // --- Counts of SELECTED options ---
    const riskSelectedCount = riskInvestmentKeys.filter((key) => options[key]).length;
    const safeSelectedCount = safeInvestmentKeys.filter((key) => options[key]).length;

    // 1. Calculate ACTUAL Risk % and Safe % from user's selected investment 'options'
    //    These are now percentages of the total *available* categories for risk/safe respectively.
    const actualRiskPercent = totalRiskCategoriesAvailable > 0 ? (riskSelectedCount / totalRiskCategoriesAvailable) * 100 : 0;
    const actualSafePercent = totalSafeCategoriesAvailable > 0 ? (safeSelectedCount / totalSafeCategoriesAvailable) * 100 : 0;

    // 2. Determine TARGET Risk % based on 'age'
    //    (Target Safe % = Age, so Target Risk % = 100 - Age)
    const numericAge = Number(age) || 0;
    const idealAgeForCalc = numericAge > 0 ? numericAge : 25; // Default age
    const targetIdealSafePercent = Math.max(0, Math.min(100, idealAgeForCalc));
    const targetIdealRiskPercent = 100 - targetIdealSafePercent;

    // 3. Calculate the DIFFERENCE between ACTUAL Risk % and TARGET Risk %
    const riskDifference = actualRiskPercent - targetIdealRiskPercent;

    // 4. Get the score (1-5) based on this riskDifference
    const scaledScore = calculateInvestmentScoreFromRiskDifference(riskDifference);

    return {
        risk: actualRiskPercent,
        guaranteed: actualSafePercent, // Using 'guaranteed' for consistency with your state key
        scaledScore: scaledScore,
    };
};

// At the top of your FinancialHealthCalculator component, or imported
const RISK_INVESTMENT_OPTION_KEYS = [
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

const SAFE_INVESTMENT_OPTION_KEYS = [
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

const investmentKeys = Object.keys(investmentDisplayNames);
const riskyKeys = investmentKeys.slice(0, 10);
const safeKeys = investmentKeys.slice(10);

// --- Main Component ---

const FinancialHealthCalculator = () => {
    const [formData, setFormData] = useState({
        // Basic Info
        clientName: '',
        financialDoctorName: '', // Default value
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
        marriageFundGoal: 0,
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
            { item: 'Debt Management', target: 0, currentStatus: 0, score: 0, type: 'inverse', formula: 'EMI Burden (Max 40% Income)' },
            { item: 'Wealth Planning', target: 0, currentStatus: 0, score: 0, type: 'standard', formula: 'Build Wealth (Save 20% or More)' },
            { item: 'Home Loan or Rent', target: 0, currentStatus: 0, score: 0, type: 'inverse', formula: ' Rent Affordability (Max 30% Income) ' },
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
                // The target string will be dynamically updated based on age.
                // This initial value is just a placeholder.
                target: 'Balanced (Based on Age)',
                currentStatus: { risk: 0, guaranteed: 0 }, // Stores actual risk/safe percentages
                score: 0, // Will be calculated
                type: 'investment',
                options: {
                    // All possible investment options, initialized to false
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
                    fixedDepositsRDs: false,
                    ppf: false,
                    epf: false,
                    nps: false,
                    govtBondsAAACorpBonds: false,
                    postOfficeSchemes: false,
                    sukanyaSamriddhiYojana: false,
                    ulipSavingInsurance: false,
                    gold: false,
                    debtMutualFundsIndexETFs: false,
                },
            },
            // CurrentStatus linked to familyGoals select
        ],
    });

    const searchParams = useSearchParams();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // NEW EFFECT: Prefill form fields from URL query parameters
    useEffect(() => {
        if (searchParams) {
            // Ensure searchParams is available
            const nameFromUrl = searchParams.get('name');
            const phoneFromUrl = searchParams.get('phone');
            const emailFromUrl = searchParams.get('email');
            const DoctorFromUrl = searchParams.get('doctor');
            // const idFromUrl = searchParams.get('id'); // Optional: if you need to use/store the ID

            // Check if any relevant params exist to avoid unnecessary state updates
            if (nameFromUrl || phoneFromUrl || emailFromUrl) {
                setFormData((prev) => ({
                    ...prev,
                    clientName: nameFromUrl || prev.clientName,
                    mobileNumber: phoneFromUrl || prev.mobileNumber,
                    emailId: emailFromUrl || prev.emailId,
                    financialDoctorName: DoctorFromUrl || prev.financialDoctorName,
                    // Example if you want to store the ID:
                    // clientQueryId: idFromUrl || prev.clientQueryId,
                }));
            }
        }
    }, [searchParams]); // Re-run if searchParams object changes

    // NEW EFFECT: Calculate Age from Date of Birth
    useEffect(() => {
        let newCalculatedAge = ''; // Default to empty string for age

        if (formData.dateOfBirth) {
            try {
                const birthDate = new Date(formData.dateOfBirth);

                // Check if the parsed date is valid
                if (isNaN(birthDate.getTime())) {
                    throw new Error('Invalid date format');
                }

                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDifference = today.getMonth() - birthDate.getMonth();

                if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                newCalculatedAge = Math.max(0, age); // Ensure age is not negative
            } catch (error) {
                // If DOB is invalid or any error occurs, age will remain an empty string
                console.warn('Could not calculate age from DOB:', formData.dateOfBirth, error.message);
                newCalculatedAge = ''; // Explicitly set to empty on error
            }
        }

        // Only update formData if the calculated age is different from the current age in state
        // This prevents unnecessary re-renders and potential loops.
        // It also correctly sets age to '' if DOB is cleared or invalid.
        if (formData.age !== newCalculatedAge) {
            setFormData((prev) => ({
                ...prev,
                age: newCalculatedAge,
            }));
        }
    }, [formData.dateOfBirth]); // Only re-calculate when dateOfBirth changes

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
    const handleInvestmentDiversificationChange = (optionKey, isChecked) => {
        setFormData((prev) => {
            const checklist = [...prev.checklist];
            const invItemIndex = checklist.findIndex((it) => it.item === 'Investment Diversification');

            if (invItemIndex > -1) {
                const invItem = { ...checklist[invItemIndex] }; // Create a copy of the investment item
                invItem.options = { ...invItem.options, [optionKey]: isChecked }; // Update the specific option

                // Recalculate metrics and score using the updated options and current age from `prev.age`
                const { risk, guaranteed, scaledScore } = calculateInvestmentDiversificationScore(invItem.options, prev.age);

                invItem.currentStatus = { risk, guaranteed };
                invItem.score = scaledScore;

                checklist[invItemIndex] = invItem; // Put the updated item back into the checklist
                return { ...prev, checklist };
            }
            return prev; // Should not happen if item exists
        });
    };

    // --- Calculation Logic ---

    // Calculates the score for a single checklist item based on its type, target, and current status
    // MODIFIED: Added fullFormData (as prev) to provide context like age if needed by specific types
    const calculateItemScore = (item, prevFormData) => {
        // prevFormData can be used if a type needs context beyond item
        let percentage = 0;
        let score = 1;

        const currentNumeric = typeof item.currentStatus === 'number' ? item.currentStatus : 0;
        const targetNumeric = typeof item.target === 'number' ? item.target : 0;

        switch (item.type) {
            case 'standard':
                percentage = targetNumeric > 0 ? Math.min(100, (currentNumeric / targetNumeric) * 100) : currentNumeric > 0 ? 100 : 0;
                score = calculateScoreToScale(percentage);
                break;
            case 'inverse':
                percentage = currentNumeric <= targetNumeric ? 100 : currentNumeric > 0 ? Math.max(0, (targetNumeric / currentNumeric) * 100) : 100;
                score = calculateScoreToScale(percentage);
                break;
            case 'cibil':
                percentage = currentNumeric >= 800 ? 100 : currentNumeric >= 300 ? Math.max(0, Math.pow((currentNumeric - 300) / 450, 2) * 100) : 0;
                score = calculateScoreToScale(percentage);
                break;
            case 'yesno':
                percentage = item.currentStatus === 'Yes' ? 100 : 0;
                score = calculateScoreToScale(percentage);
                break;
            case 'investment':
                // Score for 'investment' is primarily set by its dedicated handler
                // or during the recalculateTargetsAndScores logic when age changes.
                // This ensures it's always calculated with the correct age context.
                score = item.score; // Relies on item.score being up-to-date from those specific calculations.
                break;
            default:
                score = 1;
        }
        return { ...item, score: isNaN(score) ? 1 : score };
    };

    // RENAMED and MODIFIED: This function will handle both target recalculation and subsequent sync/scoring.
    const recalculateTargetsAndScores = useCallback(() => {
        setFormData((prev) => {
            const {
                annualIncome,
                monthlyExpenses,
                childEducationFundGoal,
                marriageFundGoal,
                age, // <<< Crucial for Investment Diversification
                // Values for syncing top-level inputs to checklist currentStatus
                debtManagementEmi,
                monthlySavings,
                housingCost,
                cibilScoreCurrent,
                marriageFundCurrent,
                spouseCoverageCurrent,
                taxPlanningCurrent,
                budgetPlanning,
                estatePlanning,
                legacyFund,
                hufAccount,
                familyGoals,
            } = prev;

            // Step 1: Update targets for all items and specifically handle Investment Diversification
            let checklistAfterTargetUpdate = prev.checklist.map((item) => {
                let tempItem = { ...item };
                let newTarget = tempItem.target;

                switch (tempItem.item) {
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
                        break;
                    case 'Wealth Planning':
                        newTarget = (annualIncome / 12) * 0.2;
                        break;
                    case 'Home Loan or Rent':
                        newTarget = (annualIncome / 12) * 0.3;
                        break;
                    case 'Marriage Fund':
                        newTarget = marriageFundGoal;
                        break;
                    case "Spouse's Coverage":
                        newTarget = annualIncome * 10;
                        break;
                    case 'CIBIL Score':
                        newTarget = 750;
                        break;
                    case 'Tax Planning':
                        newTarget = 200000;
                        break;
                    case 'Investment Diversification':
                        const numericAgeForInv = Number(age) || 0;
                        const idealAgeForInvDisplay = numericAgeForInv > 0 ? numericAgeForInv : 25;
                        const targetSafeDisplayPercent = Math.max(0, Math.min(100, idealAgeForInvDisplay));
                        const targetRiskDisplayPercent = 100 - targetSafeDisplayPercent;
                        newTarget = `Balanced: (Risk: ${targetRiskDisplayPercent.toFixed(0)}%, Safe: ${targetSafeDisplayPercent.toFixed(0)}%)`;

                        // Recalculate its current status (actual %s) and score based on its options and current age
                        const invResults = calculateInvestmentDiversificationScore(tempItem.options, age);
                        tempItem.currentStatus = { risk: invResults.risk, guaranteed: invResults.guaranteed };
                        tempItem.score = invResults.scaledScore;
                        break;
                    case 'Budget Planning':
                    case 'Estate Planning':
                    case 'Legacy Fund':
                    case 'HUF Account':
                    case 'Family Goals':
                        newTarget = tempItem.target; // Remains 'Yes'
                        break;
                }
                tempItem.target = newTarget;
                return tempItem; // Return item with updated target (and specific updates for Inv.Div)
            });

            // Step 2: Sync top-level form inputs to checklist.currentStatus and finalize scores
            const finalChecklist = checklistAfterTargetUpdate.map((item) => {
                let syncedItem = { ...item }; // Start with item from Step 1
                let currentValToSyncFromTopLevel;
                let needsGenericScoreRecalc = false; // Flag if generic scoring is needed

                // Determine if this item's currentStatus should be synced from a top-level field
                switch (syncedItem.item) {
                    case 'Debt Management':
                        currentValToSyncFromTopLevel = debtManagementEmi;
                        break;
                    case 'Wealth Planning':
                        currentValToSyncFromTopLevel = monthlySavings;
                        break;
                    case 'Home Loan or Rent':
                        currentValToSyncFromTopLevel = housingCost;
                        break;
                    case 'CIBIL Score':
                        currentValToSyncFromTopLevel = cibilScoreCurrent;
                        break;
                    case 'Marriage Fund':
                        currentValToSyncFromTopLevel = marriageFundCurrent;
                        break;
                    case "Spouse's Coverage":
                        currentValToSyncFromTopLevel = spouseCoverageCurrent;
                        break;
                    case 'Tax Planning':
                        currentValToSyncFromTopLevel = taxPlanningCurrent;
                        break;
                    case 'Budget Planning':
                        currentValToSyncFromTopLevel = budgetPlanning;
                        break;
                    case 'Estate Planning':
                        currentValToSyncFromTopLevel = estatePlanning;
                        break;
                    case 'Legacy Fund':
                        currentValToSyncFromTopLevel = legacyFund;
                        break;
                    case 'HUF Account':
                        currentValToSyncFromTopLevel = hufAccount;
                        break;
                    case 'Family Goals':
                        currentValToSyncFromTopLevel = familyGoals;
                        break;
                    default:
                        // If not synced, and not Investment Diversification (whose score is already set),
                        // it might still need generic scoring if its target changed.
                        if (syncedItem.item !== 'Investment Diversification') {
                            needsGenericScoreRecalc = true;
                        }
                        break; // No top-level sync for this item
                }

                // If a sync value is identified, update currentStatus if different
                if (currentValToSyncFromTopLevel !== undefined && syncedItem.currentStatus !== currentValToSyncFromTopLevel) {
                    // Check type for Yes/No to prevent overriding object with string
                    if (syncedItem.type === 'yesno' && typeof currentValToSyncFromTopLevel === 'string') {
                        syncedItem.currentStatus = currentValToSyncFromTopLevel;
                    } else if (typeof syncedItem.currentStatus === 'number' && typeof currentValToSyncFromTopLevel === 'number') {
                        syncedItem.currentStatus = currentValToSyncFromTopLevel;
                    }
                    needsGenericScoreRecalc = true; // Synced, so score it
                }

                // If needs generic scoring (either target changed, or currentStatus synced)
                // and it's not Investment Diversification (already scored specifically)
                if (needsGenericScoreRecalc && syncedItem.item !== 'Investment Diversification') {
                    return calculateItemScore(syncedItem, prev); // Pass `prev` for context if calculateItemScore needs it
                }
                // For Investment Diversification, its score and currentStatus are set in Step 1.
                // For items that didn't change target and weren't synced, return as is.
                // For items whose target changed in step 1 but weren't synced (e.g. Income Protection if its table input wasn't touched)
                // but still need scoring based on new target and existing table input:
                else if (syncedItem.item !== 'Investment Diversification' && !needsGenericScoreRecalc) {
                    // This ensures standard items get scored if their target changed, even if not synced
                    // because their currentStatus is from the table, not top-level form.
                    const originalChecklistItem = prev.checklist.find((ci) => ci.item === syncedItem.item);
                    if (originalChecklistItem && originalChecklistItem.target !== syncedItem.target) {
                        return calculateItemScore(syncedItem, prev);
                    }
                }
                return syncedItem;
            });

            // Only update state if the checklist has actually changed
            if (JSON.stringify(prev.checklist) !== JSON.stringify(finalChecklist)) {
                return { ...prev, checklist: finalChecklist };
            }
            return prev; // No change
        });
    }, [calculateInvestmentDiversificationScore, calculateItemScore, calculateScoreToScale]); // Add other stable functions if they are used and defined outside

    // --- Effects ---

    // MODIFIED: This useEffect now calls recalculateTargetsAndScores and includes formData.age
    useEffect(() => {
        recalculateTargetsAndScores();
    }, [
        formData.annualIncome,
        formData.monthlyExpenses,
        formData.childEducationFundGoal,
        formData.marriageFundGoal,
        formData.age, // <<< ADDED formData.age
        // Add other top-level formData fields that should trigger a full checklist re-evaluation if they change
        formData.debtManagementEmi,
        formData.monthlySavings,
        formData.housingCost,
        formData.cibilScoreCurrent,
        formData.marriageFundCurrent,
        formData.spouseCoverageCurrent,
        formData.taxPlanningCurrent,
        formData.budgetPlanning,
        formData.estatePlanning,
        formData.legacyFund,
        formData.hufAccount,
        formData.familyGoals,
        recalculateTargetsAndScores, // Dependency on the memoized function itself
    ]);

    // --- Submission ---
    const handleSubmit = async () => {
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
               
        try {
          await fetch(`${API_URL}/api/logs/log-health-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientName: formData.clientName,
              mobileNumber: formData.mobileNumber,
              emailId: formData.emailId,
              date: Date.now(),
            }),
          });
        } catch (err) {
          console.error('Error logging usage:', err);
  }

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

                 {/* Mobile View - Cards (Hidden on Medium screens and up) */}
    <div className="md:hidden">
        <div className="space-y-4">
            {formData.checklist.map((row, index) => {
                const isNumericInput = ['standard', 'inverse', 'cibil'].includes(row.type);
                const isYesNoInput = row.type === 'yesno';
                const isInvestmentInput = row.type === 'investment';

                // Format Target for display
                let displayTarget = row.target;
                if (typeof row.target === 'number') {
                    displayTarget = `₹ ${row.target.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                } else if (row.item === 'CIBIL Score') {
                    displayTarget = '750+';
                }

                // Format Gap for display
                let displayGap = 'N/A';
                if (typeof row.target === 'number' && typeof row.currentStatus === 'number' && !isNaN(row.target) && !isNaN(row.currentStatus)) {
                    const gapValue = row.target - row.currentStatus;
                    const relevantGap = row.type === 'inverse' || row.type === 'cibil' ? Math.max(0, gapValue) : gapValue;
                    displayGap = `₹ ${relevantGap.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                    if (relevantGap < 0 && row.type !== 'inverse') displayGap = `- ₹ ${Math.abs(relevantGap).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                    if (row.item === 'CIBIL Score') displayGap = `${Math.max(0, 750 - row.currentStatus)}`;
                }

                return (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-base mb-2">{row.item}</h4>
                            <span
                                className={`text-lg font-bold px-2 py-0.5 rounded ${
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
                        </div>
                        
                        {!isInvestmentInput && (
                             <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Formula: {row.formula || '-'}</p>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {/* Target */}
                            <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Target</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{displayTarget}</p>
                            </div>

                            {/* Gap */}
                            <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Gap</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{displayGap}</p>
                            </div>
                        </div>

                        {/* Current Status / Input Section */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Status / Input</label>
                            {isInvestmentInput ? (
                                                                                 <Popover width={300} position="bottom" withArrow shadow="md">
                                                    <Popover.Target>
                                                        <Button size="xs" variant="light" color="indigo" className="text-xs">
                                                            Manage Investments
                                                        </Button>
                                                    </Popover.Target>
                                                    <Popover.Dropdown>
                                                        <ScrollArea h={250}>
                                                            <div className="flex flex-col gap-4">
                                                                {/* Risky Investments */}
                                                                <div>
                                                                    <h3 className="text-sm font-semibold text-red-500 mb-1">Risky Investments</h3>
                                                                    <div className="flex flex-col gap-2">
                                                                        {riskyKeys.map(
                                                                            (key) =>
                                                                                row.options.hasOwnProperty(key) && (
                                                                                    <Checkbox
                                                                                        key={key}
                                                                                        label={investmentDisplayNames[key]}
                                                                                        checked={row.options[key]}
                                                                                        onChange={(e) => handleInvestmentDiversificationChange(key, e.target.checked)}
                                                                                        size="xs"
                                                                                        radius="sm"
                                                                                    />
                                                                                ),
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Safe Investments */}
                                                                <div>
                                                                    <h3 className="text-sm  font-semibold text-green-600 mb-1">Safe Investments</h3>
                                                                    <div className="flex flex-col gap-2">
                                                                        {safeKeys.map(
                                                                            (key) =>
                                                                                row.options.hasOwnProperty(key) && (
                                                                                    <Checkbox
                                                                                        key={key}
                                                                                        label={investmentDisplayNames[key]}
                                                                                        checked={row.options[key]}
                                                                                        onChange={(e) => handleInvestmentDiversificationChange(key, e.target.checked)}
                                                                                        size="xs"
                                                                                        className="text-start"
                                                                                        radius="sm"
                                                                                    />
                                                                                ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </ScrollArea>

                                                        <div className="mt-4 space-y-2 p-1">
                                                            {' '}
                                                            {/* Added space-y-2 and p-1 */}
                                                            <div>
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300"> Risk Allocation:</span>
                                                                    <span className="font-semibold text-red-600 dark:text-red-400">{row.currentStatus.risk.toFixed(0)}%</span>
                                                                </div>
                                                                <Progress
                                                                    value={row.currentStatus.risk}
                                                                    color="red"
                                                                    size="lg" // was 20
                                                                    radius="xl"
                                                                    striped
                                                                    animate
                                                                    // tooltip={`Actual Risk: ${row.currentStatus.risk.toFixed(0)}%`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300"> Safe Allocation:</span>
                                                                    <span className="font-semibold text-teal-600 dark:text-teal-400">{row.currentStatus.guaranteed.toFixed(0)}%</span>
                                                                </div>
                                                                <Progress
                                                                    value={row.currentStatus.guaranteed}
                                                                    color="teal" // Changed from green for better contrast with Mantine's default green
                                                                    size="lg"
                                                                    radius="xl"
                                                                    striped
                                                                    animate
                                                                    // tooltip={`Actual Safe: ${row.currentStatus.guaranteed.toFixed(0)}%`}
                                                                />
                                                            </div>
                                                            {/* Optional: Display Target Allocation for reference */}
                                                            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                                <Text size="xs" color="dimmed" align="center">
                                                                    Target (based on age): {row.target} {/* row.target is already like "Balanced: (Risk: X%, Safe: Y%)" */}
                                                                </Text>
                                                            </div>
                                                        </div>
                                                    </Popover.Dropdown>
                                                </Popover>
                            ) : isNumericInput ? (
                                <NumberInput
                                    value={row.currentStatus === 0 ? '' : row.currentStatus}
                                    onChange={(val) => handleChecklistNumericChange(index, val ?? 0)}
                                    placeholder="Enter Value"
                                    size="sm"
                                    hideControls
                                />
                            ) : isYesNoInput ? (
                                <select
                                    value={row.currentStatus}
                                    onChange={(e) => handleYesNoChange(index, e.target.value)}
                                    className="form-select w-full border-gray-300 rounded-md shadow-sm"
                                >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            ) : (
                                <span>{row.currentStatus}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
                <div className="hidden md:block overflow-x-auto">
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
                                    displayTarget = ` ${row.target.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
                                        <td className="border px-3 py-2">
                                            {isInvestmentInput ? (
                                                <Popover width={300} position="bottom" withArrow shadow="md">
                                                    <Popover.Target>
                                                        <Button size="xs" variant="light" color="indigo" className="text-xs">
                                                            Manage Investments
                                                        </Button>
                                                    </Popover.Target>
                                                    <Popover.Dropdown>
                                                        <ScrollArea h={250}>
                                                            <div className="flex flex-col gap-4">
                                                                {/* Risky Investments */}
                                                                <div>
                                                                    <h3 className="text-sm font-semibold text-red-500 mb-1">Risky Investments</h3>
                                                                    <div className="flex flex-col gap-2">
                                                                        {riskyKeys.map(
                                                                            (key) =>
                                                                                row.options.hasOwnProperty(key) && (
                                                                                    <Checkbox
                                                                                        key={key}
                                                                                        label={investmentDisplayNames[key]}
                                                                                        checked={row.options[key]}
                                                                                        onChange={(e) => handleInvestmentDiversificationChange(key, e.target.checked)}
                                                                                        size="xs"
                                                                                        radius="sm"
                                                                                    />
                                                                                ),
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Safe Investments */}
                                                                <div>
                                                                    <h3 className="text-sm  font-semibold text-green-600 mb-1">Safe Investments</h3>
                                                                    <div className="flex flex-col gap-2">
                                                                        {safeKeys.map(
                                                                            (key) =>
                                                                                row.options.hasOwnProperty(key) && (
                                                                                    <Checkbox
                                                                                        key={key}
                                                                                        label={investmentDisplayNames[key]}
                                                                                        checked={row.options[key]}
                                                                                        onChange={(e) => handleInvestmentDiversificationChange(key, e.target.checked)}
                                                                                        size="xs"
                                                                                        className="text-start"
                                                                                        radius="sm"
                                                                                    />
                                                                                ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </ScrollArea>

                                                        <div className="mt-4 space-y-2 p-1">
                                                            {' '}
                                                            {/* Added space-y-2 and p-1 */}
                                                            <div>
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300"> Risk Allocation:</span>
                                                                    <span className="font-semibold text-red-600 dark:text-red-400">{row.currentStatus.risk.toFixed(0)}%</span>
                                                                </div>
                                                                <Progress
                                                                    value={row.currentStatus.risk}
                                                                    color="red"
                                                                    size="lg" // was 20
                                                                    radius="xl"
                                                                    striped
                                                                    animate
                                                                    // tooltip={`Actual Risk: ${row.currentStatus.risk.toFixed(0)}%`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300"> Safe Allocation:</span>
                                                                    <span className="font-semibold text-teal-600 dark:text-teal-400">{row.currentStatus.guaranteed.toFixed(0)}%</span>
                                                                </div>
                                                                <Progress
                                                                    value={row.currentStatus.guaranteed}
                                                                    color="teal" // Changed from green for better contrast with Mantine's default green
                                                                    size="lg"
                                                                    radius="xl"
                                                                    striped
                                                                    animate
                                                                    // tooltip={`Actual Safe: ${row.currentStatus.guaranteed.toFixed(0)}%`}
                                                                />
                                                            </div>
                                                            {/* Optional: Display Target Allocation for reference */}
                                                            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                                <Text size="xs" color="dimmed" align="center">
                                                                    Target (based on age): {row.target} {/* row.target is already like "Balanced: (Risk: X%, Safe: Y%)" */}
                                                                </Text>
                                                            </div>
                                                        </div>
                                                    </Popover.Dropdown>
                                                </Popover>
                                            ) : (
                                                row.formula || '-'
                                            )}
                                        </td>
                                        <td className="border px-3 py-2 text-right">{displayTarget}</td>
                                        <td className="border px-3 py-2 text-center">
                                            {isInvestmentInput ? (
                                                <div className="space-y-2 min-w-[160px]">
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">Risk:</span>
                                                            <span className="font-semibold text-red-600 dark:text-red-400">{row.currentStatus.risk?.toFixed(0)}%</span>
                                                        </div>
                                                        <Progress value={row.currentStatus.risk} color="red" size="md" radius="xl" striped animate />
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">Safe:</span>
                                                            <span className="font-semibold text-green-600 dark:text-green-400">{row.currentStatus.guaranteed?.toFixed(0)}%</span>
                                                        </div>
                                                        <Progress value={row.currentStatus.guaranteed} color="teal" size="md" radius="xl" striped animate />
                                                    </div>
                                                </div>
                                            ) : isNumericInput ? (
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
                                            ) : isYesNoInput ? (
                                                <select
                                                    value={row.currentStatus}
                                                    onChange={(e) => handleYesNoChange(index, e.target.value)}
                                                    className="form-select w-full mx-auto border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            ) : (
                                                <span>{row.currentStatus}</span>
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
                        Generate Financial Health Report !
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && formDataForReport && <FinancialHealthReportModal data={formDataForReport} onClose={handleModalClose} />}
        </>
    );
};

export default FinancialHealthCalculator;
