import { useEffect, useState } from 'react';
import axios from 'axios';
import { Drawer, Button, TextInput, Select, Textarea } from '@mantine/core';
import dayjs from 'dayjs';

const AppointmentEditDrawer = ({ appointment, opened, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        appointment_date: '',
        appointment_type: '',
        status: '',
        notes: '',
    });

    useEffect(() => {
        if (appointment) {
            // Convert UTC time from DB to local time
            const localTime = dayjs(appointment.appointment_date).format('YYYY-MM-DDTHH:mm');
    
            setFormData({
                appointment_date: localTime,
                appointment_type: appointment.appointment_type,
                status: appointment.status,
                notes: appointment.notes,
            });
        }
    }, [appointment]);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleUpdate = async () => {
        try {
            await axios.put(`${API_URL}/api/appointments/${appointment.id}`, formData);
            onUpdate(); // Refresh table
            onClose();
        } catch (error) {
            console.error('Error updating appointment:', error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this appointment?')) return;
        try {
            await axios.delete(`${API_URL}/api/appointments/${appointment.id}`);
            onUpdate(); // Refresh table
            onClose();
        } catch (error) {
            console.error('Error deleting appointment:', error);
        }
    };

    return (
        <Drawer opened={opened} onClose={onClose} title="Edit Appointment" size="md" padding="md">
            {appointment ? (
                <div className="flex flex-col gap-4 p-5">
                    <TextInput
                        label="Appointment Date & Time"
                        type="datetime-local"
                        name="appointment_date"
                        value={formData.appointment_date}
                        onChange={handleChange}
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
                        onChange={handleChange}
                    />
                    <div className="flex gap-2">
                        <Button color="blue" onClick={handleUpdate}>Save Changes</Button>
                        <Button color="red" onClick={handleDelete}>Delete</Button>
                    </div>
                </div>
            ) : (
                <p>No appointment selected.</p>
            )}
        </Drawer>
    );
};

export default AppointmentEditDrawer;
