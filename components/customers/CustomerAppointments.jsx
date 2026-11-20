'use client';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Autocomplete, Badge, Button, Checkbox, Loader, Menu, Modal, Select, Text, TextInput, Textarea, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  IconCalendarPlus, IconCalendarTime, IconCheck, IconDotsVertical, IconHistory, IconPencil, IconRefresh, IconTrash, IconUser, IconX,
} from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const PURPOSES = ['Consultation', 'Policy review', 'Renewal discussion', 'Claim support', 'Document collection', 'Follow-up meeting'];
export const OUTCOMES = ['Interested', 'Not interested', 'Policy sold', 'Needs follow-up', 'Documents pending', 'Customer did not come', 'Other'];

const pad = (n) => String(n).padStart(2, '0');
// Date → value for <input type="datetime-local"> (local time).
const toInput = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
// Local datetime-local value → exact moment for the server (so the server's time zone does not matter).
const toIso = (local) => {
  const d = local ? new Date(local) : null;
  return d && !isNaN(d.getTime()) ? d.toISOString() : '';
};
const nowInput = () => toInput(new Date());
const fmt = (v) => {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};
const rel = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return '';
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  const abs = Math.abs(mins);
  const span = abs < 60 ? `${abs} min` : abs < 1440 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} days`;
  return mins >= 0 ? `in ${span}` : `${span} ago`;
};
const isFuture = (local) => {
  const d = local ? new Date(local) : null;
  return d && !isNaN(d.getTime()) && d.getTime() > Date.now() - 60000;
};

const STATE = {
  upcoming: { label: 'Upcoming', color: 'blue' },
  overdue: { label: 'Overdue', color: 'red' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'gray' },
};
const FILTERS = ['upcoming', 'overdue', 'completed', 'cancelled', 'all'];

const ACTION_LABEL = {
  created: 'Booked', rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed', reopened: 'Reopened',
  reassigned: 'Given to another staff member', updated: 'Edited', deleted: 'Deleted',
};

function Shell({ opened, onClose, title, children, busy }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  return (
    <Modal opened={opened} onClose={() => !busy && onClose()} title={title} centered size="lg" fullScreen={isPhone}>
      {children}
    </Modal>
  );
}

function Buttons({ onCancel, busy, label, color = 'blue', disabled = false }) {
  return (
    <div className="mt-2 flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
      <Button variant="default" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">Back</Button>
      <Button type="submit" color={color} loading={busy} disabled={disabled} className="w-full sm:w-auto">{label}</Button>
    </div>
  );
}

// Outcome + optional next follow-up (used when completing, and when recording a meeting that already happened).
// onChange is a state setter: updates are merged into the latest form (never a stale copy).
function OutcomeFields({ value, onChange }) {
  const set = (k) => (v) => {
    const val = v && typeof v === 'object' && 'currentTarget' in v ? v.currentTarget.value : v;
    onChange((f) => ({ ...f, [k]: val }));
  };
  return (
    <>
      <Select label="How did it go?" required data={OUTCOMES} value={value.outcome || null} onChange={set('outcome')} withinPortal placeholder="Choose the outcome" />
      <Textarea label="Meeting notes" value={value.outcome_notes || ''} onChange={set('outcome_notes')} autosize minRows={2} className="sm:col-span-2" />
      <Checkbox label="Add the next follow-up" checked={!!value.withNext} onChange={(e) => { const on = e.currentTarget.checked; onChange((f) => ({ ...f, withNext: on })); }} className="sm:col-span-2" />
      {value.withNext && (
        <>
          <TextInput label="Follow-up date & time" type="datetime-local" required min={nowInput()} value={value.next_date || ''} onChange={set('next_date')} />
          <TextInput label="Follow-up purpose" value={value.next_purpose || ''} onChange={set('next_purpose')} placeholder="e.g. Share quotation" />
          <Textarea label="Follow-up remarks" value={value.next_notes || ''} onChange={set('next_notes')} autosize minRows={1} className="sm:col-span-2" />
        </>
      )}
    </>
  );
}
const outcomeError = (o) => {
  if (!o.outcome) return 'Please choose how the meeting went.';
  if (o.withNext && !o.next_date) return 'Please choose the date and time of the next follow-up.';
  if (o.withNext && !isFuture(o.next_date)) return 'The next follow-up must be in the future.';
  return '';
};
const outcomeBody = (o) => ({
  outcome: o.outcome,
  outcome_notes: o.outcome_notes || '',
  ...(o.withNext ? { next_followup: { date: toIso(o.next_date), purpose: o.next_purpose || '', notes: o.next_notes || '' } } : {}),
});

// Profile section: every appointment of the customer with Upcoming / Overdue / Completed / Cancelled filters,
// booking, reschedule, cancel, complete (outcome + next follow-up), staff assignment and history.
// isAdmin: can give an appointment to any team member. addSignal: change it to open "Add appointment".
// onChange: after anything is saved (e.g. to refresh the profile overview).
export default function CustomerAppointments({ customer, isAdmin = false, addSignal = 0, onChange, hideTitle = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(null);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(null); // { kind: 'add'|'edit'|'reschedule'|'cancel'|'complete'|'history'|'delete', appt? }
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/appointments/customer/${customer.id}`, { headers: await authHeaders() });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load appointments. Please try again.'));
    }
  }, [customer.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/customers/assignment/staff`, { headers: await authHeaders() });
        setStaff(res.data?.staff || []);
      } catch (_) {
        setStaff([]);
      }
    })();
  }, [isAdmin]);

  const open = (kind, appt = null) => {
    setFormError('');
    setHistory(null);
    if (kind === 'add') setForm({ date: '', purpose: '', notes: '', user_id: '', past: false, outcome: null });
    if (kind === 'edit') setForm({ purpose: appt.appointment_type || '', notes: appt.notes || '', user_id: appt.user_id ? String(appt.user_id) : '' });
    if (kind === 'reschedule') setForm({ date: '', reason: '' });
    if (kind === 'cancel') setForm({ reason: '' });
    if (kind === 'complete') setForm({ outcome: appt?.outcome || null, outcome_notes: appt?.outcome_notes || '', withNext: false });
    if (kind === 'history') {
      (async () => {
        try {
          const res = await axios.get(`${API_URL}/api/appointments/${appt.id}/history`, { headers: await authHeaders() });
          setHistory(res.data);
        } catch (err) {
          setHistory({ error: errorMessage(err, 'Could not load the history. Please try again.') });
        }
      })();
    }
    setModal({ kind, appt });
  };

  useEffect(() => {
    if (addSignal) open('add');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  const run = async (request, done) => {
    setBusy(true);
    setFormError('');
    try {
      const res = await request(await authHeaders());
      setModal(null);
      showNotification({ title: done, message: res?.data?.next_followup_id ? 'The next follow-up was added too.' : 'Saved.', color: 'green' });
      await load();
      onChange?.();
    } catch (err) {
      setFormError(errorMessage(err, 'Could not save. Nothing was changed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const { kind, appt } = modal;
    const url = `${API_URL}/api/appointments`;
    if (kind === 'add') {
      if (!form.date) return setFormError('Please choose the appointment date and time.');
      if (!form.purpose.trim()) return setFormError('Please enter the purpose of the appointment.');
      if (!form.past && !isFuture(form.date)) return setFormError('This time has already passed. Choose a future time, or tick "This meeting already happened".');
      if (form.past) {
        const oe = outcomeError(form);
        if (oe) return setFormError(oe);
      }
      const body = {
        customer_id: customer.id,
        appointment_date: toIso(form.date),
        appointment_type: form.purpose.trim(),
        notes: form.notes,
        ...(isAdmin && form.user_id ? { user_id: Number(form.user_id) } : {}),
        ...(form.past ? { status: 'Completed', ...outcomeBody(form) } : {}),
      };
      return run((headers) => axios.post(url, body, { headers }), form.past ? 'Meeting recorded' : 'Appointment booked');
    }
    if (kind === 'edit') {
      if (!form.purpose.trim()) return setFormError('Please enter the purpose of the appointment.');
      const body = { appointment_type: form.purpose.trim(), notes: form.notes, ...(isAdmin ? { user_id: form.user_id ? Number(form.user_id) : null } : {}) };
      return run((headers) => axios.put(`${url}/${appt.id}`, body, { headers }), 'Appointment updated');
    }
    if (kind === 'reschedule') {
      if (!form.date) return setFormError('Please choose the new date and time.');
      if (!isFuture(form.date)) return setFormError('Please choose a future date and time.');
      const reopen = appt.state === 'cancelled';
      return run((headers) => axios.post(`${url}/${appt.id}/reschedule`, { appointment_date: toIso(form.date), reason: form.reason, ...(reopen ? { status: 'Scheduled' } : {}) }, { headers }), reopen ? 'Appointment reopened' : 'Appointment rescheduled');
    }
    if (kind === 'cancel') {
      return run((headers) => axios.post(`${url}/${appt.id}/cancel`, { reason: form.reason }, { headers }), 'Appointment cancelled');
    }
    if (kind === 'complete') {
      const oe = outcomeError(form);
      if (oe) return setFormError(oe);
      return run((headers) => axios.post(`${url}/${appt.id}/complete`, outcomeBody(form), { headers }), 'Outcome saved');
    }
    if (kind === 'delete') {
      return run((headers) => axios.delete(`${url}/${appt.id}`, { headers }), 'Appointment deleted');
    }
    return null;
  };

  const counts = data?.counts || { upcoming: 0, overdue: 0, completed: 0, cancelled: 0, total: 0 };
  const active = filter || (counts.overdue && !counts.upcoming ? 'overdue' : 'upcoming');
  const list = (data?.appointments || []).filter((a) => active === 'all' || a.state === active);
  // Upcoming soonest first; the rest newest first.
  if (active === 'upcoming') list.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
  // Read the value now: React clears the event before a state updater runs.
  const valueOf = (v) => (v && typeof v === 'object' && 'currentTarget' in v ? (v.currentTarget.type === 'checkbox' ? v.currentTarget.checked : v.currentTarget.value) : v);
  const set = (k) => (v) => {
    const value = valueOf(v);
    setForm((f) => ({ ...f, [k]: value }));
  };
  const staffData = [{ value: '', label: isAdmin ? "Customer's staff member (default)" : 'Me' }, ...staff.map((s) => ({ value: String(s.id), label: s.username }))];
  const k = modal?.kind;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        {!hideTitle && (
          <div className="text-base font-semibold dark:text-white-light">
            Appointments {counts.total > 0 && <span className="text-sm font-normal text-gray-500">({counts.total})</span>}
          </div>
        )}
        <Button size="xs" variant="light" leftIcon={<IconCalendarPlus size={14} />} onClick={() => open('add')}>Add Appointment</Button>
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error} <Button variant="subtle" size="xs" compact onClick={load}>Try again</Button></div>
      ) : !data ? (
        <div className="flex justify-center py-4"><Loader size="sm" /></div>
      ) : (
        <>
          <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((f) => {
              const n = f === 'all' ? counts.total : counts[f];
              const on = active === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${on ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'} ${f === 'overdue' && n && !on ? '!border-red-300 !text-red-600' : ''}`}
                  aria-pressed={on}
                >
                  {f === 'all' ? 'All' : STATE[f].label} ({n})
                </button>
              );
            })}
          </div>

          {!list.length ? (
            <Text size="sm" color="dimmed">
              {active === 'upcoming' ? 'No upcoming appointments. Use "Add Appointment" to book one.' : active === 'overdue' ? 'Nothing overdue.' : `No ${active === 'all' ? '' : STATE[active].label.toLowerCase() + ' '}appointments.`}
            </Text>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map((a) => (
                <div key={a.id} className={`min-w-0 rounded-lg border p-3 ${a.state === 'overdue' ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Text weight={600} className="break-words">{a.appointment_type || 'Appointment'}</Text>
                        <Badge size="xs" color={STATE[a.state].color} variant={a.state === 'overdue' ? 'filled' : 'light'}>{STATE[a.state].label}</Badge>
                        {a.reschedule_count > 0 && <Badge size="xs" color="gray" variant="outline">Moved {a.reschedule_count}×</Badge>}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        <IconCalendarTime size={14} className="shrink-0 text-gray-500" />
                        <span className="break-words">{fmt(a.appointment_date)}</span>
                        {(a.state === 'upcoming' || a.state === 'overdue') && <span className="text-xs text-gray-500">· {rel(a.appointment_date)}</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <IconUser size={12} className="shrink-0" /> {a.staff_name || 'No staff member'}
                      </div>
                    </div>
                    <Menu withinPortal position="bottom-end" shadow="md">
                      <Menu.Target>
                        <ActionIcon variant="subtle" aria-label="Appointment actions"><IconDotsVertical size={18} /></ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {a.state !== 'cancelled' && a.state !== 'completed' && <Menu.Item icon={<IconPencil size={14} />} onClick={() => open('edit', a)}>Edit</Menu.Item>}
                        {a.state === 'completed' && <Menu.Item icon={<IconPencil size={14} />} onClick={() => open('complete', a)}>Edit outcome</Menu.Item>}
                        <Menu.Item icon={<IconHistory size={14} />} onClick={() => open('history', a)}>History</Menu.Item>
                        <Menu.Divider />
                        <Menu.Item color="red" icon={<IconTrash size={14} />} onClick={() => open('delete', a)}>Delete</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </div>

                  {a.notes && <div className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{a.notes}</div>}
                  {a.state === 'completed' && (a.outcome || a.outcome_notes) && (
                    <div className="mt-2 rounded-md bg-green-50 p-2 text-sm dark:bg-green-900/20">
                      {a.outcome && <div><span className="text-xs text-gray-500">Outcome: </span><b>{a.outcome}</b></div>}
                      {a.outcome_notes && <div className="whitespace-pre-wrap break-words">{a.outcome_notes}</div>}
                      {a.next_followup_date && <div className="mt-1 text-xs">Next follow-up: {fmt(a.next_followup_date)}{a.next_followup_purpose ? ` · ${a.next_followup_purpose}` : ''}</div>}
                    </div>
                  )}
                  {a.state === 'cancelled' && a.cancel_reason && <div className="mt-2 break-words text-xs text-gray-500">Reason: {a.cancel_reason}</div>}

                  {/* Main actions for the state */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(a.state === 'upcoming' || a.state === 'overdue') && (
                      <>
                        <Button size="xs" color="green" variant={a.state === 'overdue' ? 'filled' : 'light'} leftIcon={<IconCheck size={14} />} onClick={() => open('complete', a)}>
                          {a.state === 'overdue' ? 'Record outcome' : 'Complete'}
                        </Button>
                        <Button size="xs" variant="light" leftIcon={<IconRefresh size={14} />} onClick={() => open('reschedule', a)}>Reschedule</Button>
                        <Button size="xs" variant="subtle" color="gray" leftIcon={<IconX size={14} />} onClick={() => open('cancel', a)}>Cancel</Button>
                      </>
                    )}
                    {a.state === 'cancelled' && <Button size="xs" variant="light" leftIcon={<IconRefresh size={14} />} onClick={() => open('reschedule', a)}>Reopen with new time</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── popups ─── */}
      <Shell opened={k === 'add' || k === 'edit'} onClose={() => setModal(null)} busy={busy} title={k === 'edit' ? 'Edit appointment' : `New appointment${customer.full_name ? ` with ${customer.full_name}` : ''}`}>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {k === 'add' && (
            <TextInput label="Date & time" type="datetime-local" required min={form.past ? undefined : nowInput()} max={form.past ? nowInput() : undefined} value={form.date || ''} onChange={set('date')} />
          )}
          <Autocomplete label="Purpose" required data={PURPOSES} value={form.purpose || ''} onChange={set('purpose')} placeholder="e.g. Policy review" maxLength={50} withinPortal />
          {isAdmin && <Select label="Staff member" data={staffData} value={form.user_id ?? ''} onChange={(v) => setForm((f) => ({ ...f, user_id: v || '' }))} withinPortal className={k === 'edit' ? '' : 'sm:col-span-2'} />}
          <Textarea label="Remarks" value={form.notes || ''} onChange={set('notes')} autosize minRows={2} className="sm:col-span-2" />
          {k === 'add' && (
            <Checkbox label="This meeting already happened (record its outcome)" checked={!!form.past} onChange={set('past')} className="sm:col-span-2" />
          )}
          {k === 'add' && form.past && <OutcomeFields value={form} onChange={setForm} />}
          {formError && <Text size="sm" color="red" className="sm:col-span-2">{formError}</Text>}
          <Buttons onCancel={() => setModal(null)} busy={busy} label={k === 'edit' ? 'Save changes' : form.past ? 'Save meeting' : 'Book appointment'} />
        </form>
      </Shell>

      <Shell opened={k === 'reschedule'} onClose={() => setModal(null)} busy={busy} title={modal?.appt?.state === 'cancelled' ? 'Reopen appointment' : 'Reschedule appointment'}>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modal?.appt && <Text size="sm" className="sm:col-span-2">Now: <b>{fmt(modal.appt.appointment_date)}</b></Text>}
          <TextInput label="New date & time" type="datetime-local" required min={nowInput()} value={form.date || ''} onChange={set('date')} />
          <TextInput label="Reason (optional)" value={form.reason || ''} onChange={set('reason')} maxLength={500} />
          <Text size="xs" color="dimmed" className="sm:col-span-2">Reminders will be sent again for the new time. The old time is kept in the history.</Text>
          {formError && <Text size="sm" color="red" className="sm:col-span-2">{formError}</Text>}
          <Buttons onCancel={() => setModal(null)} busy={busy} label={modal?.appt?.state === 'cancelled' ? 'Reopen' : 'Reschedule'} />
        </form>
      </Shell>

      <Shell opened={k === 'cancel'} onClose={() => setModal(null)} busy={busy} title="Cancel this appointment?">
        <form onSubmit={submit} className="grid grid-cols-1 gap-3">
          {modal?.appt && <Text size="sm">{modal.appt.appointment_type} on <b>{fmt(modal.appt.appointment_date)}</b> will be cancelled. It stays in the list under Cancelled, and you can reopen it later.</Text>}
          <TextInput label="Reason (optional)" value={form.reason || ''} onChange={set('reason')} maxLength={500} placeholder="e.g. Customer is travelling" />
          {formError && <Text size="sm" color="red">{formError}</Text>}
          <Buttons onCancel={() => setModal(null)} busy={busy} label="Cancel appointment" color="red" />
        </form>
      </Shell>

      <Shell opened={k === 'complete'} onClose={() => setModal(null)} busy={busy} title={modal?.appt?.state === 'completed' ? 'Edit meeting outcome' : 'How did the meeting go?'}>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modal?.appt && <Text size="sm" className="sm:col-span-2">{modal.appt.appointment_type} · {fmt(modal.appt.appointment_date)}</Text>}
          <OutcomeFields value={form} onChange={setForm} />
          {formError && <Text size="sm" color="red" className="sm:col-span-2">{formError}</Text>}
          <Buttons onCancel={() => setModal(null)} busy={busy} label="Save outcome" color="green" />
        </form>
      </Shell>

      <Shell opened={k === 'delete'} onClose={() => setModal(null)} busy={busy} title="Delete this appointment?">
        <form onSubmit={submit} className="grid grid-cols-1 gap-3">
          <Text size="sm">It will be removed from the list. A copy is kept in the history. To keep it visible, cancel it instead.</Text>
          {formError && <Text size="sm" color="red">{formError}</Text>}
          <Buttons onCancel={() => setModal(null)} busy={busy} label="Delete" color="red" />
        </form>
      </Shell>

      <Shell opened={k === 'history'} onClose={() => setModal(null)} title="Appointment history">
        {!history ? (
          <div className="flex justify-center py-4"><Loader size="sm" /></div>
        ) : history.error ? (
          <Text size="sm" color="red">{history.error}</Text>
        ) : !history.length ? (
          <Text size="sm" color="dimmed">No changes recorded yet.</Text>
        ) : (
          <div>
            {history.map((h) => (
              <div key={h.id} className="border-b border-gray-200 py-2 last:border-b-0 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b>{ACTION_LABEL[h.action] || h.action}</b>
                  {h.action === 'rescheduled' && <span className="break-words">{fmt(h.from_date)} → {fmt(h.to_date)}</span>}
                  {h.action === 'created' && h.to_date && <span>for {fmt(h.to_date)}</span>}
                  {h.action === 'reassigned' && <span>{h.from_name || 'No staff member'} → {h.to_name || 'No staff member'}</span>}
                </div>
                {h.details?.reason && <div className="text-xs text-gray-600">Reason: {h.details.reason}</div>}
                {h.details?.outcome && <div className="text-xs text-gray-600">Outcome: {h.details.outcome}{h.details.outcome_notes ? ` · ${h.details.outcome_notes}` : ''}</div>}
                <Text size="xs" color="dimmed">{fmt(h.created_at)}{h.actor_name ? ` · by ${h.actor_name}` : ''}</Text>
              </div>
            ))}
          </div>
        )}
      </Shell>
    </div>
  );
}
