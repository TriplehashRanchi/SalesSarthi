'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, TextInput, Button, Group, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';
import { authHeaders } from '@/utils/authHeaders';
import ProductLineSelect from './ProductLineSelect';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fromLead = (lead) => ({
  full_name: lead?.full_name || '',
  email: lead?.email || '',
  phone_number: lead?.phone_number || '',
  product_name: '',
  policy_number: '',
  premium: '',
});

// Lead → Customer: the user checks the details and picks the product line(s).
// If a customer with the same phone/email already exists, the backend merges into it.
export default function ConvertLeadModal({ lead, onClose, onConverted }) {
  const [form, setForm] = useState(fromLead(lead));
  const [folderIds, setFolderIds] = useState([]);
  const [folderError, setFolderError] = useState('');
  const [saving, setSaving] = useState(false);
  const isPhone = useMediaQuery('(max-width: 639px)');

  useEffect(() => {
    setForm(fromLead(lead));
    setFolderIds([]);
    setFolderError('');
  }, [lead]);

  // Read the value now: e.currentTarget is null by the time React runs the state updater.
  const set = (key) => (e) => {
    const { value } = e.currentTarget;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!folderIds.length) return setFolderError('Select at least one product line');
    setSaving(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/leads/${lead.id}/convert`,
        { ...form, folder_ids: folderIds },
        { headers: await authHeaders() },
      );
      showNotification(
        data?.merged
          ? { title: 'Merged', message: `${form.full_name} already was a customer. Product line(s) added to that customer.`, color: 'blue' }
          : { title: 'Converted', message: `${form.full_name} is now a customer.`, color: 'green' },
      );
      onConverted?.(lead, data);
      onClose();
    } catch (err) {
      showNotification({ title: 'Error', message: err.response?.data?.message || err.response?.data || err.message || 'Failed to convert lead.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={!!lead} onClose={onClose} title="Convert to Customer" centered size="lg" fullScreen={isPhone}>
      <form onSubmit={submit} className="space-y-4">
        <ProductLineSelect
          value={folderIds}
          onChange={(ids) => {
            setFolderIds(ids);
            if (ids.length) setFolderError('');
          }}
          error={folderError}
          required
          data-autofocus
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="Full Name" required value={form.full_name} onChange={set('full_name')} />
          <TextInput label="Phone Number" type="tel" value={form.phone_number} onChange={set('phone_number')} />
          <TextInput label="Email" type="email" className="sm:col-span-2" value={form.email} onChange={set('email')} />
          <TextInput label="Product Name" placeholder="e.g. Term plan" value={form.product_name} onChange={set('product_name')} />
          <TextInput label="Policy Number" value={form.policy_number} onChange={set('policy_number')} />
          <TextInput label="Premium" type="number" value={form.premium} onChange={set('premium')} />
        </div>
        <Text size="xs" color="dimmed">
          This lead will move out of the lead list. If a customer with the same phone or email exists, the two are merged.
        </Text>
        <Group position="right" className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="default" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" color="teal" loading={saving} className="w-full sm:w-auto">
            Convert
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
