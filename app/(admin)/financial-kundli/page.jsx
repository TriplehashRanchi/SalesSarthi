'use client';

import { useState, useMemo, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PremiumGate from '@/components/premium/PremiumGate';
import next from 'next';

/* =========================================================
   ICONS
========================================================= */
const Icons = {
    ChevronRight: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
    ),
    ChevronLeft: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
    ),
    Check: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
    ),
    Plus: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
    ),
    Trash: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
        </svg>
    ),
    User: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    Briefcase: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
        </svg>
    ),
    CreditCard: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
    ),
    Shield: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
        </svg>
    ),
    Target: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
};

/* =========================================================
   COMPONENTS
========================================================= */
const InputGroup = ({ label, value, onChange, type = 'text', placeholder, prefix, suffix, className = '' }) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="text-[11px] font-bold text-slate-500 uppercase  ml-0.5">{label}</label>
        <div className="flex items-center w-full bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-200 shadow-sm overflow-hidden h-11 lg:h-10">
            {prefix && <div className="pl-3 pr-2 text-slate-400 text-sm font-medium bg-slate-50 h-full flex items-center border-r border-slate-100">{prefix}</div>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full h-full bg-transparent border-none px-3 text-base lg:text-sm text-slate-900 placeholder:text-slate-300 focus:ring-0"
            />
            {suffix && <div className="pr-3 pl-2 text-slate-400 text-xs font-medium h-full flex items-center bg-slate-50 border-l border-slate-100">{suffix}</div>}
        </div>
    </div>
);
const Label = ({ children, required }) => (
    <label className="text-[11px] font-bold text-slate-500 uppercase  ml-0.5">
        {children} {required && <span className="text-[#1E8455]">*</span>}
    </label>
);

const StepItem = ({ step, index, current, onClick }) => {
    const isActive = current === index;
    const isPast = index < current;
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-left group
        ${isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
      `}
        >
            <div
                className={`
        w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all
        ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : isPast ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}
      `}
            >
                {isPast ? <Icons.Check /> : step.icon}
            </div>
            <div className="flex-1">
                <span className={`block text-sm font-bold ${isActive ? 'text-indigo-900' : 'text-slate-500 group-hover:text-slate-700'}`}>{step.title}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{step.desc}</span>
            </div>
        </button>
    );
};

/* =========================================================
   PAGE
========================================================= */
export default function FinancialKundliPage() {
    const router = useRouter();
    const auth = getAuth();

    const { profile, loading: authLoading } = useAuth();
    const hasAccess = profile?.add_ons?.includes('FINANCIAL_KUNDLI');

    if (authLoading) {
        return <div className="p-6 text-sm text-slate-500">Loading...</div>;
    }

    if (!hasAccess) {
        return (
            <PremiumGate
                title="Financial Kundli is a Premium Add-on"
                subtitle="Unlock deep financial diagnostics, AI insights, and export-ready reports for every client."
                features={[
                    'Insurance gap & risk score engine',
                    'Goal-based action plan with timelines',
                    'Professional PDF reports for clients',
                ]}
                ctaLabel="Request Financial Kundli Access"
            />
        );
    }

    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [lang, setLang] = useState('English');

    const t = (key) => translations[lang][key] || key;
    // --- NEW: For the Analysis UI cycling messages ---
    const [tipIndex, setTipIndex] = useState(0);
    const analysisSteps = [
        'Evaluating asset allocation strategy...',
        'Checking debt-to-income sustainability...',
        'Simulating inflation-adjusted goal trajectories...',
        'Optimizing tax efficiency parameters...',
        'Synthesizing final Financial Kundli report...',
    ];

    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setTipIndex((prev) => (prev + 1) % analysisSteps.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [loading]);

    const [data, setData] = useState({
        client: {
            financial_doctor_name: '',
            name: '',
            email: '',
            phone: '',
            dob: '',
            age: '',
            marital_status: 'Married',
            family_members: '',
            occupation: 'Salaried',
            profession: '',
            city: '',
            wanted_retirement_age: '',
            report_language: 'English' ,
            current_year: new Date().getFullYear(),
        },
        cashflow: {
            monthly_income: '',
            annual_income: '',
            monthly_expenses: '',
            monthly_savings: '',
            desired_emergency_months: '6',
            current_emergency_fund: '',
        },
        tax_and_risk: {
            tax_regime: 'New Regime',
            risk_profile: 'Moderate',
            inflation_goals_yearly: '8',
            inflation_expenses_yearly: '6',
            roi_yearly: '12',
        },
        assets: {
            cash: '',
            equity: '',
            debt: '',
            epf: '',
            real_estate: '',
        },
        liabilities: {
            home: { outstanding: '', interest: '', emi: '', months_left: '' },
            vehicle: { outstanding: '', interest: '', emi: '', months_left: '' },
            credit_card: { outstanding: '', interest: '', emi: '', months_left: '' },
            personal: { outstanding: '', interest: '', emi: '', months_left: '' },
            other: { outstanding: '', interest: '', emi: '', months_left: '' },
        },
        insurance: {
            life: '',
            health: '',
            critical: '',
            accident: '',
        },
        goals: [
            { goal_name: 'Child Higher Education', priority: 'High', current_cost: '', existing_corpus: '', target_year: '' },
            { goal_name: 'Dream Home', priority: 'High', current_cost: '', existing_corpus: '', target_year: '' },
            { goal_name: 'Retirement', priority: 'High', current_cost: '', existing_corpus: '', target_year: '' },
            { goal_name: 'Financial Freedom', priority: 'High', current_cost: '', existing_corpus: '', target_year: '' },
        ],
    });

    const translations = {
        English: {
            personalInfo: 'Personal Information',
            financialDoctor: 'Financial Doctor',
            clientFullName: 'Client Full Name',
            email: 'Email ID',
            phone: 'Phone',
            dob: 'Date of Birth',
            currentAge: 'Current Age',
            birthPlace: 'Place / City of Birth',
            retirementAge: 'Retirement Age',
            familyMembers: 'Family Members',
            next: 'Next Step',
            back: 'Back',
            generate: 'Generate Kundli Report',

            assetTitle: 'Asset Portfolio',

            cashBank: 'Cash & Bank Balance',
            equity: 'Equity Mutual Funds / Stocks',
            debt: 'Debt Funds / FDs / Bonds',
            epfPpf: 'EPF / PPF Corpus',
            realEstate: 'Real Estate (Investment / Self Use)',

            incomeExpensesTitle: 'Income & Expenses',
            planningTitle: 'Planning Assumptions',

            monthlyIncome: 'Monthly Income',
            annualIncome: 'Annual Income',
            monthlyExpenses: 'Monthly Expenses',
            monthlySavings: 'Current Monthly Savings',
            emergencyFund: 'Current Emergency Fund',
            targetEmergency: 'Target Emergency (Months)',

            expectedROI: 'Expected ROI',
            goalInflation: 'Goal Inflation',
            expenseInflation: 'Expense Inflation',

            insuranceTitle: 'Insurance & Protection',

            lifeInsurance: 'Life Insurance (Term)',
            healthInsurance: 'Health Insurance',
            criticalIllness: 'Critical Illness Cover',
            accidentCover: 'Accident / Disability Cover',

            goalsTitle: 'Future Milestones',
            addGoal: 'Add Goal',

            noGoalsTitle: 'No goals added',
            noGoalsDesc: 'Add goals like Retirement, Child Education, or Home Purchase.',

            goalName: 'Goal Name',
            goalPlaceholder: "e.g. Daughter's Marriage",

            costToday: 'Cost Today',
            targetYear: 'Target Year',
            existingCorpus: 'Existing Corpus for this Goal',

            loanTitleHome: 'Home Loan',
            loanTitleVehicle: 'Vehicle Loan',
            loanTitleCreditCard: 'Credit Card Loan',
            loanTitlePersonal: 'Personal Loan',
            loanTitleOther: 'Other Loan',

            outstanding: 'Outstanding Amount',
            interestRate: 'Interest Rate',
            monthlyEmi: 'Monthly EMI',
            monthsLeft: 'Months Left',
            monthsLeftPlaceholder: 'e.g. 24',

            stepClientTitle: 'Lagna Graha',
            stepClientDesc: 'Basic Information · Client Profile',

            stepCashflowTitle: 'Surya Graha',
            stepCashflowDesc: 'Income & Inflation · Cashflow & Tax',

            stepAssetsTitle: 'Guru Graha',
            stepAssetsDesc: 'What You Own · Asset Portfolio',

            stepLiabilitiesTitle: 'Shani Graha',
            stepLiabilitiesDesc: 'Debts & EMIs · Liabilities',

            stepInsuranceTitle: 'Mangal Graha',
            stepInsuranceDesc: 'Insurance Coverage · Risk Protection',

            stepGoalsTitle: 'Chandra Graha',
            stepGoalsDesc: 'Future Aspirations · Financial Goals',

            appTitle: 'Financial Kundli',
            appTagline: 'Comprehensive Diagnosis',

            netWorth: 'Net Worth',
            savingsRate: 'Savings Rate',
            emergency: 'Emergency',
            months: 'Months',
        },

        Hindi: {
            personalInfo: 'व्यक्तिगत जानकारी',
            financialDoctor: 'फाइनेंशियल डॉक्टर (एडवाइज़र)',
            clientFullName: 'क्लाइंट का पूरा नाम',
            email: 'ईमेल आईडी',
            phone: 'मोबाइल नंबर',
            dob: 'जन्म तिथि',
            currentAge: 'वर्तमान उम्र',
            birthPlace: 'जन्म स्थान / शहर',
            retirementAge: 'रिटायरमेंट की उम्र',
            familyMembers: 'परिवार के सदस्य',
            next: 'अगला कदम',
            back: 'वापस',
            generate: 'कुंडली रिपोर्ट जनरेट करें',
            assetTitle: 'एसेट पोर्टफोलियो',
            cashBank: 'कैश और बैंक बैलेंस',
            equity: 'इक्विटी म्यूचुअल फंड्स / स्टॉक्स',
            debt: 'डेट फंड्स / FD / बॉन्ड्स',
            epfPpf: 'EPF / PPF फंड',
            realEstate: 'रियल एस्टेट (निवेश / स्वयं उपयोग)',

            incomeExpensesTitle: 'आय और खर्च',
            planningTitle: 'प्लानिंग से जुड़ी मान्यताएँ',

            monthlyIncome: 'मासिक आय',
            annualIncome: 'वार्षिक आय',
            monthlyExpenses: 'मासिक खर्च',
            monthlySavings: 'मौजूदा मासिक बचत',
            emergencyFund: 'मौजूदा इमरजेंसी फंड',
            targetEmergency: 'टारगेट इमरजेंसी फंड (महीनों में)',

            expectedROI: 'अपेक्षित रिटर्न (ROI)',
            goalInflation: 'गोल्स पर महंगाई दर',
            expenseInflation: 'खर्चों पर महंगाई दर',

            insuranceTitle: 'बीमा और सुरक्षा',

            lifeInsurance: 'लाइफ इंश्योरेंस (टर्म प्लान)',
            healthInsurance: 'हेल्थ इंश्योरेंस',
            criticalIllness: 'क्रिटिकल इलनेस कवर',
            accidentCover: 'एक्सीडेंट / डिसएबिलिटी कवर',

            goalsTitle: 'भविष्य के लक्ष्य',
            addGoal: 'नया लक्ष्य जोड़ें',

            noGoalsTitle: 'अभी कोई लक्ष्य नहीं जोड़ा गया',
            noGoalsDesc: 'रिटायरमेंट, बच्चों की पढ़ाई या घर खरीदने जैसे लक्ष्य जोड़ें।',

            goalName: 'लक्ष्य का नाम',
            goalPlaceholder: 'जैसे: बेटी की शादी',

            costToday: 'आज की लागत',
            targetYear: 'लक्ष्य वर्ष',
            existingCorpus: 'इस लक्ष्य के लिए मौजूदा फंड',

            loanTitleHome: 'होम लोन',
            loanTitleVehicle: 'व्हीकल लोन',
            loanTitleCreditCard: 'क्रेडिट कार्ड लोन',
            loanTitlePersonal: 'पर्सनल लोन',
            loanTitleOther: 'अन्य लोन',

            outstanding: 'बकाया राशि',
            interestRate: 'ब्याज दर',
            monthlyEmi: 'मासिक EMI',
            monthsLeft: 'बचे हुए महीने',
            monthsLeftPlaceholder: 'जैसे: 24',

            stepClientTitle: 'लग्न ग्रह',
            stepClientDesc: 'मूल जानकारी · क्लाइंट प्रोफ़ाइल',

            stepCashflowTitle: 'सूर्य ग्रह',
            stepCashflowDesc: 'आय और मुद्रास्फीति · कैशफ्लो और टैक्स',

            stepAssetsTitle: 'गुरु ग्रह',
            stepAssetsDesc: 'आपकी संपत्ति · एसेट पोर्टफोलियो',

            stepLiabilitiesTitle: 'शनि ग्रह',
            stepLiabilitiesDesc: 'ऋण और EMI · देनदारियाँ',

            stepInsuranceTitle: 'मंगल ग्रह',
            stepInsuranceDesc: 'बीमा सुरक्षा · जोखिम से सुरक्षा',

            stepGoalsTitle: 'चंद्र ग्रह',
            stepGoalsDesc: 'भविष्य के लक्ष्य · वित्तीय उद्देश्य',

            appTitle: 'फाइनेंशियल कुंडली',
            appTagline: 'समग्र वित्तीय विश्लेषण',

            netWorth: 'कुल संपत्ति',
            savingsRate: 'बचत दर',
            emergency: 'आपातकालीन फंड',
            months: 'महीने',
        },
    };

    useEffect(() => {
        const monthly = Number(data.cashflow.monthly_income);

        if (!monthly || monthly <= 0) return;

        const annual = monthly * 12;

        setData((prev) => ({
            ...prev,
            cashflow: {
                ...prev.cashflow,
                annual_income: annual.toString(),
            },
        }));
    }, [data.cashflow.monthly_income]);

    useEffect(() => {
        if (!data.client.dob) return;

        const dob = new Date(data.client.dob);
        const today = new Date();

        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        if (!Number.isNaN(age) && age >= 0) {
            setData((prev) => ({
                ...prev,
                client: {
                    ...prev.client,
                    age: age.toString(),
                },
            }));
        }
    }, [data.client.dob]);

    const steps = [
        {
            id: 'client',
            title: t('stepClientTitle'),
            desc: t('stepClientDesc'),
            icon: <Icons.User />,
        },
        {
            id: 'cashflow',
            title: t('stepCashflowTitle'),
            desc: t('stepCashflowDesc'),
            icon: <Icons.Briefcase />,
        },
        {
            id: 'assets',
            title: t('stepAssetsTitle'),
            desc: t('stepAssetsDesc'),
            icon: <Icons.Briefcase />,
        },
        {
            id: 'liabilities',
            title: t('stepLiabilitiesTitle'),
            desc: t('stepLiabilitiesDesc'),
            icon: <Icons.CreditCard />,
        },
        {
            id: 'insurance',
            title: t('stepInsuranceTitle'),
            desc: t('stepInsuranceDesc'),
            icon: <Icons.Shield />,
        },
        {
            id: 'goals',
            title: t('stepGoalsTitle'),
            desc: t('stepGoalsDesc'),
            icon: <Icons.Target />,
        },
    ];

    /* ===================== CALCULATIONS ===================== */
    const metrics = useMemo(() => {
        const totalAssets = Object.values(data.assets).reduce((a, b) => Number(a || 0) + Number(b || 0), 0);
        const totalLiabilities = Object.values(data.liabilities).reduce((a, b) => a + Number(b.outstanding || 0), 0);
        const monthlyIncome = Number(data.cashflow.annual_income || 0) / 12 || Number(data.cashflow.monthly_income || 0);
        const savingsRate = monthlyIncome > 0 ? Math.round((Number(data.cashflow.monthly_savings || 0) / monthlyIncome) * 100) : 0;

        const expenses = Number(data.cashflow.monthly_expenses || 1);
        const runway = (Number(data.cashflow.current_emergency_fund || 0) / expenses).toFixed(1);

        return {
            netWorth: totalAssets - totalLiabilities,
            savingsRate,
            runway,
        };
    }, [data]);

    /* ===================== HANDLERS ===================== */
    const update = (section, field, value) => {
        setData((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    };

    const updateLoan = (loan, field, value) => {
        setData((prev) => ({
            ...prev,
            liabilities: {
                ...prev.liabilities,
                [loan]: { ...prev.liabilities[loan], [field]: value },
            },
        }));
    };

    const addGoal = () => {
        setData((prev) => ({
            ...prev,
            goals: [...prev.goals, { goal_name: '', priority: 'High', current_cost: '', existing_corpus: '', target_year: '' }],
        }));
    };

    const updateGoal = (i, field, value) => {
        const goals = [...data.goals];
        goals[i][field] = value;
        setData((prev) => ({ ...prev, goals }));
    };

    const formatCurrency = (num) => {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    const submit = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_URL}/api/financial-kundli/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            router.push(`/financial-kundli/report/${result.reportId || ''}`);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentStep]);

    return (
        <div className="lg:flex lg:h-screen lg:overflow-hidden bg-slate-50 text-slate-900 ">
            {/* ================= SIDEBAR ================= */}
            <aside className="hidden lg:flex flex-col w-80 bg-white border-r border-slate-200 h-full z-20">
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">FK</div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">{t('appTitle')}</h1>
                    </div>
                    <p className="text-xs text-slate-400 font-medium ml-11">{t('appTagline')}</p>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 space-y-2">
                    {steps.map((s, idx) => (
                        <StepItem key={s.id} step={s} index={idx} current={currentStep} onClick={() => setCurrentStep(idx)} />
                    ))}
                </nav>

                <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <span>Completion</span>
                        <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
                    </div>
                </div>
            </aside>

            {/* ================= MAIN CONTENT ================= */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* HEADER STATS */}
                <header className="bg-white border-b border-slate-200 z-10 sticky top-0">
                    <div className="px-4 py-4 lg:px-10 lg:py-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6 lg:gap-12">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('netWorth')}</span>
                                <span className={`text-lg lg:text-2xl font-black ${metrics.netWorth < 0 ? 'text-red-500' : 'text-slate-900'}`}>{formatCurrency(metrics.netWorth)}</span>
                            </div>
                            <div className="hidden sm:block h-10 w-px bg-slate-100"></div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('savingsRate')}</span>
                                <span className="text-lg lg:text-2xl font-black text-indigo-600">{metrics.savingsRate}%</span>
                            </div>
                            <div className="hidden sm:block h-10 w-px bg-slate-100"></div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('emergency')}</span>
                                <span className="text-lg lg:text-2xl font-black text-slate-900">
                                    {metrics.runway} <span className="text-xs font-bold text-slate-400">{t('months')}</span>
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2 text-xs font-bold">
                            <button onClick={() => setLang('English')} className={`px-3 py-1 rounded ${lang === 'English' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                                EN
                            </button>
                            <button onClick={() => setLang('Hindi')} className={`px-3 py-1 rounded ${lang === 'Hindi' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                                हिंदी
                            </button>
                        </div>

                        <div className="lg:hidden text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                            Step {currentStep + 1} of {steps.length}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 pb-32 lg:p-10">
                    {loading ? (
                        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                            {/* RADAR ANIMATION */}
                            <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                                <div className="absolute inset-0 bg-indigo-600/5 rounded-full animate-ping opacity-20" />
                                <div className="absolute inset-0 rounded-full border border-slate-200">
                                    <div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-indigo-500 to-transparent origin-left animate-[spin_3s_linear_infinite]" />
                                </div>
                                <div className="absolute inset-10 border border-dashed border-slate-200 rounded-full animate-[spin_15s_linear_infinite]" />

                                <div className="relative z-10 w-20 h-20 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-xl">
                                    <div className="flex gap-1 items-end h-6">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="w-1.5 bg-indigo-600 rounded-full animate-[loading_1.2s_ease-in-out_infinite]"
                                                style={{ animationDelay: `${i * 0.15}s`, height: '40%' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="max-w-sm space-y-4">
                                <h2 className="text-2xl font-black text-slate-900">
                                    Deep <span className="text-indigo-600">Diagnosis</span> Active
                                </h2>
                                <div className="h-6">
                                    <p className="text-slate-500 text-sm font-medium animate-pulse">{analysisSteps[tipIndex]}</p>
                                </div>
                                <div className="pt-4 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-20" />
                                            <path d="M12 2a10 10 0 0110 10" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase tracking-wider">
                                        Please stay on this page.
                                        <br />
                                        We are calculating complex benchmarks.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto">
                            {/* STEP 0: CLIENT PROFILE */}
                            {currentStep === 0 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
                                        <h3 className="text-lg font-bold text-slate-900 mb-6">{t('personalInfo')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputGroup
                                                label={t('financialDoctor')}
                                                value={data.client.financial_doctor_name}
                                                onChange={(e) => update('client', 'financial_doctor_name', e.target.value)}
                                            />
                                            <InputGroup label={t('clientFullName')} value={data.client.name} onChange={(e) => update('client', 'name', e.target.value)} />
                                            <InputGroup label={t('email')} type="email" value={data.client.email} onChange={(e) => update('client', 'email', e.target.value)} />
                                            <InputGroup label={t('phone')} value={data.client.phone} onChange={(e) => update('client', 'phone', e.target.value)} />
                                            <InputGroup label={t('dob')} type="date" value={data.client.dob} onChange={(e) => update('client', 'dob', e.target.value)} />
                                            <InputGroup label={t('currentAge')} type="number" value={data.client.age} onChange={(e) => update('client', 'age', e.target.value)} />
                                            <InputGroup label={t('birthPlace')} value={data.client.city} onChange={(e) => update('client', 'city', e.target.value)} />
                                            <InputGroup
                                                label={t('retirementAge')}
                                                type="number"
                                                value={data.client.wanted_retirement_age}
                                                onChange={(e) => update('client', 'wanted_retirement_age', e.target.value)}
                                            />
                                            <InputGroup
                                                label={t('familyMembers')}
                                                type="number"
                                                value={data.client.family_members}
                                                onChange={(e) => update('client', 'family_members', e.target.value)}
                                            />
                                             <div>
                                                 <Label required>{t('report Language')}</Label>
                                                  <div className="flex flex-wrap gap-2 mt-1">
                                            {['English', 'Hindi', 'Hinglish', 'Marathi', 'Gujarati'].map((lang) => (
                                                <button
                                                    key={lang}
                                                    onClick={() => update('client', 'report_language', lang)}
                                                    className={`px-2 py-2 rounded-lg text-xs border transition-all ${
                                                        data.client.report_language === lang ? 'bg-indigo-600 border-[#1E8455] text-white' : 'bg-white/5 border-white/10'
                                                    }`}
                                                >
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                             </div>
                                       
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 1: CASHFLOW & TAX */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
                                        <h3 className="text-lg font-bold text-slate-900 mb-6">{t('incomeExpensesTitle')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <InputGroup
                                                label={t('monthlyIncome')}
                                                prefix="₹"
                                                value={data.cashflow.monthly_income}
                                                onChange={(e) => update('cashflow', 'monthly_income', e.target.value)}
                                            />
                                            <InputGroup
                                                label={t('annualIncome')}
                                                prefix="₹"
                                                value={data.cashflow.annual_income}
                                                onChange={(e) => update('cashflow', 'annual_income', e.target.value)}
                                            />
                                            <InputGroup
                                                label={t('monthlyExpenses')}
                                                prefix="₹"
                                                value={data.cashflow.monthly_expenses}
                                                onChange={(e) => update('cashflow', 'monthly_expenses', e.target.value)}
                                            />
                                            <InputGroup
                                                label={t('monthlySavings')}
                                                prefix="₹"
                                                value={data.cashflow.monthly_savings}
                                                onChange={(e) => update('cashflow', 'monthly_savings', e.target.value)}
                                            />
                                            <InputGroup
                                                label={t('emergencyFund')}
                                                prefix="₹"
                                                value={data.cashflow.current_emergency_fund}
                                                onChange={(e) => update('cashflow', 'current_emergency_fund', e.target.value)}
                                            />
                                            <InputGroup
                                                label={t('targetEmergency')}
                                                value={data.cashflow.desired_emergency_months}
                                                onChange={(e) => update('cashflow', 'desired_emergency_months', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
                                        <h3 className="text-lg font-bold text-slate-900 mb-6">{t('planningTitle')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <InputGroup
                                                label={t('expectedROI')}
                                                suffix="%"
                                                value={data.tax_and_risk.roi_yearly}
                                                onChange={(e) => update('tax_and_risk', 'roi_yearly', e.target.value)}
                                            />
                                            <InputGroup
                                                label={t('goalInflation')}
                                                suffix="%"
                                                value={data.tax_and_risk.inflation_goals_yearly}
                                                onChange={(e) => update('tax_and_risk', 'inflation_goals_yearly', e.target.value)}
                                            />
                                            <InputGroup
                                                label={t('expenseInflation')}
                                                suffix="%"
                                                value={data.tax_and_risk.inflation_expenses_yearly}
                                                onChange={(e) => update('tax_and_risk', 'inflation_expenses_yearly', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: ASSETS */}
                            {currentStep === 2 && (
                                <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6">{t('assetTitle')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <InputGroup label={t('cashBank')} prefix="₹" value={data.assets.cash} onChange={(e) => update('assets', 'cash', e.target.value)} />
                                        <InputGroup label={t('equity')} prefix="₹" value={data.assets.equity} onChange={(e) => update('assets', 'equity', e.target.value)} />
                                        <InputGroup label={t('debt')} prefix="₹" value={data.assets.debt} onChange={(e) => update('assets', 'debt', e.target.value)} />
                                        <InputGroup label={t('epfPpf')} prefix="₹" value={data.assets.epf} onChange={(e) => update('assets', 'epf', e.target.value)} />
                                        <InputGroup
                                            label={t('realEstate')}
                                            prefix="₹"
                                            value={data.assets.real_estate}
                                            onChange={(e) => update('assets', 'real_estate', e.target.value)}
                                            className="md:col-span-2"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: LIABILITIES */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    {['home', 'vehicle', 'credit_card', 'personal', 'other'].map((key) => (
                                        <div key={key} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-2 h-6 bg-red-500 rounded-full"></div>
                                                <h3 className="font-bold uppercase text-xs tracking-widest text-slate-900">
                                                    {' '}
                                                    {t(
                                                        key === 'home'
                                                            ? 'loanTitleHome'
                                                            : key === 'vehicle'
                                                              ? 'loanTitleVehicle'
                                                              : key === 'credit_card'
                                                                ? 'loanTitleCreditCard'
                                                                : key === 'personal'
                                                                  ? 'loanTitlePersonal'
                                                                  : 'loanTitleOther',
                                                    )}{' '}
                                                    Loan
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <InputGroup
                                                    label={t('outstanding')}
                                                    prefix="₹"
                                                    value={data.liabilities[key].outstanding}
                                                    onChange={(e) => updateLoan(key, 'outstanding', e.target.value)}
                                                />
                                                <InputGroup label={t('interestRate')} suffix="%" value={data.liabilities[key].interest} onChange={(e) => updateLoan(key, 'interest', e.target.value)} />
                                                <InputGroup label={t('monthlyEmi')} prefix="₹" value={data.liabilities[key].emi} onChange={(e) => updateLoan(key, 'emi', e.target.value)} />
                                                <InputGroup
                                                    label={t('monthsLeft')}
                                                    type="number"
                                                    value={data.liabilities[key].months_left}
                                                    onChange={(e) => updateLoan(key, 'months_left', e.target.value)}
                                                    placeholder={t('monthsLeftPlaceholder')}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* STEP 4: INSURANCE */}
                            {currentStep === 4 && (
                                <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6">{t('insuranceTitle')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <InputGroup label={t('lifeInsurance')} prefix="₹" value={data.insurance.life} onChange={(e) => update('insurance', 'life', e.target.value)} />
                                        <InputGroup label={t('healthInsurance')} prefix="₹" value={data.insurance.health} onChange={(e) => update('insurance', 'health', e.target.value)} />
                                        <InputGroup label={t('criticalIllness')} prefix="₹" value={data.insurance.critical} onChange={(e) => update('insurance', 'critical', e.target.value)} />
                                        <InputGroup label={t('accidentCover')} prefix="₹" value={data.insurance.accident} onChange={(e) => update('insurance', 'accident', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: GOALS */}
                            {currentStep === 5 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-bold">{t('goalsTitle')}</h3>
                                        <button
                                            onClick={addGoal}
                                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                        >
                                            <Icons.Plus /> {t('addGoal')}
                                        </button>
                                    </div>

                                    {data.goals.length === 0 && (
                                        <div className="bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-3xl p-12 text-center">
                                            <p className="text-indigo-900 font-bold mb-1">{t('noGoalsTitle')}</p>
                                            <p className="text-indigo-400 text-sm mb-4">{t('noGoalsDesc')}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {data.goals.map((g, i) => (
                                            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group relative">
                                                <button
                                                    onClick={() => {
                                                        const goals = data.goals.filter((_, idx) => idx !== i);
                                                        setData((prev) => ({ ...prev, goals }));
                                                    }}
                                                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Icons.Trash />
                                                </button>
                                                <div className="space-y-4">
                                                    <InputGroup
                                                        label={t('goalName')}
                                                        placeholder={t('goalPlaceholder')}
                                                        value={g.goal_name}
                                                        onChange={(e) => updateGoal(i, 'goal_name', e.target.value)}
                                                    />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <InputGroup label={t('costToday')} prefix="₹" value={g.current_cost} onChange={(e) => updateGoal(i, 'current_cost', e.target.value)} />
                                                        <InputGroup label={t('targetYear')} placeholder="2040" value={g.target_year} onChange={(e) => updateGoal(i, 'target_year', e.target.value)} />
                                                    </div>
                                                    <InputGroup label={t('existingCorpus')} prefix="₹" value={g.existing_corpus} onChange={(e) => updateGoal(i, 'existing_corpus', e.target.value)} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* FOOTER NAVIGATION */}
                <footer className="bg-white border-t border-slate-200 p-4 lg:p-6 sticky bottom-0 z-30">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <button
                            disabled={currentStep === 0}
                            onClick={() => setCurrentStep((s) => s - 1)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-0 transition-all"
                        >
                            <Icons.ChevronLeft /> {t('back')}
                        </button>

                        {currentStep < steps.length - 1 ? (
                            <button
                                onClick={() => setCurrentStep((s) => s + 1)}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                            >
                                {t('next')} <Icons.ChevronRight />
                            </button>
                        ) : (
                            <button
                                onClick={submit}
                                disabled={loading}
                                className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
                            >
                                {loading ? 'Generating...' : t('generate')} <Icons.Check />
                            </button>
                        )}
                    </div>
                </footer>
            </div>
            <style jsx global>{`
                @keyframes loading {
                    0%,
                    100% {
                        height: 30%;
                    }
                    50% {
                        height: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
