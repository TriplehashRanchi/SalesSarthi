'use client';
import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import AddAgentModal from '@/components/admin/AddAgentModal';
import ImportAgentsModal from '../../../components/agents/ImportAgentsModal';

export default function AgentRagBoard() {
    const [columns, setColumns] = useState({ Red: [], Amber: [], Green: [] });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    
    // ✅ New State: Toggle between 'board' and 'list'
    const [viewMode, setViewMode] = useState('board'); 

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
        const allAgents = [...columns.Red, ...columns.Amber, ...columns.Green];

        if (allAgents.length === 0) {
            alert('No agents to export');
            return;
        }

        const headers = ['Username', 'Email', 'Phone', 'Employment Type', 'RAG Status', 'Last Active Date', 'Total Leads', 'Total Meetings', 'Total Sales'];
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

        const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        {viewMode === 'board' ? 'Drag agents between columns' : 'Drag rows to update status'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 mr-2">
                        <button 
                            onClick={() => setViewMode('board')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${viewMode === 'board' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            Board
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            List
                        </button>
                    </div>

                    <button onClick={exportAgents} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                    </button>

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

            {/* SHARED DRAG CONTEXT */}
            <DragDropContext onDragEnd={onDragEnd}>
                
                {/* VIEW 1: BOARD (Your Original UI) */}
                {viewMode === 'board' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <RagColumn title="RED" id="Red" color="red" agents={columns.Red} />
                        <RagColumn title="AMBER" id="Amber" color="amber" agents={columns.Amber} />
                        <RagColumn title="GREEN" id="Green" color="green" agents={columns.Green} />
                    </div>
                )}

                {/* VIEW 2: LIST (The New UI you liked) */}
                {viewMode === 'list' && (
                    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
                        <RagListGroup title="Red Status Agents" id="Red" color="red" agents={columns.Red} />
                        <RagListGroup title="Amber Status Agents" id="Amber" color="amber" agents={columns.Amber} />
                        <RagListGroup title="Green Status Agents" id="Green" color="green" agents={columns.Green} />
                    </div>
                )}

            </DragDropContext>

            <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleCreateAgent} />
        </div>
    );
}

// ------------------------------------------------------------------
// BOARD VIEW COMPONENTS (EXACTLY YOUR ORIGINAL UI)
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// LIST VIEW COMPONENTS (THE NEW UI YOU LIKED)
// ------------------------------------------------------------------

const RagListGroup = ({ title, id, color, agents }) => {
    const headerColors = {
        red: 'border-l-4 border-l-red-500 bg-red-50',
        amber: 'border-l-4 border-l-amber-500 bg-amber-50',
        green: 'border-l-4 border-l-emerald-500 bg-emerald-50',
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className={`p-4 flex justify-between items-center ${headerColors[color]}`}>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    {title}
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs border border-gray-200 shadow-sm">{agents.length}</span>
                </h3>
            </div>
            
            {/* Table Header Row */}
            {agents.length > 0 && (
                <div className="grid grid-cols-12 gap-4 px-6 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:grid">
                    <div className="col-span-4">Agent Name</div>
                    <div className="col-span-2">Contact</div>
                    <div className="col-span-3 text-center">Performance (M/L/S)</div>
                    <div className="col-span-2">Last Active</div>
                    <div className="col-span-1 text-right">Action</div>
                </div>
            )}

            <Droppable droppableId={id}>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[50px] p-2">
                        {agents.length === 0 ? (
                             <div className="p-8 text-center text-gray-400 italic text-sm">No agents in this status. Drag items here to update.</div>
                        ) : (
                            agents.map((agent, index) => (
                                <Draggable key={agent.id} draggableId={agent.id.toString()} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`
                                                relative grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 items-center rounded-md border mb-2
                                                ${snapshot.isDragging 
                                                    ? 'bg-blue-50 border-blue-400 shadow-xl z-50' 
                                                    : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'}
                                            `}
                                        >
                                           <AgentListItem agent={agent} />
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
    );
};

const AgentListItem = ({ agent }) => {
    return (
        <>
            <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                <div className="p-1 text-gray-400 cursor-grab hidden md:block">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {agent.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="font-semibold text-gray-900 text-sm">{agent.username}</div>
                    <div className="text-xs text-gray-500">{agent.employment_type}</div>
                </div>
            </div>
            
            <div className="col-span-1 md:col-span-2 flex flex-col justify-center text-sm">
                <span className="text-gray-600 text-xs">{agent.phone || 'N/A'}</span>
                <span className="text-gray-400 text-[10px] truncate">{agent.email}</span>
            </div>

            <div className="col-span-1 md:col-span-3 flex items-center justify-start md:justify-center gap-4 text-sm text-gray-600">
                <div className="text-center"><span className="block font-bold text-gray-900">{agent.total_meetings || 0}</span><span className="text-[10px]">Mtgs</span></div>
                <div className="w-px h-6 bg-gray-200"></div>
                <div className="text-center"><span className="block font-bold text-gray-900">{agent.total_leads || 0}</span><span className="text-[10px]">Leads</span></div>
                <div className="w-px h-6 bg-gray-200"></div>
                <div className="text-center"><span className="block font-bold text-gray-900">{agent.total_sales || 0}</span><span className="text-[10px]">Sales</span></div>
            </div>

            <div className="col-span-1 md:col-span-2 text-sm text-gray-500">
                 {agent.last_active_date 
                    ? new Date(agent.last_active_date).toLocaleDateString() 
                    : '-'}
            </div>

            <div className="col-span-1 md:col-span-1 flex justify-end">
                <Link href={`/agents/${agent.id}`} className="p-2 text-gray-400 hover:text-blue-600 transition">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
            </div>
        </>
    );
};