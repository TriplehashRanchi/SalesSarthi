'use client';
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import {
  IconCalendar, IconUserPlus, IconBriefcase, IconCurrencyDollar,
  IconSend, IconPencil, IconLoader, IconCheck, IconX, IconTrendingUp
} from '@tabler/icons-react';

// ==========================================
// 1. TOAST NOTIFICATION
// ==========================================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-lg border transition-all animate-fade-in ${
      isSuccess ? 'bg-white border-emerald-100 text-emerald-700' : 'bg-white border-red-100 text-red-700'
    }`}>
      <div className={`p-1 rounded-full ${isSuccess ? 'bg-emerald-100' : 'bg-red-100'}`}>
        {isSuccess ? <IconCheck size={16} /> : <IconX size={16} />}
      </div>
      <span className="text-sm font-medium text-gray-800">{message}</span>
    </div>
  );
};

// ==========================================
// 2. STAT CARD (Top Header)
// ==========================================
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
      <Icon size={22} stroke={1.5} />
    </div>
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

// ==========================================
// 3. INPUT FIELD
// ==========================================
const InputField = ({ label, type, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
    />
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function UserActivity() {
  // --- STATE ---
  const [form, setForm] = useState({
    activity_date: new Date().toLocaleDateString('en-CA'),
    leads: '',
    meetings: '',
    sales: '',
  });

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);

  const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/activities`;

  // --- API HELPERS ---
  const getAuthHeader = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    const token = await user.getIdToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchHistory = async () => {
    try {
      const config = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/user/history`, config);
      setHistory(res.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchHistory();
    });
    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const showToast = (message, type) => setToast({ message, type });

  const resetForm = () => {
    setForm({
      activity_date: new Date().toLocaleDateString('en-CA'),
      leads: '',
      meetings: '',
      sales: ''
    });
    setEditId(null);
  };

  const handleEdit = (item) => {
    const dateStr = new Date(item.activity_date).toLocaleDateString('en-CA');
    setForm({
      activity_date: dateStr,
      leads: item.leads,
      meetings: item.meetings,
      sales: item.sales,
    });
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (form.leads === '' || form.meetings === '' || form.sales === '') {
      return showToast('Please fill in all fields', 'error');
    }

    setSubmitting(true);
    try {
      const config = await getAuthHeader();
      const payload = {
        activity_date: form.activity_date,
        leads: parseInt(form.leads),
        meetings: parseInt(form.meetings),
        sales: parseInt(form.sales),
      };

      if (editId) {
        await axios.put(`${API_BASE}/user/${editId}`, payload, config);
        showToast('Activity updated', 'success');
      } else {
        await axios.post(`${API_BASE}/user`, payload, config);
        showToast('Activity logged', 'success');
      }

      await fetchHistory();
      resetForm();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Something went wrong";
      if (errorMsg.includes("already submitted")) {
        showToast("Already logged today. Edit below.", 'error');
      } else {
        showToast(errorMsg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => history.reduce((acc, curr) => ({
    leads: acc.leads + curr.leads,
    meetings: acc.meetings + curr.meetings,
    sales: acc.sales + curr.sales
  }), { leads: 0, meetings: 0, sales: 0 }), [history]);

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans p-6 md:p-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Activity Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Track your daily performance metrics.</p>
          </div>
          
          <div className="flex gap-3">
             <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-medium text-gray-600">
                Total Entries: <span className="text-gray-900 font-bold ml-1">{history.length}</span>
             </div>
          </div>
        </div>

        {/* TOP STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Leads" value={stats.leads} icon={IconUserPlus} color="bg-blue-500" />
          <StatCard label="Total Meetings" value={stats.meetings} icon={IconBriefcase} color="bg-purple-500" />
          <StatCard label="Total Sales" value={stats.sales} icon={IconCurrencyDollar} color="bg-emerald-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: FORM CARD */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">
                {editId ? 'Edit Entry' : 'Log Activity'}
              </h2>
              {editId && (
                <button onClick={resetForm} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded transition">
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-4">
              <InputField 
                label="Date" 
                type="date" 
                value={form.activity_date} 
                onChange={(e) => setForm({...form, activity_date: e.target.value})} 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <InputField 
                  label="Leads" 
                  type="number" 
                  placeholder="0" 
                  value={form.leads} 
                  onChange={(e) => setForm({...form, leads: e.target.value})} 
                />
                <InputField 
                  label="Meetings" 
                  type="number" 
                  placeholder="0" 
                  value={form.meetings} 
                  onChange={(e) => setForm({...form, meetings: e.target.value})} 
                />
              </div>

              <InputField 
                label="Sales" 
                type="number" 
                placeholder="0" 
                value={form.sales} 
                onChange={(e) => setForm({...form, sales: e.target.value})} 
              />

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`w-full mt-2 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all flex justify-center items-center gap-2
                  ${editId ? 'bg-gray-900 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {submitting ? <IconLoader className="animate-spin" size={18} /> : (editId ? <IconRefresh size={18} /> : <IconSend size={18} />)}
                {editId ? 'Update Record' : 'Submit Activity'}
              </button>
            </div>
          </div>

          {/* RIGHT: HISTORY TABLE */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <IconTrendingUp size={18} className="text-gray-400" />
              <h3 className="font-semibold text-gray-700">Recent History</h3>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center text-gray-400 text-sm">Loading data...</div>
              ) : history.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">No records found. Start logging!</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium text-center">Leads</th>
                      <th className="px-6 py-3 font-medium text-center">Meetings</th>
                      <th className="px-6 py-3 font-medium text-center">Sales</th>
                      {/* <th className="px-6 py-3 font-medium text-right">Action</th> */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-gray-900">
                           {new Date(item.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {item.leads}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                            {item.meetings}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            {item.sales}
                          </span>
                        </td>
                        {/* <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleEdit(item)} 
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-blue-50"
                            title="Edit"
                          >
                            <IconPencil size={16} />
                          </button>
                        </td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Helper icon import fix
const IconRefresh = ({size}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>
);