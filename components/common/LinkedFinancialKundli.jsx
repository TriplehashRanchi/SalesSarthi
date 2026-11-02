'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { Badge, Button, Group, Loader, Modal, Paper, Text } from '@mantine/core';
import { IconFileAnalytics, IconPlus } from '@tabler/icons-react';

const scoreColor = (score) => (score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red');

// Lists the Financial Kundli reports linked to one lead or customer, with a shortcut to create a new one.
const LinkedFinancialKundli = ({ type, entity }) => {
    const router = useRouter();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAll, setShowAll] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        if (!entity?.id) return;
        const load = async () => {
            try {
                const user = getAuth().currentUser;
                if (!user) throw new Error('Authentication required.');
                const token = await user.getIdToken();
                const res = await axios.get(`${API_URL}/api/financial-kundli/linked/${type}/${entity.id}`, { headers: { Authorization: `Bearer ${token}` } });
                setReports(res.data.data || []);
            } catch (err) {
                setError('Could not load Financial Kundli reports.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [type, entity?.id]);

    const createNew = () => {
        const qs = new URLSearchParams({
            linkedType: type,
            linkedId: entity.id,
            name: entity.full_name || '',
            phone: entity.phone_number || '',
            email: entity.email || '',
        }).toString();
        router.push(`/financial-kundli?${qs}`);
    };

    const PREVIEW = 3;

    const row = (r) => (
        <Group key={r.id} position="apart" py={6} noWrap>
            <div>
                <Text size="sm">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                <Badge size="sm" color={scoreColor(r.overall_health_score)} variant="light">
                    Score {Math.round(r.overall_health_score)}
                </Badge>
            </div>
            <Button size="xs" variant="subtle" onClick={() => router.push(`/financial-kundli/report/${r.id}`)}>
                View report
            </Button>
        </Group>
    );

    return (
        <Paper withBorder p="md" radius="md">
            <Group position="apart" mb="xs" noWrap>
                <Group spacing="xs" noWrap>
                    <IconFileAnalytics size={18} />
                    <Text weight={600}>Financial Kundli</Text>
                </Group>
                <Button size="xs" variant="light" leftIcon={<IconPlus size={14} />} onClick={createNew}>
                    Create
                </Button>
            </Group>

            {loading ? (
                <Loader size="sm" />
            ) : error ? (
                <Text size="sm" color="red">
                    {error}
                </Text>
            ) : reports.length === 0 ? (
                <Text size="sm" color="dimmed">
                    No Financial Kundli report yet.
                </Text>
            ) : (
                <>
                    {reports.slice(0, PREVIEW).map(row)}
                    {reports.length > PREVIEW && (
                        <Button fullWidth mt="xs" size="xs" variant="light" onClick={() => setShowAll(true)}>
                            View all ({reports.length})
                        </Button>
                    )}
                </>
            )}

            <Modal opened={showAll} onClose={() => setShowAll(false)} title={`All Financial Kundli reports (${reports.length})`} centered overflow="inside">
                {reports.map(row)}
            </Modal>
        </Paper>
    );
};

export default LinkedFinancialKundli;
