'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader, Notification } from '@mantine/core';
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
        <div className="panel">
            <h2>Edit Customer: {customerData.full_name}</h2>
            <CustomerForm customerData={customerData} onSubmit={handleUpdateCustomer} />
        </div>
    );
};

export default EditCustomer;
