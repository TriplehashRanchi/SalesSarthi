'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  FileInput,
  Button,
  Table,
  ScrollArea,
  Text,
  Group,
  Badge,
  LoadingOverlay,
  Anchor,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconUpload, IconAlertTriangle, IconCheck, IconDownload } from '@tabler/icons-react';
import Papa from 'papaparse';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const REQUIRED_HEADERS = ['full_name', 'email', 'phone_number'];

const SAMPLE_SHEET_HEADERS = [
  'full_name',
  'email',
  'phone_number',
  'gender',
  'date_of_birth',
  'anniversary_date',
  'address',
  'company_name',
  'product_name',
  'policy_number',
  'premium',
  'coverage_amount',
  'renewal_date',
  'status',
  'source',
  'referrer',
  'notes',
];

const CsvCustomersUpload = ({ opened, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------- CSV → JSON -------- */
  const parseCsv = useCallback((f) => {
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors, meta }) => {
        if (errors.length) {
          showNotification({
            title: 'Parsing error',
            message: errors[0].message,
            color: 'red',
            icon: <IconAlertTriangle size={16} />,
          });
          return;
        }
        const missing = REQUIRED_HEADERS.filter((h) => !meta.fields.includes(h));
        if (missing.length) {
          showNotification({
            title: 'Invalid CSV',
            message: `Missing column(s): ${missing.join(', ')}`,
            color: 'red',
            icon: <IconAlertTriangle size={16} />,
          });
          return;
        }
        setRows(data);
      },
    });
  }, []);

  const handleFile = (f) => {
    setFile(f);
    setRows([]);
    if (f) parseCsv(f);
  };

  /* -------- Generate & Download Sample CSV -------- */
  const generateSampleCsvContent = () => {
    const exampleRows = [
      {
        full_name: "Arjun Mehta",
        email: "arjun.mehta@example.com",
        phone_number: "9211111111",
        gender: "M",
        date_of_birth: "1985-06-15",
        anniversary_date: "2020-01-20",
        address: "221B Baker Street, Apt 4",
        company_name: "Zenith Tech Solutions",
        product_name: "Life Shield Plus",
        policy_number: "LSP-0007A",
        premium: "15000",
        coverage_amount: "5000000",
        renewal_date: "2024-12-20",
        status: "Active",
        source: "Facebook Ads",
        referrer: "",
        notes: "Prime prospect - wants annual reminder",
      },
      {
        full_name: "Pooja Nair",
        email: "pooja.nair@example.com",
        phone_number: "9222222222",
        gender: "F",
        date_of_birth: "1990-11-01",
        anniversary_date: "",
        address: "Artisan Avenue Lofts #302",
        company_name: "Nair Designs Co.",
        product_name: "Health Plus Plan",
        policy_number: "HP-4521B",
        premium: "8500",
        coverage_amount: "2000000",
        renewal_date: "2025-03-15",
        status: "Active",
        source: "Referral",
        referrer: "Joseph Mathew",
        notes: "Follow up for policy details",
      },
      {
        full_name: "Rohan Kapoor",
        email: "rohan.kapoor@example.com",
        phone_number: "9199999999",
        gender: "M",
        date_of_birth: "",
        anniversary_date: "",
        address: "Plot 44, Gu Sector",
        company_name: "Global Logistics",
        product_name: "Motor Secure",
        policy_number: "MS-8899",
        premium: "12000",
        coverage_amount: "1000000",
        renewal_date: "2024-10-05",
        status: "Active",
        source: "LinkedIn Outreach",
        referrer: "",
        notes: "Wants add-on coverage next renewal",
      },
    ];
    return Papa.unparse(exampleRows, { columns: SAMPLE_SHEET_HEADERS });
  };

  const handleDownloadSample = async () => {
    const csvContent = generateSampleCsvContent();

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: 'sample_customers_import_format.csv',
          data: csvContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        showNotification({
          title: 'File saved',
          message: 'Sample CSV saved to Documents folder.',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } catch (err) {
        console.error("Filesystem error:", err);
        showNotification({
          title: 'Save failed',
          message: 'Could not save sample CSV on device.',
          color: 'red',
          icon: <IconAlertTriangle size={16} />,
        });
      }
    } else {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'sample_customers_import_format.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  /* -------- Upload to API -------- */
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const upload = async () => {
    if (!rows.length) {
      showNotification({ title: 'No data', message: 'Choose a CSV first', color: 'yellow' });
      return;
    }
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        showNotification({
          title: 'Authentication Error',
          message: 'You must be logged in to upload customers.',
          color: 'red',
          icon: <IconAlertTriangle size={16} />,
        });
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();

      await axios.post(
        `${API_URL}/api/customers/bulk`,
        { customers: rows },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );

      showNotification({
        title: 'Import success',
        message: `${rows.length} customer record(s) queued`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setFile(null);
      setRows([]);
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error("Upload error:", err);
      showNotification({
        title: 'Upload failed',
        message: err.response?.data?.message || err.message || 'An unknown error occurred.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  /* -------- UI -------- */
  return (
    <Modal opened={opened} onClose={onClose} title="Bulk-upload Customers" size="xl" centered>
      <LoadingOverlay visible={loading} overlayBlur={2} />

      <Group position="apart" mb="sm" align="flex-start">
        <div>
          <Text size="sm" weight={500}>Required columns for upload:</Text>
          <Text size="xs" color="dimmed" mb="xs">{REQUIRED_HEADERS.join(', ')}</Text>
          <Text size="xs" color="dimmed" mt={2}>
            (Any other columns you include will also be sent to the server.)
          </Text>
        </div>
        <Anchor component="button" type="button" onClick={handleDownloadSample} size="sm" mt="xs">
          <Group spacing="xs" noWrap>
            <IconDownload size={14} />
            Download Sample CSV
          </Group>
        </Anchor>
      </Group>

      <FileInput
        label="Select CSV file"
        placeholder="Choose .csv"
        accept=".csv,text/csv,application/vnd.ms-excel"
        icon={<IconUpload size={16} />}
        value={file}
        onChange={handleFile}
        mb="md"
      />

      {rows.length > 0 && (
        <>
          <Text size="sm" mb="xs">
            Previewing {preview.length} of {rows.length} rows
          </Text>

          <ScrollArea h={220} type="auto" mb="md">
            <Table striped withBorder fontSize="xs">
              <thead>
                <tr>
                  {Object.keys(preview[0] || {}).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    {Object.keys(r).map((k) => (
                      <td key={k}>{r[k]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollArea>

          <Badge color="teal" mt="sm" mb="md">
            Looks good ✓
          </Badge>
        </>
      )}

      <Group position="right" mt="md">
        <Button variant="default" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={upload} disabled={loading || !rows.length}>
          Import {rows.length ? `(${rows.length})` : ''}
        </Button>
      </Group>
    </Modal>
  );
};

export default CsvCustomersUpload;
