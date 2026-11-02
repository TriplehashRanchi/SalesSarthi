'use client';

import { useEffect, useRef, useState } from 'react';
import { Textarea, TextInput, NumberInput, Select, SegmentedControl, Button, Group, Text, Box, UnstyledButton, Badge } from '@mantine/core';
import { IconCheck, IconPlus, IconSparkles } from '@tabler/icons-react';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';
import MessageBubble from './MessageBubble';
import { suggestionsFor } from './suggestions';

const availableVariables = [
  { value: '{name}', label: 'Name' },
  { value: '{policy_number}', label: 'Policy Number' },
  { value: '{dob}', label: 'Date of Birth' },
  { value: '{renewal_date}', label: 'Renewal Date' },
  { value: '{appointment_date}', label: 'Appointment Date' },
];

const MANUAL = 'manual';
const DEFAULT_WINDOW = { recent: 7, recurring: 2, upcoming: 7 };

const StepTitle = ({ n, children, hint }) => (
  <Group spacing={8} mb={8} noWrap align="center">
    <Badge variant="filled" radius="xl" sx={{ width: 22, height: 22, padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</Badge>
    <Text weight={600} size="sm">{children}</Text>
    {hint && <Text size="xs" color="dimmed">{hint}</Text>}
  </Group>
);

// Create or edit one reminder type: its name, who it is for, when it shows up, and the message.
const ReminderTypeForm = ({ type, dateFields, onSave, apiUrl, token }) => {
  const [name, setName] = useState(type?.name || '');
  const [description, setDescription] = useState(type?.description || '');
  const [audience, setAudience] = useState(type?.audience || 'customer');
  const [dateField, setDateField] = useState(type?.date_field || MANUAL);
  const [windowDays, setWindowDays] = useState(type?.window_days || 2);
  const [message, setMessage] = useState(type?.template_message || '');
  const [loading, setLoading] = useState(false);
  const [beforePick, setBeforePick] = useState(''); // what was in the box before a ready-made option was picked
  const textAreaRef = useRef(null);

  const fieldOptions = Object.entries(dateFields?.[audience] || {}).map(([value, f]) => ({ value, label: f.label }));
  const rule = dateField !== MANUAL ? dateFields?.[audience]?.[dateField] : null;
  const suggestions = suggestionsFor(dateField === MANUAL ? null : dateField);
  const selectedSuggestion = suggestions.find((s) => s.message === message)?.id || null;

  // Keep the date rule valid when the audience changes.
  useEffect(() => {
    if (dateField !== MANUAL && !dateFields?.[audience]?.[dateField]) setDateField(MANUAL);
  }, [audience]);

  // Tap a ready-made option to use it; tap it again to unmark it and go back to what you had.
  const toggleSuggestion = (s) => {
    if (selectedSuggestion === s.id) {
      setMessage(beforePick);
      return;
    }
    if (!selectedSuggestion) setBeforePick(message);
    setMessage(s.message);
  };

  const handleDateFieldChange = (value) => {
    setDateField(value);
    const mode = value !== MANUAL ? dateFields?.[audience]?.[value]?.mode : null;
    if (mode) setWindowDays(DEFAULT_WINDOW[mode]);
  };

  const handleInsertVariable = (variable) => {
    const textarea = textAreaRef.current;
    if (!textarea) return setMessage((m) => m + variable);
    const start = textarea.selectionStart ?? message.length;
    const end = textarea.selectionEnd ?? message.length;
    setMessage(message.substring(0, start) + variable + message.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showNotification({ title: 'Name needed', message: 'Give this reminder type a name.', color: 'orange' });
    if (!message.trim()) return showNotification({ title: 'Message is empty', message: 'Please write a message or pick a ready-made one.', color: 'orange' });

    setLoading(true);
    const body = {
      name: name.trim(),
      description: description.trim(),
      audience,
      date_field: dateField === MANUAL ? null : dateField,
      window_days: dateField === MANUAL ? null : windowDays,
      template_message: message,
    };
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      const res = type
        ? await axios.put(`${apiUrl}/api/reminder-types/${type.id}`, body, { headers })
        : await axios.post(`${apiUrl}/api/reminder-types`, body, { headers });
      onSave(res.data, !!type);
    } catch (error) {
      console.error('Error saving reminder type:', error.response ? error.response.data : error);
      showNotification({ title: 'Error', message: error.response?.data?.message || 'Failed to save reminder type.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const who = audience === 'lead' ? 'leads' : 'customers';

  return (
    <form onSubmit={handleSubmit}>
      <Box mb="lg">
        <StepTitle n="1">Name it</StepTitle>
        <TextInput placeholder="e.g. Premium Due" value={name} onChange={(e) => setName(e.currentTarget.value)} maxLength={100} required data-autofocus />
        <TextInput mt="xs" placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.currentTarget.value)} maxLength={255} />
      </Box>

      <Box mb="lg">
        <StepTitle n="2" hint="who it is for and when it shows up on the Reminders page">Who and when</StepTitle>
        <SegmentedControl
          fullWidth
          value={audience}
          onChange={setAudience}
          data={[
            { label: 'Customers', value: 'customer' },
            { label: 'Leads', value: 'lead' },
          ]}
        />
        <Select
          mt="xs"
          label="Show it based on"
          value={dateField}
          onChange={handleDateFieldChange}
          data={[...fieldOptions, { value: MANUAL, label: `Manual: I choose which ${who} to message` }]}
        />
        {rule && (
          <NumberInput
            mt="xs"
            min={1}
            max={365}
            value={windowDays}
            onChange={(v) => setWindowDays(v || 1)}
            label={rule.mode === 'recent' ? `Show ${who} added in the last (days)` : `Show it this many days before the date`}
          />
        )}
        <Text size="xs" color="dimmed" mt={6}>
          {!rule
            ? `Every one of your ${who} is listed, so you can pick who to message.`
            : rule.mode === 'recent'
            ? `Lists ${who} added in the last ${windowDays} day(s).`
            : `Lists ${who} whose ${rule.label.toLowerCase()} is within the next ${windowDays} day(s).`}
        </Text>
      </Box>

      <Box mb="md">
        <StepTitle n="3">Write the message</StepTitle>
        {suggestions.length > 0 && (
          <Group spacing="xs" mb="xs">
            {suggestions.map((s) => {
              const active = selectedSuggestion === s.id;
              return (
                <UnstyledButton
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSuggestion(s)}
                  sx={(theme) => ({
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: theme.fontSizes.sm,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: `1.5px solid ${active ? theme.colors.blue[6] : theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[4]}`,
                    background: active ? (theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.blue[0]) : 'transparent',
                    color: active ? theme.colors.blue[6] : 'inherit',
                    '&:hover': { borderColor: theme.colors.blue[5] },
                  })}
                >
                  <Group spacing={6} noWrap>
                    {active ? <IconCheck size={14} /> : <IconSparkles size={14} />}
                    {s.name}
                  </Group>
                </UnstyledButton>
              );
            })}
          </Group>
        )}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="Type your message here..."
          required
          ref={textAreaRef}
          minRows={6}
          maxRows={14}
          autosize
          maxLength={2000}
        />
        <Group spacing={6} mt="xs" align="center">
          <Text size="xs" color="dimmed" mr={4}>Tap to add:</Text>
          {availableVariables.map((variable) => (
            <Button key={variable.value} type="button" size="xs" compact variant="light" radius="xl" leftIcon={<IconPlus size={12} />} onClick={() => handleInsertVariable(variable.value)}>
              {variable.label}
            </Button>
          ))}
        </Group>
      </Box>

      <Box mb="lg">
        <Text size="xs" weight={600} color="dimmed" mb={6} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Preview, as your client will see it
        </Text>
        {message.trim() ? <MessageBubble message={message} filled /> : <Text size="sm" color="dimmed">Your message preview will appear here.</Text>}
      </Box>

      <Group position="apart" mt="xl">
        <Text size="xs" color="dimmed">{message.length} / 2000 characters</Text>
        <Button type="submit" loading={loading} size="md">
          {type ? 'Save changes' : 'Add reminder type'}
        </Button>
      </Group>
    </form>
  );
};

export default ReminderTypeForm;
