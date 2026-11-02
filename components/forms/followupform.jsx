'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Button, TextInput, Textarea, Box, Title, Alert, Text } from '@mantine/core';
import { getAuth } from 'firebase/auth';

const PURPOSE_OPTIONS = ['FHC', 'First Meeting', 'Product Discussion', 'Closing', 'Other'];

// A follow-up is for either a lead (leadId) or a customer (customerId).
const FollowupForm = ({ leadId, customerId, existingFollowUp, onFollowupChange, onCancel, initialDate, hideTitle = false }) => {
  const [followUpDate, setFollowUpDate] = useState('');
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Populate form fields if editing an existing follow-up
  useEffect(() => {
    if (existingFollowUp) {
      if (existingFollowUp && existingFollowUp.id) {
            const utcDate = new Date(existingFollowUp.follow_up_date);
            const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
            setFollowUpDate(localDate.toISOString().slice(0, 16));
            setStatus(existingFollowUp.status);
            // A saved purpose outside the fixed list was typed in by the user, so show it under "Other".
            if (PURPOSE_OPTIONS.includes(existingFollowUp.purpose)) {
              setPurpose(existingFollowUp.purpose);
              setOtherReason('');
            } else {
              setPurpose('Other');
              setOtherReason(existingFollowUp.purpose || '');
            }
            setNotes(existingFollowUp.notes || '');
            setIsUpdating(true);
        }
    } else {
      setFollowUpDate('');
      setStatus('Pending');
      setPurpose('');
      setOtherReason('');
      setNotes('');
      setIsUpdating(false);

      if (initialDate) {
                const date = new Date(initialDate);
                // Adjust for timezone to display correctly in the input
                const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                setFollowUpDate(adjustedDate.toISOString().slice(0, 16));
            } else {
                setFollowUpDate('');
            }
        }
    }, [existingFollowUp, initialDate]); 


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!followUpDate || !status || !purpose) {
      setError('Please fill all required fields.');
      return;
    }
    if (purpose === 'Other' && !otherReason.trim()) {
      setError('Please type the reason for this follow-up.');
      return;
    }
    setSubmitting(true);

    const localDate = new Date(followUpDate);
    const correctUtcIsoString = localDate.toISOString();


    // Get auth token for the SECURE actions (create/update)
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
        Swal.fire('Error', 'Authentication error. Please log in again.', 'error');
        setSubmitting(false);
        return;
    }
    const token = await user.getIdToken();

    // The data payload is clean, with no user_id.
    const followUpData = {
      ...(customerId ? { customer_id: customerId } : { lead_id: leadId }),
      follow_up_date: correctUtcIsoString,
      status: status,
      purpose: purpose === 'Other' ? otherReason.trim() : purpose,
      notes: notes,
    };

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isUpdating) {
        await axios.put(`${API_URL}/api/followups/${existingFollowUp.id}`, followUpData, config);
        Swal.fire('Success', 'Follow-up updated successfully!', 'success');
      } else {
        await axios.post(`${API_URL}/api/followups`, followUpData, config);
        Swal.fire('Success', 'Follow-up created successfully!', 'success');
      }
    
      if (onFollowupChange) onFollowupChange();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating/updating follow-up.');
      Swal.fire('Error', err.response?.data?.message || 'An error occurred', 'error');
    } finally {
        setSubmitting(false);
    }
  };

  // Tap-to-pick pill, used for Status and Purpose.
  const Pill = ({ active, children, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-300 text-gray-700 hover:border-violet-400 dark:border-gray-600 dark:text-gray-200'}`}
    >
      {children}
    </button>
  );

  return (
    <Box>
      {!hideTitle && <Title order={4} mb="md">{isUpdating ? 'Update Follow-Up' : 'Create Follow-Up'}</Title>}
      {error && <Alert title="Error" color="red" variant="light" withCloseButton onClose={() => setError('')} mb="md">{error}</Alert>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextInput label="Date and Time" type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} required />

        <div>
          <Text size="sm" weight={500} mb={6}>Status <span className="text-red-500">*</span></Text>
          <div className="flex gap-2">
            {['Pending', 'Completed'].map((o) => (
              <Pill key={o} active={status === o} onClick={() => setStatus(o)}>{o}</Pill>
            ))}
          </div>
        </div>

        <div>
          <Text size="sm" weight={500} mb={6}>Purpose <span className="text-red-500">*</span></Text>
          <div className="flex flex-wrap gap-2">
            {PURPOSE_OPTIONS.map((o) => (
              <Pill key={o} active={purpose === o} onClick={() => setPurpose(o)}>{o}</Pill>
            ))}
          </div>
        </div>

        {purpose === 'Other' && (
          <TextInput
            label="Reason"
            placeholder="Type the reason for this follow-up"
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            maxLength={255}
            required
            data-autofocus
          />
        )}

        <Textarea label="Notes" placeholder="Add details..." value={notes} onChange={(e) => setNotes(e.target.value)} minRows={3} autosize />

        {/* In the follow-ups popup the buttons stay at the bottom on phones */}
        <div
          className={
            hideTitle
              ? 'sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2'
              : 'flex justify-end gap-2 pt-2'
          }
        >
          <Button variant="default" radius="xl" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button type="submit" color="violet" radius="xl" loading={submitting}>
            {isUpdating ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Box>
  );
};

export default FollowupForm;
