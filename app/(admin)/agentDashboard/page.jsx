"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import Link from "next/link";
// ✅ Import the modal component
import AddAgentModal from "@/components/admin/AddAgentModal"; 

export default function AgentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // ✅ State for Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Define fetch function outside useEffect so we can reuse it (e.g. after adding agent)
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
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle saving a new agent from the Dashboard
  const handleAgentCreated = async (formData) => {
      // Here you would typically call your API to create the agent
      // Since the Modal usually handles the API call internally or via prop, 
      // we assume the modal calls the API. 
      // After save, we close modal and refresh stats.
      
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      // Perform API call here if not inside the Modal component
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
      });

      setIsModalOpen(false);
      fetchData(); // Refresh dashboard stats
  };

  if (loading) return <div className="p-10 text-gray-500">Loading Dashboard...</div>;
  if (!data) return <div className="p-10 text-gray-500">No data available.</div>;

  return (
    <div className="p-6 space-y-6 bg-[#F9FAFB] min-h-screen font-sans text-gray-800">

      {/* --- ROW 1: RAG CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/agents">
           <RagCard label="Red Agents" count={data?.rag?.red || 0} color="red" sub="Inactive > 60 days" />
        </Link>
        <Link href="/agents">
           <RagCard label="Amber Agents" count={data?.rag?.amber || 0} color="amber" sub="Inactive 30-60 days" />
        </Link>
        <Link href="/agents">
           <RagCard label="Green Agents" count={data?.rag?.green || 0} color="green" sub="Active within 30 days" />
        </Link>
      </div>

      {/* --- ROW 2: BIRTHDAYS & MILESTONE --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Birthdays */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[180px]">
          <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            🎂 Birthdays
          </h3>
          <div className="flex-1 flex items-center justify-center">
            {(!data?.birthdays || data.birthdays.length === 0) ? (
                <div className="text-gray-400 font-medium">No upcoming birthdays</div>
            ) : (
                <ul className="w-full space-y-2">
                    {data.birthdays.map((b, i) => (
                        <li key={i} className="flex justify-between p-2 bg-gray-50 rounded hover:bg-gray-50 transition">
                            <span className="font-medium text-gray-900">{b.username}</span>
                            <span className="text-gray-500">{b.bday_fmt}</span>
                        </li>
                    ))}
                </ul>
            )}
          </div>
        </div>

        {/* Milestone Tracker */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[180px]">
          <h3 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
            🏆 Next Milestone Tracker
          </h3>
          <p className="text-sm text-gray-500 mb-6">Track agent progress towards income milestones</p>
          
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-4">
               <span className="font-bold text-gray-900">₹25K Milestone</span>
               <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded">1 agents</span>
            </div>

            <div className="mb-2">
               <div className="flex justify-between text-sm mb-1">
                 <span className="font-semibold text-gray-900">{data?.milestone?.name || "No Data"}</span>
                 <div className="text-right">
                   <span className="text-gray-500 block text-xs">
                     {data?.milestone?.progress < 100 ? "Keep pushing!" : "Goal Reached!"}
                   </span>
                 </div>
               </div>
               <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex items-center">
                 <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${data?.milestone?.progress || 0}%` }}></div>
               </div>
               <div className="text-right text-xs text-gray-500 mt-1">{data?.milestone?.progress || 0}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ROW 3: QUICK ACTIONS --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-2">
          ⭐ Quick Actions
        </h3>
        <p className="text-sm text-gray-500 mb-6">Common tasks to manage your team</p>

        <div className="flex flex-wrap  gap-4">
          {/* ✅ New Agent Button Opens Modal */}
          <button 
             onClick={() => setIsModalOpen(true)}
             className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
             New Agent
          </button>
          
          <ActionButton label="Import Agents" icon={<UploadIcon />} />
          <Link href="/tasks">
            <ActionButton label="Generate task for the day" icon={<LightningIcon />} />
          </Link>
          <ActionButton label="Daily Huddles" icon={<UsersIcon />} />
        </div>
      </div>

      {/* --- ROW 4: PRIORITY QUEUE (Clickable Rows) --- */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <h3 className="font-bold text-xl text-gray-900">Priority Queue</h3>
        </div>
        <p className="text-gray-500 text-sm mb-8">Agents requiring immediate attention</p>

        <div className="space-y-8">
            
            {/* 1. Priority Agents Section */}
            <div>
                <h4 className="font-bold text-gray-700 mb-4">Priority Agents</h4>
                {(!data.priorityAgents || data.priorityAgents.length === 0) ? (
                    <div className="text-gray-400 text-sm italic">No agents at risk</div>
                ) : (
                    <div className="space-y-3">
                        {data.priorityAgents.map((agent) => (
                            // ✅ Wrapped in Link to redirect to Agent Page
                            <Link href={`/agents`} key={agent.id} className="block group">
                                <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-4 bg-white group-hover:border-red-300 group-hover:shadow-sm transition cursor-pointer">
                                    <span className={`px-4 py-1 rounded-md text-xs font-bold border ${
                                        agent.rag_status === 'Red' 
                                          ? 'bg-red-500 text-white border-red-600' 
                                          : 'bg-amber-400 text-black border-amber-500'
                                    }`}>
                                        {agent.rag_status}
                                    </span>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition">{agent.username}</div>
                                        <div className="text-xs text-gray-500">{agent.days_inactive || 1} days inactive</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. High Priority Tasks Section */}
            <div>
                <h4 className="font-bold text-gray-700 mb-4">High Priority Tasks</h4>
                {(!data.highPriorityTasks || data.highPriorityTasks.length === 0) ? (
                    <div className="text-gray-400 text-sm italic">No high priority tasks</div>
                ) : (
                    <div className="space-y-3">
                        {data.highPriorityTasks.map((task) => (
                            // ✅ Wrapped in Link to redirect to Task Board
                            <Link href={`/tasks`} key={task.id} className="block group">
                                <div className="border border-gray-200 rounded-xl p-4 bg-white group-hover:border-red-300 group-hover:shadow-sm transition cursor-pointer">
                                    <div className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition">{task.title}</div>
                                    <div className="text-sm text-gray-500 mb-3">{task.agent_name}</div>
                                    
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-gray-300 text-gray-700 shadow-sm">
                                            {task.category || "General"}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                            {new Date(task.due_date).toLocaleDateString("en-GB")}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* ✅ Modal Component */}
      <AddAgentModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleAgentCreated}
      />
    </div>
  );
}

// --- SUB COMPONENTS ---

function RagCard({ label, count, color, sub }) {
  const styles = {
      red: { dot: "bg-red-500", border: "border-gray-200" },
      amber: { dot: "bg-amber-400", border: "border-gray-200" },
      green: { dot: "bg-emerald-400", border: "border-gray-200" }
  }[color];

  return (
    <div className={`bg-white border ${styles.border} rounded-xl p-6 shadow-sm flex flex-col justify-between h-full min-h-[140px] hover:shadow-md transition cursor-pointer group`}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition">{label}</h3>
        <div className={`w-3 h-3 rounded-full ${styles.dot}`}></div>
      </div>
      <div>
          <div className="text-4xl font-bold mt-4 text-gray-900">{count}</div>
          <div className="text-gray-500 text-xs mt-1">{sub}</div>
      </div>
    </div>
  );
}

function ActionButton({ label, icon }) {
  return (
    <button className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 transition shadow-sm">
      {icon}
      <span>{label}</span>
    </button>
  );
}

// --- ICONS ---

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);

const LightningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);