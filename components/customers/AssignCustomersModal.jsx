'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Badge, Button, Checkbox, Loader, Modal, Radio, Select, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconInfoCircle, IconUsers } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Even split preview: same as the server (first ones in the list get the extra one).
const shares = (count, ids) => Object.fromEntries(ids.map((id, i) => [id, Math.floor(count / ids.length) + (i < count % ids.length ? 1 : 0)]));

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Assign / reassign customers (admin). customers: [{ id, full_name, user_id }].
// One customer always has one staff member; their pending follow-ups, upcoming appointments and pending
// reminders move with them.
export default function AssignCustomersModal({ opened, customers = [], onClose, onDone }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [team, setTeam] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState('single');
  const [userId, setUserId] = useState(null);
  const [equalIds, setEqualIds] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const count = customers.length;
  const single = count === 1 ? customers[0] : null;

  useEffect(() => {
    if (!opened) return;
    setMode('single');
    setUserId(null);
    setEqualIds([]);
    setError('');
    setTeam(null);
    setLoadError('');
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/customers/assignment/staff`, { headers: await authHeaders() });
        setTeam(data);
      } catch (err) {
        setLoadError(errorMessage(err, 'Could not load your team. Please try again.'));
      }
    })();
  }, [opened]);

  const staff = team?.staff || [];
  const nameOf = Object.fromEntries(staff.map((s) => [String(s.id), s.username]));
  const preview = mode === 'equal' && equalIds.length >= 2 ? shares(count, equalIds) : null;

  const save = async () => {
    setError('');
    if (mode === 'single' && !userId) return setError('Please choose a team member.');
    if (mode === 'equal' && equalIds.length < 2) return setError('Select at least two team members to share the customers equally.');
    setSaving(true);
    try {
      const body = { customer_ids: customers.map((c) => c.id), mode };
      if (mode === 'single') body.user_id = Number(userId);
      if (mode === 'equal') body.user_ids = equalIds.map(Number);
      const { data } = await axios.post(`${API_URL}/api/customers/assign`, body, { headers: await authHeaders() });
      const s = data.summary || {};
      const moved = [
        s.followups_moved ? plural(s.followups_moved, 'follow-up') : null,
        s.appointments_moved ? plural(s.appointments_moved, 'appointment') : null,
        s.reminders_moved ? plural(s.reminders_moved, 'reminder') : null,
      ].filter(Boolean);
      const parts = [
        s.assigned ? `${plural(s.assigned, 'customer')} assigned.` : 'Nothing to change: they already had this staff member.',
        moved.length ? `Moved with them: ${moved.join(', ')}.` : null,
        s.followups_merged ? `${plural(s.followups_merged, 'follow-up')} the new staff member already had were not added twice.` : null,
        s.unchanged && s.assigned ? `${plural(s.unchanged, 'customer')} already had this staff member.` : null,
        s.kept_with_previous?.length ? `Some ${s.kept_with_previous.join(' and ')} stayed with the previous staff member.` : null,
        s.not_found ? `${plural(s.not_found, 'customer')} could not be found and were skipped.` : null,
      ].filter(Boolean);
      showNotification({ title: 'Assignment saved', message: parts.join(' '), color: 'green', autoClose: 8000 });
      onDone?.(data.summary);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not assign the customers. Nothing was changed. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const staffLabel = (s) => `${s.username}${s.role ? ` (${s.role})` : ''} · ${plural(s.customers, 'customer')}`;
  const toggleEqual = (id) => setEqualIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal
      opened={opened}
      onClose={() => !saving && onClose()}
      title={single ? `Assign ${single.full_name || 'customer'}` : `Assign ${plural(count, 'customer')}`}
      centered
      size="lg"
      fullScreen={isPhone}
    >
      {single && (
        <Text size="sm" mb="sm">
          Now with: <b>{single.assigned_to_name || (Number(single.user_id) > 0 ? 'A team member' : 'You (not assigned)')}</b>
        </Text>
      )}

      {loadError ? (
        <Text size="sm" color="red">{loadError}</Text>
      ) : !team ? (
        <div className="flex justify-center py-6"><Loader size="sm" /></div>
      ) : !staff.length ? (
        <Text size="sm" color="dimmed">You have no team members yet. Add a team member first, then assign customers to them.</Text>
      ) : (
        <div className="space-y-4">
          <Radio.Group value={mode} onChange={(v) => { setMode(v); setError(''); }} orientation="vertical" spacing="xs">
            <Radio value="single" label="One team member" />
            {count > 1 && staff.length > 1 && <Radio value="equal" label="Share equally between team members" />}
            <Radio value="unassign" label="Nobody (you handle them)" />
          </Radio.Group>

          {mode === 'single' && (
            <Select
              label="Team member"
              placeholder="Choose a team member"
              data={staff.map((s) => ({ value: String(s.id), label: staffLabel(s) }))}
              value={userId}
              onChange={setUserId}
              searchable
              withinPortal
              nothingFound="No team member found"
            />
          )}

          {mode === 'equal' && (
            <div>
              <Text size="sm" weight={500} mb={6}>Team members ({equalIds.length} selected)</Text>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-gray-700">
                {staff.map((s) => {
                  const id = String(s.id);
                  return (
                    <div key={id} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Checkbox checked={equalIds.includes(id)} onChange={() => toggleEqual(id)} label={staffLabel(s)} className="min-w-0" />
                      {preview && preview[id] !== undefined && (
                        <Badge size="sm" color="blue" variant="light" className="shrink-0">+{preview[id]}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {preview && (
                <Text size="xs" color="dimmed" mt={6}>
                  Each gets {Math.floor(count / equalIds.length)}
                  {count % equalIds.length ? ` or ${Math.floor(count / equalIds.length) + 1}` : ''} customers. Customers already with one of them stay where they are.
                </Text>
              )}
            </div>
          )}

          {team.unassigned > 0 && (
            <Text size="xs" color="dimmed"><IconUsers size={12} className="mr-1 inline" />{plural(team.unassigned, 'customer')} in your account have no staff member.</Text>
          )}

          <div className="flex gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <IconInfoCircle size={18} className="mt-0.5 shrink-0" />
            <span>
              Pending follow-ups, upcoming appointments and pending reminders move with the customer
              {mode === 'unassign' ? ' to you' : ' to the new staff member'}. Their dates and remarks stay the same. Completed ones stay as history. Every change is saved in the customer&apos;s history.
            </span>
          </div>
        </div>
      )}

      {error && <Text size="sm" color="red" mt="sm">{error}</Text>}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="default" onClick={onClose} disabled={saving} className="w-full sm:w-auto">Cancel</Button>
        <Button onClick={save} loading={saving} disabled={!team || !staff.length} className="w-full sm:w-auto">
          {mode === 'equal' && preview ? `Share between ${equalIds.length}` : 'Assign'}
        </Button>
      </div>
      {mode === 'single' && userId && nameOf[userId] && count > 1 && (
        <Text size="xs" color="dimmed" mt="xs" align="right">All {count} go to {nameOf[userId]}.</Text>
      )}
    </Modal>
  );
}
