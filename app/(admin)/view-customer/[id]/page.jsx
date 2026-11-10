'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader, Notification, Avatar, ActionIcon, Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
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

    const visibleFields = fields.filter((f) => f.value !== null && f.value !== undefined && f.value !== '');

    return (
        <div className="panel max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 pb-4">
                <ActionIcon variant="subtle" color="dark" onClick={() => router.push('/customers')} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <Avatar color="blue" variant="light" radius="xl" size="lg">
                    {(customer.full_name || '?').trim().charAt(0).toUpperCase()}
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold leading-tight dark:text-white-light md:text-xl">{customer.full_name}</div>
                    <div className="text-sm text-gray-500">{customer.phone_number}</div>
                </div>
                <CustomerQuickActions customer={customer} onAppointment={() => setOpenDrawer(true)} size="xl" plain />
                <div className="hidden items-center gap-2 md:flex">
                    <Button variant="light" color="blue" onClick={openFinCheckup}>
                        Fin-Health Checkup
                    </Button>
                    <Button color="blue" onClick={() => router.push(`/edit-customer/${customer.id}`)}>
                        Edit Customer
                    </Button>
                </div>
            </div>
            <div className="flex gap-2 pb-4 md:hidden">
                <Button className="flex-1" variant="light" color="blue" onClick={openFinCheckup}>
                    Fin-Health Checkup
                </Button>
                <Button className="flex-1" color="blue" onClick={() => router.push(`/edit-customer/${customer.id}`)}>
                    Edit Customer
                </Button>
            </div>

            {/* Linked reports: no boxes, just a divider under each */}
            <div className="mb-4 grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2 [&_.mantine-Paper-root]:!rounded-none [&_.mantine-Paper-root]:!border-0 [&_.mantine-Paper-root]:!border-b [&_.mantine-Paper-root]:!bg-transparent [&_.mantine-Paper-root]:!px-0 [&_.mantine-Paper-root]:!shadow-none">
                <LinkedFinHealthCheckups type="customer" entity={customer} />
                <LinkedFinancialKundli type="customer" entity={customer} />
            </div>

            {/* Details */}
            <div className="pb-1 pt-2 text-base font-semibold dark:text-white-light">Customer Details</div>
            <div className="grid grid-flow-dense grid-cols-2 gap-x-6 md:grid-cols-3">
                {visibleFields.map(({ label, value, textarea }) => {
                    const text = String(value);
                    // Short values pair up; long or multi-line ones take a full row on phones.
                    const span = textarea ? 'col-span-2 md:col-span-3' : text.length > 18 ? 'col-span-2 md:col-span-1' : '';
                    return (
                        <div key={label} className={`min-w-0 border-b border-gray-200 py-3 dark:border-gray-700 ${span}`}>
                            <div className="text-xs text-gray-500">{label}</div>
                            <div className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium dark:text-white-light">{text}</div>
                        </div>
                    );
                })}
            </div>
            <AppointmentDrawer customer={customer} opened={openDrawer} onClose={() => setOpenDrawer(false)} />
        </div>
    );
};

export default ViewCustomer;
