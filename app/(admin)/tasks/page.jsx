"use client";
import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getAuth } from "firebase/auth";
import Link from "next/link";
import AddTaskModal from "@/components/admin/AddTaskModal"; 

export default function TaskBoard() {
  const [tasks, setTasks] = useState({ Pending: [], InProgress: [], Done: [], Skipped: [] });
  const [agents, setAgents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchTasks();
        fetchAgents();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const fetchTasks = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return; 

      const token = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to fetch tasks");

      const data = await res.json();
      
      const grouped = { Pending: [], InProgress: [], Done: [], Skipped: [] };
      
      data.forEach(t => {
         let status = t.status;
         // Normalize status strings from DB to UI
         if (status === "Planned") status = "Pending";
         if (status === "In Progress" || status === "in_progress") status = "InProgress"; 
         if (status === "Completed") status = "Done"; 
         if (status === "done") status = "Done"; 

         if(grouped[status]) {
             grouped[status].push(t);
         } else {
             grouped.Pending.push(t); 
         }
      });
      setTasks(grouped);

    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const fetchAgents = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAgents(data);
    } catch (error) {
      console.error("Error fetching agents", error);
    }
  };

  const handleCreateTask = async (newTaskData) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newTaskData)
      });

      if (res.ok) {
        setIsModalOpen(false); 
        fetchTasks(); 
      } else {
        alert("Failed to create task");
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // UI Update
    const sourceList = [...tasks[source.droppableId]];
    const destList = [...tasks[destination.droppableId]];
    const [movedItem] = sourceList.splice(source.index, 1);
    
    // Map column ID back to Backend Status
    let newStatus = destination.droppableId;
    if (newStatus === "Pending") newStatus = "Planned";
    if (newStatus === "Done") newStatus = "Completed";

    movedItem.status = newStatus;
    
    destList.splice(destination.index, 0, movedItem);
    
    setTasks({
      ...tasks,
      [source.droppableId]: sourceList,
      [destination.droppableId]: destList
    });

    // API Update
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${movedItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col relative">
       <Link href="/dashboard" className="text-sm text-gray-500 mb-4 inline-block">← Back to Dashboard</Link>
       
       <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold">Task management Board For All Agents</h1>
         <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
         >
           + Add Task
         </button>
       </div>

       <div className="flex gap-4 mb-6">
         {['Create Daily Huddles', 'Create Weekly Review', 'Create Monthly R&R'].map(txt => (
            <button key={txt} className="bg-white border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 font-medium text-gray-700">
              {txt}
            </button>
         ))}
       </div>

       <DragDropContext onDragEnd={onDragEnd}>
         <div className="grid grid-cols-4 gap-6 flex-1 h-full items-start">
            <TaskColumn id="Pending" title="Planned" tasks={tasks.Pending} />
            <TaskColumn id="InProgress" title="In Progress" tasks={tasks.InProgress} />
            <TaskColumn id="Done" title="Done" tasks={tasks.Done} />
            <TaskColumn id="Skipped" title="Skipped" tasks={tasks.Skipped} />
         </div>
       </DragDropContext>

       <AddTaskModal 
           isOpen={isModalOpen} 
           onClose={() => setIsModalOpen(false)} 
           onSave={handleCreateTask}
           agents={agents}
       />
    </div>
  );
}

// --- TASK COLUMN COMPONENT ---
const TaskColumn = ({ id, title, tasks }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col min-h-[600px] shadow-sm">
    <div className="flex justify-between items-center mb-4 px-1">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">{tasks.length}</span>
    </div>
    
    <Droppable droppableId={id}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 space-y-3">
          {tasks.map((task, index) => (
            <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <TaskCard task={task} />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </div>
);

// --- NEW TASK CARD UI (MATCHING SCREENSHOT) ---
const TaskCard = ({ task }) => {
  // Helpers
  const isOverdue = new Date(task.due_date) < new Date() && task.status !== "Completed" && task.status !== "Done";
  
  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getCategoryStyle = (category) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("review")) return "bg-purple-100 text-purple-700";
    if (cat.includes("huddle")) return "bg-gray-100 text-gray-700";
    if (cat.includes("field")) return "bg-green-100 text-green-700";
    if (cat.includes("training")) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
      
      {/* Header: Title & Actions */}
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900 leading-tight pr-4">
          {task.title}
        </h4>
        
        {/* Action Icons (Show on Hover) */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-gray-400 hover:text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </button>
          <button className="text-gray-400 hover:text-red-600">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>

      {/* Sub-header: Agent & Category */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className="text-gray-500">{task.agent_name || "Unassigned"}</span>
        <span className="text-gray-300">•</span>
        {task.category && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryStyle(task.category)}`}>
            {task.category}
          </span>
        )}
      </div>

      {/* Footer: Date & Priority */}
      <div className="flex justify-between items-center mt-2">
        {/* Date Section */}
        <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          
          <span>{formatDate(task.due_date)}</span>
          {isOverdue && <span>(Overdue)</span>}
        </div>

        {/* Priority Badge */}
        {task.priority?.toLowerCase() === 'high' && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            High
          </span>
        )}
      </div>
    </div>
  );
};