'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import superAdminAxios from '@/utils/superAdminAxios';
import { DatePicker } from '@mantine/dates';
import { Button, Group } from '@mantine/core';

const DailyEarningsChart = () => {
  const [dailyData, setDailyData] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const fetchDailyEarnings = async () => {
    try {
      const res = await superAdminAxios.get('/api/superadmin/transactions');
      const transactions = res.data || [];

      // Filter for successful transactions and date range
      const filteredTxns = transactions.filter(txn => {
        if (txn.status !== 'Success') return false;
        const txnDate = new Date(txn.txn_date.replace(" ", "T")); // normalize
        if (fromDate && txnDate < fromDate) return false;
        if (toDate && txnDate > toDate) return false;
        return true;
      });

      // Group by day
      const dailyTotals = {};
      let total = 0;

      filteredTxns.forEach(txn => {
        const date = new Date(txn.txn_date.replace(" ", "T"));
        const day = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
        if (!dailyTotals[day]) dailyTotals[day] = 0;

        // Ensure numeric value
        const amount = parseFloat(txn.amount) || 0;
        dailyTotals[day] += amount;
        total += amount;
      });

      // Convert to chart data
      const chartData = Object.entries(dailyTotals).map(([date, earnings]) => ({
        date,
        earnings: parseFloat(earnings.toFixed(2)),
      }));

      // Sort chronologically
      chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

      setDailyData(chartData);
      setTotalEarnings(total);
    } catch (err) {
      console.error('Failed to load chart data:', err.message);
    }
  };

  useEffect(() => {
    fetchDailyEarnings();
  }, []);

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Total Earnings: <span className="text-blue-600">₹{totalEarnings.toLocaleString()}</span>
        </h2>
        <Group>
          <DatePicker label="From" value={fromDate} onChange={setFromDate} />
          <DatePicker label="To" value={toDate} onChange={setToDate} />
          <Button onClick={fetchDailyEarnings}>Apply Filter</Button>
        </Group>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#888" />
            <YAxis tickFormatter={(v) => `₹${v.toLocaleString()}`} />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} labelFormatter={(label) => `Date: ${label}`} />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorEarnings)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DailyEarningsChart;
