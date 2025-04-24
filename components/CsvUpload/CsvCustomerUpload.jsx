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
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconUpload, IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import Papa from 'papaparse';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

/* ── required fields in your MySQL schema ── */
const REQUIRED_HEADERS = ['full_name', 'email', 'phone_number']; // status defaults server-side

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

  /* -------- Upload to API -------- */
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const upload = async () => {
    if (!rows.length) {
      showNotification({ title: 'No data', message: 'Choose a CSV first', color: 'yellow' });
      return;
    }
    try {
      setLoading(true);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      await axios.post(
        `${API_URL}/api/customers/bulk`,
        { customers: rows },
        { headers: { Authorization: `Bearer ${token}` } },
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

  /* -------- UI -------- */
  return (
    <Modal opened={opened} onClose={onClose} title="Bulk-upload Customers" size="lg" centered>
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

    {/* horizontal + vertical scroll */}
    <ScrollArea h={220} type="auto">
      <Table
        striped
        withBorder
        fontSize="xs"
        sx={{
          tableLayout: 'auto',
          minWidth: 'max-content',    // ⬅︎ let columns grow
          'th, td': { whiteSpace: 'nowrap' }, // ⬅︎ keep words together
        }}
      >
        <thead>
          <tr>
            {Object.keys(preview[0]).map((h) => (
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

    <Badge color="teal" mt="sm">
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

export default CsvCustomersUpload;
