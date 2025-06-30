'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { useRouter } from 'next/navigation';
import { Menu, Button, Drawer, ScrollArea, Text, Divider, Badge } from '@mantine/core';
import IconPencil from '../icon/icon-pencil';
import AppointmentDrawer from './AppointmentDrawer'; // New drawer for managing appointments
import { getAuth } from 'firebase/auth';
import IconMailDot from '../icon/icon-mail-dot';

const CustomerTable = () => {

    const [customers, setCustomers] = useState([]);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [recordsData, setRecordsData] = useState(customers);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState({
        columnAccessor: 'full_name',
        direction: 'asc',
    });

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [openDrawer, setOpenDrawer] = useState(false);
    
    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const fetchCustomers = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
              alert('You must be logged in!');
              return;
            }
            const token = await user.getIdToken();
            const response = await axios.get(`${API_URL}/api/customers/user`,{
                headers: {
                    "Content-Type":"application/json",
                    Authorization: `Bearer ${token}`,
                }
            });
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleManageAppointments = (customer) => {
        setSelectedCustomer(customer);
        setOpenDrawer(true);
    };

    const handleEditCustomer = (customer) => {
        router.push(`/editcustomer/${customer.id}`);
    };


    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        const filteredCustomers = customers.filter((item) =>
            item.full_name.toLowerCase().includes(search.toLowerCase()) ||
            item.email.toLowerCase().includes(search.toLowerCase()) ||
            item.phone_number.toLowerCase().includes(search.toLowerCase())
        );

        const sortedCustomers = sortBy(filteredCustomers, sortStatus.columnAccessor);
        const finalSortedCustomers = sortStatus.direction === 'desc' ? sortedCustomers.reverse() : sortedCustomers;

        setRecordsData(finalSortedCustomers);
        setPage(1);
    }, [search, customers, sortStatus]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData(customers.slice(from, to)); 
    }, [page, pageSize, customers]);


    const getNextAppointment = (appointments) => {
        if (!appointments || appointments.length === 0) return null;
        const upcoming = appointments
            .filter(appt => new Date(appt.appointment_date) > new Date())
            .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
        return upcoming.length ? upcoming[0] : null;
    };
    

    return (
        <div className="panel mt-6">
            <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                <h5 className="text-lg font-semibold dark:text-white-light">Customer Table</h5>
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
                        { accessor: 'full_name', title: 'Name', sortable: true },
                        { accessor: 'email', title: 'Email', sortable: true },
                        { accessor: 'phone_number', title: 'Phone', sortable: true },
                        {
                            accessor: 'next_appointment',
                            title: 'Next Appointment',
                            render: (record) => {
                                const nextAppt = getNextAppointment(record.appointments);
                                return nextAppt ? (
                                    <Badge color="blue">
                                        {new Date(nextAppt.appointment_date).toLocaleString()} - {nextAppt.appointment_type}
                                    </Badge>
                                ) : (
                                    <Text>No Upcoming Appointment</Text>
                                );
                            },
                        },
                        {
                            accessor: 'actions',
                            title: 'Actions',
                            render: (record) => (
                                <Menu withinPortal shadow="md" width={200}>
                                <Menu.Target>
                                    <Button variant="transparent" compact>
                                        <IconPencil />
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item onClick={() => handleEditCustomer(record)}>
                                        <div className="flex gap-2"><IconPencil /> Edit Customer</div>
                                    </Menu.Item>
                                    <Menu.Item onClick={() => handleManageAppointments(record)}>
                                        <div className="flex gap-2"><IconMailDot /> Appointments</div>
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                            ),
                        },
                    ]}
                    totalRecords={customers.length}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={(p) => setPage(p)}
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={setPageSize}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                />
            </div>
            
            <AppointmentDrawer
                customer={selectedCustomer}
                opened={openDrawer}
                onClose={() => setOpenDrawer(false)}
            />
        </div>
    );
};

export default CustomerTable;
