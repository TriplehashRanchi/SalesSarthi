'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { Button, Group, Loader, Modal, Paper, Text } from '@mantine/core';
import { IconHeartbeat, IconPlus } from '@tabler/icons-react';
import FinancialHealthReportModal from '@/components/modals/finhealth2';

const parseForm = (raw) => {
    try {
        return typeof raw === 'object' ? raw : JSON.parse(raw);
    } catch {
        return null;
    }
};

// Same shape the checkup history page hands to the report popup.
const toReport = (form) => ({
    ...form,
    checklist: form.checklist?.map((i) => ({
        ...i,
        gap: typeof i.target === 'number' && typeof i.currentStatus === 'number' ? (i.target - i.currentStatus).toFixed(2) : 'N/A',
    })),
});

// Lists the Fin-Health Checkups generated for one lead or customer; each opens in the report popup.
const LinkedFinHealthCheckups = ({ type, entity, doctorName = '' }) => {
    const router = useRouter();
    const [checkups, setCheckups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [report, setReport] = useState(null);
    const [showAll, setShowAll] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        if (!entity?.id) return;
        const load = async () => {
            try {
                const user = getAuth().currentUser;
                if (!user) throw new Error('Authentication required.');
                const token = await user.getIdToken();
                const res = await axios.get(`${API_URL}/api/checkups`, { headers: { Authorization: `Bearer ${token}` } });
                const mine = [];
                (res.data || []).forEach((c) => {
                    const form = parseForm(c.formData);
                    if (!form) return;
                    const linked = Number(form.clientId) === Number(entity.id) && form.clientType === type;
                    // Older checkups were saved without the client link; fall back to the exact name.
                    const legacy = !form.clientId && c.clientName === entity.full_name;
                    if (linked || legacy) mine.push({ ...c, form });
                });
                setCheckups(mine);
            } catch (err) {
                setError('Could not load Fin-Health Checkups.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [type, entity?.id]);

    const createNew = () => {
        const qs = new URLSearchParams({ id: entity.id, type, name: entity.full_name || '', phone: entity.phone_number || '', email: entity.email || '', doctor: doctorName }).toString();
        router.push(`/fincalc?${qs}`);
    };

    const PREVIEW = 3;

    const row = (c) => (
        <Group key={c.id} position="apart" py={6} noWrap>
            <div>
                <Text size="sm">{new Date(c.checkupDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                <Text size="xs" color="dimmed">
                    {c.financialDoctorName || 'Advisor not set'}
                </Text>
            </div>
            <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                    setShowAll(false);
                    setReport(toReport(c.form));
                }}
            >
                View report
            </Button>
        </Group>
    );

    return (
        <Paper withBorder p="md" radius="md">
            <Group position="apart" mb="xs" noWrap>
                <Group spacing="xs" noWrap>
                    <IconHeartbeat size={18} />
                    <Text weight={600}>Fin-Health Checkup</Text>
                </Group>
                <Button size="xs" variant="light" color="blue" leftIcon={<IconPlus size={14} />} onClick={createNew}>
                    New
                </Button>
            </Group>

            {loading ? (
                <Loader size="sm" />
            ) : error ? (
                <Text size="sm" color="red">
                    {error}
                </Text>
            ) : checkups.length === 0 ? (
                <Text size="sm" color="dimmed">
                    No Fin-Health Checkup generated yet.
                </Text>
            ) : (
                <>
                    {checkups.slice(0, PREVIEW).map(row)}
                    {checkups.length > PREVIEW && (
                        <Button fullWidth mt="xs" size="xs" variant="light" color="blue" onClick={() => setShowAll(true)}>
                            View all ({checkups.length})
                        </Button>
                    )}
                </>
            )}

            <Modal opened={showAll} onClose={() => setShowAll(false)} title={`All Fin-Health Checkups (${checkups.length})`} centered overflow="inside">
                {checkups.map(row)}
            </Modal>

            {report && <FinancialHealthReportModal data={report} onClose={() => setReport(null)} />}
        </Paper>
    );
};

export default LinkedFinHealthCheckups;
