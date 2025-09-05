'use client';

/**
 * CsvBulkUploadUser.jsx
 *
 * Bulk‑import leads from a simple CSV. This component provides a sample CSV
 * download that uses Capacitor's Filesystem for a native save experience on
 * mobile, while using a standard web file input for uploads on all platforms.
 *
 * REQUIRED CSV HEADERS
 * --------------------
 * full_name,email,phone_number,lead_status
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
  Anchor, // Added for the download link
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import Papa from 'papaparse';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { IconUpload, IconAlertTriangle, IconCheck, IconDownload } from '@tabler/icons-react'; // Added IconDownload

// --- CAPACITOR IMPORTS ---
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Minimum columns we expect – everything else is optional
const REQUIRED_HEADERS = ['full_name', 'email', 'phone_number', 'lead_status'];

// Sample headers for the downloadable template, including optional fields
const SAMPLE_SHEET_HEADERS = [
  'full_name',
  'email',
  'phone_number',
  'lead_status',
  'address',
  'notes',
];

const CsvBulkUploadUser = ({ opened, onClose, onSuccess }) => {
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
          showNotification({ title: 'Parsing error', message: errors[0].message, color: 'red', icon: <IconAlertTriangle size={16} /> });
          return;
        }
        const missing = REQUIRED_HEADERS.filter((h) => !meta.fields.includes(h));
        if (missing.length) {
          showNotification({ title: 'Invalid CSV', message: `Missing column(s): ${missing.join(', ')}`, color: 'red', icon: <IconAlertTriangle size={16} /> });
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
      { full_name: "Alex Ray", email: "alex.ray@example.com", phone_number: "9876543211", lead_status: "New", address: "789 Pine Rd, Metroville", notes: "Interested in service B." },
      { full_name: "Bethany Shaw", email: "beth.shaw@example.com", phone_number: "9123456780", lead_status: "Contacted", address: "101 Maple Ln, Suburbia", notes: "Wants a callback on Friday." },
    ];
    return Papa.unparse(exampleRows, { columns: SAMPLE_SHEET_HEADERS });
  };

  const handleDownloadSample = async () => {
    const csvContent = generateSampleCsvContent();
    const fileName = 'sample_user_leads_import.csv';

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        showNotification({ title: 'File saved', message: `Sample CSV saved to Documents.`, color: 'green', icon: <IconCheck size={16} /> });
      } catch (err) {
        console.error("Capacitor Filesystem error:", err);
        showNotification({ title: 'Save failed', message: 'Could not save the sample CSV.', color: 'red', icon: <IconAlertTriangle size={16} /> });
      }
    } else {
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
        showNotification({ title: 'Authentication Error', message: 'You must be logged in to upload.', color: 'red', icon: <IconAlertTriangle size={16} /> });
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();

      await axios.post(
        `${API_URL}/api/leads/bulk-user`,
        { leads: rows },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
      );

      showNotification({ title: 'Import success', message: `${rows.length} lead(s) queued`, color: 'green', icon: <IconCheck size={16} /> });
      setFile(null);
      setRows([]);
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      showNotification({ title: 'Upload failed', message: err.response?.data?.message || err.message, color: 'red', icon: <IconAlertTriangle size={16} /> });
    } finally {
      setLoading(false);
    }
  };

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  /* ---------- UI ---------- */
  return (
    <Modal opened={opened} onClose={onClose} title="Bulk CSV Upload" size="lg" centered>
      <LoadingOverlay visible={loading} overlayBlur={2} />

      <Group position="apart" mb="sm" align="flex-start">
        <div>
          <Text size="sm" weight={500}>Required columns:</Text>
          <Text size="xs" color="dimmed" mb="xs">{REQUIRED_HEADERS.join(', ')}</Text>
        </div>
        <Anchor component="button" type="button" onClick={handleDownloadSample} size="sm" mt="xs">
          <Group spacing="xs" noWrap>
            <IconDownload size={14} />
            Download Sample
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
          <ScrollArea h={200} mb="md">
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
          <Badge color="teal" mb="md">
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

export default CsvBulkUploadUser;