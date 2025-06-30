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

/* ── required fields in your MySQL schema ── */
const REQUIRED_HEADERS = ['full_name', 'email', 'phone_number']; // status defaults server-side

// Headers based on the provided image for the sample CSV
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

// Optional headers are those in the sample sheet that are not strictly required for upload
const OPTIONAL_SAMPLE_HEADERS = SAMPLE_SHEET_HEADERS.filter(
  (h) => !REQUIRED_HEADERS.includes(h)
);

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

  /* -------- Download Sample CSV -------- */
  const generateSampleCsvContent = () => {
    const headersString = SAMPLE_SHEET_HEADERS.join(',');

    // Helper to create a row string from an array of values, ensuring correct column count
    const createSampleRow = (values) => {
      const row = [];
      for (let i = 0; i < SAMPLE_SHEET_HEADERS.length; i++) {
        // Ensure value is a string and escape quotes if any (basic escaping for this manual generation)
        // For robust CSV generation with complex data, use Papa.unparse or a similar library.
        let val = values[i] !== undefined && values[i] !== null ? String(values[i]) : '';
        if (val.includes('"')) {
            val = `"${val.replace(/"/g, '""')}"`;
        } else if (val.includes(',')) {
            val = `"${val}"`;
        }
        row.push(val);
      }
      return row.join(',');
    };

    // Values should correspond to the order in SAMPLE_SHEET_HEADERS
    const exampleRow1Values = [
      "Arjun Mehta",              // full_name
      "arjun.mehta@example.com",  // email
      "9211111111",               // phone_number (example, ensure it's a string)
      "M",                        // gender
      "1985-06-15",               // date_of_birth
      "2020-01-20",               // anniversary_date
      "221B Baker Street, Apt 4", // address
      "Zenith Tech Solutions",    // company_name
      "Life Shield Plus",         // product_name
      "LSP-0007A",                // policy_number
      "15000",                    // premium
      "5000000",                  // coverage_amount
      "2024-12-20",               // renewal_date
      "Active",                   // status
      "Facebook Ads",             // source
      "",                         // referrer
      "Prime prospect - wants annual reminder", // notes
    ];

    const exampleRow2Values = [
      "Pooja Nair",               // full_name
      "pooja.nair@example.com",   // email
      "9222222222",               // phone_number
      "F",                        // gender
      "1990-11-01",               // date_of_birth
      "",                         // anniversary_date
      "Artisan Avenue Lofts #302",// address (empty for Pooja in image, example here)
      "Nair Designs Co.",         // company_name
      "Health Plus Plan",         // product_name
      "HP-4521B",                 // policy_number
      "8500",                     // premium
      "2000000",                  // coverage_amount
      "2025-03-15",               // renewal_date
      "Active",                   // status
      "Referral",                 // source
      "Joseph Mathew",            // referrer
      "Follow up for policy details", // notes
    ];
     const exampleRow3Values = [ // Example with only required fields and some optional
      "Rohan Kapoor",             // full_name
      "rohan.kapoor@example.com", // email
      "9199999999",               // phone_number
      "M",                        // gender
      "",                         // date_of_birth
      "",                         // anniversary_date
      "Plot 44, Gu Sector",       // address
      "Global Logistics",         // company_name
      "Motor Secure",             // product_name
      "MS-8899",                  // policy_number
      "12000",                    // premium
      "1000000",                  // coverage_amount
      "2024-10-05",               // renewal_date
      "Active",                   // status
      "LinkedIn Outreach",        // source
      "",                         // referrer
      "Wants add-on coverage next renewal", // notes
    ];


    return `${headersString}\n${createSampleRow(exampleRow1Values)}\n${createSampleRow(exampleRow2Values)}\n${createSampleRow(exampleRow3Values)}`;
  };

  const handleDownloadSample = () => {
    const csvContent = generateSampleCsvContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'sample_customers_import_format.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      showNotification({
        title: 'Download Error',
        message: 'Your browser does not support automatic downloads.',
        color: 'orange',
      });
      console.log("Sample CSV Content:\n", csvContent);
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
    <Modal opened={opened} onClose={onClose} title="Bulk-upload Customers" size="xl" centered> {/* Increased size to xl for more info */}
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
        accept=".csv"
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
            <Table
              striped
              withBorder
              fontSize="xs"
              sx={{
                tableLayout: 'auto',
                minWidth: 'max-content',
                'th, td': { whiteSpace: 'nowrap' },
              }}
            >
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