'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Drawer, Button, TextInput, Select, Textarea, Autocomplete, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from '@/components/customers/useCreateCustomer';
import { OUTCOMES, PURPOSES } from '@/components/customers/CustomerAppointments';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const toIso = (local) => {
  const d = local ? new Date(local) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : '';
};

// Edit one appointment from the Appointments pages. The server keeps the history (rescheduled, cancelled,
// completed with outcome) and checks access; completing needs the meeting outcome.
const AppointmentEditDrawer = ({ appointment, opened, onClose, onUpdate }) => {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [formData, setFormData] = useState({ appointment_date: '', appointment_type: '', status: '', notes: '', outcome: null, outcome_notes: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (appointment) {
      setFormData({
        appointment_date: dayjs(appointment.appointment_date).format('YYYY-MM-DDTHH:mm'),
        appointment_type: appointment.appointment_type || '',
        status: ['Scheduled', 'Completed', 'Cancelled'].includes(appointment.status) ? appointment.status : 'Scheduled',
        notes: appointment.notes || '',
        outcome: appointment.outcome || null,
        outcome_notes: appointment.outcome_notes || '',
        reason: '',
      });
      setError('');
      setConfirmDelete(false);
    }
  }, [appointment]);

  // Read the value now: React clears the event before a state updater runs.
  const set = (k) => (v) => {
    const value = v && typeof v === 'object' && 'currentTarget' in v ? v.currentTarget.value : v;
    setFormData((f) => ({ ...f, [k]: value }));
  };

  const handleUpdate = async () => {
    setError('');
    if (!formData.appointment_date) return setError('Please choose the appointment date and time.');
    if (!String(formData.appointment_type || '').trim()) return setError('Please enter the purpose of the appointment.');
    if (formData.status === 'Completed' && !formData.outcome) return setError('Please choose how the meeting went.');
    setBusy(true);
    try {
      const body = {
        appointment_date: toIso(formData.appointment_date),
        appointment_type: formData.appointment_type,
        status: formData.status,
        notes: formData.notes,
        ...(formData.status === 'Completed' ? { outcome: formData.outcome, outcome_notes: formData.outcome_notes } : {}),
        ...(formData.status === 'Cancelled' ? { cancel_reason: formData.reason } : {}),
      };
      await axios.put(`${API_URL}/api/appointments/${appointment.id}`, body, { headers: await authHeaders() });
      showNotification({ title: 'Saved', message: 'The appointment was updated.', color: 'green' });
      onUpdate?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the change. Nothing was changed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await axios.delete(`${API_URL}/api/appointments/${appointment.id}`, { headers: await authHeaders() });
      showNotification({ title: 'Deleted', message: 'The appointment was deleted. A copy is kept in its history.', color: 'green' });
      onUpdate?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the appointment. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer opened={opened} onClose={() => !busy && onClose()} title="Edit Appointment" size={isPhone ? '100%' : 'md'} padding="md" position="right">
      {appointment ? (
        <div className="flex flex-col gap-4">
          <TextInput label="Appointment Date & Time" type="datetime-local" value={formData.appointment_date} onChange={set('appointment_date')} />
          <Autocomplete label="Purpose" data={PURPOSES} value={formData.appointment_type} onChange={set('appointment_type')} maxLength={50} withinPortal />
          <Select label="Status" data={['Scheduled', 'Completed', 'Cancelled']} value={formData.status} onChange={set('status')} withinPortal />
          {formData.status === 'Completed' && (
            <>
              <Select label="How did it go?" required data={OUTCOMES} value={formData.outcome} onChange={set('outcome')} withinPortal />
              <Textarea label="Meeting notes" value={formData.outcome_notes} onChange={set('outcome_notes')} autosize minRows={2} />
            </>
          )}
          {formData.status === 'Cancelled' && appointment.status !== 'Cancelled' && (
            <TextInput label="Reason (optional)" value={formData.reason} onChange={set('reason')} maxLength={500} />
          )}
          <Textarea label="Remarks" value={formData.notes} onChange={set('notes')} autosize minRows={2} />
          {error && <Text size="sm" color="red">{error}</Text>}
          {confirmDelete ? (
            <div className="rounded-md border border-red-200 p-3 text-sm dark:border-red-800">
              Delete this appointment? A copy is kept in its history. To keep it in the list, set the status to Cancelled instead.
              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="default" onClick={() => setConfirmDelete(false)} disabled={busy} className="w-full sm:w-auto">Back</Button>
                <Button color="red" onClick={handleDelete} loading={busy} className="w-full sm:w-auto">Delete</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button color="blue" onClick={handleUpdate} loading={busy} className="w-full sm:w-auto">Save Changes</Button>
              <Button color="red" variant="light" onClick={() => setConfirmDelete(true)} disabled={busy} className="w-full sm:w-auto">Delete</Button>
            </div>
          )}
        </div>
      ) : (
        <p>No appointment selected.</p>
      )}
    </Drawer>
  );
};

export default AppointmentEditDrawer;
