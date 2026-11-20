'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ActionIcon, Badge, Button, Loader, Modal, Select, Text, TextInput, Textarea } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconArrowLeft, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from '@/components/customers/useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CHANNEL_OPTIONS = [
  { value: 'all', label: 'All channels' },
  { value: 'whatsapp', label: 'WhatsApp only' },
  { value: 'sms', label: 'SMS only' },
  { value: 'email', label: 'Email only' },
];
const CHANNEL_BADGE = { all: ['All channels', 'gray'], whatsapp: ['WhatsApp', 'green'], sms: ['SMS', 'blue'], email: ['Email', 'orange'] };
const PLACEHOLDER_HELP = { name: 'Full name', first_name: 'First name', phone: 'Phone', email: 'Email', policy_number: 'Policy number', product_name: 'Product', company_name: 'Company', premium: 'Premium', renewal_date: 'Renewal date', staff_name: 'Your name' };
const EMPTY = { name: '', channel: 'all', subject: '', body: '' };

// Message templates (#19): used from a customer's profile for WhatsApp, SMS and Email.
export default function MessageTemplatesPage() {
  const router = useRouter();
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null); // null | {id?, ...}
  const [removing, setRemoving] = useState(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/message-templates`, { headers: await authHeaders() });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the templates. Please try again.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (v) => {
    const value = v && typeof v === 'object' && 'currentTarget' in v ? v.currentTarget.value : v;
    setEdit((f) => ({ ...f, [k]: value }));
  };

  // Puts {placeholder} where the cursor is in the message.
  const insert = (key) => {
    const token = `{${key}}`;
    const el = bodyRef.current;
    setEdit((f) => {
      const text = f.body || '';
      const at = el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length;
      return { ...f, body: `${text.slice(0, at)}${token}${text.slice(at)}` };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!edit.name.trim()) return setFormError('Please give the template a name.');
    if (!edit.body.trim()) return setFormError('Please write the message.');
    setBusy(true);
    setFormError('');
    try {
      const body = { name: edit.name, channel: edit.channel, subject: edit.subject, body: edit.body };
      if (edit.id) await axios.put(`${API_URL}/api/message-templates/${edit.id}`, body, { headers: await authHeaders() });
      else await axios.post(`${API_URL}/api/message-templates`, body, { headers: await authHeaders() });
      showNotification({ title: 'Template saved', message: `"${edit.name.trim()}" is ready to use.`, color: 'green' });
      setEdit(null);
      load();
    } catch (err) {
      setFormError(errorMessage(err, 'Could not save the template. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await axios.delete(`${API_URL}/api/message-templates/${removing.id}`, { headers: await authHeaders() });
      showNotification({ title: 'Template deleted', message: `"${removing.name}" was deleted. Messages already sent are not affected.`, color: 'green' });
      setRemoving(null);
      load();
    } catch (err) {
      showNotification({ title: 'Could not delete', message: errorMessage(err, 'Could not delete the template. Please try again.'), color: 'red' });
    } finally {
      setBusy(false);
    }
  };

  const templates = data?.templates || [];
  const placeholders = data?.placeholders || Object.keys(PLACEHOLDER_HELP);

  return (
    <div className="panel max-md:!border-0 max-md:!bg-transparent max-md:!p-0 max-md:!shadow-none dark:max-md:!bg-transparent">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ActionIcon variant="subtle" color="dark" size="lg" radius="xl" className="-ml-1.5 shrink-0" onClick={() => router.back()} aria-label="Back">
          <IconArrowLeft size={22} />
        </ActionIcon>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white-light sm:text-xl">Message Templates</h2>
          <Text size="xs" color="dimmed">Ready-made messages for WhatsApp, SMS and Email. Use them from a customer&apos;s profile; details like {'{name}'} are filled in automatically.</Text>
        </div>
        <Button leftIcon={<IconPlus size={16} />} onClick={() => { setFormError(''); setEdit({ ...EMPTY }); }} className="max-sm:w-full">New template</Button>
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error} <Button variant="subtle" size="xs" compact onClick={load}>Try again</Button></div>
      ) : !data ? (
        <div className="flex justify-center py-8"><Loader /></div>
      ) : !templates.length ? (
        <Text size="sm" color="dimmed">No templates yet. Use &quot;New template&quot; to add one.</Text>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => {
            const [label, color] = CHANNEL_BADGE[t.channel] || CHANNEL_BADGE.all;
            return (
              <div key={t.id} className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text weight={600} className="break-words">{t.name}</Text>
                      <Badge size="xs" color={color} variant="light">{label}</Badge>
                    </div>
                    {t.subject && <Text size="xs" color="dimmed" className="break-words">Subject: {t.subject}</Text>}
                  </div>
                  <ActionIcon variant="subtle" color="blue" aria-label={`Edit ${t.name}`} onClick={() => { setFormError(''); setEdit({ id: t.id, name: t.name, channel: t.channel, subject: t.subject || '', body: t.body }); }}><IconPencil size={16} /></ActionIcon>
                  <ActionIcon variant="subtle" color="red" aria-label={`Delete ${t.name}`} onClick={() => setRemoving(t)}><IconTrash size={16} /></ActionIcon>
                </div>
                <div className="mt-2 line-clamp-6 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{t.body}</div>
              </div>
            );
          })}
        </div>
      )}

      <Modal opened={!!edit} onClose={() => !busy && setEdit(null)} title={edit?.id ? 'Edit template' : 'New template'} centered size="lg" fullScreen={isPhone}>
        {edit && (
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput label="Name" required value={edit.name} onChange={set('name')} maxLength={80} placeholder="e.g. Renewal reminder" />
              <Select label="Use for" data={CHANNEL_OPTIONS} value={edit.channel} onChange={set('channel')} withinPortal />
            </div>
            {(edit.channel === 'email' || edit.channel === 'all') && (
              <TextInput label="Email subject" value={edit.subject} onChange={set('subject')} maxLength={200} description="Used when this template is sent by email." />
            )}
            <Textarea label="Message" required value={edit.body} onChange={set('body')} autosize minRows={6} maxRows={16} ref={bodyRef} />
            <div>
              <Text size="xs" color="dimmed" mb={4}>Insert customer details (filled in when sending):</Text>
              <div className="flex flex-wrap gap-1.5">
                {placeholders.map((p) => (
                  <button key={p} type="button" onClick={() => insert(p)} className="rounded-full border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800" title={`{${p}}`}>
                    {PLACEHOLDER_HELP[p] || p}
                  </button>
                ))}
              </div>
            </div>
            {formError && <Text size="sm" color="red">{formError}</Text>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="default" onClick={() => setEdit(null)} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" loading={busy} className="w-full sm:w-auto">Save template</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal opened={!!removing} onClose={() => !busy && setRemoving(null)} title="Delete this template?" centered fullScreen={isPhone}>
        <Text size="sm" mb="md">&quot;{removing?.name}&quot; will be deleted. Messages already sent with it stay in the customers&apos; history.</Text>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="default" onClick={() => setRemoving(null)} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
          <Button color="red" onClick={remove} loading={busy} className="w-full sm:w-auto">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
