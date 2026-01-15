'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { showNotification } from '@mantine/notifications';
import { getAuth } from 'firebase/auth';

// --- CUSTOM VINTAGE COMPONENTS ---

const Label = ({ children, required }) => (
    <label className="block text-[12px] font-bold uppercase tracking-widest text-[#4a3728] mb-1 font-serif">
        {children} {required && <span className="text-red-700">*</span>}
    </label>
);

const InputText = ({ value, onChange, type = 'text', placeholder = '' }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent border-b-2 border-[#4a3728]/30 px-2 py-2 text-[#2c1810] placeholder:text-[#4a3728]/40 focus:border-[#4a3728] outline-none transition-all font-serif italic"
    />
);

const SelectChip = ({ label, selected, onClick, multi = false }) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 rounded-sm text-xs font-bold border transition-all font-serif ${
            selected
                ? 'bg-[#4a3728] border-[#4a3728] text-[#f4e4bc] shadow-sm'
                : 'bg-transparent border-[#4a3728]/40 text-[#4a3728] hover:bg-[#4a3728]/10'
        }`}
    >
        {label}
    </button>
);

const RangeSlider = ({ label, value, onChange, min = 1, max = 10, subLabels }) => (
    <div className="mb-4 relative z-10">
        <div className="flex justify-between mb-1">
            <span className="text-xs font-bold text-[#4a3728] font-serif">{label}</span>
            <span className="text-xs font-black text-[#2c1810]">{value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={Number(value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-1.5 bg-[#4a3728]/20 rounded-lg appearance-none cursor-pointer accent-[#4a3728]"
        />
        {subLabels && (
            <div className="flex justify-between mt-1 text-[9px] text-[#4a3728]/70 font-bold uppercase font-serif">
                <span>{subLabels[0]}</span>
                <span>{subLabels[1]}</span>
                <span>{subLabels[2]}</span>
            </div>
        )}
    </div>
);

const ToggleYesNo = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between py-2 border-b border-[#4a3728]/10 mb-2">
        <span className="text-xs font-bold text-[#4a3728] font-serif pr-4">{label}</span>
        <div className="flex gap-2">
            <button
                onClick={() => onChange(true)}
                className={`px-3 py-1 text-[10px] font-black border ${value === true ? 'bg-green-800 text-white' : 'text-[#4a3728] border-[#4a3728]/30'}`}
            >
                YES
            </button>
            <button
                onClick={() => onChange(false)}
                className={`px-3 py-1 text-[10px] font-black border ${value === false ? 'bg-red-800 text-white' : 'text-[#4a3728] border-[#4a3728]/30'}`}
            >
                NO
            </button>
        </div>
    </div>
);

export default function BusinessKundliWizard() {
    const router = useRouter();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const totalSteps = 11;
    const progress = step >= 12 ? 100 : ((step - 1) / totalSteps) * 100;

    const [tipIndex, setTipIndex] = useState(0);

    useEffect(() => {
        if (step === 12) {
            const interval = setInterval(() => {
                setTipIndex((prev) => (prev + 1) % 5);
            }, 8000);
            return () => clearInterval(interval);
        }
    }, [step]);

    const analysisSteps = [
        "Consulting the Business Horoscope...",
        "Aligning the 12 Financial Houses...",
        "Inking the Vastu of Productivity...",
        "Calculating the Wealth Grahas...",
        "Finalizing the Financial Kundli..."
    ];

    // --- LOGIC (KEEPING ALL YOUR ORIGINAL STATE & FUNCTIONS) ---
    const [formData, setFormData] = useState({
        identity: { name: user?.name || '', age: '', city: '', experience_years: '', work_type: 'Full Time', primary_product: [] },
        birthday: { dob: '', tob: '', pob: '', accuracy: 'Exact' },
        numbers: { commission_90: '', sales_count_90: '', avg_ticket_90: '', leads_90: '', meetings_90: '', sales_closed_90: '', total_income_12m: '', best_month_income: '', worst_month_income: '', active_clients: '' },
        client: { needs_analysis: 'Sometimes', portfolio_checkup: 'Sometimes', reviews_per_month: '', avg_client_age: '', referral_percent: '', comm_frequency: 'Quarterly' },
        operation: { hours_per_week: '', calls_per_day: '', meetings_per_week: '', prospecting_sources: [] },
        market: { competitor_aware: 5, value_prop_clarity: 5, differentiation: [], lost_to_competitors: '1-3', objection_confidence: 5 },
        tech: { tools: [], crm_update: 'Weekly', digital_pres: 'Sometimes', video_comfort: 'Moderately', automation: 'No' },
        compliance: { suitability: false, kyc: false, risk_disclosure: false, no_misselling: false, record_keeping: false, reg_updates: false, training_freq: 'Yearly' },
        skills: { product_knowledge: 5, fin_planning: 5, communication: 5, selling: 5, followup: 5, comparison: 5 },
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
        if (s === 1 && (!formData.identity.name || !formData.identity.age || !formData.identity.city)) return false;
        if (s === 2 && (!formData.birthday.dob || !formData.birthday.tob || !formData.birthday.pob)) return false;
        return true;
    };

    const handleNext = () => { if (validateStep()) setStep(s => s + 1); else showNotification({ message: 'Fill required fields', color: 'red' }); };

    const handleSubmit = async () => {
        setStep(12); setLoading(true);
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kundli/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData),
            });
            const result = await res.json();
            if (result.success) setTimeout(() => router.push(`/business-kundli/report?id=${result.reportId}`), 2000);
        } catch (e) { setStep(11); setLoading(false); }
    };

    const renderScreen = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-5 animate-fadeIn relative z-10">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black text-[#3e2723] font-serif uppercase tracking-tighter">I. Identity</h2>
                            <div className="w-24 h-0.5 bg-[#4a3728] mx-auto mt-1 opacity-30"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <div className="col-span-2"><Label required>Full Name</Label><InputText value={formData.identity.name} onChange={(e) => update('identity', 'name', e.target.value)} /></div>
                            <div><Label required>Age</Label><InputText type="number" value={formData.identity.age} onChange={(e) => update('identity', 'age', e.target.value)} /></div>
                            <div><Label required>City</Label><InputText value={formData.identity.city} onChange={(e) => update('identity', 'city', e.target.value)} /></div>
                            <div className="col-span-2">
                                <Label>Work Type</Label>
                                <div className="flex gap-4 mt-1">
                                    {['Full Time', 'Part Time'].map(t => (
                                        <button key={t} onClick={() => update('identity', 'work_type', t)} className={`flex-1 py-2 border ${formData.identity.work_type === t ? 'bg-[#4a3728] text-white' : 'border-[#4a3728]/30 text-[#4a3728]'} text-xs font-bold`}>{t}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 12:
                return (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
                        <div className="w-24 h-24 border-4 border-[#4a3728]/20 border-t-[#4a3728] rounded-full animate-spin mb-6"></div>
                        <h2 className="text-xl font-black text-[#3e2723] font-serif uppercase mb-2">Consulting the Scribes</h2>
                        <p className="text-sm font-serif italic text-[#4a3728]">"{analysisSteps[tipIndex]}"</p>
                    </div>
                );
            default:
                return (
                    <div className="py-10 text-center relative z-10">
                        <h2 className="text-xl font-serif font-black text-[#4a3728]">HOUSE {step}</h2>
                        <p className="text-xs italic text-[#4a3728]/60 mt-2">Section loading... Proceed to align the stars.</p>
                        <div className="mt-4 opacity-20 text-4xl">🕉️</div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#ede0c8] text-[#2c1810] relative flex items-center justify-center p-4 font-serif">
            {/* Background Image Texture (Parchment look) */}
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/old-map.png')]"></div>

            <div className="max-w-3xl w-full relative">
                
                {/* THE KUNDLI CHART BOX (Exactly like the image) */}
                <div className="relative bg-[#fdf5e6] border-2 border-[#4a3728] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-1 md:p-2">
                    
                    {/* Inner Decorative Lines (The Diamond Shape) */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* Horizontal Cross */}
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#4a3728] opacity-20"></div>
                        <div className="absolute left-1/2 top-0 w-[1px] h-full bg-[#4a3728] opacity-20"></div>
                        {/* The Large Diamond */}
                        <div className="absolute top-1/2 left-1/2 w-[141%] h-[141%] border border-[#4a3728] opacity-20 -translate-x-1/2 -translate-y-1/2 rotate-45"></div>
                    </div>

                    {/* Content Area */}
                    <div className="relative bg-[#fdf5e6] border border-[#4a3728]/40 p-6 md:p-12 min-h-[500px] flex flex-col">
                        
                        {/* Header Branding */}
                        <div className="text-center mb-8 relative z-10">
                            <span className="text-[10px] tracking-[0.4em] font-black text-[#4a3728]/50 uppercase">The Official</span>
                            <h1 className="text-3xl md:text-5xl font-black text-[#3e2723] leading-none my-1 tracking-tighter">
                                FINANCIAL KUNDLI
                            </h1>
                            <div className="flex items-center justify-center gap-2 text-[#4a3728]/40">
                                <div className="h-[1px] w-12 bg-current"></div>
                                <span className="text-[10px] font-bold">HOUSE OF GROWTH</span>
                                <div className="h-[1px] w-12 bg-current"></div>
                            </div>
                        </div>

                        <div className="flex-1">
                            {renderScreen()}
                        </div>

                        {/* Navigation */}
                        {step < 12 && (
                            <div className="mt-10 relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-[10px] font-bold text-[#4a3728]/60 uppercase tracking-widest">
                                        House {step} of 11
                                    </div>
                                    <div className="w-32 h-1 bg-[#4a3728]/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#4a3728] transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    {step > 1 && (
                                        <button onClick={() => setStep(s => s - 1)} className="px-6 py-4 border border-[#4a3728] text-[#4a3728] font-bold text-xs uppercase hover:bg-[#4a3728] hover:text-[#fdf5e6] transition-all">
                                            Back
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => (step < totalSteps ? handleNext() : handleSubmit())}
                                        className="flex-1 bg-[#3e2723] text-[#f4e4bc] py-4 px-6 text-sm font-black uppercase tracking-widest hover:bg-[#2c1810] shadow-lg transition-all active:scale-[0.98]"
                                    >
                                        {step === totalSteps ? 'Seal the Kundli' : 'Next House'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Decorative Elements Around the Chart (Visual Props) */}
                <div className="hidden lg:block absolute -left-20 top-1/2 -translate-y-1/2 opacity-20 text-6xl">🧭</div>
                <div className="hidden lg:block absolute -right-20 top-20 opacity-20 text-6xl rotate-12">🖋️</div>
                <div className="hidden lg:block absolute -right-20 bottom-10 opacity-20 text-6xl -rotate-12">🪙</div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,900;1,400&display=swap');
                
                .font-serif {
                    font-family: 'Playfair Display', serif;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.6s ease-out forwards;
                }

                /* Custom scrollbar for vintage feel */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #ede0c8; }
                ::-webkit-scrollbar-thumb { background: #4a3728; }
            `}</style>
        </div>
    );
}