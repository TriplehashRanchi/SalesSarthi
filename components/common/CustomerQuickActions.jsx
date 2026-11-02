'use client';

import { ActionIcon, Group } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconBrandWhatsapp, IconCalendarPlus, IconPhoneCall } from '@tabler/icons-react';

// Returns a 10-digit Indian mobile number, or null when the value isn't one.
const toTenDigitMobile = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
    return /^[6-9]\d{9}$/.test(ten) ? ten : null;
};

const CustomerQuickActions = ({ customer, onAppointment, size = 'md' }) => {
    const warn = (message) => showNotification({ title: 'Cannot continue', message, color: 'red' });

    const handleCall = () => {
        const digits = String(customer.phone_number || '').replace(/[^\d+]/g, '');
        if (!digits) return warn('Phone number is missing.');
        window.open(`tel:${digits}`, '_self');
    };

    const handleMessage = () => {
        const ten = toTenDigitMobile(customer.phone_number);
        if (!ten) return warn('Invalid Indian mobile number.');
        window.open(`https://wa.me/91${ten}?text=${encodeURIComponent(`Hello ${customer.full_name},`)}`, '_blank');
    };

    return (
        <Group spacing={6} noWrap onClick={(e) => e.stopPropagation()}>
            <ActionIcon title="Call" size={size} variant="light" color="blue" aria-label="Call customer" onClick={handleCall}>
                <IconPhoneCall size={16} />
            </ActionIcon>
            <ActionIcon title="WhatsApp message" size={size} variant="light" color="green" aria-label="Message customer on WhatsApp" onClick={handleMessage}>
                <IconBrandWhatsapp size={16} />
            </ActionIcon>
            <ActionIcon title="Appointments" size={size} variant="light" color="violet" aria-label="Manage appointments" onClick={() => onAppointment(customer)}>
                <IconCalendarPlus size={16} />
            </ActionIcon>
        </Group>
    );
};

export default CustomerQuickActions;
