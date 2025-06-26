'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Button, TextInput, Select, Textarea, Group, Box, Title, Alert, ScrollArea, Grid } from '@mantine/core';
import { getAuth } from 'firebase/auth';

const FollowupForm = ({ leadId, existingFollowUp, onFollowupChange, onCancel }) => {
  const [stages, setStages] = useState([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Fetch follow-up stages. This is a PUBLIC endpoint as requested.
  useEffect(() => {
    const fetchStages = async () => {
      try {
        // CORRECT: Calling the public endpoint without auth or user ID.
        const response = await axios.get(`${API_URL}/api/followup-stages/1`);
        setStages(response.data);
      } catch (err) {
        console.error("Error fetching stages:", err);
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
      setNotes(existingFollowUp.notes || '');
      setIsUpdating(true);
    } else {
      setFollowUpDate('');
      setStatus('');
      setPurpose('');
      setNotes('');
      setIsUpdating(false);
    }
  }, [existingFollowUp]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!followUpDate || !status || !purpose) {
      setError('Please fill all required fields.');
      return;
    }
    setSubmitting(true);

    const localDate = new Date(followUpDate);
    const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);

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
      lead_id: leadId,
      follow_up_date: utcDate.toISOString(),
      status: status,
      purpose: purpose,
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

  return (
 <Box>
            {/* The title and error alert remain the same */}
            <Title order={4} mb="md">{isUpdating ? 'Update Follow-Up' : 'Create Follow-Up'}</Title>
            {error && <Alert title="Error" color="red" variant="light" withCloseButton onClose={() => setError('')} mb="md">{error}</Alert>}
            
            {/* We will still use a ScrollArea for resilience on small screens */}
            <ScrollArea.Autosize maxHeight="calc(80vh - 120px)">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <TextInput
                        label="Date and Time"
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        required
                        variant="filled"
                    />

                    {/* THIS IS THE CHANGE: Using a Grid for the two dropdowns */}
                    <Grid>
                        <Grid.Col span={6}>
                            <Select
                                label="Status"
                                placeholder="Status"
                                value={status}
                                onChange={setStatus}
                                data={['Pending', 'Completed']}
                                required
                                variant="filled"
                            />
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Select
                                label="Purpose"
                                placeholder="Purpose"
                                value={purpose}
                                onChange={setPurpose}
                                data={stages.map((stage) => stage.name)}
                                required
                                searchable
                                variant="filled"
                            />
                        </Grid.Col>
                    </Grid>

                    <Textarea
                        label="Notes"
                        placeholder="Add details..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        variant="filled"
                        minRows={2}
                    />

                </form>
            </ScrollArea.Autosize>

            {/* Action buttons remain at the bottom */}
            <Group position="right" mt="xl">
                <Button variant="default" onClick={onCancel} disabled={submitting}>Cancel</Button>
                <Button type="submit" loading={submitting} onClick={handleSubmit}>
                    {isUpdating ? 'Update' : 'Create'}
                </Button>
            </Group>
        </Box>
  );
};

export default FollowupForm;