import ComponentsDashboardAnalytics from '@/components/dashboard/analytics';
import ComponentsDashboardFinance from '@/components/dashboard/finance';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Sales Admin',
};

const Sales = () => {
    return (
        <div>
            <ComponentsDashboardFinance />
            {/* <ComponentsDashboardAnalytics /> */}
        </div>
    );
};

export default Sales;
