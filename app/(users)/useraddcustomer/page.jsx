'use client'
import CustomerForm from "@/components/forms/customerform";
import { showNotification } from "@mantine/notifications";
import { ActionIcon } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function UserAddCustomer() {

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const router = useRouter();

    const onSubmit = async (data) => {
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            const { id, ...body } = data;
            const res = await axios.post(`${API_URL}/api/customers/user`, body, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            showNotification(
                res.data?.merged
                    ? { title: 'Merged', message: 'This customer already existed (same phone/email). Added the product line(s) to that customer.', color: 'blue' }
                    : { title: 'Success', message: 'Customer created successfully', color: 'green' },
            );
            router.push('/usercustomers');

        } catch (error) {
           showNotification({ title: 'Error', message: error.message, color: 'red' });
        }
    
    };

    return (
        <div>
            <div className="mb-5 flex items-center gap-2 sm:mb-6 sm:gap-3">
                <ActionIcon variant="subtle" color="dark" size="lg" radius="xl" className="-ml-1.5 shrink-0" onClick={() => router.push('/usercustomers')} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <h2 className="min-w-0 truncate text-lg font-semibold text-gray-800 dark:text-white-light sm:text-xl">Add New Customer</h2>
            </div>
            <CustomerForm onSubmit={onSubmit} customerData={null} hideTitle />
        </div>
    );
}