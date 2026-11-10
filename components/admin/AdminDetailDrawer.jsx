'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ActionIcon, Avatar, Badge, Button, CopyButton, Drawer, Loader, Text, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconCheck, IconCopy, IconEdit, IconPackage, IconUsers } from '@tabler/icons-react';
import superAdminAxios from '@/utils/superAdminAxios';
import LeadFolderSupportAccess from '@/components/superadmin/LeadFolderSupportAccess';

const AVATAR_COLORS = ['violet', 'blue', 'orange', 'teal', 'pink', 'green'];

const fmtDate = (v, withTime = false) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return withTime
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const money = (amount, currency = 'INR') => {
  const n = Number(amount);
  if (!isFinite(n)) return '—';
  try {
    return n.toLocaleString('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 });
  } catch {
    return `${currency} ${n.toLocaleString('en-IN')}`;
  }
};

function Section({ title, children }) {
  return (
    <section className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="min-w-0 text-right font-medium text-gray-800 dark:text-gray-100">{children}</span>
    </div>
  );
}

function Copyable({ value }) {
  if (!value) return null;
  return (
    <CopyButton value={String(value)} timeout={1500}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? 'Copied' : 'Copy'} withinPortal>
          <ActionIcon size="sm" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy} aria-label="Copy">
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}

// Everything about one admin. `admin` is the row from the list (shown at once); full details load on open.
export default function AdminDetailDrawer({ admin, onClose, onEditPlan, onTeamLimit }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!admin) return;
    let alive = true;
    setDetail(null);
    setError('');
    setLoading(true);
    superAdminAxios
      .get(`/api/superadmin/admins/${admin.admin_id}`)
      .then((res) => alive && setDetail(res.data))
      .catch((err) => alive && setError(err.response?.data?.message || 'Could not load full details'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [admin]);

  const a = { ...(admin || {}), ...(detail || {}) };
  const initial = (a.name || '?').trim().charAt(0).toUpperCase();
  const expired = a.expires_at ? new Date(a.expires_at).getTime() < Date.now() : false;
  const daysLeft = a.expires_at ? Math.ceil((new Date(a.expires_at).getTime() - Date.now()) / 86400000) : null;
  const txns = detail?.transactions || [];
  const metrics = detail?.metrics || {};

  return (
    <Drawer
      opened={!!admin}
      onClose={onClose}
      position="right"
      size={isPhone ? '100%' : 440}
      padding={0}
      withCloseButton={false}
      zIndex={1000}
      // Mantine v5's body does not fill the drawer height; make it a flex column so the middle part can scroll.
      styles={{
        drawer: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
      }}
    >
      {admin && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-start gap-3 px-5 pb-4 pt-5">
            <Avatar size="lg" radius="xl" variant="light" color={AVATAR_COLORS[(initial.charCodeAt(0) || 0) % AVATAR_COLORS.length]}>
              {initial}
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold">{a.name || '—'}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge size="sm" variant="light" color={expired ? 'red' : 'green'}>{expired ? 'Expired' : 'Active'}</Badge>
                <Badge size="sm" variant="light" color="violet">{a.subscription_plan || 'Basic'}</Badge>
              </div>
            </div>
            <ActionIcon variant="subtle" onClick={onClose} aria-label="Close" size="lg">
              <span className="text-xl leading-none">×</span>
            </ActionIcon>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Section title="Contact">
              <Row label="Email">
                <span className="inline-flex items-center gap-1">
                  {a.email ? <a href={`mailto:${a.email}`} className="break-all text-violet-600">{a.email}</a> : '—'}
                  <Copyable value={a.email} />
                </span>
              </Row>
              <Row label="Phone">
                <span className="inline-flex items-center gap-1">
                  {a.phone ? <a href={`tel:${a.phone}`} className="text-violet-600">{a.phone}</a> : '—'}
                  <Copyable value={a.phone} />
                </span>
              </Row>
              <Row label="Admin ID">
                <span className="inline-flex items-center gap-1">
                  {a.admin_id}
                  <Copyable value={a.admin_id} />
                </span>
              </Row>
              {a.admin_code && <Row label="Admin code">{a.admin_code}</Row>}
            </Section>

            <Section title="Subscription">
              <Row label="Plan">{a.subscription_plan || 'Basic'}</Row>
              <Row label="Access">
                <Badge size="sm" variant="light" color={a.subscription_status === 'Active' ? 'green' : 'gray'}>{a.subscription_status || '—'}</Badge>
              </Row>
              <Row label="Expires">
                {fmtDate(a.expires_at, true)}
                {daysLeft !== null && (
                  <div className={`text-xs font-normal ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-orange-500' : 'text-gray-500'}`}>
                    {daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : `Expired ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago`}
                  </div>
                )}
              </Row>
              <Row label="Joined">{fmtDate(a.created_at, true)}</Row>
              <Row label="Last updated">{fmtDate(a.updated_at, true)}</Row>
            </Section>

            <Section title="Usage">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <div className="text-xs text-gray-500">Team members</div>
                  <div className="text-lg font-semibold">
                    {a.user_count ?? 0}
                    <span className="text-sm font-normal text-gray-400"> / {a.max_team_members ?? '∞'}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <div className="text-xs text-gray-500">Leads</div>
                  <div className="text-lg font-semibold">{a.lead_count ?? 0}</div>
                </div>
              </div>
            </Section>

            <Section title="Payments">
              {loading ? (
                <div className="flex justify-center py-3"><Loader size="sm" /></div>
              ) : error ? (
                <Text size="sm" color="red">{error}</Text>
              ) : (
                <>
                  <Row label="Total paid">{money(metrics.totalRevenue)}</Row>
                  <Row label="Transactions">{metrics.transactionCount ?? 0}</Row>
                  <Row label="Last payment">
                    {metrics.lastPaymentAmount ? `${money(metrics.lastPaymentAmount)} · ${fmtDate(metrics.lastPaymentDate)}` : '—'}
                  </Row>
                  {txns.length > 0 && (
                    <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                      {txns.slice(0, 5).map((t) => (
                        <div key={t.txn_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <div className="truncate">{t.description || 'Payment'}</div>
                            <div className="text-xs text-gray-500">{fmtDate(t.txn_date)}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-medium">{money(t.amount, t.currency)}</div>
                            <div className={`text-xs ${t.status === 'Success' ? 'text-green-600' : 'text-gray-500'}`}>{t.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Section>

            <Section title="Lead Folders – Support Access">
              <LeadFolderSupportAccess key={admin.admin_id} adminId={admin.admin_id} bare />
            </Section>
          </div>

          {/* Actions */}
          <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-800">
            <Button variant="light" color="violet" size="xs" leftIcon={<IconEdit size={14} />} onClick={() => onEditPlan(admin)}>
              Edit plan
            </Button>
            <Button variant="light" color="teal" size="xs" leftIcon={<IconUsers size={14} />} onClick={() => onTeamLimit(admin)}>
              Team limit
            </Button>
            <Button component={Link} href={`/superadmin/admins/${admin.admin_id}`} variant="default" size="xs" leftIcon={<IconPackage size={14} />}>
              Add-ons
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
