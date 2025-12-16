'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AddIncomeModal from '@/components/admin/AddIncomeModal';
import { useParams } from 'next/navigation';

export default function AgentDetails() {
    const { id } = useParams();
    console.log("Agent ID:", id);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('Overview'); // Default Tab
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

    // 1. Fetch Agent Data
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

    // 2. Handle Add Income Save
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

    if (!data) return <div className="p-10 text-gray-500">Loading Agent Profile...</div>;
    const { agent, income, activity } = data;

    // --- DATA PREPARATION ---

    // Chart Data
    const chartData =
        income?.length > 0
            ? [...income].reverse().map((i) => ({
                  name: new Date(i.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                  income: Number(i.income),
              }))
            : [];

    // Income Stats
    const avgIncome = income?.length ? Math.round(income.reduce((a, b) => a + Number(b.income), 0) / income.length) : 0;
    const maxIncome = income?.length ? Math.max(...income.map((i) => Number(i.income))) : 0;

    // Days Inactive Calculation
    const daysInactive = agent.last_active_date ? Math.floor((new Date() - new Date(agent.last_active_date)) / (1000 * 60 * 60 * 24)) : 0;

    // Badge Color Helper
    const getBadgeColor = (status) => {
        if (status === 'Red') return 'bg-red-100 text-red-700';
        if (status === 'Amber') return 'bg-yellow-100 text-yellow-800'; // Match screenshot "Amber"
        return 'bg-green-100 text-green-700';
    };

    return (
        <div className="p-8 bg-white min-h-screen font-sans text-gray-800">
            {/* --- HEADER --- */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">{agent.username}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getBadgeColor(agent.rag_status)}`}>{agent.rag_status || 'Green'}</span>
                    </div>
                    <p className="text-gray-500 mt-1">{agent.phone || 'No ID'}</p>
                </div>

                <div className="flex gap-2">
                    {/* <ActionButton icon={<EditIcon />} /> */}
                    <ActionButton icon={<PhoneIcon />} />
                    <ActionButton icon={<MessageIcon />} />
                    <ActionButton icon={<DeleteIcon />} isDelete />
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="flex border-b border-gray-200 mb-8 bg-gray-50 rounded-t-lg">
                <TabButton label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
                <TabButton label="Plan" active={activeTab === 'Plan'} onClick={() => setActiveTab('Plan')} />
                <TabButton label="Activity Log" active={activeTab === 'Activity Log'} onClick={() => setActiveTab('Activity Log')} />
            </div>

            {/* ======================= TAB 1: OVERVIEW ======================= */}
            {activeTab === 'Overview' && (
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 mb-6">Quick Stats</h3>
                        <div className="grid grid-cols-4 gap-8">
                            <StatItem label="Last Activity" value={daysInactive} sub="days ago" />
                            <StatItem label="Meetings (30d)" value={agent.total_meetings || 0} />
                            <StatItem label="Leads (30d)" value={agent.total_leads || 0} />
                            <StatItem label="Sales (90d)" value={agent.total_sales || 0} />
                        </div>
                    </div>

                    {/* Agent Details */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">Agent Details</h3>
                        <div className="grid grid-cols-1 gap-y-3 text-sm">
                            <DetailRow label="Employment Type" value={agent.employment_type || 'Full-time'} />
                            <DetailRow label="Date Joined" value={new Date(agent.created_at).toLocaleDateString('en-GB')} />
                            <DetailRow label="Date of Birth" value={agent.date_of_birth ? new Date(agent.date_of_birth).toLocaleDateString('en-GB') : 'N/A'} />
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">RAG Status</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getBadgeColor(agent.rag_status)}`}>{agent.rag_status || 'Green'}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {/* <div className="flex gap-4 mt-6">
                            <button className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex justify-center items-center gap-2">
                                + Log Activity
                            </button>
                            <button className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Quick Nudge</button>
                        </div> */}
                    </div>

                    {/* Income Graph */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Income History</h3>
                                <p className="text-sm text-gray-500">Monthly income progression over time</p>
                            </div>
                            <button onClick={() => setIsIncomeModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                                + Add Income Record
                            </button>
                        </div>

                        <div className="flex gap-12 mb-6">
                            <div>
                                <div className="text-xs text-gray-500 font-medium">Average</div>
                                <div className="text-2xl font-bold mt-1 text-gray-900">₹{avgIncome.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-medium">Highest</div>
                                <div className="text-2xl font-bold mt-1 text-gray-900">₹{maxIncome.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-medium">Trend</div>
                                <div className="text-2xl font-bold mt-1 text-red-500 flex items-center gap-2">
                                    -87%{' '}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                                        <polyline points="17 18 23 18 23 12"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}K`} />
                                    <Tooltip formatter={(value) => [`₹${value}`, 'Income']} />
                                    <Area type="monotone" dataKey="income" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================= TAB 2: PLAN ======================= */}
            {activeTab === 'Plan' && (
                <div className="space-y-6">
                    {/* Plan Summary Card */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-xl text-gray-900 mb-4">Plan Summary</h3>
                        <p className="text-gray-600">Lost rhythm for 60+ days; restart with H2H, micro-plan, and two joint fields.</p>
                    </div>

                    {/* 30-Day Goals Card */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative pb-16">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-bold text-xl text-gray-900">30-Day Goals</h3>
                            {/* <button className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-100">
                 Regenerate Plan
               </button> */}
                        </div>

                        <ul className="space-y-3 text-gray-700">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-black rounded-full"></span> Complete heart-to-heart meeting within 24 hours
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-black rounded-full"></span> Set 30-day micro-plan with achievable targets
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-black rounded-full"></span> Conduct 2 joint field visits
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-black rounded-full"></span> Generate 5 new leads per week
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-black rounded-full"></span> Complete skill refresher training
                            </li>
                        </ul>

                        {/* Floating Add Task Button */}
                    </div>

                    <button className="px-6 py-2.5 bg-blue-600 text-white right-4 bottom-4 text-sm font-medium rounded-lg shadow-md hover:bg-blue-700 transition flex items-center gap-2">
                        <span>+</span> Add Task
                    </button>
                </div>
            )}

            {/* ======================= TAB 3: ACTIVITY LOG ======================= */}
            {activeTab === 'Activity Log' && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="font-bold text-xl text-gray-900">Activity History</h3>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2">
                            <span>+</span> Add Activity
                        </button>
                    </div>

                    {/* Empty State / List */}
                    {!activity || activity.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center mt-20">
                            <div className="text-gray-400 font-medium text-lg mb-1">No activity logged yet</div>
                            <div className="text-gray-500 text-sm">Start by logging today's outreach</div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {activity.map((act, index) => (
                                <div key={index} className="flex gap-4 border-l-2 border-gray-200 pl-4 relative">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white"></div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">{new Date(act.activity_date).toLocaleDateString()}</p>
                                        <p className="text-gray-800">
                                            Updated stats:{' '}
                                            <span className="font-medium">
                                                {act.meetings} Meetings, {act.leads} Leads, {act.sales} Sales
                                            </span>
                                        </p>
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
    );
}

// --- SUB COMPONENTS FOR STYLING ---

function ActionButton({ icon, isDelete }) {
    return (
        <button
            className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 transition ${isDelete ? 'text-red-500 hover:bg-red-50 hover:border-red-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
        >
            {icon}
        </button>
    );
}

function TabButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-4 text-sm font-medium text-center transition-all ${
                active ? 'bg-white border-x border-t border-gray-200 rounded-t-lg text-blue-600 shadow-[0_-2px_5px_rgba(0,0,0,0.02)]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
        >
            {label}
        </button>
    );
}

function StatItem({ label, value, sub }) {
    return (
        <div>
            <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
            <div className="text-3xl font-bold text-gray-900">
                {value} <span className="text-sm font-normal text-gray-400">{sub}</span>
            </div>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex justify-between border-b border-gray-100 py-2">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-900">{value}</span>
        </div>
    );
}

// --- ICONS (SVG) ---
const EditIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);
const PhoneIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);
const MessageIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
);
const DeleteIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);
