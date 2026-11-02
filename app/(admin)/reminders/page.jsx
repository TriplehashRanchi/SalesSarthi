'use client';

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Box, Tabs, Loader, Text, Button, TextInput, Stack, Avatar, Badge } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { getAuth } from 'firebase/auth';
import { IconBrandWhatsapp, IconCake, IconGift, IconCalendarEvent, IconUserPlus, IconSearch, IconBell, IconSettings, IconArrowLeft } from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useRouter } from 'next/navigation';

dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.extend(utc);
dayjs.extend(timezone);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Fills {variables} in a reminder message with the person's data.
const replacePlaceholders = (templateMessage, record) => {
  const fmt = (v) => dayjs.utc(v).local().format('MMMM D, YYYY');
  const values = {
    '{name}': record.full_name,
    '{policy_number}': record.policy_number,
    '{dob}': record.date_of_birth && fmt(record.date_of_birth),
    '{renewal_date}': record.renewal_date && fmt(record.renewal_date),
    '{anniversary}': record.anniversary && fmt(record.anniversary),
    '{appointment_date}': record.appointment_date && dayjs.utc(record.appointment_date).local().format('MMMM D, YYYY h:mm A'),
  };
  return Object.entries(values).reduce((msg, [token, value]) => (value ? msg.split(token).join(value) : msg), templateMessage);
};

// Next time a yearly date (birthday, anniversary) comes around.
const getNextEventDate = (date) => {
  const now = dayjs();
  let next = date.year(now.year());
  if (date.format('MM-DD') < now.format('MM-DD')) next = next.add(1, 'year');
  return next;
};

// How the type's date rule behaves: recent (added in the last N days), recurring (yearly), upcoming (one date), or manual.
const modeOf = (type, dateFields) => (type.date_field ? dateFields?.[type.audience]?.[type.date_field]?.mode || 'manual' : 'manual');

const formatReminderDate = (record, type, mode) => {
  if (mode === 'manual') return record.phone_number || '—';
  const raw = record[type.date_field];
  if (!raw) return '—';
  const date = dayjs.utc(raw).local();
  if (!date.isValid()) return 'Invalid date';
  if (mode === 'recent') return `Added ${date.fromNow()}`;
  const shown = mode === 'recurring' ? getNextEventDate(date) : date;
  return shown.calendar(dayjs(), { sameDay: '[Today]', nextDay: '[Tomorrow]', nextWeek: 'dddd', lastDay: '[Yesterday]', lastWeek: '[Last] dddd', sameElse: 'MMMM D, YYYY' });
};

const iconFor = (type, style = { marginRight: '8px' }, size = 18) => {
  switch (type.date_field) {
    case 'created_at': return <IconUserPlus size={size} style={style} />;
    case 'date_of_birth': return <IconCake size={size} style={style} />;
    case 'anniversary': return <IconGift size={size} style={style} />;
    case 'renewal_date': return <IconCalendarEvent size={size} style={style} />;
    default: return <IconBell size={size} style={style} />;
  }
};

const ActionIconBack = ({ onClick }) => (
  <button type="button" onClick={onClick} aria-label="Back" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-700 md:hidden transition hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700">
    <IconArrowLeft size={22} />
  </button>
);

const AVATAR_COLORS = ['violet', 'blue', 'orange', 'teal', 'pink', 'green'];
const colorFor = (name) => AVATAR_COLORS[((name || '?').trim().charCodeAt(0) || 0) % AVATAR_COLORS.length];

const authHeaders = async () => {
  const user = getAuth().currentUser;
  if (!user) return null;
  return { Authorization: `Bearer ${await user.getIdToken()}` };
};

const RemindersPage = () => {
  const router = useRouter();
  const [types, setTypes] = useState([]);
  const [dateFields, setDateFields] = useState({});
  const [typesLoading, setTypesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null); // id of the active reminder type, as a string
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({}); // pending count per reminder type id

  const activeType = useMemo(() => types.find((t) => String(t.id) === activeTab) || null, [types, activeTab]);
  const mode = activeType ? modeOf(activeType, dateFields) : 'manual';

  // 1) The admin's reminder types become the tabs.
  useEffect(() => {
    const load = async () => {
      try {
        const headers = await authHeaders();
        if (!headers) return;
        const res = await axios.get(`${API_URL}/api/reminder-types`, { headers });
        setTypes(res.data.types);
        setDateFields(res.data.dateFields);
        setActiveTab((current) => current ?? (res.data.types[0] ? String(res.data.types[0].id) : null));
      } catch (error) {
        console.error('Error fetching reminder types:', error);
        showNotification({ title: 'Error', message: 'Failed to load reminder types', color: 'red' });
      } finally {
        setTypesLoading(false);
      }
    };
    load();
  }, []);

  // 2) People due for the active type, plus today's already-sent log for it.
  useEffect(() => {
    if (!activeType) return;
    let cancelled = false;
    const load = async () => {
      setRecordsLoading(true);
      try {
        const headers = await authHeaders();
        if (!headers) return;
        const [recordsRes, logsRes] = await Promise.all([
          axios.get(`${API_URL}/api/reminder-types/${activeType.id}/recipients`, { headers }),
          axios.get(`${API_URL}/api/reminders/reminder_logs?category=${encodeURIComponent(activeType.type_key)}`, { headers }),
        ]);
        if (!cancelled) {
          setRecords(recordsRes.data);
          setLogs(logsRes.data);
        }
      } catch (error) {
        console.error('Error fetching reminder data:', error);
        showNotification({ title: 'Error', message: 'Failed to fetch reminders', color: 'red' });
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeType]);

  // 3) Pending count for every tab, so empty tabs can stay badge-free.
  useEffect(() => {
    if (!types.length) return;
    let cancelled = false;
    const loadCounts = async () => {
      try {
        const headers = await authHeaders();
        if (!headers) return;
        const entries = await Promise.all(
          types.map(async (t) => {
            try {
              const [recipients, sent] = await Promise.all([
                axios.get(`${API_URL}/api/reminder-types/${t.id}/recipients`, { headers }),
                axios.get(`${API_URL}/api/reminders/reminder_logs?category=${encodeURIComponent(t.type_key)}`, { headers }),
              ]);
              return [t.id, recipients.data.filter((r) => !sent.data.some((log) => log.source_id === r.id)).length];
            } catch {
              return [t.id, null];
            }
          })
        );
        if (!cancelled) setCounts(Object.fromEntries(entries));
      } catch (error) {
        console.error('Error fetching reminder counts:', error);
      }
    };
    loadCounts();
    return () => { cancelled = true; };
  }, [types]);

  // Live count for the open tab (drops as reminders are sent).
  const pendingActive = useMemo(() => records.filter((r) => !logs.some((log) => log.source_id === r.id)).length, [records, logs]);

  const shownRecords = useMemo(() => {
    if (!activeType) return [];
    const base = records.filter((r) => !logs.some((log) => log.source_id === r.id));
    const searched = search ? base.filter((r) => r.full_name?.toLowerCase().includes(search.toLowerCase())) : base;
    const sorted = [...searched];
    const dateOf = (r) => dayjs.utc(r[activeType.date_field]).local();
    if (mode === 'recent') sorted.sort((a, b) => dateOf(b).diff(dateOf(a)));
    else if (mode === 'recurring') sorted.sort((a, b) => getNextEventDate(dateOf(a)).diff(getNextEventDate(dateOf(b))));
    else if (mode === 'upcoming') sorted.sort((a, b) => dateOf(a).diff(dateOf(b)));
    else sorted.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    return sorted;
  }, [activeType, records, logs, search, mode]);

  const handleSendReminder = async (record) => {
    try {
      const headers = await authHeaders();
      if (!headers) {
        showNotification({ title: 'Error', message: 'You must be logged in to send a reminder', color: 'red' });
        return;
      }
      if (!record.phone_number) {
        showNotification({ title: 'Error', message: 'No phone number found for this record.', color: 'red' });
        return;
      }

      const finalMessage = replacePlaceholders(activeType.template_message, record);

      // Log it so it is hidden from today's list (fire-and-forget).
      axios
        .post(
          `${API_URL}/api/reminders/reminder_logs`,
          {
            admin_id: record.admin_id,
            user_id: record.user_id,
            source_type: activeType.audience,
            source_id: record.id,
            template_id: activeType.id,
            category: activeType.type_key,
            message_sent: finalMessage,
          },
          { headers }
        )
        .then(() => setLogs((prev) => [...prev, { source_id: record.id }]))
        .catch((err) => console.error('Reminder log update failed:', err));

      window.open(`https://wa.me/${record.phone_number}?text=${encodeURIComponent(finalMessage)}`, '_blank');
      showNotification({ title: 'Success', message: 'Reminder sent successfully!', color: 'green' });
    } catch (error) {
      console.error('Error sending reminder:', error);
      showNotification({ title: 'Error', message: 'Failed to send reminder', color: 'red' });
    }
  };

  const loading = typesLoading || recordsLoading;

  const sendButton = (record, compact) => (
    <Button
      size={compact ? 'xs' : 'sm'}
      color="green"
      variant="light"
      radius="xl"
      leftIcon={<IconBrandWhatsapp size={16} />}
      onClick={() => handleSendReminder(record)}
    >
      Send
    </Button>
  );

  const dateChip = (record) => (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {iconFor(activeType, { marginRight: 0, flexShrink: 0 }, 14)}
      <span className="truncate">{formatReminderDate(record, activeType, mode)}</span>
    </span>
  );

  const emptyState = (
    <Stack align="center" spacing={6} mt={56} px="md">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-50 text-4xl dark:bg-gray-700">{search ? '🔍' : '🎉'}</div>
      <Text weight={600} align="center" className="mt-2 text-base text-gray-800 dark:text-gray-100 sm:text-lg">
        {search ? 'No matches found' : 'All caught up!'}
      </Text>
      <Text size="sm" align="center" className="max-w-sm text-gray-500 dark:text-gray-400">
        {search ? `No pending reminders match “${search}” in “${activeType?.name}”.` : `No pending reminders for “${activeType?.name}”. New ones will show up here.`}
      </Text>
    </Stack>
  );

  return (
    <Box className="px-1 py-2 text-gray-900 dark:text-gray-100 md:p-4">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <ActionIconBack onClick={() => router.back()} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">Reminders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeType && !loading ? `${shownRecords.length} pending in ${activeType.name}` : 'Send timely WhatsApp follow-ups'}
          </p>
        </div>
        <Button variant="light" color="violet" radius="xl" size="xs" leftIcon={<IconSettings size={14} />} onClick={() => router.push('/template')}>
          <span className="sm:hidden">Manage</span>
          <span className="hidden sm:inline">Manage reminder types</span>
        </Button>
      </div>

      <TextInput
        placeholder="Search by name..."
        icon={<IconSearch size={18} />}
        radius="xl"
        size="md"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        className="mb-4 w-full md:max-w-md"
      />

      {typesLoading ? (
        <div className="mt-10 flex justify-center"><Loader /></div>
      ) : types.length === 0 ? (
        <Stack align="center" mt="xl" spacing="xs">
          <Text className="text-lg text-gray-500 dark:text-gray-400">You have no reminder types yet.</Text>
          <Button color="violet" onClick={() => router.push('/template')}>Add a reminder type</Button>
        </Stack>
      ) : (
        <Tabs value={activeTab} onTabChange={setActiveTab} variant="pills" radius="xl" color="violet">
          {/* Scrolls sideways when there are more types than fit, so tabs never squash or wrap on phones. */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }} className="-mx-1 px-1 pb-1">
            <Tabs.List sx={{ flexWrap: 'nowrap', minWidth: 'max-content', gap: 8 }}>
              {types.map((t) => {
                const isActive = String(t.id) === activeTab;
                const count = isActive && !recordsLoading ? pendingActive : counts[t.id];
                return (
                  <Tabs.Tab
                    key={t.id}
                    value={String(t.id)}
                    sx={{ whiteSpace: 'nowrap', fontSize: 14, padding: '8px 16px' }}
                    rightSection={
                      count > 0 ? (
                        <Badge
                          size="xs"
                          variant="filled"
                          sx={{ backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#ede9fe', color: isActive ? 'inherit' : '#6d28d9' }}
                        >
                          {count}
                        </Badge>
                      ) : null
                    }
                  >
                    {t.name}
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </div>
          {types.length > 1 && (
            <Text size="xs" color="dimmed" align="right" mt={4} className="md:hidden">
              Swipe for more types →
            </Text>
          )}

          <Tabs.Panel value={activeTab || ''} className="pt-4">
            {loading ? (
              <div className="mt-10 flex justify-center"><Loader /></div>
            ) : shownRecords.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                  <table className="w-full table-auto text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                        <th className="px-4 py-3 text-left font-semibold">{mode === 'manual' ? 'Phone' : 'Date Info'}</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownRecords.map((record) => (
                        <tr key={record.id} className="border-b border-gray-100 last:border-b-0 hover:bg-violet-50/40 dark:border-gray-700 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar color={colorFor(record.full_name)} variant="light" radius="xl">
                                {(record.full_name || '?').trim().charAt(0).toUpperCase()}
                              </Avatar>
                              <span className="font-medium">{record.full_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                              {iconFor(activeType, { marginRight: 0, flexShrink: 0 }, 14)}
                              {formatReminderDate(record, activeType, mode)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{sendButton(record, false)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="md:hidden">
                  {shownRecords.map((record) => (
                    <div key={record.id} className="flex items-center gap-3 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-700">
                      <Avatar color={colorFor(record.full_name)} variant="light" radius="xl" size="lg">
                        {(record.full_name || '?').trim().charAt(0).toUpperCase()}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Text weight={500} lineClamp={1}>{record.full_name || 'N/A'}</Text>
                        {dateChip(record)}
                      </div>
                      {sendButton(record, true)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              emptyState
            )}
          </Tabs.Panel>
        </Tabs>
      )}
    </Box>
  );
};

export default RemindersPage;
