'use client';
import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import AddAgentModal from '@/components/admin/AddAgentModal';
import ImportAgentsModal from '../../../components/agents/ImportAgentsModal';

export default function AgentRagBoard() {
    const [columns, setColumns] = useState({ Red: [], Amber: [], Green: [] });
    // ✅ Fix state naming
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            const grouped = { Red: [], Amber: [], Green: [] };
            data.forEach((agent) => {
                const status = agent.rag_status || 'Green';
                if (grouped[status]) grouped[status].push(agent);
            });
            setColumns(grouped);
        } catch (error) {
            console.error('Error fetching agents:', error);
        }
    };

    // ✅ New Function to Handle Agent Creation
    const handleCreateAgent = async (agentData) => {
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(agentData),
            });

            const data = await res.json();

            if (res.ok) {
                // Success: Close modal and refresh list
                setIsModalOpen(false);
                fetchAgents();
            } else {
                alert(data.message || 'Failed to create agent');
            }
        } catch (error) {
            console.error('Failed to create agent:', error);
            alert('An error occurred while creating the agent.');
        }
    };

    const exportAgents = () => {
        // Flatten all columns into one list
        const allAgents = [...columns.Red, ...columns.Amber, ...columns.Green];

        if (allAgents.length === 0) {
            alert('No agents to export');
            return;
        }

        // Define CSV headers
        const headers = ['Username', 'Email', 'Phone', 'Employment Type', 'RAG Status', 'Last Active Date', 'Total Leads', 'Total Meetings', 'Total Sales'];

        // Map data to CSV rows
        const rows = allAgents.map((agent) => [
            agent.username || '',
            agent.email || '',
            agent.phone || '',
            agent.employment_type || '',
            agent.rag_status || 'Green',
            agent.last_active_date || '',
            agent.total_leads || 0,
            agent.total_meetings || 0,
            agent.total_sales || 0,
        ]);

        // Convert to CSV string
        const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

        // Create downloadable file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'agents_export.csv';
        link.click();

        URL.revokeObjectURL(url);
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination } = result;

        const sourceCol = [...columns[source.droppableId]];
        const destCol = source.droppableId === destination.droppableId ? sourceCol : [...columns[destination.droppableId]];

        const [moved] = sourceCol.splice(source.index, 1);
        moved.rag_status = destination.droppableId;
        destCol.splice(destination.index, 0, moved);

        const newColumns = { ...columns };
        newColumns[source.droppableId] = sourceCol;
        newColumns[destination.droppableId] = destCol;

        setColumns(newColumns);

        if (source.droppableId !== destination.droppableId) {
            try {
                const auth = getAuth();
                const token = await auth.currentUser?.getIdToken();
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${moved.id}/rag`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ rag_status: destination.droppableId }),
                });
            } catch (error) {
                console.error('Failed to update RAG status:', error);
            }
        }
    };

    return (
        <div className="p-8 bg-white min-h-screen font-sans text-gray-800">
            {/* HEADER SECTION */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
                    <p className="text-gray-500 mt-1 text-sm">Drag agents between columns to update their status</p>
                </div>

                <div className="flex gap-3">
                    <button onClick={exportAgents} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                    </button>

                    {/* ✅ Updated Button to use correct State */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition"
                    >
                        <span className="text-lg leading-none">+</span>
                        New Agent
                    </button>

                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Import
                    </button>

                    <ImportAgentsModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
                </div>
            </div>

            {/* DRAG AND DROP BOARD */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <RagColumn title="RED" id="Red" color="red" agents={columns.Red} />
                    <RagColumn title="AMBER" id="Amber" color="amber" agents={columns.Amber} />
                    <RagColumn title="GREEN" id="Green" color="green" agents={columns.Green} />
                </div>
            </DragDropContext>

            {/* ✅ Updated Modal Implementation */}
            <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleCreateAgent} />
        </div>
    );
}

// ... (Keep your RagColumn and AgentCard components below as they were) ...

const RagColumn = ({ title, id, color, agents }) => {
    const styles = {
        red: { header: 'bg-[#EF4444]', body: 'bg-[#FEF2F2] border-[#FECACA]' },
        amber: { header: 'bg-[#F59E0B]', body: 'bg-[#FFFBEB] border-[#FDE68A]' },
        green: { header: 'bg-[#10B981]', body: 'bg-[#ECFDF5] border-[#A7F3D0]' },
    };

    const theme = styles[color];

    return (
        <div className="flex flex-col h-full rounded-xl overflow-hidden shadow-sm">
            <div className={`${theme.header} p-4 text-center`}>
                <h2 className="text-white font-bold text-lg uppercase tracking-wide">{title}</h2>
                <p className="text-white/80 text-sm mt-1">
                    {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
                </p>
            </div>

            <div className={`flex-1 p-4 ${theme.body} border-x border-b rounded-b-xl min-h-[600px]`}>
                <Droppable droppableId={id}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="h-full flex flex-col gap-4">
                            {agents.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">No agents in this category</div>
                            ) : (
                                agents.map((agent, index) => (
                                    <Draggable key={agent.id} draggableId={agent.id.toString()} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`bg-white rounded-xl p-5 shadow-sm transition-all duration-200 
                          ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl z-50' : ''}
                          border border-blue-500 ring-1 ring-blue-100
                        `}
                                            >
                                                <AgentCard agent={agent} currentColumnId={id} />
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
        </div>
    );
};

const AgentCard = ({ agent, currentColumnId }) => {
    const badgeColors = {
        Red: 'bg-red-100 text-red-700',
        Amber: 'bg-amber-100 text-amber-800',
        Green: 'bg-green-100 text-green-700',
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <div className="mt-1 text-gray-400 cursor-grab active:cursor-grabbing">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="5" r="1" />
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="9" cy="19" r="1" />
                        <circle cx="15" cy="5" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <circle cx="15" cy="19" r="1" />
                    </svg>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base">{agent.username}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColors[currentColumnId] || badgeColors.Green}`}>{currentColumnId}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">Last activity: {Math.floor((new Date() - new Date(agent.last_active_date || new Date())) / (1000 * 60 * 60 * 24))} days ago</div>
                    <div className="text-gray-500 text-xs mt-0.5">{agent.employment_type || 'Full-time'}</div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-b border-gray-100 py-3 text-xs text-gray-600">
                <div className="flex-1 text-center border-r border-gray-100">
                    Meetings: <span className="font-medium text-gray-900">{agent.total_meetings || 0}</span>
                </div>
                <div className="flex-1 text-center border-r border-gray-100">
                    Leads: <span className="font-medium text-gray-900">{agent.total_leads || 0}</span>
                </div>
                <div className="flex-1 text-center">
                    Sales: <span className="font-medium text-gray-900">{agent.total_sales || 0}</span>
                </div>
            </div>

            <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Call</button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Message</button>
                <Link href={`/agents/${agent.id}`} className="w-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition hover:text-blue-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </Link>
            </div>
        </div>
    );
};
