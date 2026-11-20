'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Modal, Text, Textarea, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconPhoneCall, IconPhoneCheck, IconPhoneOff, IconPhonePause } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { callCustomer } from '@/components/common/CustomerQuickActions';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const CALL_STATUSES = [
  { value: 'Connected', icon: IconPhoneCheck, on: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  { value: 'Not Connected', icon: IconPhoneOff, on: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
  { value: 'Busy', icon: IconPhonePause, on: 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
];

// "How did the call go?" — shown right after Call opens the phone's dialer (and from "Log a call").
// Saves the status and remarks to the customer's activity timeline.
export default function CallLogModal({ opened, customer, onClose, onSaved }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [status, setStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (opened) {
      setStatus(null);
      setNotes('');
      setError('');
    }
  }, [opened]);

  const save = async (e) => {
    e.preventDefault();
    if (!status) return setError('Please choose how the call went.');
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API_URL}/api/customers/${customer.id}/calls`, { status, notes }, { headers: await authHeaders() });
      showNotification({ title: 'Call saved', message: `Saved as "${status}" in ${customer.full_name || 'the customer'}'s activity.`, color: 'green' });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the call. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={() => !saving && onClose()} title="How did the call go?" centered fullScreen={isPhone}>
      <form onSubmit={save} className="space-y-4">
        <Text size="sm" color="dimmed">
          {customer?.full_name}{customer?.phone_number ? ` · ${customer.phone_number}` : ''}
        </Text>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Call status">
          {CALL_STATUSES.map(({ value, icon: Icon, on }) => {
            const active = status === value;
            return (
              <UnstyledButton
                key={value}
                role="radio"
                aria-checked={active}
                onClick={() => { setStatus(value); setError(''); }}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 px-1 py-3 text-center text-xs font-medium sm:text-sm ${active ? on : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'}`}
              >
                <Icon size={22} />
                {value}
              </UnstyledButton>
            );
          })}
        </div>
        <Textarea label="Remarks" placeholder="What was discussed, when to call back…" value={notes} onChange={(e) => { const v = e.currentTarget.value; setNotes(v); }} autosize minRows={3} maxLength={2000} />
        {error && <Text size="sm" color="red">{error}</Text>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="subtle" leftIcon={<IconPhoneCall size={16} />} onClick={() => callCustomer(customer)} disabled={saving} className="w-full sm:w-auto">
            Call again
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="default" onClick={onClose} disabled={saving} className="w-full sm:w-auto">Skip</Button>
            <Button type="submit" loading={saving} className="w-full sm:w-auto">Save call</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
