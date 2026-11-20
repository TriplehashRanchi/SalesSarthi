'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Loader, Modal, Select, Text, TextInput, Textarea, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconAlertTriangle, IconBrandWhatsapp, IconMail, IconMessage } from '@tabler/icons-react';
import { authHeaders } from '@/utils/authHeaders';
import { errorMessage } from './useCreateCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp, tone: 'text-green-600' },
  { value: 'sms', label: 'SMS', icon: IconMessage, tone: 'text-blue-600' },
  { value: 'email', label: 'Email', icon: IconMail, tone: 'text-orange-600' },
];
const DEFAULT_LIMITS = { whatsapp: 4000, sms: 1000, email: 20000 };
const LABEL = { name: 'name', first_name: 'first name', phone: 'phone', email: 'email', policy_number: 'policy number', product_name: 'product', company_name: 'company', premium: 'premium', renewal_date: 'renewal date', staff_name: 'your name' };

// Same checks as the server.
const tenDigit = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
};
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
// {placeholders} with a value are filled; ones without a value stay as {token} so the user sees what is missing.
const fill = (text, values) => String(text || '').replace(/\{(\w+)\}/g, (m, k) => (values && values[k] ? values[k] : m));
const leftover = (text) => [...new Set(String(text || '').match(/\{\w+\}/g) || [])];

// Send a WhatsApp, SMS or Email to a customer from their profile (#19). Saved in the customer's activity.
// initialChannel: 'whatsapp' | 'sms' | 'email'. onSent: after a message is recorded.
export default function MessageComposer({ opened, customer, initialChannel = 'whatsapp', onClose, onSent }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [ctx, setCtx] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [channel, setChannel] = useState(initialChannel);
  const [templateId, setTemplateId] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const mobile = tenDigit(customer?.phone_number);
  const email = validEmail(customer?.email) ? String(customer.email).trim() : null;
  const can = { whatsapp: !!mobile, sms: !!mobile, email: !!email };
  const why = { whatsapp: 'No valid mobile number saved', sms: 'No valid mobile number saved', email: 'No email address saved' };

  useEffect(() => {
    if (!opened || !customer?.id) return undefined;
    const first = can[initialChannel] ? initialChannel : CHANNELS.map((c) => c.value).find((c) => can[c]) || initialChannel;
    setChannel(first);
    setTemplateId(null);
    setSubject('');
    setBody('');
    setError('');
    setCtx(null);
    setLoadError('');
    let live = true;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/customers/${customer.id}/messages/compose`, { headers: await authHeaders() });
        if (live) setCtx(res.data);
      } catch (err) {
        if (live) setLoadError(errorMessage(err, 'Could not load the message templates. You can still write a message.'));
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, customer?.id, initialChannel]);

  const templates = (ctx?.templates || []).filter((t) => t.channel === 'all' || t.channel === channel);
  const limit = (ctx?.limits || DEFAULT_LIMITS)[channel];
  const missing = leftover(`${channel === 'email' ? subject : ''} ${body}`);

  const pickTemplate = (id) => {
    setTemplateId(id);
    setError('');
    const t = (ctx?.templates || []).find((x) => String(x.id) === String(id));
    if (!t) return;
    setBody(fill(t.body, ctx.values));
    setSubject(fill(t.subject || t.name, ctx.values));
  };

  const check = () => {
    if (!can[channel]) return `${why[channel]} for this customer.`;
    if (!body.trim()) return 'Please write the message.';
    if (body.trim().length > limit) return `The message is too long (max ${limit} characters).`;
    if (channel === 'email' && !subject.trim()) return 'Please enter the email subject.';
    if (missing.length) return `Please fill in or remove: ${missing.join(', ')}.`;
    return '';
  };

  const record = async () => {
    const res = await axios.post(
      `${API_URL}/api/customers/${customer.id}/messages`,
      { channel, body: body.trim(), subject: channel === 'email' ? subject.trim() : undefined, template_id: templateId ? Number(templateId) : undefined },
      { headers: await authHeaders() },
    );
    return res.data;
  };

  const send = async (e) => {
    e.preventDefault();
    const problem = check();
    if (problem) return setError(problem);
    setError('');
    const text = body.trim();

    // Email from the CRM (SMTP set up): the server sends it and says if it went.
    if (channel === 'email' && ctx?.email_via_crm) {
      setSending(true);
      try {
        const out = await record();
        if (out.status === 'failed') {
          setError(out.error_message || 'The email could not be sent. Please try again.');
          onSent?.(out);
          return;
        }
        showNotification({ title: 'Email sent', message: `Sent to ${email}. Saved in the customer's activity.`, color: 'green' });
        onSent?.(out);
        onClose();
      } catch (err) {
        setError(errorMessage(err, 'Could not send the email. Please try again.'));
      } finally {
        setSending(false);
      }
      return;
    }

    // WhatsApp / SMS / email without SMTP: open the user's app right away (inside the click, so it isn't
    // blocked), then save it to the history.
    const link =
      channel === 'whatsapp' ? `https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`
        : channel === 'sms' ? `sms:+91${mobile}?body=${encodeURIComponent(text)}`
          : `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(text)}`;
    window.open(link, channel === 'whatsapp' ? '_blank' : '_self');
    setSending(true);
    try {
      const out = await record();
      const app = channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'your SMS app' : 'your email app';
      showNotification({ title: 'Message ready', message: `Opened in ${app} with the message filled in. Press send there. Saved in the customer's activity.`, color: 'green' });
      onSent?.(out);
      onClose();
    } catch (err) {
      showNotification({ title: 'Not saved to history', message: errorMessage(err, 'The app was opened, but the message could not be saved to the customer\'s activity.'), color: 'orange' });
      onClose();
    } finally {
      setSending(false);
    }
  };

  const sendLabel = channel === 'whatsapp' ? 'Open WhatsApp' : channel === 'sms' ? 'Open SMS app' : ctx?.email_via_crm ? 'Send email' : 'Open email app';

  return (
    <Modal opened={opened} onClose={() => !sending && onClose()} title={`Message ${customer?.full_name || ''}`.trim()} centered size="lg" fullScreen={isPhone}>
      <form onSubmit={send} className="space-y-3">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Channel">
          {CHANNELS.map(({ value, label, icon: Icon, tone }) => {
            const on = channel === value;
            return (
              <UnstyledButton
                key={value}
                role="radio"
                aria-checked={on}
                aria-disabled={!can[value]}
                title={can[value] ? label : why[value]}
                onClick={() => { if (can[value]) { setChannel(value); setError(''); } }}
                className={`flex flex-col items-center gap-0.5 rounded-lg border-2 px-1 py-2 text-xs font-medium sm:text-sm ${on ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'} ${can[value] ? '' : 'cursor-not-allowed opacity-40'}`}
              >
                <Icon size={20} className={tone} />
                {label}
              </UnstyledButton>
            );
          })}
        </div>
        <Text size="xs" color="dimmed">
          To: {channel === 'email' ? email || '—' : mobile ? `+91 ${mobile}` : '—'}
          {' · '}
          {channel === 'email'
            ? ctx?.email_via_crm ? 'Sent from your CRM email account; you will see if it was sent.' : 'Opens your email app (set up an email account in Automation → Email to send from the CRM).'
            : `Opens ${channel === 'whatsapp' ? 'WhatsApp' : 'the SMS app'} with the message filled in; you press send there.`}
        </Text>

        {loadError && <Text size="xs" color="orange">{loadError}</Text>}
        {!ctx && !loadError ? (
          <div className="flex justify-center py-2"><Loader size="xs" /></div>
        ) : (
          <Select
            label="Template"
            placeholder={templates.length ? 'Choose a template (optional)' : 'No templates for this channel'}
            data={templates.map((t) => ({ value: String(t.id), label: t.name }))}
            value={templateId}
            onChange={pickTemplate}
            clearable
            withinPortal
            disabled={!templates.length}
          />
        )}
        {channel === 'email' && <TextInput label="Subject" required value={subject} onChange={(e) => { const v = e.currentTarget.value; setSubject(v); }} maxLength={200} />}
        <Textarea
          label="Message"
          required
          value={body}
          onChange={(e) => { const v = e.currentTarget.value; setBody(v); }}
          autosize
          minRows={5}
          maxRows={14}
          description={`${body.trim().length} / ${limit}`}
        />
        {missing.length > 0 && (
          <div className="flex gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <IconAlertTriangle size={16} className="shrink-0" />
            <span>Not saved for this customer: {missing.map((m) => LABEL[m.slice(1, -1)] || m).join(', ')}. Type it in place of {missing.join(', ')} or remove it.</span>
          </div>
        )}
        {error && <Text size="sm" color="red">{error}</Text>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="default" onClick={onClose} disabled={sending} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" loading={sending} disabled={!can[channel]} className="w-full sm:w-auto">{sendLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}
