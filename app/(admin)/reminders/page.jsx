'use client';

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Box, Tabs, Loader, Title, Text, Button, Group, TextInput, Paper, ScrollArea, Stack, Divider } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { getAuth } from 'firebase/auth';
import { IconBrandWhatsapp, IconCake, IconGift, IconCalendarEvent, IconUserPlus, IconSearch, IconBell, IconSettings } from '@tabler/icons-react';
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

const iconFor = (type) => {
  const style = { marginRight: '8px' };
  switch (type.date_field) {
    case 'created_at': return <IconUserPlus size={18} style={style} />;
    case 'date_of_birth': return <IconCake size={18} style={style} />;
    case 'anniversary': return <IconGift size={18} style={style} />;
    case 'renewal_date': return <IconCalendarEvent size={18} style={style} />;
    default: return <IconBell size={18} style={style} />;
  }
};

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

  return (
    <Box className="p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <Group position="apart" mb="md" noWrap spacing="xs">
        <Title order={2} className="text-xl sm:text-2xl">Reminders</Title>
        <Button variant="default" radius="xl" size="xs" leftIcon={<IconSettings size={14} />} onClick={() => router.push('/template')}>
          <span className="sm:hidden">Manage</span>
          <span className="hidden sm:inline">Manage reminder types</span>
        </Button>
      </Group>

      <Group className="mb-4 flex justify-between">
        <TextInput
          placeholder="Search by name..."
          icon={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="flex-1 rounded-md dark:bg-gray-700 dark:text-white"
        />
      </Group>

      {typesLoading ? (
        <Group className="justify-center mt-10"><Loader /></Group>
      ) : types.length === 0 ? (
        <Stack align="center" mt="xl" spacing="xs">
          <Text className="text-gray-500 dark:text-gray-400 text-lg">You have no reminder types yet.</Text>
          <Button onClick={() => router.push('/template')}>Add a reminder type</Button>
        </Stack>
      ) : (
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          {/* Scrolls sideways when there are more types than fit, so tabs never squash or wrap on phones. */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }} className="-mx-4 px-4">
            <Tabs.List grow sx={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
              {types.map((t) => (
                <Tabs.Tab
                  key={t.id}
                  value={String(t.id)}
                  className="dark:text-white"
                  sx={{ whiteSpace: 'nowrap', fontSize: 14, padding: '10px 14px' }}
                >
                  {t.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </div>
          {types.length > 1 && (
            <Text size="xs" color="dimmed" align="right" mt={4} className="md:hidden">
              Swipe for more types →
            </Text>
          )}
          <Tabs.Panel value={activeTab || ''} className="pt-4">
            {loading ? (
              <Group className="justify-center mt-10"><Loader /></Group>
            ) : shownRecords.length > 0 ? (
              <>
                <div className="hidden md:block">
                  <Paper className="shadow-md p-4 rounded-md border dark:bg-gray-700 dark:border-gray-600">
                    <table className="w-full text-sm table-auto">
                      <thead className="bg-gray-100 dark:bg-gray-600 dark:text-white">
                        <tr>
                          <th className="text-left p-2">Name</th>
                          <th>{mode === 'manual' ? 'Phone' : 'Date Info'}</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shownRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white">
                            <td className="p-2">{record.full_name || 'N/A'}</td>
                            <td className="flex items-center">
                              {iconFor(activeType)}
                              {formatReminderDate(record, activeType, mode)}
                            </td>
                            <td className="text-center p-2">
                              <Button
                                size="xs"
                                className="bg-gradient-to-r from-teal-400 to-lime-400 text-white dark:from-teal-500 dark:to-lime-500"
                                leftIcon={<IconBrandWhatsapp size={16} />}
                                onClick={() => handleSendReminder(record)}
                              >
                                Send
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Paper>
                </div>

                {/* Mobile cards */}
                <div className="block md:hidden">
                  <Text size="xs" color="dimmed" mb="xs">
                    {shownRecords.length} pending {shownRecords.length === 1 ? 'reminder' : 'reminders'}
                  </Text>
                  <ScrollArea style={{ height: '60vh' }} mx="0" px="0">
                    <Stack spacing="sm">
                      {shownRecords.map((record) => (
                        <Paper key={record.id} p="sm" withBorder radius="md" className="flex flex-col gap-2">
                          <Group position="apart" noWrap>
                            <Text weight={500} lineClamp={1}>{record.full_name}</Text>
                          </Group>
                          <Group spacing="xs" align="center">
                            {iconFor(activeType)}
                            <Text size="xs">{formatReminderDate(record, activeType, mode)}</Text>
                          </Group>
                          <Divider my="xs" />
                          <Button size="xs" fullWidth leftIcon={<IconBrandWhatsapp size={16} />} onClick={() => handleSendReminder(record)}>
                            Send
                          </Button>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea>
                </div>
              </>
            ) : (
              <Stack align="center" spacing={6} mt={40} px="md">
                <Text style={{ fontSize: 40, lineHeight: 1 }}>🎉</Text>
                <Text weight={600} align="center" className="text-gray-800 dark:text-gray-100 text-base sm:text-lg">
                  All caught up!
                </Text>
                <Text size="sm" align="center" className="text-gray-500 dark:text-gray-400">
                  No pending reminders for “{activeType?.name}”.
                </Text>
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      )}
    </Box>
  );
};

export default RemindersPage;
