'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';

export default function AllAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------
  // Fetch All Agents
  // -------------------------------
  const fetchAgents = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/agents`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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

  // -------------------------------
  // Loading State
  // -------------------------------
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading agents…</p>
        </div>
      </div>
    );
  }

  // -------------------------------
  // Empty State
  // -------------------------------
  if (!agents.length) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400">
        No agents found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">
          All Agents
        </h2>
        <span className="text-sm text-gray-500">
          Total: {agents.length}
        </span>
      </div>

      {/* Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
        <div className="col-span-4">Agent</div>
        <div className="col-span-2">Contact</div>
        <div className="col-span-3 text-center">Performance (M / L / S)</div>
        <div className="col-span-2">Last Active</div>
        <div className="col-span-1 text-right">View</div>
      </div>

      {/* Agent Rows */}
      <div className="divide-y divide-gray-100">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition cursor-pointer items-center"
          >
            {/* Agent Info */}
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                {agent.username?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {agent.username}
                </div>
                <div className="text-xs text-gray-500">
                  {agent.employment_type || 'Full-time'}
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="col-span-2 text-sm">
              <div className="text-gray-700">{agent.phone || '-'}</div>
              <div className="text-xs text-gray-400 truncate">
                {agent.email}
              </div>
            </div>

            {/* Performance */}
            <div className="col-span-3 flex justify-start md:justify-center gap-6 text-sm">
              <Metric label="M" value={agent.total_meetings || 0} />
              <Metric label="L" value={agent.total_leads || 0} />
              <Metric label="S" value={agent.total_sales || 0} />
            </div>

            {/* Last Active */}
            <div className="col-span-2 text-sm text-gray-500">
              {agent.last_active_date
                ? new Date(agent.last_active_date).toLocaleDateString()
                : '-'}
            </div>

            {/* Arrow */}
            <div className="col-span-1 flex justify-end text-gray-400">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --------------------------------
// Small Metric Component
// --------------------------------
function Metric({ label, value }) {
  return (
    <div className="text-center">
      <div className="font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}
