'use client';

import { useEffect, useState, useMemo } from 'react'; // Added useMemo
import axios from 'axios';
import { Box, Table, Tabs, Loader, Title, Text, Button, Group, TextInput, Paper, Badge } from '@mantine/core'; // Added Paper, Badge
import { showNotification } from '@mantine/notifications';
import { getAuth } from 'firebase/auth';
import { 
  IconBrandWhatsapp, IconCake, IconGift, IconCalendarEvent, IconUserPlus, IconSearch,
  IconFlame, IconThumbUp, IconThumbDown, IconRefresh, IconSnowflake // Icons for lead status
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone'; // For correct timezone handling
import { useRouter } from 'next/navigation';

// Extend dayjs with plugins
dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.extend(utc);
dayjs.extend(timezone);

// --- Set default timezone if needed, or rely on browser's timezone ---
// Example: dayjs.tz.setDefault("Asia/Calcutta"); 
// It's often better to handle dates in UTC and format in the user's local time.

// Define API_URL from environment variable or fallback.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Utility function to replace placeholders in a template with record data.
const replacePlaceholders = (templateMessage, record) => {
  // Use dayjs for consistent date formatting in messages
  let msg = templateMessage;
  if (record.full_name) {
    msg = msg.replace('{name}', record.full_name);
  }
  if (record.policy_number) {
    msg = msg.replace('{policy_number}', record.policy_number);
  }
  if (record.date_of_birth) {
    // Format DOB consistently, assuming it's a date string like 'YYYY-MM-DD'
    msg = msg.replace('{dob}', dayjs.utc(record.date_of_birth).local().format('MMMM D, YYYY'));
  }
  if (record.renewal_date) {
    // Format renewal date
    msg = msg.replace('{renewal_date}', dayjs.utc(record.renewal_date).local().format('MMMM D, YYYY'));
  }
  if (record.appointment_date) {
     // Format appointment date/time
    msg = msg.replace('{appointment_date}', dayjs.utc(record.appointment_date).local().format('MMMM D, YYYY h:mm A'));
  }
  // Add anniversary if needed
  if (record.anniversary) {
    msg = msg.replace('{anniversary}', dayjs.utc(record.anniversary).local().format('MMMM D, YYYY'));
  }
  return msg;
};

// Helper function to format reminder dates for display
const formatReminderDate = (dateString, category) => {
  if (!dateString) return 'N/A';

  const now = dayjs();
  // Try parsing as UTC then converting to local to handle potential timezone issues like '1995-04-12T18:30:00.000Z' vs '1995-04-13'
  const date = dayjs.utc(dateString).local(); 

  if (!date.isValid()) return 'Invalid Date';

  switch (category) {
    case 'nurturing': // Typically uses 'created_at' which is a timestamp
      return `Added ${date.fromNow()}`; // e.g., "Added 2 days ago"
    case 'birthday':
    case 'anniversary':
      // Calculate next occurrence for display
      const nextEventDateForDisplay = getNextEventDate(date);
      // Use calendar format relative to next occurrence
      return `on ${date.format('MMMM D')} (${nextEventDateForDisplay.calendar(now)})`; // e.g., "on April 13 (in 5 days)"
    case 'renewal':
      // Use calendar format relative to the actual renewal date
      return `on ${date.format('MMMM D, YYYY')} (${date.calendar(now)})`; // e.g., "on May 15, 2025 (Tomorrow at 12:00 AM)"
    default:
      return date.format('MMMM D, YYYY'); // Fallback basic format
  }
};

// Helper function to calculate the next occurrence of a date (for sorting)
const getNextEventDate = (date) => {
  const now = dayjs();
  const todayMonthDay = now.format('MM-DD');
  const eventMonthDay = date.format('MM-DD');
  let nextEventDate = date.year(now.year());
  if (eventMonthDay < todayMonthDay) {
    nextEventDate = nextEventDate.add(1, 'year');
  }
  return nextEventDate;
};


// Helper to get the right icon for reminder category
const getCategoryIcon = (category) => {
    switch (category) {
        case 'nurturing': return <IconUserPlus size={18} style={{ marginRight: '8px' }} />;
        case 'birthday': return <IconCake size={18} style={{ marginRight: '8px' }} />;
        case 'anniversary': return <IconGift size={18} style={{ marginRight: '8px' }} />;
        case 'renewal': return <IconCalendarEvent size={18} style={{ marginRight: '8px' }} />;
        default: return null;
    }
};

// Helper to get icon and color for lead status
const getLeadStatusInfo = (status) => {
    switch (status) {
        case 'Hot Lead': return { icon: IconFlame, color: 'red' };
        case 'Qualified Lead': return { icon: IconThumbUp, color: 'green' };
        case 'Follow-up': return { icon: IconRefresh, color: 'blue' };
        case 'Cold Lead': return { icon: IconSnowflake, color: 'cyan' };
        case 'Lost Lead': return { icon: IconThumbDown, color: 'gray' };
        default: return { icon: null, color: 'gray' };
    }
};


// Custom hook to fetch reminder data for a given category.
const useReminderData = (category) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          showNotification({
            title: 'Error',
            message: 'You must be logged in to view reminders',
            color: 'red',
          });
          return;
        }
        const token = await user.getIdToken();
        let endpoint = '';
        // For nurturing, use leads; otherwise, query customers endpoint with appropriate type.
        if (category === 'nurturing') {
          endpoint = '/api/reminders/leads';
        } else {
          endpoint = `/api/reminders/customers?type=${category}`;
        }
        const res = await axios.get(API_URL + endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (error) {
        console.error('Error fetching reminder data:', error);
        showNotification({
          title: 'Error',
          message: 'Failed to fetch reminders',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };
    if (category) fetchData();
  }, [category, auth]);

  return { data, loading };
};

// Custom hook to fetch reminder logs for the active category for today.
const useReminderLogs = (category) => {
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const auth = getAuth();
  
    useEffect(() => {
      const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
          const user = auth.currentUser;
          if (!user) return;
          const token = await user.getIdToken();
          // This endpoint should return logs for the current admin for today filtered by category.
          const res = await axios.get(API_URL + '/api/reminders/reminder_logs?category=' + category, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setLogs(res.data);
        } catch (error) {
          console.error('Error fetching reminder logs:', error);
        } finally {
          setLoadingLogs(false);
        }
      };
      if (category) fetchLogs();
    }, [category, auth]);
    return { logs, loadingLogs };
  };
  

const RemindersPage = () => {
  // Define reminder categories.
  const reminderCategories = [
    { value: 'nurturing', label: 'Nurturing Reminders' },
    { value: 'birthday', label: 'Birthday Reminders' },
    { value: 'anniversary', label: 'Anniversary Reminders' },
    { value: 'renewal', label: 'Renewal Reminders' },
  ];
  const [activeTab, setActiveTab] = useState('nurturing');
  const [templates, setTemplates] = useState({});
  const [search, setSearch] = useState(''); // State for search input
  const auth = getAuth();

  // Fetch records based on the active reminder category.
  const { data: records, loading } = useReminderData(activeTab);

  // Fetch admin templates (one per category) once the page loads.
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await axios.get(API_URL + '/api/templates', {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Transform the array of templates into an object keyed by category.
        const fetchedTemplates = {};
        res.data.forEach((template) => {
          // Each admin can have one template per category.
          fetchedTemplates[template.category] = template;
        });
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error('Error fetching templates:', error);
        showNotification({
          title: 'Error',
          message: 'Failed to fetch templates',
          color: 'red',
        });
      }
    };

    fetchTemplates();
  }, [auth]);

  // Fetch reminder logs for the active category.
  const { logs, loadingLogs } = useReminderLogs(activeTab);

  // Filter out records that have already been sent a reminder today.
  const recordsToSend = records.filter(
    (record) => !logs.some((log) => log.source_id === record.id)
  );

  // Apply search filter first
  const searchedRecords = recordsToSend.filter((record) => {
    if (!search) return true;
    return record.full_name?.toLowerCase().includes(search.toLowerCase());
  });

  // Apply sorting based on active tab - useMemo for performance
  const sortedAndFilteredRecords = useMemo(() => {
    const recordsToSort = [...searchedRecords]; // Create a mutable copy

    if (activeTab === 'nurturing') {
      // Sort by creation date, latest first
      recordsToSort.sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)));
    } else {
      // Sort by next event date, closest first
      recordsToSort.sort((a, b) => {
        const dateA = activeTab === 'birthday' ? a.date_of_birth : activeTab === 'anniversary' ? a.anniversary : a.renewal_date;
        const dateB = activeTab === 'birthday' ? b.date_of_birth : activeTab === 'anniversary' ? b.anniversary : b.renewal_date;
        
        const nextA = getNextEventDate(dayjs.utc(dateA).local());
        const nextB = getNextEventDate(dayjs.utc(dateB).local());

        return nextA.diff(nextB);
      });
    }
    return recordsToSort;
  }, [searchedRecords, activeTab]);

  // Handle sending a reminder.
  const handleSendReminder = async (record) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        showNotification({
          title: 'Error',
          message: 'You must be logged in to send a reminder',
          color: 'red',
        });
        return;
      }
      const token = await user.getIdToken();

      // Retrieve the appropriate template for the active category.
      const template = templates[activeTab];
      if (!template) {
        showNotification({
          title: 'Error',
          message: 'No template found for this category',
          color: 'red',
        });
        return;
      }

      // Compute the final message by replacing placeholders with record data.
      const finalMessage = replacePlaceholders(template.template_message, record);

     

      // Prepare payload to log the reminder.
      const payload = {
        admin_id: record.admin_id, // Or get from auth context if available.
        user_id: record.user_id,   // Or use the current logged-in user's ID.
        source_type: activeTab === 'nurturing' ? 'lead' : 'customer',
        source_id: record.id,
        template_id: template.id,
        category: activeTab,
        message_sent: finalMessage,
      };

      // Log the reminder (fire-and-forget).
      axios
        .post(API_URL + '/api/reminders/reminder_logs', payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch((err) => {
          console.error('Reminder log update failed:', err);
        });

      // Verify the record has a phone number.
      if (!record.phone_number) {
        showNotification({
          title: 'Error',
          message: 'No phone number found for this record.',
          color: 'red',
        });
        return;
      }

      // Open WhatsApp using the record's phone number.
      const waURL = `https://wa.me/${record.phone_number}?text=${encodeURIComponent(finalMessage)}`;
      window.open(waURL, '_blank');
      showNotification({
        title: 'Success',
        message: 'Reminder sent successfully!',
        color: 'green',
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to send reminder',
        color: 'red',
      });
    }
  };

  const router = useRouter();

  return (
    <Box p="md">
      <Title order={2} mb="md">
        Reminders
        <Button
          onClick={() => router.push('/template')}
          ml="md"
          variant="default"
          size="xs"
          radius="xl"
        >
          Add Template
        </Button>
      </Title>
  
      {/* Search Bar */}
      <Group mb="md" position="apart">
        <TextInput
          placeholder="Search by name..."
          icon={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
          radius="md"
        />
      </Group>
  
      <Tabs value={activeTab} onTabChange={setActiveTab} variant="pills" radius="md">
        <Tabs.List grow>
          {reminderCategories.map((cat) => (
            <Tabs.Tab key={cat.value} value={cat.value}>
              {cat.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {/* Use Tabs.Panel outside the loop if content depends on activeTab */}
        <Tabs.Panel value={activeTab} pt="lg">
          {loading || loadingLogs ? (
            <Group position="center" mt="xl">
              <Loader />
            </Group>
          ) : sortedAndFilteredRecords.length > 0 ? (
            <Paper shadow="sm" p="md" radius="md" withBorder> 
              <Table 
                highlightOnHover 
                verticalSpacing="sm"
                fontSize="sm"
                striped // Added striped style
              >
                <thead style={{ backgroundColor: '#f1f3f5' }}> 
                  <tr>
                    <th style={{ paddingLeft: '16px', width: activeTab === 'nurturing' ? '30%' : '40%' }}>Name</th>
                    {activeTab === 'nurturing' && <th style={{ width: '20%' }}>Status</th>}
                    <th style={{ width: activeTab === 'nurturing' ? '30%' : '40%' }}>Date Info</th>
                    <th style={{ textAlign: 'center', paddingRight: '16px', width: '20%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredRecords.map((record) => {
                    const statusInfo = activeTab === 'nurturing' ? getLeadStatusInfo(record.lead_status) : null;
                    const StatusIcon = statusInfo?.icon;

                    return (
                      <tr key={record.id}>
                        <td style={{ paddingLeft: '16px' }}>{record.full_name || 'N/A'}</td>
                        {activeTab === 'nurturing' && (
                          <td>
                            {statusInfo && StatusIcon ? (
                              <Badge 
                                size="sm" 
                                variant="light" 
                                color={statusInfo.color}
                                leftSection={StatusIcon && <StatusIcon size={14} />}
                              >
                                {record.lead_status || 'N/A'}
                              </Badge>
                            ) : (
                              <Text size="xs" color="dimmed">N/A</Text>
                            )}
                          </td>
                        )}
                        <td style={{ display: 'flex', alignItems: 'center' }}>
                          {getCategoryIcon(activeTab)}
                          {formatReminderDate(
                            activeTab === 'nurturing'
                              ? record.created_at
                              : activeTab === 'birthday'
                              ? record.date_of_birth
                              : activeTab === 'anniversary'
                              ? record.anniversary
                              : record.renewal_date,
                            activeTab
                          )}
                        </td>
                        <td align="center" style={{ paddingRight: '16px' }}>
                          <Button
                            size="xs"
                            variant="gradient" 
                            gradient={{ from: 'teal', to: 'lime', deg: 105 }}
                            leftIcon={<IconBrandWhatsapp size={16} />} 
                            onClick={() => handleSendReminder(record)}
                          >
                            Send
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Paper>
          ) : (
            <Text align="center" color="dimmed" mt="xl" size="lg">
              🎉 No pending reminders for this category!
            </Text>
          )}
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
  
};

export default RemindersPage;
