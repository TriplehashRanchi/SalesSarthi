'use client';

/**
 * CsvBulkUploadUser.jsx
 *
 * Bulk‑import leads from a simple CSV. This component is enhanced with
 * Capacitor's FilePicker for a native file selection experience on mobile,
 * while using the standard web input for browsers.
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
  Box, // Used for the custom file input button
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import Papa from 'papaparse';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { IconUpload, IconAlertTriangle, IconCheck } from '@tabler/icons-react';

// --- CAPACITOR IMPORTS ---
import { Capacitor } from '@capacitor/core';
import { Filesystem, Encoding } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';


// Minimum columns we expect – everything else is optional
const REQUIRED_HEADERS = ['full_name', 'email', 'phone_number', 'lead_status'];

const CsvBulkUploadUser = ({ opened, onClose, onSuccess }) => {
  // `file` state can hold a web File object or a native file descriptor { name: string }
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  /* ---------- CSV Parsing (now accepts raw string data) ---------- */
  const processCsvData = useCallback((csvString) => {
    Papa.parse(csvString, {
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

  /* ------ File Handling for Web (`<FileInput>`) ------ */
  const handleWebFile = (selectedFile) => {
    setFile(selectedFile);
    setRows([]);
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => processCsvData(e.target.result);
      reader.readAsText(selectedFile);
    }
  };

  /* ------ File Handling for Native (Capacitor FilePicker) ------ */
  const handleNativeFilePick = async () => {
    try {
      const result = await FilePicker.pickFiles({
        types: ['text/csv', 'text/comma-separated-values', 'application/csv'],
      });

      const pickedFile = result.files[0];
      if (!pickedFile) return; // User cancelled the picker

      setFile({ name: pickedFile.name }); // Store file name for display
      setRows([]);

      const contents = await Filesystem.readFile({
        path: pickedFile.path,
        encoding: Encoding.UTF8,
      });

      processCsvData(contents.data);

    } catch (err) {
      console.error("Native file pick/read error:", err);
      showNotification({
        title: 'File Error',
        message: err.message || 'Could not open or read the selected file.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      });
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

      <Text size="sm" weight={500}>Required columns:</Text>
      <Text size="xs" color="dimmed" mb="md">{REQUIRED_HEADERS.join(', ')}</Text>

      {/* --- CONDITIONAL FILE INPUT UI --- */}
      <Box mb="md">
        {isNative ? (
           <Button
            fullWidth
            variant="default"
            onClick={handleNativeFilePick}
            leftIcon={<IconUpload size={16} />}
          >
            {file?.name || 'Select CSV file'}
          </Button>
        ) : (
          <FileInput
            label="Select CSV file"
            placeholder="Choose .csv"
            accept=".csv,text/csv,application/vnd.ms-excel"
            icon={<IconUpload size={16} />}
            value={file}
            onChange={handleWebFile}
          />
        )}
      </Box>

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