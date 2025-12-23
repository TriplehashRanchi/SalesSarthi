'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AddIncomeModal({ isOpen, onClose, onSave }) {
    const [form, setForm] = useState({
        month: '',
        income: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!form.month || !form.income) {
            toast.error('Please select a month and enter income amount.');
            return;
        }

        setLoading(true);

        try {
            await onSave(form);

            toast.success('Income record added successfully ✅');

            // Reset form
            setForm({ month: '', income: '' });

            onClose();
        } catch (error) {
            toast.error('Failed to add income record. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-lg text-gray-800">Add Income Record</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">Record monthly income for this agent.</p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <input
                            type="month"
                            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.month}
                            onChange={(e) => setForm({ ...form, month: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Income (₹)</label>
                        <input
                            type="number"
                            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. 50000"
                            value={form.income}
                            onChange={(e) => setForm({ ...form, income: e.target.value })}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Record'}
                    </button>
                </div>
            </div>
        </div>
    );
}
