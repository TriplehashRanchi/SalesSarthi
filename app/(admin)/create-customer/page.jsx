'use client'
import CustomerForm from "@/components/forms/customerform";
import { showNotification } from "@mantine/notifications";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function CreateCustomer() {

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const router = useRouter();

    const onSubmit = async (data) => {
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            await axios.post(`${API_URL}/api/customers`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            showNotification({ title: 'Success', message: 'Customer created successfully', color: 'green' });
            router.push('/customers');

        } catch (error) {
           showNotification({ title: 'Error', message: error.message, color: 'red' });
        }
    
    };

    return (
        <div>
            <CustomerForm  onSubmit={onSubmit} customerData={null}/>
        </div>
    );
}