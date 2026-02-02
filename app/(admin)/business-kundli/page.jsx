'use client';

import { useState, useEffect } from 'react'; // Added useEffect
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { showNotification } from '@mantine/notifications';
import { getAuth } from 'firebase/auth';
import PremiumGate from '@/components/premium/PremiumGate';

// --- ICONS (SVG) ---
const IconCheck = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
);
const IconArrowRight = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
);
const IconChevronLeft = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    </svg>
);
const IconWarning = () => (
    <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
    </svg>
);

// --- UI HELPERS ---
const Label = ({ children, required }) => (
    <label className="block text-[12px] font-bold uppercase   text-slate-300 mb-1 ml-1">
        {children} {required && <span className="text-[#1E8455]">*</span>}
    </label>
);
const InputText = ({ value, onChange, type = 'text', placeholder = '' }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#162D5C]/30 text-slate-50 placeholder:text-slate-500 focus:bg-[#162D5C]/50 focus:border-[#1E8455] focus:ring-1 focus:ring-[#1E8455]/30 outline-none transition-all shadow-lg"
    />
);

const SelectChip = ({ label, selected, onClick, multi = false }) => (
    <button
        onClick={onClick}
        className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-all shadow-sm flex items-center justify-center gap-2 ${
            selected
                ? 'bg-gradient-to-r from-[#1E8455] to-[#162D5C] border-transparent text-white shadow-lg'
                : 'bg-white/5 border-white/10 text-slate-300 hover:border-[#1E8455]/40 hover:bg-white/10'
        }`}
    >
        {selected && multi && <IconCheck />}
        {label}
    </button>
);

const RangeSlider = ({ label, value, onChange, min = 1, max = 10, subLabels }) => (
    <div className="bg-[#162D5C]/20 p-5 rounded-2xl border border-white/5 mb-3 shadow-md">
        <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-slate-100">{label}</span>
            <span className="text-sm font-bold text-[#1E8455]">{value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={Number(value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#1E8455]"
        />
        {subLabels && (
            <div className="flex justify-between mt-2 text-[10px] text-slate-400 uppercase tracking-widest">
                <span>{subLabels[0]}</span>
                <span>{subLabels[1]}</span>
                <span>{subLabels[2]}</span>
            </div>
        )}
    </div>
);


const ToggleYesNo = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-[#162D5C]/40 mb-2">
        <span className="text-sm font-medium text-slate-200 pr-4">{label}</span>
        <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
            <button
                onClick={() => onChange(true)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${value === true ? 'bg-[#1E8455] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
                YES
            </button>
            <button
                onClick={() => onChange(false)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${value === false ? 'bg-[#162D5C] text-white' : 'text-slate-500 hover:text-white'}`}
            >
                NO
            </button>
        </div>
    </div>
);


const LangToggle = ({ value, onChange }) => (
    <div className="flex bg-[#162D5C]/80 border border-white/10 rounded-xl p-1">
        {['English', 'Hindi'].map((lang) => (
            <button
                key={lang}
                onClick={() => onChange(lang)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${value === lang ? 'bg-[#1E8455] text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
                {lang === 'English' ? 'EN' : 'हिं'}
            </button>
        ))}
    </div>
);

export default function BusinessKundliWizard() {
    const router = useRouter();
    const { profile, loading: authLoading } = useAuth();
    const hasAccess = profile?.add_ons?.includes('BUSINESS_KUNDLI');

    if (authLoading) {
        return <div className="p-6 text-sm text-slate-500">Loading...</div>;
    }

    if (!hasAccess) {
        return (
            <PremiumGate
                title="Business Kundli is a Premium Add-on"
                subtitle="Unlock the Business Kundli playbook with 90-day repair plans and AI guidance."
                features={[
                    'Execution discipline scorecard',
                    '90-day repair plan & roadmap',
                    'Client-ready PDF playbooks',
                ]}
                ctaLabel="Request Business Kundli Access"
            />
        );
    }
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const totalSteps = 11;
    const progress = step >= 12 ? 100 : ((step - 1) / totalSteps) * 100;

    // New state for Case 12 message cycling
    const [tipIndex, setTipIndex] = useState(0);
    const [language, setLanguage] = useState('English');

    const t = (key) => translations[language][key] || key;

    // Cycle tips during analysis wait
    useEffect(() => {
        if (step === 12) {
            const interval = setInterval(() => {
                setTipIndex((prev) => (prev + 1) % 5);
            }, 8000);
            return () => clearInterval(interval);
        }
    }, [step]);

    const analysisSteps = [
        'Scanning business performance metrics...',
        "Calculating 'Graha' alignments for your city...",
        'Cross-referencing compliance with regulatory standards...',
        'Optimizing skill-gap recommendations...',
        'Synthesizing your final Business Kundli report...',
    ];
    const translations = {
        English: {
            identityTitle: 'Business Identity -🪐LAGNA GRAHA',
            identityDesc: 'Tell Us About Yourself',
            fullName: 'Full Name',
            age: 'Age',
            city: 'City',
            experience: 'Experience (Yrs)',
            workType: 'Work Type',
            primaryProduct: 'Primary Product Focus (Select Multiple)',
            reportLanguage: 'Report Language',
            next: 'Next Step',
            generate: 'Generate Kundli Report',

            birthdayTitle: '🪐 CHANDRA GRAHA (Rhythm & Timing)',
            dob: 'Date of Birth',
            tob: 'Time of Birth',
            pob: 'Place of Birth',
            timeAccuracy: 'Time Accuracy',

            numbersTitle: '🪐SURYA GRAHA (Income, Authority, Power)',

            last90Days: 'Last 90 Days',
            commissionEarned: 'Comm. Earned (₹)',
            noOfSales: 'No. of Sales',
            leadsGenerated: 'Leads Generated',
            meetingsConducted: 'Mtgs Conducted',
            salesClosed: 'Sales Closed',
            avgTicketSize: 'Avg Ticket Size (₹)',

            last12Months: 'Last 12 Months',
            totalIncome: 'Total Income (₹)',
            activeClients: 'Active Clients',
            bestMonth: 'Best Month (₹)',
            worstMonth: 'Worst Month (₹)',

            clientHealthTitle: '🪐SHUKRA GRAHA (Relationships & Loyalty)',

            needsAnalysis: 'Analyze needs before recommending?',
            portfolioCheckup: 'Periodic portfolio check-ups?',
            reviewsPerMonth: 'Review Meetings / Month',
            referralPercent: 'Referral %',
            avgClientAge: 'Avg Client Age (Years)',
            communicationFreq: 'Non-sales Communication Frequency',

            operationsTitle: '🪐 MANGAL GRAHA (Action, Energy, Execution)',

            hoursPerWeek: 'Hours / Week',
            callsPerDay: 'Calls / Day',
            meetingsPerWeek: 'Meetings / Week',

            prospectingSources: 'Prospecting Sources',

            marketTitle: '🪐 BUDH GRAHA (Strategy, Communication, Intelligence)',

            competitorAwareness: 'Awareness of Competitors',
            valuePropClarity: 'Value Proposition Clarity',
            objectionConfidence: 'Confidence Handling Objections',

            differentiationFactors: 'Differentiation Factors',

            clientsLost: 'Clients lost to competition (Last 12 months)',

            techTitle: '🪐 RAHU GRAHA (Technology, Leverage, Modern Tools)',

            toolsUsed: 'Tools Actively Used',
            crmUpdateFreq: 'Update CRM Frequency',
            digitalPresentation: 'Use Digital Presentations?',
            videoComfort: 'Video Meeting Comfort',
            automation: 'Automation for follow-ups?',

            complianceTitle: '🪐 SHANI GRAHA (Rules, Risk, Long-Term Survival)',
            complianceWarning: 'Shortcuts here can destroy your career. Be honest.',

            suitability: 'Suitability documentation for every sale?',
            kyc: 'Complete KYC for all clients?',
            riskDisclosure: 'Proper risk disclosures before sale?',
            noMisselling: 'No mis-selling or over-promising?',
            recordKeeping: 'Systematic record keeping?',
            regUpdates: 'Stay updated on regulatory changes?',

            trainingFreq: 'Training Frequency',

            skillsTitle: '🪐 GURU GRAHA (Knowledge & Wisdom)',
            skillsDesc: 'Rate yourself 1-10.',

            productKnowledge: 'Product Knowledge',
            financialPlanning: 'Financial Planning',
            comparisonAbility: 'Comparison Ability',
            communication: 'Communication',
            sellingClosing: 'Selling & Closing',
            followupDiscipline: 'Follow-up Discipline',

            skillLow: 'Need Work',
            skillMid: 'Avg',
            skillHigh: 'Excellent',

            skillsTip: 'If your conversion reality contradicts self-rating, we will adjust based on actual data.',

            trustTitle: '🪐 SHUKRA + SURYA COMBO (Authority + Trust)',

            clientEvents: 'Client Events (Last 12 months)?',
            testimonials: 'Testimonials Available?',
            googlePresence: 'Google Presence?',
            socialMedia: 'Active Social Media?',
            website: 'Website?',
            landingPage: 'Landing Page?',
            useKundli: 'Use Financial Kundli with Clients?',

            mindsetTitle: '🪐 KETU GRAHA (Belief, Fear, Inner Blocks)',

            confidenceCalling: 'Confidence in Calling',
            weeklyConsistency: 'Weekly Consistency',
            investmentLearning: 'Investment in Learning',
            goalTracking: 'Goal Tracking',
            fearRejection: 'Fear of Rejection (1 = High Fear, 10 = No Fear)',
        },
        Hindi: {
            identityTitle: 'बिज़नेस पहचान –🪐लग्न ग्रह',
            identityDesc: 'अपने बारे में बताएं',
            fullName: 'पूरा नाम',
            age: 'आयु',
            city: 'शहर',
            experience: 'अनुभव (वर्ष)',
            workType: 'कार्य प्रकार',
            primaryProduct: 'मुख्य प्रोडक्ट फोकस (एक से अधिक चुनें)',
            reportLanguage: 'रिपोर्ट भाषा',
            next: 'अगला चरण',
            generate: 'कुंडली रिपोर्ट बनाएं',

            birthdayTitle: '🪐 चंद्र ग्रह (लय और समय)',
            dob: 'जन्म तिथि',
            tob: 'जन्म समय',
            pob: 'जन्म स्थान',
            timeAccuracy: 'समय की सटीकता',

            numbersTitle: '🪐 सूर्य ग्रह (आय, अधिकार, शक्ति)',
            last90Days: 'पिछले 90 दिन',
            commissionEarned: 'कमिशन अर्जित (₹)',
            noOfSales: 'कुल बिक्री',
            leadsGenerated: 'लीड्स प्राप्त',
            meetingsConducted: 'बैठकें हुईं',
            salesClosed: 'डील क्लोज़',
            avgTicketSize: 'औसत टिकट साइज (₹)',
            last12Months: 'पिछले 12 महीने',
            totalIncome: 'कुल आय (₹)',
            activeClients: 'सक्रिय ग्राहक',
            bestMonth: 'सबसे अच्छा महीना (₹)',
            worstMonth: 'सबसे कम प्रदर्शन वाला महीना (₹)',

            clientHealthTitle: '🪐 शुक्र ग्रह (संबंध और विश्वास)',

            needsAnalysis: 'सिफारिश से पहले जरूरतों का विश्लेषण करते हैं?',
            portfolioCheckup: 'नियमित पोर्टफोलियो रिव्यू करते हैं?',
            reviewsPerMonth: 'प्रति माह समीक्षा बैठकें',
            referralPercent: 'रेफरल प्रतिशत',
            avgClientAge: 'औसत ग्राहक आयु (वर्ष)',
            communicationFreq: 'बिना बिक्री वाली बातचीत की आवृत्ति',

            operationsTitle: '🪐 मंगल ग्रह (साहस, ऊर्जा, प्रयास)',

            hoursPerWeek: 'प्रति सप्ताह घंटे',
            callsPerDay: 'प्रति दिन कॉल',
            meetingsPerWeek: 'प्रति सप्ताह बैठकें',

            prospectingSources: 'ग्राहक खोज के स्रोत',

            marketTitle: '🪐 बुध ग्रह (रणनीति, संवाद, बुद्धि)',

            competitorAwareness: 'प्रतिस्पर्धियों की समझ',
            valuePropClarity: 'मूल्य प्रस्ताव की स्पष्टता',
            objectionConfidence: 'आपत्तियों को संभालने का आत्मविश्वास',

            differentiationFactors: 'अलग पहचान के कारक',

            clientsLost: 'पिछले 12 महीनों में प्रतियोगियों को खोए ग्राहक',

            techTitle: '🪐 राहु ग्रह (तकनीक, प्रभाव, आधुनिक उपकरण)',

            toolsUsed: 'सक्रिय रूप से उपयोग किए जाने वाले टूल्स',
            crmUpdateFreq: 'CRM अपडेट करने की आवृत्ति',
            digitalPresentation: 'डिजिटल प्रेज़ेंटेशन का उपयोग करते हैं?',
            videoComfort: 'वीडियो मीटिंग में सहजता',
            automation: 'फॉलो-अप के लिए ऑटोमेशन का उपयोग?',

            complianceTitle: '🪐 शनि ग्रह (कानून, जोखिम, लंबे समय की सुरक्षा)',
            complianceWarning: 'यहाँ की गई लापरवाही आपका करियर खत्म कर सकती है। ईमानदार रहें।',

            suitability: 'क्या हर बिक्री के लिए उपयुक्तता दस्तावेज़ बनाए जाते हैं?',
            kyc: 'क्या सभी ग्राहकों का पूर्ण KYC होता है?',
            riskDisclosure: 'क्या बिक्री से पहले जोखिम की पूरी जानकारी दी जाती है?',
            noMisselling: 'क्या मिस-सेलिंग या ओवर-प्रॉमिसिंग नहीं होती?',
            recordKeeping: 'क्या रिकॉर्ड व्यवस्थित रूप से रखा जाता है?',
            regUpdates: 'क्या आप नियामकीय बदलावों से अपडेट रहते हैं?',

            trainingFreq: 'प्रशिक्षण की आवृत्ति',

            skillsTitle: '🪐 गुरु ग्रह (विद्या और विवेक)',
            skillsDesc: 'अपने आप को 1-10 में आंकें।',

            productKnowledge: 'प्रोडक्ट नॉलेज',
            financialPlanning: 'वित्तीय योजना',
            comparisonAbility: 'तुलना करने की क्षमता',
            communication: 'संचार कौशल',
            sellingClosing: 'सेलिंग और क्लोज़िंग',
            followupDiscipline: 'फॉलो-अप अनुशासन',

            skillLow: 'सुधार की आवश्यकता',
            skillMid: 'औसत',
            skillHigh: 'उत्कृष्ट',

            skillsTip: 'यदि आपकी वास्तविक परफॉर्मेंस सेल्फ-रेटिंग से अलग है, तो हम वास्तविक डेटा के आधार पर मूल्यांकन समायोजित करेंगे।',

            trustTitle: '🪐 शुक्र + सूर्य संयोजन (अधिकार + विश्वास)',

            clientEvents: 'क्या पिछले 12 महीनों में क्लाइंट इवेंट्स किए हैं?',
            testimonials: 'क्या टेस्टिमोनियल्स उपलब्ध हैं?',
            googlePresence: 'क्या Google पर आपकी उपस्थिति है?',
            socialMedia: 'क्या सोशल मीडिया पर आप सक्रिय हैं?',
            website: 'क्या आपकी वेबसाइट है?',
            landingPage: 'क्या आपका लैंडिंग पेज है?',
            useKundli: 'क्या आप क्लाइंट्स के साथ फाइनेंशियल कुंडली का उपयोग करते हैं?',

            mindsetTitle: '🪐 केतु ग्रह (विश्वास, भय, आंतरिक अवरोध)',

            confidenceCalling: 'कॉलिंग में आत्मविश्वास',
            weeklyConsistency: 'साप्ताहिक निरंतरता',
            investmentLearning: 'सीखने में निवेश',
            goalTracking: 'लक्ष्य ट्रैकिंग',
            fearRejection: 'रिजेक्शन का डर (1 = अधिक डर, 10 = कोई डर नहीं)',
        },
    };

    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        identity: { name: user?.name || '', age: '', city: '', experience_years: '', work_type: 'Full Time', primary_product: [], report_language: 'English' },
        birthday: { dob: '', tob: '', pob: '', accuracy: 'Exact' },
        numbers: {
            commission_90: '',
            sales_count_90: '',
            avg_ticket_90: '',
            leads_90: '',
            meetings_90: '',
            sales_closed_90: '',
            total_income_12m: '',
            best_month_income: '',
            worst_month_income: '',
            active_clients: '',
        },
        client: { needs_analysis: 'Sometimes', portfolio_checkup: 'Sometimes', reviews_per_month: '', avg_client_age: '', referral_percent: '', comm_frequency: 'Quarterly' },
        operation: { hours_per_week: '', calls_per_day: '', meetings_per_week: '', prospecting_sources: [] },
        market: { competitor_aware: 5, value_prop_clarity: 5, differentiation: [], lost_to_competitors: '1-3', objection_confidence: 5 },
        tech: { tools: [], crm_update: 'Weekly', digital_pres: 'Sometimes', video_comfort: 'Moderately', automation: 'No' },
        compliance: { suitability: false, kyc: false, risk_disclosure: false, no_misselling: false, record_keeping: false, reg_updates: false, training_freq: 'Yearly' },
        skills: { product_knowledge: 5, fin_planning: 5, comparison: 5, communication: 5, selling: 5, followup: 5 },
        trust: { client_events: false, testimonials: false, google_presence: false, social_media: false, website: false, landing_page: false, use_kundli: false },
        mindset: { confidence: 5, consistency: 5, learning: 5, track_goals: 5, fear_rejection: 5 },
    });

    const update = (section, field, value) => {
        setFormData((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    };

    const toggleArrayItem = (section, field, item) => {
        setFormData((prev) => {
            const list = prev[section][field];
            const newList = list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
            return { ...prev, [section]: { ...prev[section], [field]: newList } };
        });
    };

    const validateStep = (s = step) => {
        if (s === 1) {
            if (!formData.identity.name || !formData.identity.age || !formData.identity.city) {
                showNotification({ message: 'Please fill all required fields (*)', color: 'red' });
                return false;
            }
        }
        if (s === 2) {
            if (!formData.birthday.dob || !formData.birthday.tob || !formData.birthday.pob) {
                showNotification({ message: 'Please fill all birth details', color: 'red' });
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep((s) => s + 1);
        }
    };

    const handleSubmit = async () => {
        for (let i = 1; i <= totalSteps; i++) {
            if (!validateStep(i)) {
                setStep(i);
                return;
            }
        }

        setStep(12);
        setLoading(true);

        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kundli/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (result.success) {
                setTimeout(() => {
                    router.push(`/business-kundli/report?id=${result.reportId}`);
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed');
            }
        } catch (e) {
            setStep(11);
            setLoading(false);
            showNotification({ title: 'Error', message: 'Submission failed. Please try again.', color: 'red' });
        }
    };

    const renderScreen = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {t('identityTitle')} <span className="font-normal text-lg">({t('identityDesc')})</span>
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label required>{t('fullName')}</Label>
                                <InputText value={formData.identity.name} onChange={(e) => update('identity', 'name', e.target.value)} />
                            </div>
                            <div>
                                <Label required>{t('age')}</Label>
                                <InputText type="number" value={formData.identity.age} onChange={(e) => update('identity', 'age', e.target.value)} />
                            </div>
                            <div>
                                <Label required>{t('city')}</Label>
                                <InputText value={formData.identity.city} onChange={(e) => update('identity', 'city', e.target.value)} />
                            </div>
                            <div>
                                <Label>{t('experience')}</Label>
                                <InputText type="number" value={formData.identity.experience_years} onChange={(e) => update('identity', 'experience_years', e.target.value)} />
                            </div>
                            <div>
                                <Label>{t('workType')}</Label>
                                <div className="flex gap-2 mt-1">
                                    {['Full Time', 'Part Time'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => update('identity', 'work_type', t)}
                                            className={`px-2 py-3 rounded-lg text-xs w-full border ${formData.identity.work_type === t ? 'bg-[#1E8455]/20 border-[#1E8455] text-white' : 'bg-white/5 border-white/10'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label required>{t('primaryProduct')}</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['Life Insurance', 'Health Insurance', 'Mutual Fund', 'Leader', 'Wealth Advisory/PMS', 'Hybrid'].map((p) => (
                                    <SelectChip key={p} label={p} multi selected={formData.identity.primary_product.includes(p)} onClick={() => toggleArrayItem('identity', 'primary_product', p)} />
                                ))}
                            </div>
                        </div>
                        <Label required>{t('reportLanguage')}</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {['English', 'Hindi', 'Hinglish', 'Marathi', 'Gujarati'].map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => update('identity', 'report_language', lang)}
                                    className={`px-4 py-2 rounded-lg text-xs border transition-all ${
                                        formData.identity.report_language === lang ? 'bg-[#1E8455]/20 border-[#1E8455] text-white' : 'bg-white/5 border-white/10'
                                    }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">{t('birthdayTitle')}</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label required>{t('dob')}</Label>
                                <InputText type="date" value={formData.birthday.dob} onChange={(e) => update('birthday', 'dob', e.target.value)} />
                            </div>
                            <div>
                                <Label required>{t('tob')}</Label>
                                <InputText type="time" value={formData.birthday.tob} onChange={(e) => update('birthday', 'tob', e.target.value)} />
                            </div>
                            <div>
                                <Label required>{t('pob')}</Label>
                                <InputText value={formData.birthday.pob} onChange={(e) => update('birthday', 'pob', e.target.value)} />
                            </div>
                            <div>
                                <Label>{t('timeAccuracy')}</Label>
                                <div className="flex gap-4 mt-2">
                                    {['Exact', 'Appropriate'].map((o) => (
                                        <SelectChip key={o} label={o} selected={formData.birthday.accuracy === o} onClick={() => update('birthday', 'accuracy', o)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">{t('numbersTitle')}</h2>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <h3 className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-4">{t('last90Days')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('commissionEarned')}</Label>
                                    <InputText type="number" value={formData.numbers.commission_90} onChange={(e) => update('numbers', 'commission_90', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('noOfSales')}</Label>
                                    <InputText type="number" value={formData.numbers.sales_count_90} onChange={(e) => update('numbers', 'sales_count_90', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('leadsGenerated')}</Label>
                                    <InputText type="number" value={formData.numbers.leads_90} onChange={(e) => update('numbers', 'leads_90', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('meetingsConducted')}</Label>
                                    <InputText type="number" value={formData.numbers.meetings_90} onChange={(e) => update('numbers', 'meetings_90', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('salesClosed')}</Label>
                                    <InputText type="number" value={formData.numbers.sales_closed_90} onChange={(e) => update('numbers', 'sales_closed_90', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('avgTicketSize')}</Label>
                                    <InputText type="number" value={formData.numbers.avg_ticket_90} onChange={(e) => update('numbers', 'avg_ticket_90', e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <h3 className="text-fuchsia-200 text-xs font-bold uppercase tracking-widest mb-4">{t('last12Months')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>{t('totalIncome')}</Label>
                                    <InputText type="number" value={formData.numbers.total_income_12m} onChange={(e) => update('numbers', 'total_income_12m', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('activeClients')}</Label>
                                    <InputText type="number" value={formData.numbers.active_clients} onChange={(e) => update('numbers', 'active_clients', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('bestMonth')}</Label>
                                    <InputText type="number" value={formData.numbers.best_month_income} onChange={(e) => update('numbers', 'best_month_income', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('worstMonth')}</Label>
                                    <InputText type="number" value={formData.numbers.worst_month_income} onChange={(e) => update('numbers', 'worst_month_income', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">{t('clientHealthTitle')}</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label>{t('needsAnalysis')}</Label>
                                <div className="grid grid-cols-4 gap-1 mt-1">
                                    {['Never', 'Rarely', 'Sometimes', 'Always'].map((o) => (
                                        <button
                                            key={o}
                                            onClick={() => update('client', 'needs_analysis', o)}
                                            className={`py-2 text-[10px] rounded border ${formData.client.needs_analysis === o ? 'bg-[#1E8455]/20 border-[#1E8455] text-white' : 'bg-white/5 border-white/10'}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>{t('portfolioCheckup')}</Label>
                                <div className="grid grid-cols-4 gap-1 mt-1">
                                    {['Never', 'Rarely', 'Sometimes', 'Always'].map((o) => (
                                        <button
                                            key={o}
                                            onClick={() => update('client', 'portfolio_checkup', o)}
                                            className={`py-2 text-[10px] rounded border ${formData.client.portfolio_checkup === o ? 'bg-[#1E8455]/20 border-[#1E8455] text-white' : 'bg-white/5 border-white/10'}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>{t('reviewsPerMonth')}</Label>
                                    <InputText type="number" value={formData.client.reviews_per_month} onChange={(e) => update('client', 'reviews_per_month', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('referralPercent')}</Label>
                                    <InputText type="number" value={formData.client.referral_percent} onChange={(e) => update('client', 'referral_percent', e.target.value)} />
                                </div>
                                <div>
                                    <Label>{t('avgClientAge')}</Label>
                                    <InputText type="number" value={formData.client.avg_client_age} onChange={(e) => update('client', 'avg_client_age', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <Label>{t('communicationFreq')}</Label>
                                <div className="flex gap-2 mt-1 overflow-x-auto">
                                    {['Monthly', 'Quarterly', 'Yearly', 'Need Based'].map((o) => (
                                        <SelectChip key={o} label={o} selected={formData.client.comm_frequency === o} onClick={() => update('client', 'comm_frequency', o)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">{t('operationsTitle')}</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>{t('hoursPerWeek')}</Label>
                                <InputText type="number" value={formData.operation.hours_per_week} onChange={(e) => update('operation', 'hours_per_week', e.target.value)} />
                            </div>
                            <div>
                                <Label>{t('callsPerDay')}</Label>
                                <InputText type="number" value={formData.operation.calls_per_day} onChange={(e) => update('operation', 'calls_per_day', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <Label>{t('meetingsPerWeek')}</Label>
                                <InputText type="number" value={formData.operation.meetings_per_week} onChange={(e) => update('operation', 'meetings_per_week', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <Label>{t('prospectingSources')}</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['Referrals', 'Cold/Walk-in', 'Digital', 'Client Reviews', 'Events'].map((s) => (
                                    <SelectChip
                                        key={s}
                                        label={s}
                                        multi
                                        selected={formData.operation.prospecting_sources.includes(s)}
                                        onClick={() => toggleArrayItem('operation', 'prospecting_sources', s)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">{t('marketTitle')}</h2>
                        </div>
                        <RangeSlider label={t('competitorAwareness')} value={formData.market.competitor_aware} onChange={(v) => update('market', 'competitor_aware', v)} />
                        <RangeSlider label={t('valuePropClarity')} value={formData.market.value_prop_clarity} onChange={(v) => update('market', 'value_prop_clarity', v)} />
                        <RangeSlider label={t('objectionConfidence')} value={formData.market.objection_confidence} onChange={(v) => update('market', 'objection_confidence', v)} />
                        <div className="my-4">
                            <Label>{t('differentiationFactors')}</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {['Service Quality', 'Product Knowledge', 'Relationships', 'Tech Enabled', '24/7 Availability', 'Holistic Planning'].map((d) => (
                                    <div
                                        key={d}
                                        onClick={() => toggleArrayItem('market', 'differentiation', d)}
                                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${formData.market.differentiation.includes(d) ? 'bg-[#1E8455]/20 border-[#1E8455] text-white ' : 'bg-white/5 border-white/10'}`}
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label>{t('clientsLost')}</Label>
                            <div className="flex gap-2 mt-2">
                                {['None', '1-3', '4-10', '10+'].map((o) => (
                                    <SelectChip key={o} label={o} selected={formData.market.lost_to_competitors === o} onClick={() => update('market', 'lost_to_competitors', o)} />
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 7:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">{t('techTitle')}</h2>
                        </div>
                        <div>
                            <Label>{t('toolsUsed')}</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['CRM', 'Excel', 'Digital PPT', 'WhatsApp Biz', 'Zoom/Meet', 'Fin Calculators', 'Portfolio Apps', 'Social Media'].map((t) => (
                                    <SelectChip key={t} label={t} multi selected={formData.tech.tools.includes(t)} onClick={() => toggleArrayItem('tech', 'tools', t)} />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4 pt-4">
                            <div>
                                <Label>{t('crmUpdateFreq')}</Label>
                                <div className="flex gap-1 mt-1">
                                    {['Daily', 'Weekly', 'Monthly', 'Rarely'].map((o) => (
                                        <button
                                            key={o}
                                            onClick={() => update('tech', 'crm_update', o)}
                                            className={`flex-1 py-2 text-[10px] rounded border ${formData.tech.crm_update === o ? 'bg-[#1E8455]/20 border-[#1E8455] text-white' : 'bg-white/5 border-white/10'}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>{t('digitalPresentation')}</Label>
                                <div className="flex gap-1 mt-1">
                                    {['Always', 'Sometimes', 'Rarely', 'Never'].map((o) => (
                                        <button
                                            key={o}
                                            onClick={() => update('tech', 'digital_pres', o)}
                                            className={`flex-1 py-2 text-[10px] rounded border ${formData.tech.digital_pres === o ? 'bg-[#1E8455]/20 border-[#1E8455] text-white' : 'bg-white/5 border-white/10'}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>{t('videoComfort')}</Label>
                                <div className="flex gap-1 mt-1 overflow-x-auto">
                                    {['Very Comfortable', 'Moderately', 'Learning', 'Avoid'].map((o) => (
                                        <button
                                            key={o}
                                            onClick={() => update('tech', 'video_comfort', o)}
                                            className={`px-2 py-2 text-[10px] whitespace-nowrap rounded border ${formData.tech.video_comfort === o ? 'bg-[#1E8455]/20 border-[#1E8455] text-white' : 'bg-white/5 border-white/10'}`}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label>{t('automation')}</Label>
                                <div className="flex gap-4 mt-1">
                                    <SelectChip label="Yes" selected={formData.tech.automation === 'Yes'} onClick={() => update('tech', 'automation', 'Yes')} />
                                    <SelectChip label="No" selected={formData.tech.automation === 'No'} onClick={() => update('tech', 'automation', 'No')} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 8:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-xl font-bold text-white">{t('complianceTitle')}</h2>
                            </div>
                            <p className="bg-[#1E8455]/10 border border-[#1E8455]/30 p-3 rounded-lg text-xs italic text-slate-300">{t('complianceWarning')}</p>
                        </div>
                        <div className="space-y-2">
                            <ToggleYesNo label={t('suitability')} value={formData.compliance.suitability} onChange={(v) => update('compliance', 'suitability', v)} />
                            <ToggleYesNo label={t('kyc')} value={formData.compliance.kyc} onChange={(v) => update('compliance', 'kyc', v)} />
                            <ToggleYesNo label={t('riskDisclosure')} value={formData.compliance.risk_disclosure} onChange={(v) => update('compliance', 'risk_disclosure', v)} />
                            <ToggleYesNo label={t('noMisselling')} value={formData.compliance.no_misselling} onChange={(v) => update('compliance', 'no_misselling', v)} />
                            <ToggleYesNo label={t('recordKeeping')} value={formData.compliance.record_keeping} onChange={(v) => update('compliance', 'record_keeping', v)} />
                            <ToggleYesNo label={t('regUpdates')} value={formData.compliance.reg_updates} onChange={(v) => update('compliance', 'reg_updates', v)} />
                        </div>
                        <div>
                            <Label>{t('trainingFreq')}</Label>
                            <div className="flex gap-2 mt-2">
                                {['Monthly', 'Quarterly', 'Yearly', 'Rarely'].map((o) => (
                                    <SelectChip key={o} label={o} selected={formData.compliance.training_freq === o} onClick={() => update('compliance', 'training_freq', o)} />
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 9:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {t('skillsTitle')}
                                <span className="text-lg font-medium"> ({t('skillsDesc')})</span>
                            </h2>
                        </div>
                        <div className="space-y-2">
                            <RangeSlider
                                label={t('productKnowledge')}
                                value={formData.skills.product_knowledge}
                                onChange={(v) => update('skills', 'product_knowledge', v)}
                                subLabels={[t('skillLow'), t('skillMid'), t('skillHigh')]}
                            />
                            <RangeSlider
                                label={t('financialPlanning')}
                                value={formData.skills.fin_planning}
                                onChange={(v) => update('skills', 'fin_planning', v)}
                                subLabels={[t('skillLow'), t('skillMid'), t('skillHigh')]}
                            />
                            <RangeSlider
                                label={t('comparisonAbility')}
                                value={formData.skills.comparison}
                                onChange={(v) => update('skills', 'comparison', v)}
                                subLabels={[t('skillLow'), t('skillMid'), t('skillHigh')]}
                            />
                            <RangeSlider
                                label={t('communication')}
                                value={formData.skills.communication}
                                onChange={(v) => update('skills', 'communication', v)}
                                subLabels={[t('skillLow'), t('skillMid'), t('skillHigh')]}
                            />
                            <RangeSlider
                                label={t('sellingClosing')}
                                value={formData.skills.selling}
                                onChange={(v) => update('skills', 'selling', v)}
                                subLabels={[t('skillLow'), t('skillMid'), t('skillHigh')]}
                            />
                            <RangeSlider
                                label={t('followupDiscipline')}
                                value={formData.skills.followup}
                                onChange={(v) => update('skills', 'followup', v)}
                                subLabels={[t('skillLow'), t('skillMid'), t('skillHigh')]}
                            />
                        </div>
                        <p className="text-xs text-slate-400 italic mt-2">💡 {t('skillsTip')}</p>
                    </div>
                );
            case 10:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">{t('trustTitle')}</h2>
                        </div>
                        <div className="space-y-2">
                            <ToggleYesNo label={t('clientEvents')} value={formData.trust.client_events} onChange={(v) => update('trust', 'client_events', v)} />
                            <ToggleYesNo label={t('testimonials')} value={formData.trust.testimonials} onChange={(v) => update('trust', 'testimonials', v)} />
                            <ToggleYesNo label={t('googlePresence')} value={formData.trust.google_presence} onChange={(v) => update('trust', 'google_presence', v)} />
                            <ToggleYesNo label={t('socialMedia')} value={formData.trust.social_media} onChange={(v) => update('trust', 'social_media', v)} />
                            <ToggleYesNo label={t('website')} value={formData.trust.website} onChange={(v) => update('trust', 'website', v)} />
                            <ToggleYesNo label={t('landingPage')} value={formData.trust.landing_page} onChange={(v) => update('trust', 'landing_page', v)} />
                            <ToggleYesNo label={t('useKundli')} value={formData.trust.use_kundli} onChange={(v) => update('trust', 'use_kundli', v)} />
                        </div>
                    </div>
                );
            case 11:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-bold text-white">{t('mindsetTitle')}</h2>
                        </div>
                        <div className="space-y-4">
                            <RangeSlider label={t('confidenceCalling')} value={formData.mindset.confidence} onChange={(v) => update('mindset', 'confidence', v)} />
                            <RangeSlider label={t('weeklyConsistency')} value={formData.mindset.consistency} onChange={(v) => update('mindset', 'consistency', v)} />
                            <RangeSlider label={t('investmentLearning')} value={formData.mindset.learning} onChange={(v) => update('mindset', 'learning', v)} />
                            <RangeSlider label={t('goalTracking')} value={formData.mindset.track_goals} onChange={(v) => update('mindset', 'track_goals', v)} />
                            <RangeSlider label={t('fearRejection')} value={formData.mindset.fear_rejection} onChange={(v) => update('mindset', 'fear_rejection', v)} />
                        </div>
                    </div>
                );

            // 12. LOADING / AI ANALYSIS (ENHANCED VERSION)
            case 12:
                return (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10 animate-fadeIn text-center relative overflow-hidden">
                        {/* 1. HIGH-TECH RADAR ANIMATION */}
                        <div className="relative w-64 h-64 flex items-center justify-center">
                            <div className="absolute inset-0 bg-fuchsia-500/10 rounded-full animate-ping opacity-20" />

                            {/* Rotating Radar Line */}
                            <div className="absolute inset-0 rounded-full border border-white/5">
                                <div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-cyan-400 to-transparent origin-left animate-[spin_3s_linear_infinite]" />
                            </div>

                            {/* Orbiting Particles */}
                            <div className="absolute inset-8 border border-dashed border-slate-700 rounded-full animate-[spin_20s_linear_infinite]" />
                            <div className="absolute inset-16 border border-dashed border-slate-800 rounded-full animate-[spin_15s_linear_reverse_infinite]" />

                            {/* The "Core" */}
                            <div className="relative z-10 w-24 h-24 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl">
                                <div className="flex gap-1 items-end h-8">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="w-2 bg-gradient-to-t from-fuchsia-600 to-cyan-400 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
                                            style={{ animationDelay: `${i * 0.2}s`, height: '40%' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. PATIENCE & STATUS TEXT */}
                        <div className="max-w-md space-y-4 px-6">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    AI Analysis <span className="text-[#1E8455]">in Progress</span>
                                </h2>
                                <p className="text-xs text-slate-500 uppercase tracking-[0.3em] font-semibold">Deep Diagnostic Engine Active</p>
                            </div>

                            {/* Dynamic Message Ticker */}
                            <div className="h-12 flex items-center justify-center">
                                <p className="text-indigo-200/80 text-sm italic animate-pulse">"{analysisSteps[tipIndex]}"</p>
                            </div>

                            {/* 3. TIME DISCLAIMER BOX */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md shadow-inner">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                        <svg className="w-5 h-5 text-amber-400 animate-[spin_8s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                            <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-bold">Comprehensive calculation takes 1-2 minutes.</p>
                                        <p className="text-slate-400 text-[11px]">Please do not refresh or close this window while we build your Business Kundli.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. INFINITE PROGRESS BAR (Visual Only) */}
                        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-24 animate-[scan_2s_linear_infinite]" />
                        </div>

                        <style jsx>{`
                            @keyframes loading {
                                0%,
                                100% {
                                    height: 30%;
                                }
                                50% {
                                    height: 100%;
                                }
                            }
                            @keyframes scan {
                                0% {
                                    transform: translateX(-100%);
                                }
                                100% {
                                    transform: translateX(200%);
                                }
                            }
                        `}</style>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`min-h-screen ${language === 'Hindi' ? 'font-hindi' : ''} relative overflow-hidden bg-gradient-to-br from-[#000d1a] via-[#162D5C] to-[#001a33] text-slate-50 pb-28 lg:pb-12`}>
            <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,#1E8455,transparent_30%),radial-gradient(circle_at_80%_0%,#162D5C,transparent_20%)]"></div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8">
                <div className="bg-black/30 border border-white/10 rounded-xl  px-4 py-3 sticky top-4 z-20 flex items-center justify-between gap-3 backdrop-blur-2xl shadow-lg">
                    {step > 1 && step < 12 ? (
                        <button onClick={() => setStep((s) => s - 1)} className="p-2 text-slate-300 hover:bg-white/5 rounded-full transitio">
                            <IconChevronLeft />
                        </button>
                    ) : (
                        <div className="w-10" />
                    )}

                    <div className="flex flex-col items-center ">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E8455] mb-1">{step < 12 ? `Step ${step} / ${totalSteps}` : 'Processing'}</span>
                        <div className="h-1.5 w-28 bg-white/10  rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#1E8455] to-[#162D5C] transition-all duration-700" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <LangToggle value={language} onChange={setLanguage} />
                    </div>
                </div>

                <div className="mt-8 mb-24">
                    <div className="bg-[#162D5C]/30 border border-white/5 rounded-xl p-6 backdrop-blur-xl shadow-2xl min-h-[480px]">{renderScreen()}</div>
                </div>

                {step < 12 && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 border-t border-white/10 backdrop-blur-xl z-30 lg:static lg:bg-transparent lg:border-none lg:p-0 lg:mt-6">
                        <div className="max-w-6xl mx-auto">
                            <button
                                onClick={() => (step < totalSteps ? handleNext() : handleSubmit())}
                                disabled={loading}
                                className="w-full bg-[#1E8455] hover:bg-[#1E8455]/90 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                {step === totalSteps ? `${t('generate')}` : `${t('next')}`}
                                <IconArrowRight />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
