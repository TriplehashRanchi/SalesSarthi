'use client';

/**
 * CsvBulkUpload.jsx
 *
 * Bulk‑import leads from a simple CSV. Only the **basics** are required now because
 * ids (admin_id, user_id, fb_lead_id, etc.) will be generated server‑side.
 *
 * REQUIRED CSV HEADERS
 * --------------------
 * full_name,email,phone_number,lead_status
 *
 * Any extra columns (address, notes, gender, etc.) are forwarded untouched –
 * your backend decides what to persist or ignore.
 *
 * Backend contract:   POST /api/leads/bulk   { leads: [ { full_name, email, ... } ] }
 */
'use client';

/**
 * CsvBulkUpload.jsx
 *
 * Bulk‑import leads from a simple CSV. This component now handles downloads
 * for both web browsers and native mobile platforms (via Capacitor).
 *
 * REQUIRED CSV HEADERS
 * --------------------
 * full_name,email,phone_number,lead_status
 *
 * Any extra columns (address, notes, gender, etc.) are forwarded untouched –
 * your backend decides what to persist or ignore.
 *
 * Backend contract:   POST /api/leads/bulk   { leads: [ { full_name, email, ... } ] }
 */

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
// --- CAPACITOR IMPORTS ---
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Minimum columns we expect – everything else is optional
const REQUIRED_HEADERS = ['full_name', 'email', 'phone_number', 'lead_status', 'address', 'notes'];

// Sample headers for the downloadable template, including optional fields
const SAMPLE_SHEET_HEADERS = [
  'full_name',
  'email',
  'phone_number',
  'lead_status',
  'address',
  'notes',
];

const CsvBulkUpload = ({ opened, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------- parse ---------- */
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

  /* ---------- download sample CSV (with Capacitor support) ---------- */
  const generateSampleCsvContent = () => {
    const exampleRows = [
      {
        full_name: "John Doe",
        email: "john.doe@example.com",
        phone_number: "9876543210",
        lead_status: "New",
        address: "123 Main St, Anytown",
        notes: "Initial inquiry about product X.",
      },
      {
        full_name: "Jane Smith",
        email: "jane.smith@example.com",
        phone_number: "9123456789",
        lead_status: "Contacted",
        address: "456 Oak Ave, Sometown",
        notes: "Follow-up scheduled for next week.",
      },
    ];
    // Use Papa.unparse for robust CSV generation
    return Papa.unparse(exampleRows, { columns: SAMPLE_SHEET_HEADERS });
  };

  const handleDownloadSample = async () => {
    const csvContent = generateSampleCsvContent();
    const fileName = 'sample_leads_import.csv';

    // Check if running on a native platform (iOS/Android)
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Documents, // Saves to a common, user-accessible directory
          encoding: Encoding.UTF8,
        });
        showNotification({
          title: 'File saved',
          message: `Sample CSV saved to Documents folder.`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } catch (err) {
        console.error("Capacitor Filesystem error:", err);
        showNotification({
          title: 'Save failed',
          message: 'Could not save the sample CSV on your device.',
          color: 'red',
          icon: <IconAlertTriangle size={16} />,
        });
      }
    } else {
      // Fallback for standard web browsers
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };


  /* ---------- upload ---------- */
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const upload = async () => {
    if (!rows.length) {
      showNotification({ title: 'No data', message: 'Pick a CSV first', color: 'yellow' });
      return;
    }
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        showNotification({
            title: 'Authentication Error',
            message: 'You must be logged in to upload leads.',
            color: 'red',
            icon: <IconAlertTriangle size={16} />,
        });
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();

      await axios.post(
        `${API_URL}/api/leads/bulk`,
        { leads: rows },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
      );

      showNotification({
        title: 'Import success',
        message: `${rows.length} lead(s) queued for insertion`,
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

  /* ---------- UI ---------- */
  return (
    <Modal opened={opened} onClose={onClose} title="Bulk-upload Leads" size="xl" centered>
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

export default CsvBulkUpload;