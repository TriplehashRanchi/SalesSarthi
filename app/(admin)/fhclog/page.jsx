'use client';

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import sortBy from 'lodash/sortBy';
import {
  Button,
  Text,
  LoadingOverlay,
  Alert,
  TextInput,
  Flex,
  Box,
  Group,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import {
  IconEye,
  IconAlertCircle,
  IconSearch,
  IconX,
  IconCalendar,
} from '@tabler/icons-react';
import { getAuth } from 'firebase/auth';
import { parseISO, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import FinancialHealthReportModal from '@/components/modals/finhealth2';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CheckupHistory = () => {
  const [allCheckups, setAllCheckups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortStatus, setSortStatus] = useState({
    columnAccessor: 'checkupDate',
    direction: 'desc',
  });

  const [page, setPage] = useState(1);
  const recordsPerPage = 5; // 👈 Change this for more/less rows per page

  const [selectedReportData, setSelectedReportData] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
     // 👈 2. READ PARAMETERS FROM THE URL
    const searchParams = useSearchParams();
    const clientIdFromUrl = searchParams.get('clientId');
    const clientTypeFromUrl = searchParams.get('clientType');
    const clientNameFromUrl = searchParams.get('clientName');


  // --- Fetch checkup history ---
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const auth = getAuth();
        if (!auth.currentUser) throw new Error('User not authenticated.');

        const token = await auth.currentUser.getIdToken();
        const response = await axios.get(`${API_URL}/api/checkups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllCheckups(response.data);
      } catch (err) {
        console.error('Error fetching checkup history:', err);
        setError('Failed to load checkup history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // --- Filtering & Sorting ---
  const filteredRecords = useMemo(() => {
    let filtered = [...allCheckups];

     // 👇 --- START OF ADDED LOGIC --- 👇
    // 1. Apply primary filter from URL parameters first
    if (clientIdFromUrl && clientTypeFromUrl) {
        // Primary method: Filter by ID and Type (most reliable)
        filtered = filtered.filter(checkup => {
            try {
                const formData = JSON.parse(checkup.formData);
                // Ensure clientId is treated as a number for a safe comparison
                return formData.clientId === parseInt(clientIdFromUrl, 10) && formData.clientType === clientTypeFromUrl;
            } catch {
                return false; // Ignore records with malformed JSON
            }
        });
    } else if (clientNameFromUrl) {
        // Fallback method: Filter by Name if ID/Type are missing
        filtered = filtered.filter(checkup => checkup.clientName === clientNameFromUrl);
    }
    // 👆 --- END OF ADDED LOGIC --- 👆

    // Date filter
    if (dateRange.from && dateRange.to) {
      const from = parseISO(dateRange.from);
      const to = parseISO(dateRange.to);
      filtered = filtered.filter((c) => {
        try {
          const d = parseISO(c.checkupDate);
          return isWithinInterval(d, { start: startOfDay(from), end: endOfDay(to) });
        } catch {
          return false;
        }
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.clientName.toLowerCase().includes(q) ||
          (c.financialDoctorName &&
            c.financialDoctorName.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sorted = sortBy(filtered, sortStatus.columnAccessor);
    const sortedRecords =
      sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

    return sortedRecords;
  },  [allCheckups, dateRange, searchQuery, sortStatus, clientIdFromUrl, clientTypeFromUrl, clientNameFromUrl]);

  // --- Pagination logic ---
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const records = useMemo(() => {
    const from = (page - 1) * recordsPerPage;
    const to = from + recordsPerPage;
    return filteredRecords.slice(from, to);
  }, [filteredRecords, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateRange]);

  // --- Helpers ---
  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  // const prepareReportData = (formDataString) => {
  //   if (!formDataString) return null;
  //   try {
  //     const data = JSON.parse(formDataString);
  //     return {
  //       ...data,
  //       checklist: data.checklist?.map((i) => ({
  //         ...i,
  //         gap:
  //           typeof i.target === 'number' && typeof i.currentStatus === 'number'
  //             ? (i.target - i.currentStatus).toFixed(2)
  //             : 'N/A',
  //       })),
  //     };
  //   } catch (e) {
  //     console.error('Failed to parse formData:', e);
  //     alert('The data for this report seems corrupted.');
  //     return null;
  //   }
  // };

  const prepareReportData = (formDataString) => {
  if (!formDataString) return null;

  try {
    // Check if data is already an object
    const data = typeof formDataString === "object"
      ? formDataString
      : JSON.parse(formDataString);

    return {
      ...data,
      checklist: data.checklist?.map((i) => ({
        ...i,
        gap:
          typeof i.target === "number" && typeof i.currentStatus === "number"
            ? (i.target - i.currentStatus).toFixed(2)
            : "N/A",
      })),
    };
  } catch (e) {
    console.error("Failed to parse formData:", e);
    alert("The data for this report seems corrupted.");
    return null;
  }
};


  const handleViewReport = (checkup) => {
    const report = prepareReportData(checkup.formData);
    if (report) {
      setSelectedReportData(report);
      setIsReportModalOpen(true);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDateRange({ from: '', to: '' });
  };

  // --- Columns ---
  const columns = [
    {
      accessor: 'checkupDate',
      title: 'Date',
      sortable: true,
      render: (r) => formatDate(r.checkupDate),
    },
    { accessor: 'clientName', title: 'Client Name', sortable: true },
    {
      accessor: 'financialDoctorName',
      title: 'Advisor / User',
      sortable: true,
      render: (r) => r.financialDoctorName || 'N/A',
    },
    {
      accessor: 'actions',
      title: 'Actions',
      textAlign: 'right',
      render: (r) => (
        <Button
          variant="light"
          size="xs"
          leftIcon={<IconEye size={16} />}
          onClick={() => handleViewReport(r)}
        >
          View Report
        </Button>
      ),
    },
  ];

  const CheckupCard = ({ checkup }) => (
    <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <Text weight={600} className="dark:text-white">
            {checkup.clientName}
          </Text>
          <Text size="sm" color="dimmed">
            on {formatDate(checkup.checkupDate)}
          </Text>
        </div>
        <Button variant="light" size="xs" onClick={() => handleViewReport(checkup)}>
          View
        </Button>
      </div>
      <Text size="sm" className="dark:text-gray-300">
        Advisor:{' '}
        <span className="font-medium">{checkup.financialDoctorName || 'N/A'}</span>
      </Text>
    </div>
  );

  // --- Render ---
  return (
    <div className="panel relative mt-6">
      <h2 className="text-xl font-semibold mb-4">Financial Health Checkup History</h2>

      {/* FILTERS */}
      <Box mb="md">
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          gap="md"
          align="center"
          justify="space-between"
          wrap="wrap"
        >
          {/* Search Bar */}
          <TextInput
            placeholder="Search by client or advisor..."
            icon={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1, minWidth: '250px' }}
          />

          {/* Date Range Inputs */}
          <Group gap="xs" align="center" wrap="nowrap" style={{ flexWrap: 'nowrap' }}>
            <TextInput
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((r) => ({ ...r, from: e.target.value }))
              }
              placeholder="From"
              icon={<IconCalendar size={16} />}
              styles={{
                input: { height: 36, paddingRight: 8, paddingLeft: 34 },
              }}
            />
            <TextInput
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((r) => ({ ...r, to: e.target.value }))
              }
              placeholder="To"
              icon={<IconCalendar size={16} />}
              styles={{
                input: { height: 36, paddingRight: 8, paddingLeft: 34 },
              }}
            />
            {(dateRange.from || dateRange.to || searchQuery) && (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftIcon={<IconX size={14} />}
                onClick={handleClearFilters}
                style={{ height: 36 }}
              >
                Clear
              </Button>
            )}
          </Group>
        </Flex>
      </Box>

      <LoadingOverlay visible={loading} overlayBlur={2} />

      {error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error!"
          color="red"
          withCloseButton
          onClose={() => setError(null)}
          mb="md"
        >
          {error}
        </Alert>
      )}

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {!loading &&
          records.length > 0 &&
          records.map((c) => <CheckupCard key={c.id} checkup={c} />)}
        {!loading && records.length === 0 && (
          <Text align="center" p="md">
            No records found.
          </Text>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block datatables">
        <DataTable
          highlightOnHover
          records={records}
          columns={columns}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          minHeight={200}
          fetching={loading}
          noRecordsText="No checkup history found"
          totalRecords={totalRecords}
          recordsPerPage={recordsPerPage}
          page={page}
          onPageChange={setPage}
          paginationText={({ from, to, totalRecords }) =>
            `${from}-${to} of ${totalRecords} records`
          }
        />
      </div>

      {/* Report Modal */}
      {isReportModalOpen && selectedReportData && (
        <FinancialHealthReportModal
          data={selectedReportData}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CheckupHistory;
