'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader, Notification, ActionIcon, Avatar, Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import axios from 'axios';
import CustomerForm from '@/components/forms/customerform';

const EditCustomer = () => {
    const { id } = useParams();
    const router = useRouter();
    const [customerData, setCustomerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/customers/${id}`);
                setCustomerData(response.data);
            } catch (err) {
                setError('Failed to fetch customer data.');
            } finally {
                setLoading(false);
            }
        };
        fetchCustomer();
    }, [id]);

    const handleUpdateCustomer = async (updatedData) => {
        try {
            await axios.put(`${API_URL}/api/customers/${id}`, updatedData);
            router.push('/customers');  // Redirect after update
        } catch (err) {
            setError('Failed to update customer.');
        }
    };

    if (loading) return <Loader />;
    if (error) return <Notification color="red">{error}</Notification>;

    return (
        <div className="panel max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent">
            <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
                <ActionIcon variant="subtle" color="dark" onClick={() => router.push('/customers')} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <Avatar color="blue" variant="light" radius="xl" size="lg">
                    {(customerData.full_name || '?').trim().charAt(0).toUpperCase()}
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold leading-tight dark:text-white-light md:text-xl">{customerData.full_name}</div>
                    <div className="truncate text-sm text-gray-500">Editing customer</div>
                </div>
                <Button className="hidden md:inline-flex" variant="default" onClick={() => router.push('/customers')}>
                    Cancel
                </Button>
            </div>
            <CustomerForm customerData={customerData} onSubmit={handleUpdateCustomer} />
        </div>
    );
};

export default EditCustomer;
