'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getAuth } from 'firebase/auth';
import Link from 'next/link';
import AddTaskModal from '@/components/admin/AddTaskModal';


const STATUS_STYLES = {
    Pending: {
        columnBg: 'bg-yellow-50',
        headerText: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-700',
        cardBorder: 'border-yellow-300',
    },
    InProgress: {
        columnBg: 'bg-blue-50',
        headerText: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-700',
        cardBorder: 'border-blue-300',
    },
    Done: {
        columnBg: 'bg-green-50',
        headerText: 'text-green-700',
        badge: 'bg-green-100 text-green-700',
        cardBorder: 'border-green-300',
    },
    Skipped: {
        columnBg: 'bg-gray-100',
        headerText: 'text-gray-600',
        badge: 'bg-gray-200 text-gray-600',
        cardBorder: 'border-gray-300',
    },
};

const PRIORITY_STYLES = {
    high: 'bg-red-500 text-white',
    medium: 'bg-orange-500 text-white',
    low: 'bg-blue-500 text-white',
};


export default function TaskBoard() {
    const searchParams = useSearchParams();
    const typeFromUrl = searchParams.get('type'); // AGENT | ADMIN

    // Stores the organized columns for UI
    const [tasks, setTasks] = useState({ Pending: [], InProgress: [], Done: [], Skipped: [] });
    // Stores the raw list from API to allow client-side filtering
    const [allFetchedTasks, setAllFetchedTasks] = useState([]);

    const [agents, setAgents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'

    // NEW: Filter State ('AGENT' or 'ADMIN')
    const [filterType, setFilterType] = useState('AGENT');

    useEffect(() => {
        if (typeFromUrl === 'ADMIN' || typeFromUrl === 'AGENT') {
            setFilterType(typeFromUrl);
        }
    }, [typeFromUrl]);


    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTasks();
            fetchAgents();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Re-group tasks whenever the raw data or the filter type changes
    useEffect(() => {
        if (allFetchedTasks.length > 0) {
            processAndGroupTasks(allFetchedTasks, filterType);
        }
    }, [allFetchedTasks, filterType]);

    const fetchTasks = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to fetch tasks');

            const data = await res.json();

            // Store raw data
            setAllFetchedTasks(data);

            // Initial processing
            processAndGroupTasks(data, filterType);
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    };

    // Helper to filter and group raw data into columns
    const processAndGroupTasks = (data, activeFilter) => {
        const grouped = { Pending: [], InProgress: [], Done: [], Skipped: [] };

        // 1. Filter by subject_type (AGENT vs ADMIN)
        const filteredData = data.filter((t) => {
            if (activeFilter === 'AGENT') return t.subject_type === 'AGENT';
            if (activeFilter === 'ADMIN') return t.subject_type === 'ADMIN';
            return true;
        });

        // 2. Group by Status
        filteredData.forEach((t) => {
            let status = t.status;
            // Normalize status strings from DB to UI
            if (status === 'Planned') status = 'Pending';
            if (status === 'Pending') status = 'Pending'; // Handle existing Pending
            if (status === 'In Progress' || status === 'in_progress') status = 'InProgress';
            if (status === 'Completed') status = 'Done';
            if (status === 'done') status = 'Done';

            // Fallback for unknown statuses or empty strings (like in your JSON example id:5)
            if (!status || status === '') status = 'Pending';

            if (grouped[status]) {
                grouped[status].push(t);
            } else {
                grouped.Pending.push(t);
            }
        });
        setTasks(grouped);
    };

    const fetchAgents = async () => {
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setAgents(data);
        } catch (error) {
            console.error('Error fetching agents', error);
        }
    };

    const handleCreateTask = async (newTaskData) => {
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            // Automatically assign subject_type based on the current view/creation logic
            // Or ensure the modal passes it. For now, we assume the API handles it or modal sends it.
            const payload = {
                ...newTaskData,
                subject_type: filterType, // Optional: create task in current view category
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchTasks();
            } else {
                alert('Failed to create task');
            }
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const onDragEnd = async (result) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // UI Update (Immediate feedback)
        const sourceList = [...tasks[source.droppableId]];
        const destList = [...tasks[destination.droppableId]];
        const [movedItem] = sourceList.splice(source.index, 1);

        // Map column ID back to Backend Status
        let newStatus = destination.droppableId;
        if (newStatus === 'Pending') newStatus = 'Planned';
        if (newStatus === 'Done') newStatus = 'Completed';

        // Update item status locally
        movedItem.status = newStatus;

        destList.splice(destination.index, 0, movedItem);

        setTasks({
            ...tasks,
            [source.droppableId]: sourceList,
            [destination.droppableId]: destList,
        });

        // CRITICAL: Update the raw data list too, so filtering doesn't revert the move
        const updatedRawTasks = allFetchedTasks.map((t) => (t.id === movedItem.id ? { ...t, status: newStatus } : t));
        setAllFetchedTasks(updatedRawTasks);

        // API Update
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${movedItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus }),
        });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col relative">
            <Link href="/dashboard" className="text-sm text-gray-500 mb-4 inline-block">
                ← Back to Dashboard
            </Link>

            <div className="flex justify-between items-center mb-6">
                {/* LEFT SIDE TITLE */}
                <h1 className="text-2xl font-bold">Task Management Board For All Agents</h1>

                {/* RIGHT SIDE CONTROLS */}
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex rounded-lg border overflow-hidden">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`px-4 py-2 text-sm transition ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                        >
                            Board
                        </button>

                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 text-sm transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                        >
                            List
                        </button>
                    </div>

                    {/* Add Task Button */}
                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition">
                        + Add Task
                    </button>
                </div>
            </div>

            {/* --- FILTER BUTTONS --- */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setFilterType('AGENT')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'AGENT' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white border text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    Agent Task
                </button>

                <button
                    onClick={() => setFilterType('ADMIN')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'ADMIN' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white border text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    Your Task
                </button>
            </div>

            {viewMode === 'board' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-4 gap-2 flex-1 h-full items-start">
                        <TaskColumn id="Pending" title="Planned" tasks={tasks.Pending} />
                        <TaskColumn id="InProgress" title="In Progress" tasks={tasks.InProgress} />
                        <TaskColumn id="Done" title="Done" tasks={tasks.Done} />
                        <TaskColumn id="Skipped" title="Skipped" tasks={tasks.Skipped} />
                    </div>
                </DragDropContext>
            ) : (
                <TaskListView tasks={tasks} />
            )}

            <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleCreateTask} agents={agents} />
        </div>
    );
}

// ... (Rest of your components: TaskListView, TaskColumn, TaskCard remain unchanged)
const TaskListView = ({ tasks }) => {
    const allTasks = Object.entries(tasks).flatMap(([status, items]) => items.map((t) => ({ ...t, _uiStatus: status })));

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-600">
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3">Agent</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Due</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Priority</th>
                    </tr>
                </thead>

                <tbody>
                    {allTasks.map((task) => {
                        const styles = STATUS_STYLES[task._uiStatus];
                        const isOverdue = new Date(task.due_date) < new Date() && task._uiStatus !== 'Done';

                        return (
                            <tr key={task.id} className="border-b hover:bg-gray-50 transition">
                                <td className="px-4 py-3 font-medium text-gray-900">{task.title}</td>

                                <td className="px-4 py-3 text-gray-600">{task.agent_name || 'Unassigned'}</td>

                                <td className="px-4 py-3">{task.category && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{task.category}</span>}</td>

                                <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>{new Date(task.due_date).toLocaleDateString()}</td>

                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>{task._uiStatus}</span>
                                </td>

                                <td className="px-4 py-3">
                                    {task.priority && (
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
        ${PRIORITY_STYLES[task.priority.toLowerCase()] || 'bg-gray-300 text-gray-700'}`}
                                        >
                                            {task.priority}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}

                    {allTasks.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-6 text-gray-400 text-sm">
                                No tasks available
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// --- TASK COLUMN COMPONENT ---
const TaskColumn = ({ id, title, tasks }) => {
    const styles = STATUS_STYLES[id];

    return (
        <div className={`rounded-xl border p-4 flex flex-col min-h-[600px] shadow-sm ${styles.columnBg}`}>
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className={`font-semibold ${styles.headerText}`}>{title}</h3>

                <span className={`text-xs font-bold px-2 py-1 rounded-full ${styles.badge}`}>{tasks.length}</span>
            </div>

            <Droppable droppableId={id}>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 space-y-3">
                        {tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <TaskCard task={task} status={id} isDragging={snapshot.isDragging} />
                                    </div>
                                )}
                            </Draggable>
                        ))}

                        {tasks.length === 0 && <div className="text-xs text-gray-400 text-center py-6">Drop tasks here</div>}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

// --- NEW TASK CARD UI (MATCHING SCREENSHOT) ---
const TaskCard = ({ task, status, isDragging }) => {
    const styles = STATUS_STYLES[status];
    // Helpers
    // const isOverdue = new Date(task.due_date) < new Date() && task.status !== "Completed" && task.status !== "Done";
    const isOverdue = new Date(task.due_date) < new Date() && status !== 'Done';

    const formatDate = (dateString) => {
        const options = { month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    const getCategoryStyle = (category) => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('review')) return 'bg-purple-100 text-purple-700';
        if (cat.includes('huddle')) return 'bg-gray-100 text-gray-700';
        if (cat.includes('field')) return 'bg-green-100 text-green-700';
        if (cat.includes('training')) return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <div
            className={`
    group rounded-xl p-4 transition-all duration-200 ease-out relative
    border-l-4 ${styles.cardBorder}
    ${styles.columnBg}
    ${isDragging ? 'shadow-lg scale-[1.02]' : 'shadow-sm hover:shadow-md'}
  `}
        >
            {/* Header: Title & Actions */}
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 leading-tight pr-4">{task.title}</h4>
                {/* Status Badge */}
                <span className={`inline-block mb-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>{status}</span>

                {/* Action Icons (Show on Hover) */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            {/* Sub-header: Agent & Category */}
            <div className="flex items-center flex-wrap gap-2 mb-4 text-sm">
                <span className="text-gray-500">{task.agent_name || 'Unassigned'}</span>
                <span className="text-gray-300">•</span>
                {task.category && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryStyle(task.category)}`}>{task.category}</span>}
            </div>

            {/* Footer: Date & Priority */}
            <div className="flex justify-between items-center mt-2">
                {/* Date Section */}
                <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>

                    <span>{formatDate(task.due_date)}</span>
                    {isOverdue && <span className="ml-1 text-[10px] font-semibold text-red-500">OVERDUE</span>}
                </div>

                {/* Priority Badge */}
                {task.priority?.toLowerCase() === 'high' && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">High</span>}
            </div>
        </div>
    );
};
