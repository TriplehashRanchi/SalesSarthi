'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';

const LeadTable = () => {
    const getLeadsFromLocalStorage = () => {
        const storedLeads = localStorage.getItem('leads');
        return storedLeads ? JSON.parse(storedLeads) : [];
    };

    const [leads, setLeads] = useState(getLeadsFromLocalStorage());
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [recordsData, setRecordsData] = useState(leads);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState({
        columnAccessor: 'full_name',
        direction: 'asc',
    });

    useEffect(() => {
        localStorage.setItem('leads', JSON.stringify(leads));
    }, [leads]);

    useEffect(() => {
        const filteredLeads = leads.filter((item) => {
            return (
                item.full_name.toLowerCase().includes(search.toLowerCase()) ||
                item.email.toLowerCase().includes(search.toLowerCase()) ||
                item.phone_number.toLowerCase().includes(search.toLowerCase()) ||
                item.company_name.toLowerCase().includes(search.toLowerCase())
            );
        });

        const sortedLeads = sortBy(filteredLeads, sortStatus.columnAccessor);
        const finalSortedLeads = sortStatus.direction === 'desc' ? sortedLeads.reverse() : sortedLeads;

        setRecordsData(finalSortedLeads);
        setPage(1);
    }, [search, leads, sortStatus]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData(leads.slice(from, to));
    }, [page, pageSize, leads]);

    const formatDate = (date) => {
        const dt = new Date(date);
        const month = dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
        const day = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
        return `${day}/${month}/${dt.getFullYear()}`;
    };

    return (
        <div className="panel mt-6">
            <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                <h5 className="text-lg font-semibold dark:text-white-light">Lead Table</h5>
                <div className="ltr:ml-auto rtl:mr-auto">
                    <input
                        type="text"
                        className="form-input w-auto"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="datatables">
                <DataTable
                    highlightOnHover
                    className="table-hover whitespace-nowrap"
                    records={recordsData}
                    columns={[
                        {
                            accessor: 'full_name',
                            title: 'Name',
                            sortable: true,
                            render: ({ full_name }) => <div>{full_name}</div>,
                        },
                        { accessor: 'company_name', title: 'Company', sortable: true },
                        { accessor: 'lead_status', title: 'Lead Status', sortable: true },
                        { accessor: 'email', title: 'Email', sortable: true },
                        { accessor: 'phone_number', title: 'Phone', sortable: true },
                        {
                            accessor: 'date_of_birth',
                            title: 'DOB',
                            sortable: true,
                            render: ({ date_of_birth }) => <div>{formatDate(date_of_birth)}</div>,
                        },
                    ]}
                    totalRecords={leads.length}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={(p) => setPage(p)}
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={setPageSize}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                    paginationText={({ from, to, totalRecords }) =>
                        `Showing ${from} to ${to} of ${totalRecords} entries`
                    }
                />
            </div>
        </div>
    );
};

export default LeadTable;
