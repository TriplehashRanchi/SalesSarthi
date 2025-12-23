'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AddAgentModal({ isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        employment_type: 'Full-time',
        date_of_birth: '',
        last_active_date: new Date().toISOString().split('T')[0], // Default to today
        leads: 0,
        meetings: 0,
        sales: 0,
    });

    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [errors, setErrors] = useState({});

    // Handle animation mounting
    useEffect(() => {
        if (isOpen) setIsVisible(true);
        else setTimeout(() => setIsVisible(false), 200);
    }, [isOpen]);

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (['leads', 'meetings', 'sales'].includes(name)) value = Number(value);
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        if (!formData.first_name || !formData.email || !formData.password) {
            toast.error('Please fill in First Name, Email, and Password.');
            return;
        }

        if (!formData.phone || formData.phone.length !== 10) {
            setErrors({ phone: 'Phone number must be exactly 10 digits' });
            return;
        }

        setLoading(true);

        try {
            await onSave({
                ...formData,
                phone: `+91${formData.phone}`,
            });

            toast.success('Agent created successfully ✅');

            onClose();
        } catch (error) {
            toast.error('Failed to create agent. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, ''); // only digits

        if (value.length > 10) return;

        setFormData((prev) => ({
            ...prev,
            phone: value,
        }));

        // Clear error while typing
        setErrors((prev) => ({ ...prev, phone: '' }));
    };

    const validateForm = () => {
        let newErrors = {};

        if (formData.phone.length !== 10) {
            newErrors.phone = 'Phone number must be exactly 10 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
            {/* BACKDROP */}
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            {/* MODAL CONTAINER */}
            <div
                className={`relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl transform transition-all duration-300 flex flex-col max-h-[90vh] ${
                    isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                }`}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white rounded-t-2xl z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">New Agent</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Enter details to onboard a new team member.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                    {/* Section 1: Personal Details */}
                    <div className="space-y-5">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Personal Information</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Input label="First Name" name="first_name" placeholder="John" value={formData.first_name} onChange={handleChange} />
                            <Input label="Last Name" name="last_name" placeholder="Doe" value={formData.last_name} onChange={handleChange} />
                        </div>

                        <Input label="Email Address" name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleChange} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Input label="Phone Number" name="phone" placeholder="9876543210" value={formData.phone} onChange={handlePhoneChange} error={errors.phone} />

                            <Select
                                label="Employment Type"
                                name="employment_type"
                                value={formData.employment_type}
                                onChange={handleChange}
                                options={['Full-time', 'Part-time', 'Contract', 'Freelance']}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Input label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} />
                            <Input label="Password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Section 2: Initial Metrics (Visual separation) */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>
                            <h3 className="text-sm font-bold text-gray-800">Initial Performance Data</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Input label="Last Active Date" name="last_active_date" type="date" value={formData.last_active_date} onChange={handleChange} bg="bg-white" />
                            <div className="grid grid-cols-3 gap-2 sm:col-span-1">
                                <Input label="Leads" name="leads" type="number" value={formData.leads} onChange={handleChange} bg="bg-white" />
                                <Input label="Meetings" name="meetings" type="number" value={formData.meetings} onChange={handleChange} bg="bg-white" />
                                <Input label="Sales" name="sales" type="number" value={formData.sales} onChange={handleChange} bg="bg-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Creating...
                            </>
                        ) : (
                            'Create Agent'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* REUSABLE UI COMPONENTS */

function Input({ label, name, value, onChange, type = 'text', placeholder, bg = 'bg-gray-50' }) {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-gray-700 ml-1">{label}</label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-2.5 ${bg} border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-gray-300`}
            />
        </div>
    );
}

function Select({ label, name, value, onChange, options }) {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-gray-700 ml-1">{label}</label>
            <div className="relative">
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-gray-300 cursor-pointer"
                >
                    {options.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
