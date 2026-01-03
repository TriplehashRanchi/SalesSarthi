"use client";

import { useState } from "react";

export default function AddActivityModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    activity_date: new Date().toISOString().slice(0, 10),
    leads: "",
    meetings: "",
    sales: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onSave({
      ...form,
      leads: Number(form.leads || 0),
      meetings: Number(form.meetings || 0),
      sales: Number(form.sales || 0),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900">Log Activity</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-4">
          <input
            type="date"
            name="activity_date"
            value={form.activity_date}
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-2 text-sm"
          />

          <input
            type="number"
            name="leads"
            placeholder="Leads"
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-2 text-sm"
          />

          <input
            type="number"
            name="meetings"
            placeholder="Meetings"
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-2 text-sm"
          />

          <input
            type="number"
            name="sales"
            placeholder="Sales"
            onChange={handleChange}
            className="w-full border rounded-xl px-4 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow"
          >
            Save Activity
          </button>
        </div>
      </div>
    </div>
  );
}
