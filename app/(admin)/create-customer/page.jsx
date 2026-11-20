'use client'
import CustomerForm from "@/components/forms/customerform";
import { ActionIcon } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import DuplicateCustomerModal from "@/components/customers/DuplicateCustomerModal";
import useCreateCustomer from "@/components/customers/useCreateCustomer";
import { useRouter } from "next/navigation";

export default function CreateCustomer() {

    const router = useRouter();
    const { submit, duplicate, modalProps } = useCreateCustomer({ endpoint: '/api/customers', onSaved: () => router.push('/customers') });

    // false → not saved yet (duplicate to review, or an error was shown); the form keeps what was typed.
    const onSubmit = async (data) => {
        const { id, ...body } = data;
        return submit(body);
    };

    return (
        <div>
            <div className="mb-5 flex items-center gap-2 sm:mb-6 sm:gap-3">
                <ActionIcon variant="subtle" color="dark" size="lg" radius="xl" className="-ml-1.5 shrink-0" onClick={() => router.push('/customers')} aria-label="Back">
                    <IconArrowLeft size={22} />
                </ActionIcon>
                <h2 className="min-w-0 truncate text-lg font-semibold text-gray-800 dark:text-white-light sm:text-xl">Add New Customer</h2>
            </div>
            <CustomerForm onSubmit={onSubmit} customerData={null} hideTitle />
            <DuplicateCustomerModal duplicate={duplicate} profilePath={(id) => `/view-customer/${id}`} {...modalProps} />
        </div>
    );
}