'use client';

import { useEffect, useState } from 'react';
import superAdminAxios from '@/utils/superAdminAxios';
import { DataTable } from 'mantine-datatable';
import { TextInput, Select, Button, Grid, Badge } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconDownload } from '@tabler/icons-react';
import { CSVLink } from 'react-csv';

const TransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(null);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    // 👇 Place this above your return block
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [successfulCount, setSuccessfulCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);

    const PAGE_SIZES = [10, 20, 30, 50];

    const fetchTransactions = async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (fromDate && toDate) {
                params.append('from', fromDate.toISOString().split('T')[0]);
                params.append('to', toDate.toISOString().split('T')[0]);
            }

            const res = await superAdminAxios.get(`/api/superadmin/transactions?${params.toString()}`);
            const txns = res.data || [];

            setTransactions(txns);
            setPage(1); // ✅ Reset to first page on filter

            // 🔢 Calculate totals
            let total = 0;
            let success = 0;
            let fail = 0;
            txns.forEach((txn) => {
                if (txn.status === 'Success') {
                    success++;
                    total += txn.amount / 100;
                }
            });
            txns.forEach((txn) => {
              if(txn.status === 'Failed') {
                fail++;
                total += txn.amount / 100;
              }
            });

            setTotalEarnings(total);
            setSuccessfulCount(success);
            setFailedCount(fail);
        } catch (err) {
            console.error('Failed to fetch transactions:', err.message);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Transactions</h2>
            {/* 📊 Summary Cards */}
            <div className="flex flex-wrap gap-4">
                <div className="w-[300px] bg-white dark:bg-gray-800 rounded shadow-md p-6">
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total Earnings</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{totalEarnings.toLocaleString()}</p>
                </div>
                <div className="w-[300px] bg-white dark:bg-gray-800 rounded shadow-md p-6">
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">No. of Successful Orders</h4>
                    <p className="text-2xl font-bold text-green-600">{successfulCount}</p>
                </div>
                <div className="w-[300px] bg-white dark:bg-gray-800 rounded shadow-md p-6">
                    <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-2">No. of Failed Orders</h4>
                    <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                </div>
            </div>

            {/* 🔍 Filter Bar */}
            <Grid gutter="md">
                <Grid.Col span={3}>
                    <TextInput label="Search Admin" placeholder="name or email" value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={2}>
                    <Select label="Status" placeholder="All" data={['Success', 'Failed', 'Pending']} value={status} onChange={setStatus} clearable />
                </Grid.Col>
                <Grid.Col span={3}>
                    <DatePicker label="From" value={fromDate} onChange={setFromDate} />
                </Grid.Col>
                <Grid.Col span={3}>
                    <DatePicker label="To" value={toDate} onChange={setToDate} />
                </Grid.Col>
                <Grid.Col span={1}>
                    <Button fullWidth className="mt-6" onClick={fetchTransactions}>
                        Filter
                    </Button>
                </Grid.Col>
            </Grid>

            {/* 📥 CSV Export */}
            <div className="flex justify-end">
                <CSVLink data={transactions} filename="transactions.csv" className="btn bg-blue-500 text-white px-4 py-2 rounded-md flex items-center gap-2">
                    <IconDownload size={16} />
                    Export CSV
                </CSVLink>
            </div>

            {/* 📊 Transaction Table */}
            <DataTable
                records={transactions.slice((page - 1) * pageSize, page * pageSize)}
                totalRecords={transactions.length}
                recordsPerPage={pageSize}
                page={page}
                onPageChange={setPage}
                recordsPerPageOptions={PAGE_SIZES}
                onRecordsPerPageChange={setPageSize}
                highlightOnHover
                columns={[
                    { accessor: 'txn_id', title: 'Txn ID' },
                    { accessor: 'gateway_txn_id', title: 'Gateway Txn' },
                    { accessor: 'admin_name', title: 'Admin' },
                    { accessor: 'email', title: 'Email' },
                    {
                        accessor: 'amount',
                        title: 'Amount (₹)',
                        render: ({ amount }) => `₹${(amount / 100).toFixed(2)}`,
                    },
                    { accessor: 'currency', title: 'Currency' },
                    {
                        accessor: 'status',
                        title: 'Status',
                        render: ({ status }) => <Badge color={status === 'Success' ? 'green' : status === 'Failed' ? 'red' : 'yellow'}>{status}</Badge>,
                    },
                    {
                        accessor: 'txn_date',
                        title: 'Date',
                        render: ({ txn_date }) =>
                            new Date(txn_date).toLocaleString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            }),
                    },
                ]}
            />
        </div>
    );
};

export default TransactionsPage;
