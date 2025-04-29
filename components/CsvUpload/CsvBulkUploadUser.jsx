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
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import Papa from 'papaparse';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { IconUpload, IconAlertTriangle, IconCheck } from '@tabler/icons-react';

// Minimum columns we expect – everything else is optional
const REQUIRED_HEADERS = ['full_name', 'email', 'phone_number', 'lead_status'];

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
        `${API_URL}/api/leads/bulk-user`,
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

export default CsvBulkUploadUser;
