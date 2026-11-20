'use client';
import { Badge } from '@mantine/core';
import { normalizeCustomerStatus } from '@/utils/customerStatus';

const COLORS = { Active: 'green', Inactive: 'gray', Prospect: 'blue', 'Renewal Due': 'orange', Closed: 'red' };

// Customer status as a small coloured badge. Empty status shows as Active (the column default).
export default function CustomerStatusBadge({ status, size = 'sm' }) {
  const value = normalizeCustomerStatus(status);
  return (
    <Badge color={COLORS[value] || 'gray'} variant="light" size={size} className="shrink-0 normal-case">
      {value}
    </Badge>
  );
}
