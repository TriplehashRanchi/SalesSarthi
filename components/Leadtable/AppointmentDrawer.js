import { useEffect, useState } from 'react';
import axios from 'axios';
import { Drawer, Button, Timeline, ScrollArea, TextInput, Select, Textarea } from '@mantine/core';
import dayjs from 'dayjs';

const AppointmentDrawer = ({ customer, opened, onClose }) => {
    const [appointments, setAppointments] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [formData, setFormData] = useState({
        appointment_date: '',
        appointment_type: '',
        status: 'Scheduled',
        notes: ''
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        if (customer) fetchAppointments();
    }, [customer]);

    const fetchAppointments = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/appointments/customer/${customer.id}`);
            setAppointments(res.data);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };

    const handleAddOrEdit = async () => {
        try {
            if (selectedAppointment) {
                // Editing existing appointment
                await axios.put(`${API_URL}/api/appointments/${selectedAppointment.id}`, formData);
            } else {
                // Adding new appointment
                await axios.post(`${API_URL}/api/appointments`, {
                    user_id: customer.user_id,
                    customer_id: customer.id,
                    ...formData
                });
            }
            fetchAppointments();
            setSelectedAppointment(null); // Reset selection
        } catch (error) {
            console.error('Error saving appointment:', error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this appointment?')) return;
        try {
            await axios.delete(`${API_URL}/api/appointments/${selectedAppointment.id}`);
            fetchAppointments();
            setSelectedAppointment(null); // Reset form
        } catch (error) {
            console.error('Error deleting appointment:', error);
        }
    };

    const openEditForm = (appointment) => {
        setSelectedAppointment(appointment);
        setFormData({
            appointment_date: dayjs(appointment.appointment_date).format('YYYY-MM-DDTHH:mm'),
            appointment_type: appointment.appointment_type,
            status: appointment.status,
            notes: appointment.notes
        });
    };

    const openNewAppointmentForm = () => {
        setSelectedAppointment(null);
        setFormData({
            appointment_date: '',
            appointment_type: '',
            status: 'Scheduled',
            notes: ''
        });
    };

    return (
        <Drawer opened={opened} onClose={onClose} title={`Appointments for ${customer?.full_name}`} padding="xl" size="lg">
            {!selectedAppointment ? (
                <>
                    {/* Scrollable container for appointments */}
                    <ScrollArea h={400}>
                        {appointments.length > 0 ? (
                            <Timeline active={appointments.length - 1} bulletSize={24} lineWidth={2}>
                                {appointments.map(appt => (
                                    <Timeline.Item key={appt.id} title={appt.appointment_type}>
                                        <p>{new Date(appt.appointment_date).toLocaleString()}</p>
                                        <p className="text-sm text-gray-600">Status: {appt.status}</p>
                                        <p className="text-sm text-gray-500">{appt.notes}</p>
                                        <Button variant="outline" size="xs" onClick={() => openEditForm(appt)}>
                                            Edit
                                        </Button>
                                    </Timeline.Item>
                                ))}
                            </Timeline>
                        ) : <p>No appointments found.</p>}
                    </ScrollArea>

                    {/* Add New Appointment Button */}
                    <div className="fixed bottom-0 left-0 w-full bg-white p-4 border-t shadow-lg">
                        <Button className="w-full" onClick={openNewAppointmentForm}>+ Add Appointment</Button>
                    </div>
                </>
            ) : (
                // Form for adding/editing appointments
                <div className="flex flex-col gap-4">
                    <TextInput
                        label="Appointment Date & Time"
                        type="datetime-local"
                        name="appointment_date"
                        value={formData.appointment_date}
                        onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    />
                    <Select
                        label="Type"
                        name="appointment_type"
                        data={['Consultation', 'Follow-up', 'Therapy']}
                        value={formData.appointment_type}
                        onChange={(value) => setFormData({ ...formData, appointment_type: value })}
                    />
                    <Select
                        label="Status"
                        name="status"
                        data={['Scheduled', 'Completed', 'Cancelled']}
                        value={formData.status}
                        onChange={(value) => setFormData({ ...formData, status: value })}
                    />
                    <Textarea
                        label="Notes"
                        name="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                    <div className="flex gap-2">
                        <Button color="blue" onClick={handleAddOrEdit}>
                            {selectedAppointment ? 'Save Changes' : 'Add Appointment'}
                        </Button>
                        {selectedAppointment && (
                            <Button color="red" onClick={handleDelete}>Delete</Button>
                        )}
                    </div>
                </div>
            )}
        </Drawer>
    );
};

export default AppointmentDrawer;
