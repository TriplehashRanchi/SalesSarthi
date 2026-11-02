'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader, Notification } from '@mantine/core';
import axios from 'axios';
import CustomerQuickActions from '@/components/common/CustomerQuickActions';
import LinkedFinancialKundli from '@/components/common/LinkedFinancialKundli';
import LinkedFinHealthCheckups from '@/components/common/LinkedFinHealthCheckups';
import AppointmentDrawer from '@/components/Leadtable/AppointmentDrawer';

const fmtDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
};

const ViewCustomer = () => {
    const { id } = useParams();
    const router = useRouter();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDrawer, setOpenDrawer] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/customers/${id}`);
                setCustomer(response.data);
            } catch (err) {
                setError('Failed to fetch customer data.');
            } finally {
                setLoading(false);
            }
        };
        fetchCustomer();
    }, [id]);

    if (loading) return <Loader />;
    if (error || !customer) return <Notification color="red">{error || 'Customer not found.'}</Notification>;

    const openFinCheckup = () => {
        const qs = new URLSearchParams({ id: customer.id, type: 'customer', name: customer.full_name, phone: customer.phone_number, email: customer.email }).toString();
        router.push(`/fincalc?${qs}`);
    };

    const fields = [
        { label: 'Full Name', value: customer.full_name },
        { label: 'Email', value: customer.email },
        { label: 'Phone Number', value: customer.phone_number },
        { label: 'Gender', value: customer.gender },
        { label: 'Date of Birth', value: fmtDate(customer.date_of_birth) },
        { label: 'Anniversary', value: fmtDate(customer.anniversary) },
        { label: 'Address', value: customer.address, textarea: true },
        { label: 'Company Name', value: customer.company_name },
        { label: 'Product Name', value: customer.product_name },
        { label: 'Policy Number', value: customer.policy_number },
        { label: 'Premium', value: customer.premium },
        { label: 'Coverage Amount', value: customer.coverage_amount },
        { label: 'Renewal Date', value: fmtDate(customer.renewal_date) },
        { label: 'Status', value: customer.status },
        { label: 'Source', value: customer.source },
        { label: 'Referrer', value: customer.referrer },
        { label: 'Notes', value: customer.notes, textarea: true },
    ];

    return (
        <div className="panel">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 break-words text-lg sm:text-xl">View Customer: {customer.full_name}</h2>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <CustomerQuickActions customer={customer} onAppointment={() => setOpenDrawer(true)} size="lg" />
                    <button type="button" className="btn btn-outline-primary flex-1 sm:flex-none" onClick={() => router.push('/customers')}>
                        Back
                    </button>
                    <button type="button" className="btn btn-outline-success flex-1 sm:flex-none" onClick={openFinCheckup}>
                        Fin-Health Checkup
                    </button>
                    <button type="button" className="btn btn-primary flex-1 sm:flex-none" onClick={() => router.push(`/edit-customer/${customer.id}`)}>
                        Edit Customer
                    </button>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <LinkedFinHealthCheckups type="customer" entity={customer} />
                <LinkedFinancialKundli type="customer" entity={customer} />
            </div>

            <div className="form-container p-4 sm:p-6 bg-white rounded shadow-md">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Customer Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fields.map(({ label, value, textarea }) => (
                        <div key={label}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                            {textarea ? <textarea readOnly value={value ?? ''} className="form-textarea w-full" /> : <input type="text" readOnly value={value ?? ''} className="form-input w-full" />}
                        </div>
                    ))}
                </div>
            </div>
            <AppointmentDrawer customer={customer} opened={openDrawer} onClose={() => setOpenDrawer(false)} />
        </div>
    );
};

export default ViewCustomer;
