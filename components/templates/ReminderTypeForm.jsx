'use client';

import { useEffect, useRef, useState } from 'react';
import { Textarea, TextInput, NumberInput, Select, Button, Group, Text, Box, UnstyledButton, Badge, Divider } from '@mantine/core';
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
  <div className="mb-3">
    <Group spacing={10} noWrap align="center">
      <Badge variant="light" color="violet" radius="xl" sx={{ width: 24, height: 24, padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</Badge>
      <Text weight={600}>{children}</Text>
    </Group>
    {hint && <Text size="xs" color="dimmed" mt={2} ml={34}>{hint}</Text>}
  </div>
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
      <Box pb="lg">
        <StepTitle n="1">Name it</StepTitle>
        <TextInput placeholder="e.g. Premium Due" value={name} onChange={(e) => setName(e.currentTarget.value)} maxLength={100} required data-autofocus />
        <TextInput mt="xs" placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.currentTarget.value)} maxLength={255} />
      </Box>

      <Divider />

      <Box py="lg">
        <StepTitle n="2" hint="Who it is for and when it shows up on the Reminders page">Who and when</StepTitle>
        <div className="flex rounded-full bg-gray-100 p-1 dark:bg-gray-800" role="radiogroup" aria-label="Who is this reminder for">
          {[
            { label: 'Customers', value: 'customer' },
            { label: 'Leads', value: 'lead' },
          ].map((o) => {
            const active = audience === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setAudience(o.value)}
                className={`h-8 flex-1 rounded-full text-sm font-semibold transition ${active ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <div className={`mt-3 grid grid-cols-1 gap-3 ${rule ? 'sm:grid-cols-2' : ''}`}>
          <Select
            label="Show it based on"
            value={dateField}
            onChange={handleDateFieldChange}
            data={[...fieldOptions, { value: MANUAL, label: `Manual: I choose which ${who} to message` }]}
          />
          {rule && (
            <NumberInput
              min={1}
              max={365}
              value={windowDays}
              onChange={(v) => setWindowDays(v || 1)}
              label={rule.mode === 'recent' ? 'Added in the last (days)' : 'Days before the date'}
            />
          )}
        </div>
        <Text size="xs" color="dimmed" mt={8}>
          {!rule
            ? `Every one of your ${who} is listed, so you can pick who to message.`
            : rule.mode === 'recent'
            ? `Lists ${who} added in the last ${windowDays} day(s).`
            : `Lists ${who} whose ${rule.label.toLowerCase()} is within the next ${windowDays} day(s).`}
        </Text>
      </Box>

      <Divider />

      <Box py="lg">
        <StepTitle n="3" hint="Pick a ready-made message or write your own">Write the message</StepTitle>
        {suggestions.length > 0 && (
          <Group spacing={8} mb="sm">
            {suggestions.map((s) => {
              const active = selectedSuggestion === s.id;
              return (
                <UnstyledButton
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSuggestion(s)}
                  sx={(theme) => ({
                    padding: '5px 12px',
                    borderRadius: 999,
                    fontSize: theme.fontSizes.xs,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: `1px solid ${active ? theme.colors.violet[5] : theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[3]}`,
                    background: active ? (theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.violet[0]) : 'transparent',
                    color: active ? theme.colors.violet[7] : 'inherit',
                    '&:hover': { borderColor: theme.colors.violet[4] },
                  })}
                >
                  <Group spacing={6} noWrap>
                    {active ? <IconCheck size={13} /> : <IconSparkles size={13} />}
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
          minRows={5}
          maxRows={14}
          autosize
          maxLength={2000}
        />
        <Group spacing={6} mt="sm" align="center">
          <Text size="xs" color="dimmed" mr={4}>Tap to add:</Text>
          {availableVariables.map((variable) => (
            <Button key={variable.value} type="button" size="xs" compact variant="light" color="violet" radius="xl" leftIcon={<IconPlus size={12} />} onClick={() => handleInsertVariable(variable.value)}>
              {variable.label}
            </Button>
          ))}
        </Group>
        <Text size="xs" color="dimmed" align="right" mt={6}>{message.length} / 2000</Text>
      </Box>

      <Box mb="lg" className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
        <Text size="xs" weight={600} color="dimmed" mb={8} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Preview, as your client will see it
        </Text>
        {message.trim() ? <MessageBubble message={message} filled /> : <Text size="sm" color="dimmed">Your message preview will appear here.</Text>}
      </Box>

      {/* Stays at the bottom of the screen on phones so Save is always reachable */}
      <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <Button type="submit" fullWidth loading={loading} size="md" color="violet" radius="xl">
          {type ? 'Save changes' : 'Add reminder type'}
        </Button>
      </div>
    </form>
  );
};

export default ReminderTypeForm;
