"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAuth } from "firebase/auth";
import {
    IconCalendar,
    IconUserPlus,
    IconBriefcase,
    IconCurrencyDollar,
    IconSend,
    IconRefresh,
    IconHistory,
    IconListCheck,
    IconPencil
} from "@tabler/icons-react";

// --- UI COMPONENTS (Moved Outside to fix typing focus issue) ---

const InputField = ({ icon: Icon, type, placeholder, value, onChange }) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
            <Icon size={20} stroke={1.5} />
        </div>
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full pl-10 pr-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all shadow-sm hover:shadow-md font-medium text-gray-700 placeholder-gray-400"
        />
    </div>
);

const StatBadge = ({ icon: Icon, label, value, color }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${color} bg-opacity-10 border border-opacity-20`}>
        <Icon size={16} className={color.replace('bg-', 'text-')} />
        <span className="text-xs text-gray-500 font-medium uppercase">{label}</span>
        <span className={`text-sm font-bold ${color.replace('bg-', 'text-')}`}>{value}</span>
    </div>
);

// --- MAIN COMPONENT ---

export default function UserActivity() {
    // Helper to get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const [form, setForm] = useState({
        activity_date: getTodayDate(), // ✅ Set default date to Today
        leads: "",
        meetings: "",
        sales: "",
    });

    const [history, setHistory] = useState([]);
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Setup Axios
    const API = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
    });

    API.interceptors.request.use(async (config) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            const idToken = await user.getIdToken();
            config.headers.Authorization = `Bearer ${idToken}`;
        }
        return config;
    });

    const addUserActivity = async () => API.post("/api/activities/user", form);
    const updateUserActivity = async (id) => API.put(`/api/activities/user/${id}`, form);
    const getHistory = async () => API.get("/api/activities/user/history");

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await getHistory();
            setHistory(res.data);
        } catch (err) {
            console.log("Error loading history", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.activity_date) {
            alert("Please select date!");
            return;
        }

        try {
            if (editId) {
                await updateUserActivity(editId);
            } else {
                await addUserActivity();
            }

            // Reset form but keep today's date
            setForm({ activity_date: getTodayDate(), leads: "", meetings: "", sales: "" });
            setEditId(null);
            fetchHistory();
        } catch (err) {
            alert("Error: " + (err?.response?.data?.error || "Something went wrong"));
        }
    };

    const handleEdit = (a) => {
        setEditId(a.id);
        setForm({
            activity_date: a.activity_date.split('T')[0], 
            leads: a.leads,
            meetings: a.meetings,
            sales: a.sales,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 relative overflow-hidden font-sans text-gray-800">
            
            {/* Background Decor Blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

            <div className="max-w-5xl mx-auto px-4 py-12 relative z-10">
                
                {/* PAGE HEADER */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-xl mb-4 text-blue-600">
                        <IconListCheck size={32} stroke={1.5} />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
                        Activity <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Dashboard</span>
                    </h1>
                    <p className="text-lg text-gray-500">Track your daily progress and performance.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT COLUMN: FORM */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-8">
                            <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-6 md:p-8 overflow-hidden relative">
                                {/* Gradient Top Border */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {editId ? "Edit Entry" : "Log Activity"}
                                    </h3>
                                    {editId && (
                                        <button 
                                            onClick={() => {
                                                setEditId(null); 
                                                setForm({ activity_date: getTodayDate(), leads: "", meetings: "", sales: "" })
                                            }}
                                            className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-600 transition"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">Date</label>
                                        <InputField 
                                            icon={IconCalendar} 
                                            type="date" 
                                            value={form.activity_date} 
                                            onChange={(e) => setForm({ ...form, activity_date: e.target.value })} 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">Leads</label>
                                            <InputField 
                                                icon={IconUserPlus} 
                                                type="number" 
                                                placeholder="0"
                                                value={form.leads} 
                                                onChange={(e) => setForm({ ...form, leads: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">Meetings</label>
                                            <InputField 
                                                icon={IconBriefcase} 
                                                type="number" 
                                                placeholder="0"
                                                value={form.meetings} 
                                                onChange={(e) => setForm({ ...form, meetings: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">Sales</label>
                                        <InputField 
                                            icon={IconCurrencyDollar} 
                                            type="number" 
                                            placeholder="0"
                                            value={form.sales} 
                                            onChange={(e) => setForm({ ...form, sales: e.target.value })} 
                                        />
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 mt-4
                                            ${editId 
                                                ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/30" 
                                                : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30"
                                            }`}
                                    >
                                        {editId ? <IconRefresh size={20} /> : <IconSend size={20} />}
                                        {editId ? "Update Activity" : "Submit Log"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: HISTORY */}
                    <div className="lg:col-span-7">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <IconHistory size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">Recent History</h3>
                            </div>
                            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border">
                                Total Entries: {history.length}
                            </span>
                        </div>

                        {loading ? (
                             <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                <p className="text-gray-400 font-medium">Loading records...</p>
                             </div>
                        ) : history.length === 0 ? (
                            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-dashed border-gray-300 p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <IconListCheck size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-700">No activities yet</h4>
                                <p className="text-gray-500">Fill out the form to start tracking your success.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {history.map((a) => (
                                    <div
                                        key={a.id}
                                        className="group bg-white/80 hover:bg-white backdrop-blur-sm border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-lg rounded-2xl p-5 transition-all duration-300 relative overflow-hidden"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            
                                            {/* Date Section */}
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-xl flex flex-col items-center justify-center border border-blue-100">
                                                    <span className="text-xs font-bold uppercase">{new Date(a.activity_date).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-lg font-extrabold leading-none">{new Date(a.activity_date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <p className="text-gray-900 font-bold">Activity Logged</p>
                                                    <p className="text-xs text-gray-500">{new Date(a.activity_date).getFullYear()}</p>
                                                </div>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="flex flex-wrap gap-2">
                                                <StatBadge icon={IconUserPlus} label="Leads" value={a.leads} color="bg-purple-500 border-purple-200 text-purple-600" />
                                                <StatBadge icon={IconBriefcase} label="Mtgs" value={a.meetings} color="bg-blue-500 border-blue-200 text-blue-600" />
                                                <StatBadge icon={IconCurrencyDollar} label="Sales" value={a.sales} color="bg-green-500 border-green-200 text-green-600" />
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                onClick={() => handleEdit(a)}
                                                className="absolute top-4 right-4 sm:static opacity-0 group-hover:opacity-100 bg-gray-900 hover:bg-black text-white p-2 rounded-lg transition-all transform translate-x-4 group-hover:translate-x-0"
                                                title="Edit Entry"
                                            >
                                                <IconPencil size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}