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

// Minimum columns we expect – everything else is optional
const REQUIRED_HEADERS = ['full_name', 'email', 'phone_number', 'lead_status'];

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

  /* ---------- download sample CSV ---------- */
  const generateSampleCsvContent = () => {
    const headers = REQUIRED_HEADERS.join(',');
    const exampleRow1 = "John Doe,john.doe@example.com,1234567890,New";
    const exampleRow2 = "Jane Smith,jane.smith@example.com,0987654321,Contacted,123 Main St,Some notes";
    // Example with an extra column (address, notes)
    const extendedHeaders = [...REQUIRED_HEADERS, 'address', 'notes'].join(',');


    return `${extendedHeaders}\n${exampleRow1},,\n${exampleRow2}`;
    // Or if you only want the required headers in the sample:
    // return `${headers}\n${exampleRow1}\nJane Smith,jane.smith@example.com,0987654321,Contacted`;
  };

  const handleDownloadSample = () => {
    const csvContent = generateSampleCsvContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'sample_leads_import.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for older browsers
      showNotification({
        title: 'Download Error',
        message: 'Your browser does not support automatic downloads. Please copy the content manually.',
        color: 'orange',
      });
      // Optionally, display the content in a modal or alert
      console.log("Sample CSV Content:\n", csvContent);
    }
  };

  /* ---------- upload ---------- */
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const upload = async () => {
    if (!rows.length) {
      showNotification({ title: 'No data', message: 'Pick a CSV first', color: 'yellow' });
      return;
    }
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Auth required');
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
      console.error(err);
      showNotification({
        title: 'Upload failed',
        message: err.response?.data?.message || err.message,
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
    <Modal opened={opened} onClose={onClose} title="Bulk CSV Upload" size="lg" centered>
      <LoadingOverlay visible={loading} overlayBlur={2} />

      <Group position="apart" mb="xs">
        <Text size="sm" weight={500}>Required columns: {REQUIRED_HEADERS.join(', ')}</Text>
        <Anchor component="button" type="button" onClick={handleDownloadSample} size="sm">
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

      <Group position="right">
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