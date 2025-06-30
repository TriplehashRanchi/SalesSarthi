'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Button, TextInput, Select, Textarea, Group, Box, Title, Alert } from '@mantine/core';

const FollowupForm = ({ leadId, existingFollowUp, onFollowupChange }) => {
  const [stages, setStages] = useState([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch follow-up stages for the logged-in user
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const userId = 1; // Replace with actual user ID (use authentication logic in real scenario)
        const response = await axios.get(`${API_URL}/api/followup-stages/${userId}`);
        setStages(response.data);
      } catch (err) {
        setError('Error fetching follow-up stages.');
      }
    };

    fetchStages();
  }, []);

  // Populate form fields if editing an existing follow-up
  useEffect(() => {
    if (existingFollowUp) {
      const utcDate = new Date(existingFollowUp.follow_up_date);
      const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
      setFollowUpDate(localDate.toISOString().slice(0, 16));
      setStatus(existingFollowUp.status);
      setPurpose(existingFollowUp.purpose);
      setNotes(existingFollowUp.notes);
      setIsUpdating(true);
    }
  }, [existingFollowUp]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!followUpDate || !status || !purpose) {
      setError('Please fill all required fields.');
      return;
    }

    const localDate = new Date(followUpDate);
    const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);

    const followUpData = {
      lead_id: leadId,
      user_id: 1,
      follow_up_date: utcDate.toISOString(),
      status: status,
      purpose: purpose,
      notes: notes,
    };

    try {
      if (isUpdating) {
        await axios.put(`${API_URL}/api/followups/${existingFollowUp.id}`, followUpData);
       Swal.fire('Success', 'Follow-up updated successfully!', 'success');
      } else {
        await axios.post('${API_URL}/api/followups', followUpData);
        Swal.fire('Success', 'Follow-up created successfully!', 'success');
      }
    
      // Notify parent to refresh follow-up data
      if (onFollowupChange) {
        onFollowupChange();
      }
    } catch (err) {
      setError(err.response ? err.response.data.message : 'Error creating/updating follow-up.');
      Swal.fire('Error', 'Error creating/updating follow-up.', 'error');  
    }
    
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
      }}
    >
      <Title order={3}>{isUpdating ? 'Update Follow-Up' : 'Create Follow-Up'}</Title>
      {error && (
        <Alert title="Error" color="red">
          {error}
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <TextInput
          type="datetime-local"
          label="Follow-up Date and Time"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          required
        />

        <Select
          label="Status"
          placeholder="Select Status"
          value={status}
          onChange={setStatus}
          data={[
            { value: 'Pending', label: 'Pending' },
            { value: 'Completed', label: 'Completed' },
          ]}
          required
        />

        <Select
          label="Purpose"
          placeholder="Select Purpose"
          value={purpose}
          onChange={setPurpose}
          data={stages.map((stage) => ({
            value: stage.name,
            label: stage.name,
          }))}
          required
        />

        <Textarea
          label="Notes"
          placeholder="Add any additional details..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Group position="right">
          <Button type="submit">{isUpdating ? 'Update Follow-Up' : 'Create Follow-Up'}</Button>
        </Group>
      </form>
    </Box>
  );
};

export default FollowupForm;
