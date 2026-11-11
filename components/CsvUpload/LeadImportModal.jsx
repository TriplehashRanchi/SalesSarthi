'use client';
// Bulk CSV lead import (admin and team member).
//   1. Pick a CSV  -> parsed in the browser, checked by the API (invalid rows + duplicates). Nothing saved yet.
//   2. Review      -> choose the destination folder (required, can be changed), decide each duplicate
//                     (Skip / Update existing / Delete existing & import), pick the record when one row matches two leads.
//   3. Import      -> "Delete existing & import" asks for confirmation first. Summary shown; if rows were skipped
//                     as invalid, an error report (original columns + Error Reason) downloads automatically.
// Cancel before step 3 imports nothing.
import { useEffect, useMemo, useState } from 'react';
import { Anchor, Badge, Button, FileInput, Group, Loader, Modal, Radio, ScrollArea, SegmentedControl, Select, Table, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconDownload, IconFolder, IconUpload } from '@tabler/icons-react';
import Papa from 'papaparse';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import PillToggle from '@/components/assign/PillToggle';
import AssignPicker, { EMPTY_ASSIGN, assignError, toPayload } from '@/components/assign/AssignPicker';
import { importCheck, importCommit, errorMessage } from '@/components/Leadtable/leadFolders';

const REQUIRED_HEADERS = ['full_name', 'phone_number'];
const SAMPLE_HEADERS = ['full_name', 'email', 'phone_number', 'lead_status', 'address', 'notes'];
const SAMPLE_ROWS = [
    { full_name: 'Rahul Sharma', email: 'rahul@example.com', phone_number: '9876543210', lead_status: 'Cold Lead', address: 'Delhi', notes: 'Kanyadaan enquiry' },
    { full_name: 'Neha Verma', email: '', phone_number: '9123456789', lead_status: 'Hot Lead', address: 'Noida', notes: 'Referral' },
];

const ACTIONS = [
    { value: 'skip', label: 'Skip' },
    { value: 'update', label: 'Update existing' },
    { value: 'replace', label: 'Delete existing & import' },
];

// Saves a CSV on web (download) or on the phone (Documents folder).
const saveCsv = async (fileName, content) => {
    if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({ path: fileName, data: content, directory: Directory.Documents, encoding: Encoding.UTF8 });
        showNotification({ title: 'File saved', message: `${fileName} saved to Documents.`, color: 'green' });
        return;
    }
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const matchText = (dup, m) =>
    m.matched_on
        .map((on) => (on === 'phone' ? `Phone: ${m.phone_number || dup.phone_number}` : `Email: ${m.email || dup.email}`))
        .join(' · ');

// historyHref: where "View Import History" goes after an import.
// teamMembers: [{ id, username, role }] the user may assign to (admin / manager). Empty = no assign option.
const LeadImportModal = ({ opened, onClose, onDone, folders, defaultFolderId, onCreateFolder, historyHref, teamMembers = [] }) => {
    const isPhone = useMediaQuery('(max-width: 639px)');
    const [step, setStep] = useState('pick'); // pick | review | done
    const [file, setFile] = useState(null);
    const [fields, setFields] = useState([]);
    const [rows, setRows] = useState([]);
    const [check, setCheck] = useState(null);
    const [folderId, setFolderId] = useState(null);
    const [decisions, setDecisions] = useState({}); // row_index -> { action, target_id }
    const [busy, setBusy] = useState(false);
    const [confirmReplace, setConfirmReplace] = useState(false);
    const [summary, setSummary] = useState(null);
    const [assignOn, setAssignOn] = useState(false);
    const [assignVal, setAssignVal] = useState(EMPTY_ASSIGN);

    const reset = () => {
        setStep('pick');
        setFile(null);
        setFields([]);
        setRows([]);
        setCheck(null);
        setDecisions({});
        setBusy(false);
        setConfirmReplace(false);
        setSummary(null);
        setAssignOn(false);
        setAssignVal(EMPTY_ASSIGN);
    };

    useEffect(() => {
        if (opened) {
            reset();
            setFolderId(defaultFolderId ? String(defaultFolderId) : null);
        }
    }, [opened, defaultFolderId]);

    const close = () => {
        if (busy) return;
        if (step === 'done') onDone?.();
        onClose();
    };

    /* ───── step 1: parse + check ───── */
    const handleFile = (f) => {
        setFile(f);
        if (!f) return;
        Papa.parse(f, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: (h) => h.trim(),
            complete: async ({ data, errors, meta }) => {
                if (errors.length && !data.length) {
                    showNotification({ title: 'Could not read the file', message: errors[0].message, color: 'red', icon: <IconAlertTriangle size={16} /> });
                    return;
                }
                const missing = REQUIRED_HEADERS.filter((h) => !meta.fields.includes(h));
                if (missing.length) {
                    showNotification({ title: 'Invalid CSV', message: `Missing column(s): ${missing.join(', ')}. Download the sample CSV to see the format.`, color: 'red', icon: <IconAlertTriangle size={16} /> });
                    return;
                }
                if (!data.length) {
                    showNotification({ title: 'Empty file', message: 'The CSV has no rows.', color: 'yellow' });
                    return;
                }
                setFields(meta.fields);
                setRows(data);
                setBusy(true);
                try {
                    const res = await importCheck(data);
                    setCheck(res);
                    setDecisions(Object.fromEntries(res.duplicates.map((d) => [d.row_index, { action: 'skip', target_id: d.matches.length === 1 ? d.matches[0].id : null }])));
                    setStep('review');
                } catch (err) {
                    showNotification({ title: 'Check failed', message: errorMessage(err, 'Could not check the file.'), color: 'red' });
                } finally {
                    setBusy(false);
                }
            },
        });
    };

    /* ───── step 2: review ───── */
    const dupByIndex = useMemo(() => Object.fromEntries((check?.duplicates || []).map((d) => [d.row_index, d])), [check]);
    const setDecision = (rowIndex, patch) => setDecisions((prev) => ({ ...prev, [rowIndex]: { ...prev[rowIndex], ...patch } }));
    const applyToAll = (action) =>
        setDecisions((prev) => {
            const next = { ...prev };
            (check?.duplicates || []).forEach((d) => {
                const modifiable = d.matches.some((m) => m.can_modify);
                next[d.row_index] = { ...next[d.row_index], action: action !== 'skip' && !modifiable ? 'skip' : action };
            });
            return next;
        });

    const counts = useMemo(() => {
        const c = { skip: 0, update: 0, replace: 0, needsPick: 0 };
        Object.entries(decisions).forEach(([idx, d]) => {
            c[d.action] += 1;
            if (d.action !== 'skip' && !d.target_id && (dupByIndex[idx]?.matches.length || 0) > 1) c.needsPick += 1;
        });
        return c;
    }, [decisions, dupByIndex]);

    const folderName = folders.find((f) => String(f.id) === folderId)?.name;
    const assignOk = !assignOn || !assignError(assignVal);
    const canImport = !!folderId && counts.needsPick === 0 && assignOk && !busy;

    /* ───── step 3: import ───── */
    const runImport = async () => {
        setConfirmReplace(false);
        setBusy(true);
        try {
            const res = await importCommit({
                rows,
                folder_id: Number(folderId),
                file_name: file?.name,
                assignment: assignOn ? toPayload(assignVal) : undefined,
                fields, // column order for the stored error report
                file_text: await file.text().catch(() => ''), // original CSV, kept 30 days in Import History
                decisions: Object.entries(decisions).map(([row_index, d]) => ({ row_index: Number(row_index), action: d.action, target_id: d.target_id })),
            });
            setSummary(res);
            setStep('done');
            if (res.invalid?.length) await downloadErrorReport(res.invalid);
        } catch (err) {
            showNotification({ title: 'Import failed', message: errorMessage(err, 'Import failed. Nothing was imported.'), color: 'red' });
        } finally {
            setBusy(false);
        }
    };

    const startImport = () => (counts.replace > 0 ? setConfirmReplace(true) : runImport());

    // Original columns of each skipped row + "Error Reason".
    const downloadErrorReport = async (invalid) => {
        const report = invalid.map((e) => ({ ...rows[e.row_index], 'Error Reason': e.reason }));
        const csv = Papa.unparse(report, { columns: [...fields, 'Error Reason'] });
        const base = (file?.name || 'leads').replace(/\.csv$/i, '');
        try {
            await saveCsv(`${base}_error_report.csv`, csv);
        } catch (err) {
            console.error('Error report not saved:', err);
            showNotification({ title: 'Could not save the error report', message: 'The file could not be saved on this device. Please try again, or download it from Import History.', color: 'red' });
        }
    };

    const downloadSample = () => saveCsv('sample_leads_import.csv', Papa.unparse(SAMPLE_ROWS, { columns: SAMPLE_HEADERS })).catch(() => {});

    /* ───── UI ───── */
    const stat = (label, value, color) => (
        <div className="rounded-lg bg-gray-50 p-2.5 text-center dark:bg-gray-800">
            <div className={`text-lg font-bold ${color || ''}`}>{value}</div>
            <div className="text-[11px] text-gray-500">{label}</div>
        </div>
    );

    return (
        <>
            <Modal opened={opened} onClose={close} title={<Text weight={700} size="lg">Bulk Upload Leads</Text>} size="xl" centered={!isPhone} fullScreen={isPhone} radius="lg">
                {step === 'pick' && (
                    <>
                        <Group position="apart" align="flex-start" mb="sm" noWrap>
                            <div className="min-w-0">
                                <Text size="sm" weight={500}>Required columns: full_name, phone_number</Text>
                                <Text size="xs" color="dimmed">Optional: email, lead_status, address, notes</Text>
                            </div>
                            <Anchor component="button" type="button" onClick={downloadSample} size="sm" className="flex-shrink-0">
                                <Group spacing={4} noWrap><IconDownload size={14} /> Sample CSV</Group>
                            </Anchor>
                        </Group>
                        <FileInput label="Select CSV file" placeholder="Choose .csv" accept=".csv,text/csv,application/vnd.ms-excel" icon={<IconUpload size={16} />} value={file} onChange={handleFile} disabled={busy} />
                        {busy && (
                            <Group mt="md" spacing="xs"><Loader size="sm" /><Text size="sm">Checking {rows.length} rows for errors and duplicates…</Text></Group>
                        )}
                        <Group position="right" mt="lg">
                            <Button variant="default" onClick={close} disabled={busy}>Cancel</Button>
                        </Group>
                    </>
                )}

                {step === 'review' && check && (
                    <>
                        <Text size="sm" color="dimmed" mb="xs" className="break-all">{file?.name}</Text>
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {stat('Total rows', check.total)}
                            {stat('New leads', check.new_count, 'text-green-600')}
                            {stat('Duplicates', check.duplicates.length, check.duplicates.length ? 'text-orange-500' : '')}
                            {stat('Invalid (skipped)', check.invalid.length, check.invalid.length ? 'text-red-600' : '')}
                        </div>

                        {/* preview */}
                        <Text size="xs" weight={600} mb={4}>Preview (first 5 rows)</Text>
                        <ScrollArea type="auto" mb="md">
                            <Table striped withBorder fontSize="xs">
                                <thead><tr>{fields.map((h) => <th key={h} className="whitespace-nowrap">{h}</th>)}</tr></thead>
                                <tbody>
                                    {rows.slice(0, 5).map((r, i) => (
                                        <tr key={i}>{fields.map((h) => <td key={h} className="whitespace-nowrap">{r[h]}</td>)}</tr>
                                    ))}
                                </tbody>
                            </Table>
                        </ScrollArea>

                        {/* destination folder */}
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                            <Select
                                className="flex-1"
                                label="Destination folder"
                                description="Required. You can change it any time before importing."
                                placeholder={folders.length ? 'Select a folder' : 'Create a folder first'}
                                data={folders.map((f) => ({ value: String(f.id), label: f.name }))}
                                value={folderId}
                                onChange={setFolderId}
                                searchable
                                withinPortal
                                required
                                icon={<IconFolder size={15} />}
                                error={!folderId ? 'Select a destination folder' : null}
                            />
                            {onCreateFolder && (
                                <Button variant="default" onClick={async () => { const f = await onCreateFolder(); if (f) setFolderId(String(f.id)); }}>
                                    + New folder
                                </Button>
                            )}
                        </div>

                        {/* assign / distribute */}
                        {teamMembers.length > 0 && (
                            <div className="mb-4">
                                <Text size="sm" weight={500} mb={4}>Assign new leads</Text>
                                <PillToggle
                                    value={assignOn ? 'yes' : 'no'}
                                    onChange={(v) => setAssignOn(v === 'yes')}
                                    data={[{ value: 'no', label: "Don't assign" }, { value: 'yes', label: 'Assign to team' }]}
                                />
                                {assignOn && (
                                    <div className="mt-2">
                                        <AssignPicker value={assignVal} onChange={setAssignVal} teamMembers={teamMembers} total={check.new_count} />
                                    </div>
                                )}
                            </div>
                        )}

                        {check.invalid.length > 0 && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                {check.invalid.length} row{check.invalid.length === 1 ? '' : 's'} have missing or invalid data and will be skipped. An error report with their original data and the reason will download automatically after the import.
                            </div>
                        )}

                        {/* duplicates */}
                        {check.duplicates.length > 0 && (
                            <div className="mb-2">
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <Text size="sm" weight={600}>{check.duplicates.length} duplicate{check.duplicates.length === 1 ? '' : 's'} found (same phone or email)</Text>
                                    <Group spacing={6}>
                                        <Text size="xs" color="dimmed">Apply to all:</Text>
                                        {ACTIONS.map((a) => (
                                            <Button key={a.value} size="xs" compact variant="light" color={a.value === 'replace' ? 'red' : 'blue'} onClick={() => applyToAll(a.value)}>{a.label}</Button>
                                        ))}
                                    </Group>
                                </div>
                                <div className="max-h-[40vh] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                                    {check.duplicates.map((d) => {
                                        const dec = decisions[d.row_index] || { action: 'skip' };
                                        const modifiable = d.matches.filter((m) => m.can_modify);
                                        return (
                                            <div key={d.row_index} className="p-3">
                                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <Text size="sm" weight={600} className="truncate">{d.full_name}</Text>
                                                        {d.matches.length === 1 && <Text size="xs" color="dimmed">{matchText(d, d.matches[0])}{d.matches[0].full_name !== d.full_name ? ` (existing: ${d.matches[0].full_name})` : ''}</Text>}
                                                    </div>
                                                    <SegmentedControl
                                                        size="xs"
                                                        value={dec.action}
                                                        onChange={(v) => setDecision(d.row_index, { action: v })}
                                                        data={ACTIONS.map((a) => ({ ...a, disabled: a.value !== 'skip' && !modifiable.length }))}
                                                        className="max-w-full overflow-x-auto"
                                                    />
                                                </div>
                                                {!modifiable.length && <Text size="xs" color="orange">The existing lead belongs to another team member – it can only be skipped.</Text>}
                                                {d.matches.length > 1 && (
                                                    <Radio.Group
                                                        value={dec.target_id ? String(dec.target_id) : null}
                                                        onChange={(v) => setDecision(d.row_index, { target_id: Number(v) })}
                                                        orientation="vertical"
                                                        spacing={4}
                                                        mt={4}
                                                        label={<Text size="xs" color={dec.action !== 'skip' && !dec.target_id ? 'red' : 'dimmed'}>Matches {d.matches.length} existing leads – choose which one to {dec.action === 'replace' ? 'delete' : 'update'}:</Text>}
                                                    >
                                                        {d.matches.map((m) => (
                                                            <Radio
                                                                key={m.id}
                                                                value={String(m.id)}
                                                                disabled={!m.can_modify}
                                                                label={<Text size="xs"><b>{m.full_name}</b> · {matchText(d, m)}</Text>}
                                                            />
                                                        ))}
                                                    </Radio.Group>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <Button variant="default" onClick={close} disabled={busy}>Cancel (import nothing)</Button>
                            <Button color="blue" onClick={startImport} loading={busy} disabled={!canImport}>
                                {folderName ? `Import into “${folderName}”` : 'Select a folder to import'}
                            </Button>
                        </div>
                        {counts.needsPick > 0 && <Text size="xs" color="red" align="right" mt={4}>Choose the existing lead for {counts.needsPick} duplicate{counts.needsPick === 1 ? '' : 's'}.</Text>}
                    </>
                )}

                {step === 'done' && summary && (
                    <>
                        <Group spacing="xs" mb="sm">
                            <IconCheck size={18} className="text-green-600" />
                            <Text weight={600}>Import finished – folder “{summary.folder?.name}”</Text>
                        </Group>
                        <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                            <Table fontSize="sm">
                                <tbody>
                                    <tr><td>Total uploaded</td><td className="text-right font-semibold">{summary.total}</td></tr>
                                    <tr><td>Successfully imported</td><td className="text-right font-semibold text-green-600">{summary.imported}</td></tr>
                                    {summary.assigned > 0 && <tr><td>Assigned to team</td><td className="text-right font-semibold">{summary.assigned}</td></tr>}
                                    <tr><td>Existing leads updated</td><td className="text-right font-semibold">{summary.updated}</td></tr>
                                    <tr><td>Existing leads deleted & replaced</td><td className="text-right font-semibold">{summary.deleted}</td></tr>
                                    <tr><td>Duplicates skipped</td><td className="text-right font-semibold">{summary.skipped_duplicates}</td></tr>
                                    <tr><td>Skipped / invalid</td><td className="text-right font-semibold text-red-600">{summary.invalid_count}</td></tr>
                                </tbody>
                            </Table>
                        </div>
                        {summary.invalid_count > 0 && (
                            <Group position="apart" mb="sm">
                                <Text size="sm" color="dimmed">Error report downloaded (original data + Error Reason). Fix the rows and upload them again.</Text>
                                <Button size="xs" variant="light" leftIcon={<IconDownload size={14} />} onClick={() => downloadErrorReport(summary.invalid)}>Download again</Button>
                            </Group>
                        )}
                        <Text size="xs" color="dimmed" mt="xs">
                            The original file{summary.invalid_count > 0 ? ' and the error report are' : ' is'} saved in Import History for 30 days.
                        </Text>
                        <Group position="right" mt="md">
                            {historyHref && (
                                <Button component={Link} href={historyHref} variant="default">View Import History</Button>
                            )}
                            <Button color="blue" onClick={close}>Done</Button>
                        </Group>
                    </>
                )}
            </Modal>

            {/* Delete existing & import: confirm first */}
            <Modal opened={confirmReplace} onClose={() => setConfirmReplace(false)} title={<Text weight={700} size="lg">Confirm Delete & Import</Text>} centered radius="lg" size="sm" zIndex={1100}>
                <Text size="sm" mb="md">You are about to delete existing duplicate lead records and import their replacement records from the uploaded CSV file.</Text>
                <div className="mb-3 grid grid-cols-2 gap-2">
                    {stat('Existing leads to delete', counts.replace, 'text-red-600')}
                    {stat('New records to import', counts.replace, 'text-green-600')}
                </div>
                <Badge color="red" variant="light" fullWidth radius="sm" size="lg" className="!h-auto !whitespace-normal !py-1.5 !normal-case">
                    This action will permanently delete the selected existing lead records.
                </Badge>
                <Group position="right" mt="lg">
                    <Button variant="default" onClick={() => setConfirmReplace(false)}>Cancel</Button>
                    <Button color="red" onClick={runImport}>Confirm & Import</Button>
                </Group>
            </Modal>
        </>
    );
};

export default LeadImportModal;
