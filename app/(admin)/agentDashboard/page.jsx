'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import PremiumGate from '@/components/premium/PremiumGate';
import Link from 'next/link';
import AddAgentModal from '@/components/admin/AddAgentModal';
import CelebrationPopup from '@/components/ui/CelebrationPopup';

import { BrainCog } from 'lucide-react';

export default function AgentDashboard() {
    const { profile, loading: authLoading } = useAuth();
    const hasAccess = profile?.add_ons?.includes('RAG_DASHBOARD');

    if (authLoading) {
        return <div className="p-6 text-sm text-slate-500">Loading...</div>;
    }

    if (!hasAccess) {
        return (
            <PremiumGate
                title="RAG Agent Dashboard is a Premium Add-on"
                subtitle="Monitor agent activity, risk tiers, and revival tasks in one executive view."
                features={[
                    'Live RAG status monitoring',
                    'Priority agent interventions',
                    'Agent performance insights',
                ]}
                ctaLabel="Request RAG Dashboard Access"
            />
        );
    }
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [celebrations, setCelebrations] = useState([]);


    // State for Milestone Categories (Updated for 5 Tiers)
    const [milestoneTab, setMilestoneTab] = useState('tier1');
    const [view, setView] = useState('dashboard');

    const fetchData = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/dashboard-stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (err) {
            console.error('Error fetching dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'dashboard') {
            const timer = setTimeout(fetchData, 800);
            return () => clearTimeout(timer);
        }
    }, [view]);

    useEffect(() => {
        if (!data) return;

        const today = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
        });

        const sessionKey = 'celebrations-seen';
        const seen = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');

        const list = [];

        // 🎂 Birthdays
        data.birthdays?.forEach((b) => {
            if (b.bday_fmt === today && !seen.includes(`b-${b.username}`)) {
                list.push({
                    type: 'birthday',
                    username: b.username,
                    key: `b-${b.username}`,
                });
            }
        });

        // 🎉 Anniversaries
        data.anniversaries?.forEach((a) => {
            if (a.anniversary_fmt === today && !seen.includes(`a-${a.username}`)) {
                list.push({
                    type: 'anniversary',
                    username: a.username,
                    years_completed: a.years_completed,
                    key: `a-${a.username}`,
                });
            }
        });

        setCelebrations(list);
    }, [data]);


    const handleAgentCreated = async (formData) => {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(formData),
        });

        setIsModalOpen(false);
        fetchData();
    };

    // --- HELPER: FILTER AGENTS BY INCOME CATEGORY (5 TIERS) ---
    const getFilteredAgents = () => {
        if (!data?.topAgent) return [];

        const income = (agent) => Number(agent.current_income || 0);

        // Tier 1: 0 - 25,000
        const tier1 = data.topAgent.filter(a => income(a) < 25000);
        // Tier 2: 25,000 - 50,000
        const tier2 = data.topAgent.filter(a => income(a) >= 25000 && income(a) < 50000);
        // Tier 3: 50,000 - 1,00,000
        const tier3 = data.topAgent.filter(a => income(a) >= 50000 && income(a) < 100000);
        // Tier 4: 1,00,000 - 2,00,000
        const tier4 = data.topAgent.filter(a => income(a) >= 100000 && income(a) < 200000);
        // Tier 5: 2,00,000+
        const tier5 = data.topAgent.filter(a => income(a) >= 200000);

        switch (milestoneTab) {
            case 'tier5': return tier5;
            case 'tier4': return tier4;
            case 'tier3': return tier3;
            case 'tier2': return tier2;
            default: return tier1;
        }
    };

    const activeAgentsList = getFilteredAgents();

    // --- CONDITIONAL RENDER: ALL AGENTS VIEW ---
    if (view === 'allAgents') {
        return (
            <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    <AllAgentsView onBack={() => setView('dashboard')} />
                </div>
            </div>
        );
    }

    // --- LOADING STATE ---
    if (loading && !data)
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Loading Dashboard...</p>
                </div>
            </div>
        );

    if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">No data available.</div>;

    // --- MAIN DASHBOARD RENDER ---
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Manager Dashboard</h1>
                        <p className="text-slate-500 mt-1">Overview of your team's performance and immediate tasks.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Agent
                        </button>

                        <button
                            onClick={() => setView('allAgents')}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-semibold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Total Agents
                        </button>
                    </div>
                </div>

                {/* --- ROW 1: RAG STATUS CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Link href="/agents" className="block h-full">
                        <RagCard label="Red Agents" count={data?.rag?.red || 0} type="red" sub="Inactive > 60 days" />
                    </Link>
                    <Link href="/agents" className="block h-full">
                        <RagCard label="Amber Agents" count={data?.rag?.amber || 0} type="amber" sub="Inactive 30-60 days" />
                    </Link>
                    <Link href="/agents" className="block h-full">
                        <RagCard label="Green Agents" count={data?.rag?.green || 0} type="green" sub="Active within 30 days" />
                    </Link>
                </div>

                {/* --- ROW 2: MILESTONES & BIRTHDAYS --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                    {/* --- CATEGORIZED MILESTONE TRACKER (5 TIERS) --- */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">🏆 Milestone Tracker</h3>
                                    <p className="text-sm text-slate-500 mt-1">Income progress by category.</p>
                                </div>
                            </div>

                            {/* CATEGORY TABS - SCROLLABLE ON MOBILE */}
                            <div className="flex overflow-x-auto pb-2 -mx-2 px-2 md:pb-0 md:mx-0 md:px-0 custom-scrollbar">
                                <div className="flex p-1 bg-slate-100 rounded-lg whitespace-nowrap">
                                    <button
                                        onClick={() => setMilestoneTab('tier1')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${milestoneTab === 'tier1' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        0 - 25k
                                    </button>
                                    <button
                                        onClick={() => setMilestoneTab('tier2')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${milestoneTab === 'tier2' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        25k - 50k
                                    </button>
                                    <button
                                        onClick={() => setMilestoneTab('tier3')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${milestoneTab === 'tier3' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        50k - 1L
                                    </button>
                                    <button
                                        onClick={() => setMilestoneTab('tier4')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${milestoneTab === 'tier4' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        1L - 2L
                                    </button>
                                    <button
                                        onClick={() => setMilestoneTab('tier5')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${milestoneTab === 'tier5' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        2L+
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {activeAgentsList.slice(0, 5).map((agent, index) => {
                                const income = Number(agent.current_income || 0);
                                const milestone = agent.milestone;
                                if (!milestone) return null;

                                const target = milestone.completed ? milestone.nextTarget : milestone.target;
                                const progress = milestone.progress;
                                const remaining = milestone.remaining;

                                // Dynamic bar color based on category
                                let barColor = 'bg-slate-400';
                                if (milestoneTab === 'tier5') barColor = 'bg-gradient-to-r from-pink-500 to-rose-600';
                                else if (milestoneTab === 'tier4') barColor = 'bg-gradient-to-r from-purple-500 to-fuchsia-600';
                                else if (milestoneTab === 'tier3') barColor = 'bg-gradient-to-r from-indigo-500 to-violet-600';
                                else if (milestoneTab === 'tier2') barColor = 'bg-gradient-to-r from-blue-500 to-cyan-600';
                                else barColor = 'bg-gradient-to-r from-slate-400 to-slate-500';

                                return (
                                    <div key={index} className="group animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{agent.username}</span>
                                                <span className="text-xs text-slate-400">Current Income: ₹{income.toLocaleString()}</span>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{progress}%</span>

                                                {milestone.completed ? (
                                                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">🎉 Achieved</div>
                                                ) : (
                                                    <div className="text-xs text-slate-400 mt-0.5">₹{remaining.toLocaleString()} to go</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${milestone.completed ? 'bg-gradient-to-r from-emerald-500 to-green-600' : barColor}`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        <div className="mt-1 text-[11px] text-slate-400 flex justify-between">
                                            <span>Base: ₹{milestone.base?.toLocaleString() || 0}</span>
                                            <span>Target: ₹{target.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {activeAgentsList.length === 0 && (
                                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <div className="text-2xl mb-2">📊</div>
                                    <p className="text-slate-500 font-medium text-sm">No agents in this tier yet.</p>
                                    <p className="text-slate-400 text-xs mt-1">
                                        {milestoneTab === 'tier1' && "Everyone has graduated from the starter tier!"}
                                        {milestoneTab === 'tier2' && "Keep pushing agents to cross 25k!"}
                                        {milestoneTab === 'tier3' && "Push for that 1 Lakh milestone!"}
                                        {milestoneTab === 'tier4' && "Aiming for the 2 Lakh club!"}
                                        {milestoneTab === 'tier5' && "The elite club is waiting for its first member."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Birthdays (Unchanged) */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow flex flex-col">
                        <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                            <span className="text-xl">🎂</span> Upcoming Birthdays
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {!data?.birthdays || data.birthdays.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic py-8">
                                    <span className="opacity-30 text-4xl mb-2">📅</span>
                                    No upcoming birthdays
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {data.birthdays.map((b, i) => (
                                        <li key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                                    {b.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-slate-700 group-hover:text-indigo-700 transition">{b.username}</span>
                                            </div>
                                            <span className="text-xs font-semibold bg-white px-2 py-1 rounded-md text-slate-500 shadow-sm border border-slate-100">{b.bday_fmt}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- ROW 3: PRIORITY QUEUE --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm mb-8">
                    <div className="lg:col-span-2 flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-900">Priority Queue</h3>
                            <p className="text-slate-500 text-sm">Action items requiring immediate attention</p>
                        </div>
                    </div>

                    {/* Priority Agents */}
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span> Agents at Risk
                        </h4>
                        {!data.priorityAgents || data.priorityAgents.length === 0 ? (
                            <EmptyState label="No agents at risk" />
                        ) : (
                            <div className="space-y-3">
                                {data.priorityAgents.map((agent) => (
                                    <Link href={`/agents/${agent.id}`} key={agent.id} className="block group">
                                        <div className="relative overflow-hidden border border-slate-200 bg-white rounded-xl p-4 hover:border-red-300 hover:shadow-md transition-all duration-300">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${agent.rag_status === 'Red' ? 'bg-red-500' : 'bg-amber-400'}`}></div>
                                            <div className="flex justify-between items-center pl-2">
                                                <div>
                                                    <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">{agent.username}</div>
                                                    <div className="text-xs text-red-500 font-medium mt-0.5">{agent.days_inactive || 1} days inactive</div>
                                                </div>
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-bold border ${agent.rag_status === 'Red' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                                                >
                                                    {agent.rag_status}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* High Priority Tasks */}
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span> Urgent Tasks
                        </h4>
                        {!data.highPriorityTasks || data.highPriorityTasks.length === 0 ? (
                            <EmptyState label="No urgent tasks" />
                        ) : (
                            <div className="space-y-3">
                                {data.highPriorityTasks.map((task) => (
                                    <Link href={`/tasks`} key={task.id} className="block group">
                                        <div className="border border-slate-200 bg-white rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition line-clamp-1">{task.title}</div>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                                    {task.category || 'General'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                                <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold">AG</span>
                                                {task.agent_name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-orange-600 bg-orange-50 w-fit px-2 py-1 rounded">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                                </svg>
                                                Due: {new Date(task.due_date).toLocaleDateString('en-GB')}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- ROW 4: QUICK ACTIONS --- */}
                <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ActionButton
                            onClick={() => setIsModalOpen(true)}
                            label="Add New Agent"
                            desc="Onboard team member"
                            icon={
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                            }
                            color="blue"
                        />
                        <Link href="/tasks?type=AGENT" className="block">
                            <ActionButton
                                label="Go to Agent Tasks"
                                desc="Create for today"
                                icon={<LightningIcon />}
                                color="amber"
                                isLink
                            />
                        </Link>

                        <Link href="/tasks?type=ADMIN" className="block">
                            <ActionButton
                                label="Generate Agency Leader Task"
                                desc="Your task will generate automatically"
                                icon={<BrainCog />}
                                color="pink"
                                isLink
                            />
                        </Link>

                        {/* Modified Link to use onClick handler for SPA feel */}
                        <div onClick={() => setView('allAgents')} className="block h-full cursor-pointer">
                            <ActionButton label="Go to Agents" desc="View full list" icon={<UsersIcon />} color="emerald" isLink />
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
                {celebrations.map((item) => (
                    <CelebrationPopup
                        key={item.key}
                        item={item}
                        onClose={() => {
                            setCelebrations((prev) =>
                                prev.filter((c) => c.key !== item.key)
                            );

                            const seen = JSON.parse(
                                sessionStorage.getItem('celebrations-seen') || '[]'
                            );

                            sessionStorage.setItem(
                                'celebrations-seen',
                                JSON.stringify([...seen, item.key])
                            );
                        }}
                    />
                ))}
            </div>


            {/* Modal */}
            <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAgentCreated} />
        </div>
    );
}

// =========================================================================
// SUB-COMPONENT: ALL AGENTS LIST VIEW (Unchanged)
// =========================================================================

function AllAgentsView({ onBack }) {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAgents = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, { headers: { Authorization: `Bearer ${token}` } });

            if (res.ok) {
                const data = await res.json();
                setAgents(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch agents', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const filteredAgents = agents.filter((agent) => {
        const q = searchTerm.toLowerCase();

        return agent.username?.toLowerCase().includes(q) || agent.phone?.toLowerCase().includes(q) || agent.email?.toLowerCase().includes(q);
    });

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header with Back Button */}
            <div className="px-6 py-4 border-b border-gray-200 bg-slate-50/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* LEFT */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 -ml-2 hover:bg-white rounded-full transition-colors text-slate-500 hover:text-blue-600 border border-transparent hover:border-slate-200 hover:shadow-sm"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5" />
                                <path d="M12 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div>
                            <h2 className="text-xl font-bold text-gray-900">All Agents</h2>
                            <span className="text-sm text-gray-500">
                                {filteredAgents.length} of {agents.length} shown
                            </span>
                        </div>
                    </div>

                    {/* RIGHT – SEARCH */}
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, phone, or email"
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           placeholder:text-slate-400 shadow-sm"
                        />

                        {/* Search Icon */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>

                        {/* Clear Button */}
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 text-sm">Loading agents...</p>
                    </div>
                </div>
            ) : filteredAgents.length === 0 ? (
                <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-400">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="font-medium">No matching agents found</p>
                    <p className="text-xs mt-1">Try searching by name, phone, or email</p>
                </div>
            ) : (
                <>
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-4">Agent Name</div>
                        <div className="col-span-2">Contact</div>
                        <div className="col-span-3 text-center">Performance (M / L / S)</div>
                        <div className="col-span-2">Last Active</div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>

                    {/* Agent Rows */}
                    <div className="divide-y divide-gray-100">
                        {filteredAgents.map((agent) => (
                            <Link
                                key={agent.id}
                                href={`/agents/${agent.id}`}
                                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-blue-50/50 transition cursor-pointer items-center group"
                            >
                                {/* Agent Info */}
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-200">
                                        {agent.username?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{agent.username}</div>
                                        <div className="text-xs text-gray-500">{agent.employment_type || 'Full-time'}</div>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="col-span-2 text-sm">
                                    <div className="text-gray-700 font-medium">{agent.phone || '-'}</div>
                                    <div className="text-xs text-gray-400 truncate max-w-[120px]" title={agent.email}>
                                        {agent.email}
                                    </div>
                                </div>

                                {/* Performance */}
                                <div className="col-span-3 flex justify-start md:justify-center gap-6 text-sm">
                                    <Metric label="Meetings" value={agent.total_meetings || 0} />
                                    <Metric label="Leads" value={agent.total_leads || 0} />
                                    <Metric label="Sales" value={agent.total_sales || 0} />
                                </div>

                                {/* Last Active */}
                                <div className="col-span-2 text-sm text-gray-500">
                                    {agent.last_active_date ? new Date(agent.last_active_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                </div>

                                {/* Arrow */}
                                <div className="col-span-1 flex justify-end text-gray-300 group-hover:text-blue-500 transition">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14"></path>
                                        <path d="M12 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// --------------------------------
// Small Components
// --------------------------------

function Metric({ label, value }) {
    return (
        <div className="text-center">
            <div className="font-bold text-gray-900 text-base">{value}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label.charAt(0)}</div>
        </div>
    );
}

function RagCard({ label, count, type, sub }) {
    const config = {
        red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', sub: 'text-red-600/70', icon: 'bg-red-200' },
        amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', sub: 'text-amber-600/70', icon: 'bg-amber-200' },
        green: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', sub: 'text-emerald-600/70', icon: 'bg-emerald-200' },
    }[type];

    return (
        <div className={`relative overflow-hidden h-full rounded-2xl border ${config.border} bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 group`}>
            {/* Background Blob */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${config.bg} opacity-50 blur-xl group-hover:scale-150 transition-transform duration-500`}></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className={`font-bold text-lg text-slate-700 group-hover:text-slate-900`}>{label}</h3>
                        <p className={`text-xs font-medium mt-1 ${config.sub}`}>{sub}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${type === 'red' ? 'bg-red-500' : type === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                </div>
                <div className={`text-5xl font-bold mt-6 ${config.text} tracking-tight`}>{count}</div>
            </div>
        </div>
    );
}

function ActionButton({ label, desc, icon, color, onClick, isLink }) {
    const colors = {
        blue: 'group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200',
        indigo: 'group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200',
        amber: 'group-hover:bg-amber-50 group-hover:text-amber-600 group-hover:border-amber-200',
        emerald: 'group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-200',
    };

    const content = (
        <div
            className={`h-full flex flex-col justify-center items-center text-center p-4 border border-slate-200 bg-white rounded-xl shadow-sm transition-all duration-300 cursor-pointer ${colors[color] || colors.blue}`}
        >
            <div className="mb-3 p-3 bg-slate-50 rounded-full text-slate-600 shadow-sm group-hover:shadow-none group-hover:bg-white/80 transition-colors">{icon}</div>
            <div className="font-bold text-slate-800 text-sm">{label}</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">{desc}</div>
        </div>
    );

    if (isLink) return <div className="group h-full">{content}</div>;

    return (
        <button className="group h-full w-full" onClick={onClick}>
            {content}
        </button>
    );
}

function EmptyState({ label }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
            </div>
            <p className="text-slate-400 text-xs font-medium">{label}</p>
        </div>
    );
}

// --- ICONS (Styled) ---
const LightningIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
);

const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);