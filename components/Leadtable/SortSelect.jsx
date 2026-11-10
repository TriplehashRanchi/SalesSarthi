'use client';
// "Sort by" dropdown for the lead lists (admin and team member, desktop and phone).
// It drives the same sortStatus as the table's column headers, so both always agree.
// Sorting happens on the server (GET /api/lead-list ?sort=&dir=), so it covers every lead, not just the page on screen.
import { Select } from '@mantine/core';
import { IconArrowsSort } from '@tabler/icons-react';

export const SORT_OPTIONS = [
    { value: 'created_at:desc', label: 'Date added: Newest first' },
    { value: 'created_at:asc', label: 'Date added: Oldest first' },
    { value: 'full_name:asc', label: 'Name: A to Z' },
    { value: 'full_name:desc', label: 'Name: Z to A' },
];

const SortSelect = ({ sortStatus, onChange, className, style, size }) => {
    const current = `${sortStatus?.columnAccessor}:${sortStatus?.direction}`;
    // sorted by another column (status, phone...) through the table header -> nothing selected here
    const value = SORT_OPTIONS.some((o) => o.value === current) ? current : null;
    return (
        <Select
            aria-label="Sort leads"
            placeholder="Sort by"
            icon={<IconArrowsSort size={16} />}
            data={SORT_OPTIONS}
            value={value}
            onChange={(v) => {
                if (!v) return;
                const [columnAccessor, direction] = v.split(':');
                onChange({ columnAccessor, direction });
            }}
            radius="xl"
            size={size}
            className={className}
            style={style}
            withinPortal
        />
    );
};

export default SortSelect;
