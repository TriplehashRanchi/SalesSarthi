'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AddIncomeModal from '@/components/admin/AddIncomeModal';
import { useParams, useRouter } from 'next/navigation';

export default function AgentDetails() {
    const { id } = useParams();
    const router = useRouter(); // Added for back button logic (optional)
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('Overview');
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

    // 1. Fetch Agent Data (Logic Unchanged)
    const fetchAgentData = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchAgentData, 500);
        return () => clearTimeout(timer);
    }, [id]);

    // 2. Handle Add Income Save (Logic Unchanged)
    const handleAddIncome = async (formData) => {
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/income`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ agent_id: id, month: formData.month, income: formData.income }),
            });
            setIsIncomeModalOpen(false);
            fetchAgentData();
        } catch (error) {
            console.error(error);
        }
    };

    if (!data) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Loading Profile...</p>
            </div>
        </div>
    );

    const { agent, income, activity } = data;

    // --- DATA PREPARATION ---
    const chartData = income?.length > 0
            ? [...income].reverse().map((i) => ({
                  name: new Date(i.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                  income: Number(i.income),
                  fullDate: i.month
              }))
            : [];

    const avgIncome = income?.length ? Math.round(income.reduce((a, b) => a + Number(b.income), 0) / income.length) : 0;
    const maxIncome = income?.length ? Math.max(...income.map((i) => Number(i.income))) : 0;
    const daysInactive = agent.last_active_date ? Math.floor((new Date() - new Date(agent.last_active_date)) / (1000 * 60 * 60 * 24)) : 0;

    const getBadgeColor = (status) => {
        if (status === 'Red') return 'bg-red-50 text-red-700 border-red-200';
        if (status === 'Amber') return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200">
                            {agent.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{agent.username}</h1>
                                <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase border ${getBadgeColor(agent.rag_status)}`}>
                                    {agent.rag_status || 'Green'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-slate-500 text-sm">
                                <span className="flex items-center gap-1">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    {agent.phone || 'No Phone'}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span>ID: #{id.slice(0,6)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <ActionButton icon={<PhoneIcon />} label="Call" />
                        <ActionButton icon={<MessageIcon />} label="Message" />
                        <div className="w-px h-10 bg-slate-200 mx-1"></div>
                        <ActionButton icon={<DeleteIcon />} isDelete label="Remove" />
                    </div>
                </div>

                {/* --- TABS --- */}
                <div>
                    <div className="flex border-b border-slate-200 gap-8">
                        <TabButton label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
                        <TabButton label="Plan" active={activeTab === 'Plan'} onClick={() => setActiveTab('Plan')} />
                        <TabButton label="Activity Log" active={activeTab === 'Activity Log'} onClick={() => setActiveTab('Activity Log')} />
                    </div>
                </div>

                {/* ======================= TAB 1: OVERVIEW ======================= */}
                {activeTab === 'Overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        
                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard 
                                label="Inactive" 
                                value={daysInactive} 
                                sub="days" 
                                icon={<svg width="20" height="20" className="text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                            />
                            <StatCard 
                                label="Meetings (30d)" 
                                value={agent.total_meetings || 0} 
                                icon={<svg width="20" height="20" className="text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                            />
                            <StatCard 
                                label="Leads (30d)" 
                                value={agent.total_leads || 0} 
                                icon={<svg width="20" height="20" className="text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
                            />
                            <StatCard 
                                label="Sales (90d)" 
                                value={agent.total_sales || 0} 
                                icon={<svg width="20" height="20" className="text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Profile Card */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
                                <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-600 p-1 rounded">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    </span>
                                    Details
                                </h3>
                                <div className="space-y-4">
                                    <DetailRow label="Employment" value={agent.employment_type || 'Full-time'} />
                                    <DetailRow label="Joined On" value={new Date(agent.created_at).toLocaleDateString('en-GB')} />
                                    <DetailRow label="Birthday" value={agent.date_of_birth ? new Date(agent.date_of_birth).toLocaleDateString('en-GB') : 'N/A'} />
                                    {/* <DetailRow label="Location" value={agent.city || 'Not set'} /> */}
                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Performance Tags</div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">Consistency</span>
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">High Potential</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Income Graph (Takes 2 Cols) */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">Income Progression</h3>
                                        <p className="text-sm text-slate-500">Monthly earnings overview</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsIncomeModalOpen(true)} 
                                        className="bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-2"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        Add Record
                                    </button>
                                </div>

                                <div className="flex gap-8 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100/50">
                                    <div>
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Average</div>
                                        <div className="text-2xl font-bold mt-1 text-slate-900">₹{avgIncome.toLocaleString()}</div>
                                    </div>
                                    <div className="w-px h-10 bg-slate-200"></div>
                                    <div>
                                        <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Peak Month</div>
                                        <div className="text-2xl font-bold mt-1 text-slate-900">₹{maxIncome.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Income']}
                                                cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="income" 
                                                stroke="#2563EB" 
                                                strokeWidth={3} 
                                                fillOpacity={1} 
                                                fill="url(#colorIncome)" 
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#2563EB' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================= TAB 2: PLAN ======================= */}
                {activeTab === 'Plan' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl mx-auto space-y-6">
                        {/* Plan Summary Banner */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl flex gap-4 items-start">
                             <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                             </div>
                             <div>
                                <h3 className="font-bold text-lg text-blue-900">Recommended Strategy</h3>
                                <p className="text-blue-800/80 mt-1 leading-relaxed">Lost rhythm for 60+ days. The immediate focus should be restarting with a H2H meeting, establishing a micro-plan, and conducting two joint field visits to rebuild momentum.</p>
                             </div>
                        </div>

                        {/* 30-Day Goals Card */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900">30-Day Recovery Plan</h3>
                                    <p className="text-slate-500 text-sm">Actionable steps to return to Green status</p>
                                </div>
                                {/* <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-slate-200 flex items-center gap-2">
                                    <span>+</span> Add Task
                                </button> */}
                            </div>

                            <div className="space-y-4">
                                <CheckItem text="Complete heart-to-heart meeting within 24 hours" />
                                <CheckItem text="Set 30-day micro-plan with achievable targets" />
                                <CheckItem text="Conduct 2 joint field visits" />
                                <CheckItem text="Generate 5 new leads per week" />
                                <CheckItem text="Complete skill refresher training" isLast />
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================= TAB 3: ACTIVITY LOG ======================= */}
                {activeTab === 'Activity Log' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[500px]">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="font-bold text-xl text-slate-900">Activity Timeline</h3>
                                <p className="text-slate-500 text-sm">Chronological history of interactions and stats</p>
                            </div>
                            <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2">
                                {/* <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> */}
                                Log Activity
                            </button>
                        </div>

                        {!activity || activity.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                    <svg width="20" height="20" className="text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </div>
                                <div className="text-slate-900 font-medium">No activity logged yet</div>
                                <div className="text-slate-500 text-sm">Start by logging today's outreach</div>
                            </div>
                        ) : (
                            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                {activity.map((act, index) => (
                                    <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-8 last:pb-0">
                                        
                                        {/* Icon/Dot */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 group-[.is-active]:bg-blue-600 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="12" height="10">
                                                <path fillRule="nonzero" d="M10.422 1.257 4.655 7.025 2.553 4.923A.916.916 0 0 0 1.257 6.22l2.75 2.75a.916.916 0 0 0 1.296 0l6.415-6.416a.916.916 0 0 0-1.296-1.296Z" />
                                            </svg>
                                        </div>
                                        
                                        {/* Content Card */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between space-x-2 mb-2">
                                                <div className="font-bold text-slate-900">Metrics Update</div>
                                                <time className="font-mono text-xs text-slate-500">{new Date(act.activity_date).toLocaleDateString()}</time>
                                            </div>
                                            <div className="text-slate-600 text-sm">
                                                Logged stats: <span className="font-semibold text-slate-800">{act.meetings} Meetings</span>, <span className="font-semibold text-slate-800">{act.leads} Leads</span>, <span className="font-semibold text-slate-800">{act.sales} Sales</span>.
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- MODAL --- */}
                <AddIncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} onSave={handleAddIncome} />
            </div>
        </div>
    );
}

// --- SUB COMPONENTS FOR PREMIUM STYLING ---

function ActionButton({ icon, isDelete, label }) {
    return (
        <button
            title={label}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-200 shadow-sm
            ${isDelete 
                ? 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200'}`}
        >
            {icon}
        </button>
    );
}

function TabButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`pb-4 text-sm font-medium transition-all relative ${
                active 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
        >
            {label}
            {active && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full shadow-[0_-2px_6px_rgba(37,99,235,0.3)]"></span>
            )}
        </button>
    );
}

function StatCard({ label, value, sub, icon }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">{icon}</div>
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {value} <span className="text-sm font-normal text-slate-400">{sub}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">{label}</div>
            </div>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-semibold text-slate-900">{value}</span>
        </div>
    );
}

function CheckItem({ text, isLast }) {
    return (
        <div className={`flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-dashed border-slate-100' : ''}`}>
            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-500">
                <div className="w-2.5 h-2.5 rounded-full bg-transparent hover:bg-blue-500 transition-colors"></div>
            </div>
            <span className="text-slate-700 text-sm font-medium leading-relaxed">{text}</span>
        </div>
    );
}

// --- ICONS (SVG) ---
const PhoneIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
);
const MessageIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
);
const DeleteIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);