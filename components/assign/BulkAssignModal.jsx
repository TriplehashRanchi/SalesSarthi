'use client';
// "Assign" for the selected leads: one person, equal split or percentage split.
import { useEffect, useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import AssignPicker, { EMPTY_ASSIGN, assignError, toPayload } from './AssignPicker';

// onSubmit(plan) must return a promise; the modal closes when it resolves.
const BulkAssignModal = ({ opened, onClose, teamMembers, count, onSubmit }) => {
    const isPhone = useMediaQuery('(max-width: 639px)');
    const [value, setValue] = useState(EMPTY_ASSIGN);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (opened) setValue(EMPTY_ASSIGN);
    }, [opened]);

    const submit = async () => {
        setBusy(true);
        try {
            await onSubmit(toPayload(value));
            onClose();
        } catch {
            /* the caller already showed the error */
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal opened={opened} onClose={() => !busy && onClose()} title={<Text weight={700} size="lg">Assign {count} lead{count === 1 ? '' : 's'}</Text>} centered={!isPhone} fullScreen={isPhone} radius="lg" size="md">
            <AssignPicker value={value} onChange={setValue} teamMembers={teamMembers} total={count} />
            <Group position="right" mt="lg">
                <Button variant="default" onClick={onClose} disabled={busy}>Cancel</Button>
                <Button color="blue" onClick={submit} loading={busy} disabled={!!assignError(value)}>Assign</Button>
            </Group>
        </Modal>
    );
};

export default BulkAssignModal;
