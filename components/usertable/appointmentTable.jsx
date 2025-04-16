'use client';

import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import { Menu, Button, Badge, Text } from '@mantine/core';
import IconPencil from '../icon/icon-pencil';
import AppointmentEditDrawer from './AppointmentEditDrawer'; // To manage appointments
import { getAuth } from 'firebase/auth';

const AppointmentTable = ({ userId = 1 }) => {
    const [appointments, setAppointments] = useState([]);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [filteredData, setFilteredData] = useState([]);
    const [sortStatus, setSortStatus] = useState({ columnAccessor: 'appointment_date', direction: 'asc' });
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [openDrawer, setOpenDrawer] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const fetchAppointments = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if(!user){
                alert('You must be logged in!');
                return;
            }
            const token = await user.getIdToken();
            const response = await axios.get(`${API_URL}/api/appointments/user`,{
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                }
            });
            setAppointments(response.data);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    useEffect(() => {
        const sortedData = sortBy(appointments, sortStatus.columnAccessor);
        setFilteredData(sortStatus.direction === 'desc' ? sortedData.reverse() : sortedData);
        setPage(1);
    }, [sortStatus, appointments]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setFilteredData(appointments.slice(from, to));
    }, [page, pageSize, appointments]);

    const handleManageAppointment = (appointment) => {
        setSelectedAppointment(appointment);
        setOpenDrawer(true);
    };

    const refreshAppointments = () => {
        fetchAppointments(); // Reload after update/delete
        setOpenDrawer(false);
    };


    return (
        <div className="panel mt-6">
            <h5 className="text-lg font-semibold">Appointments</h5>
            <div className="datatables">
                <DataTable
                    highlightOnHover
                    className="table-hover whitespace-nowrap"
                    records={filteredData}
                    columns={[
                        {
                            accessor: 'appointment_date',
                            title: 'Date & Time',
                            render: (record) => (
                                <Badge color={new Date(record.appointment_date) > new Date() ? "green" : "red"}>
                                    {new Date(record.appointment_date).toLocaleString()}
                                </Badge>
                            ),
                            sortable: true,
                        },
                        { accessor: 'appointment_type', title: 'Type', sortable: true },
                        { accessor: 'status', title: 'Status', sortable: true },
                        { accessor: 'notes', title: 'Notes' },
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
                                        <Menu.Item onClick={() => handleManageAppointment(record)}>
                                            Manage Appointment
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            ),
                        },
                    ]}
                    totalRecords={appointments.length}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={setPage}
                    recordsPerPageOptions={PAGE_SIZES}
                    onRecordsPerPageChange={setPageSize}
                    sortStatus={sortStatus}
                    onSortStatusChange={setSortStatus}
                />
            </div>

            {/* New AppointmentEditDrawer for managing single appointments */}
            <AppointmentEditDrawer
                appointment={selectedAppointment}
                opened={openDrawer}
                onClose={() => setOpenDrawer(false)}
                onUpdate={refreshAppointments}
            />
        </div>
    );
};

export default AppointmentTable;
