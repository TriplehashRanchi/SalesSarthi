'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, TextInput, Textarea, Select, Button, Group, Text, Loader } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowsTransferDown, IconExternalLink } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import ProductLineSelect from './ProductLineSelect';
import DuplicateCustomerModal from './DuplicateCustomerModal';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) || d.getFullYear() < 1900 ? '' : d.toLocaleDateString('en-CA');
};
const gender = (v) => {
  const g = String(v ?? '').trim().toLowerCase();
  return g === 'm' || g === 'male' ? 'Male' : g === 'f' || g === 'female' ? 'Female' : '';
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const FIELDS = ['full_name', 'phone_number', 'email', 'gender', 'date_of_birth', 'address', 'company_name', 'product_name', 'policy_number', 'premium', 'coverage_amount', 'source', 'referrer', 'notes'];

// Form values from the lead (and, once loaded, the server's fuller copy of it).
// prefill (optional): { product_name, premium }, e.g. from an accepted proposal; it wins over the lead's values.
const fromLead = (lead, prefill) => {
  const out = Object.fromEntries(FIELDS.map((f) => [f, lead?.[f] ?? '']));
  out.product_name = lead?.product_name || lead?.preferred_plan || lead?.insurance_type || '';
  out.source = lead?.source || lead?.lead_source || '';
  out.gender = gender(lead?.gender);
  out.date_of_birth = toDateInput(lead?.date_of_birth);
  if (prefill?.product_name) out.product_name = prefill.product_name;
  if (prefill?.premium !== undefined && prefill?.premium !== null && prefill?.premium !== '') out.premium = prefill.premium;
  ['premium', 'coverage_amount'].forEach((f) => { out[f] = out[f] === null || out[f] === undefined ? '' : String(out[f]); });
  return out;
};

// Lead → Customer (smart conversion): the user checks and edits every detail, sees what will move over,
// then confirms. A matching customer (same phone/email) is offered before anything is saved.
export default function ConvertLeadModal({ lead, prefill, onClose, onConverted, profilePath = (id) => `/view-customer/${id}` }) {
  const [form, setForm] = useState(fromLead(lead, prefill));
  const [folderIds, setFolderIds] = useState([]);
  const [folderError, setFolderError] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [already, setAlready] = useState(null);
  const [duplicate, setDuplicate] = useState(null);
  const isPhone = useMediaQuery('(max-width: 639px)');

  useEffect(() => {
    setForm(fromLead(lead, prefill));
    setFolderIds([]);
    setFolderError('');
    setDuplicate(null);
    setAlready(null);
    setPreview(null);
    setPreviewError('');
    if (!lead?.id) return undefined;
    let live = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/leads/${lead.id}/convert-preview`, { headers: await authHeaders() });
        if (!live) return;
        setPreview(data);
        setAlready(data.already_converted);
        // Fill in what the list row did not have; anything the user already typed stays.
        setForm((prev) => {
          const server = fromLead(data.defaults);
          const next = { ...prev };
          FIELDS.forEach((f) => { if (!String(next[f] ?? '').trim() && server[f]) next[f] = server[f]; });
          return next;
        });
      } catch (err) {
        if (live) setPreviewError(errorMessage(err, 'Could not load everything about this lead. You can still convert it.'));
      }
    })();
    return () => { live = false; };
  }, [lead, prefill]);

  // Read the value now: e.currentTarget is null by the time React runs the state updater.
  const set = (key) => (e) => {
    const value = e && typeof e === 'object' && 'currentTarget' in e ? e.currentTarget.value : e;
    setForm((prev) => ({ ...prev, [key]: value ?? '' }));
  };

  const send = async (extra = {}) => {
    const { data } = await axios.post(
      `${API_URL}/api/leads/${lead.id}/convert`,
      { ...form, folder_ids: folderIds, ...extra },
      { headers: await authHeaders() },
    );
    const t = data?.transferred || {};
    const moved = t.followups_moved ? ` ${plural(t.followups_moved, 'pending follow-up')} moved to the customer.` : '';
    showNotification(
      data?.merged
        ? { title: 'Added to existing customer', message: `${form.full_name} was already a customer. The lead and its history were added to their profile; their saved details were not changed.${moved}`, color: 'blue', autoClose: 7000 }
        : { title: 'Converted', message: `${form.full_name} is now a customer. Remarks and history came along.${moved}`, color: 'green', autoClose: 7000 },
    );
    setDuplicate(null);
    onConverted?.(lead, data);
    onClose();
  };

  const fail = (err) => {
    const d = err?.response?.data;
    if (err?.response?.status === 409 && d?.code === 'DUPLICATE_CUSTOMER') return setDuplicate(d);
    if (err?.response?.status === 409 && d?.code === 'ALREADY_CONVERTED') {
      setDuplicate(null);
      return setAlready(d);
    }
    showNotification({ title: 'Could not convert', message: errorMessage(err, 'Could not convert this lead. Nothing was saved. Please try again.'), color: 'red' });
  };

  const run = async (extra) => {
    setSaving(true);
    try {
      await send(extra);
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!folderIds.length) return setFolderError('Select at least one product line');
    run();
  };

  const tr = preview?.transfer;

  return (
    <Modal opened={!!lead} onClose={onClose} title="Convert to Customer" centered size="xl" fullScreen={isPhone}>
      {already ? (
        <div className="space-y-4">
          <Text size="sm">{already.message}</Text>
          <Group position="right" className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="default" onClick={onClose} className="w-full sm:w-auto">Close</Button>
            <Button leftIcon={<IconExternalLink size={16} />} onClick={() => window.open(profilePath(already.customer_id), '_blank', 'noopener')} className="w-full sm:w-auto">
              Open customer
            </Button>
          </Group>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {/* What moves over */}
          <div className="flex gap-2 rounded-md bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-900/20 dark:text-teal-100">
            <IconArrowsTransferDown size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              {!preview && !previewError ? (
                <span className="inline-flex items-center gap-2"><Loader size="xs" /> Checking this lead&apos;s history…</span>
              ) : previewError ? (
                <span>{previewError}</span>
              ) : (
                <>
                  <div className="font-medium">What moves to the customer</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    <li>Staff member: <b>{preview.assigned_to_name || 'You (not assigned)'}</b></li>
                    <li>Contact details, source and remarks (below; you can edit them)</li>
                    <li>{tr.pending_followups ? `${plural(tr.pending_followups, 'pending follow-up')} (same dates and remarks)` : 'No pending follow-ups'}</li>
                    {(tr.calls > 0 || tr.completed_followups > 0 || tr.activity > 0) && (
                      <li>
                        History shown on the customer profile: {[tr.calls ? plural(tr.calls, 'call') : null, tr.completed_followups ? plural(tr.completed_followups, 'completed follow-up') : null, tr.activity ? plural(tr.activity, 'activity entry') : null].filter(Boolean).join(', ')}
                      </li>
                    )}
                  </ul>
                  <div className="mt-1 text-xs opacity-80">The lead itself is kept with its full history and marked as converted.</div>
                </>
              )}
            </div>
          </div>

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
            <TextInput label="Phone Number" type="tel" required value={form.phone_number} onChange={set('phone_number')} />
            <TextInput label="Email" type="email" value={form.email} onChange={set('email')} />
            <Select label="Gender" placeholder="Select" data={['Male', 'Female']} value={form.gender || null} onChange={set('gender')} clearable withinPortal />
            <TextInput label="Date of Birth" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
            <TextInput label="Company Name" value={form.company_name} onChange={set('company_name')} />
            <TextInput label="Product Name" placeholder="e.g. Term plan" value={form.product_name} onChange={set('product_name')} />
            <TextInput label="Policy Number" value={form.policy_number} onChange={set('policy_number')} />
            <TextInput label="Premium" type="number" min={0} value={form.premium} onChange={set('premium')} />
            <TextInput label="Coverage Amount" type="number" min={0} value={form.coverage_amount} onChange={set('coverage_amount')} />
            <TextInput label="Source" value={form.source} onChange={set('source')} />
            <TextInput label="Referrer" value={form.referrer} onChange={set('referrer')} />
            <Textarea label="Address" value={form.address} onChange={set('address')} autosize minRows={1} className="sm:col-span-2" />
            <Textarea label="Remarks" description="The lead's remarks. They are saved on the customer." value={form.notes} onChange={set('notes')} autosize minRows={2} className="sm:col-span-2" />
          </div>
          <Text size="xs" color="dimmed">
            If a customer with the same phone or email already exists, you will be asked before anything is saved.
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
      )}
      <DuplicateCustomerModal
        duplicate={duplicate}
        busy={saving}
        profilePath={profilePath}
        onClose={() => setDuplicate(null)}
        onAddToExisting={(id) => run({ duplicate_action: 'add_to_existing', existing_customer_id: id })}
        onCreateNew={() => run({ duplicate_action: 'create_new' })}
      />
    </Modal>
  );
}
