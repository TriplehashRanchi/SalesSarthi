'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import AddAgentModal from '@/components/admin/AddAgentModal';

export default function AgentDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // State to toggle between Dashboard and All Agents view
    const [view, setView] = useState('dashboard'); // 'dashboard' | 'allAgents'

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
        // Only fetch dashboard data if we are in dashboard view
        if (view === 'dashboard') {
            const timer = setTimeout(fetchData, 800);
            return () => clearTimeout(timer);
        }
    }, [view]);

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
                    {/* Milestone Tracker */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">🏆 Next Milestone Tracker</h3>
                                <p className="text-sm text-slate-500 mt-1">Progress towards the ₹25k income target.</p>
                            </div>
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">{Math.min(data?.topAgent?.length || 0, 3)} Agents</span>
                        </div>

                        <div className="space-y-6">
                            {data?.topAgent?.slice(0, 3).map((agent, index) => {
                                const income = Number(agent.current_income || 0);
                                const target = 25000;
                                const progress = Math.min(Math.round((income / target) * 100), 100);
                                const remaining = Math.max(target - income, 0);

                                return (
                                    <div key={index} className="group">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{agent.username}</span>
                                                <span className="text-xs text-slate-400">Current: ₹{income.toLocaleString()}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{progress}%</span>
                                                <div className="text-xs text-slate-400 mt-0.5">₹{remaining.toLocaleString()} left</div>
                                            </div>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-1000 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {(!data?.topAgent || data.topAgent.length === 0) && (
                                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm">No milestone data available yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Birthdays */}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <ActionButton
                            onClick={() => setIsModalOpen(true)}
                            label="New Agent"
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
                        <Link href="/tasks" className="block">
                            <ActionButton label="Go to Tasks" desc="Create for today" icon={<LightningIcon />} color="amber" isLink />
                        </Link>
                        {/* Modified Link to use onClick handler for SPA feel */}
                        <div onClick={() => setView('allAgents')} className="block h-full cursor-pointer">
                             <ActionButton label="Go to Agents" desc="View full list" icon={<UsersIcon />} color="emerald" isLink />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAgentCreated} />
        </div>
    );
}

// =========================================================================
// SUB-COMPONENT: ALL AGENTS LIST VIEW
// =========================================================================

function AllAgentsView({ onBack }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/agents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header with Back Button */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 -ml-2 hover:bg-white rounded-full transition-colors text-slate-500 hover:text-blue-600 border border-transparent hover:border-slate-200 hover:shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
             </button>
             <div>
                <h2 className="text-xl font-bold text-gray-900">All Agents</h2>
                <span className="text-sm text-gray-500">Manage your team members</span>
             </div>
        </div>
        <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 shadow-sm">
          Total: {agents.length}
        </span>
      </div>

      {loading ? (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading agents...</p>
            </div>
          </div>
      ) : agents.length === 0 ? (
          <div className="min-h-[400px] flex items-center justify-center text-gray-400">
            No agents found
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
                {agents.map((agent) => (
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
                        <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition">
                        {agent.username}
                        </div>
                        <div className="text-xs text-gray-500">
                        {agent.employment_type || 'Full-time'}
                        </div>
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
                    {agent.last_active_date
                        ? new Date(agent.last_active_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '-'}
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