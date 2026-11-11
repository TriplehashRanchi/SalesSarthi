'use client';
// Who gets the leads: one person, equal split, or percentage split.
// Controlled: value = { mode: 'single' | 'equal' | 'percent', ids: ['12', ...], percents: { '12': 40 } }
import { Button, Group, MultiSelect, NumberInput, Text } from '@mantine/core';
import PillToggle from './PillToggle';

export const EMPTY_ASSIGN = { mode: 'single', ids: [], percents: {} };

const round2 = (n) => Math.round(n * 100) / 100;
const sumPercent = (v) => round2(v.ids.reduce((s, id) => s + (Number(v.percents[id]) || 0), 0));

// Same maths as the server (largest remainder) so the preview matches what will happen.
export const previewCounts = (v, total) => {
    const out = {};
    if (!v.ids.length || !total) return out;
    if (v.mode === 'single') out[v.ids[0]] = total;
    else if (v.mode === 'equal') v.ids.forEach((id, i) => (out[id] = Math.floor(total / v.ids.length) + (i < total % v.ids.length ? 1 : 0)));
    else {
        const q = v.ids.map((id) => {
            const exact = (total * (Number(v.percents[id]) || 0)) / 100;
            return { id, n: Math.floor(exact), rem: exact - Math.floor(exact) };
        });
        let left = total - q.reduce((s, x) => s + x.n, 0);
        [...q].sort((a, b) => b.rem - a.rem).forEach((x) => { if (left > 0) { x.n += 1; left -= 1; } });
        q.forEach((x) => (out[x.id] = x.n));
    }
    return out;
};

export const assignError = (v) => {
    if (v.mode === 'single') return v.ids.length === 1 ? null : 'Select a team member';
    if (v.ids.length < 2) return 'Select at least two team members';
    if (v.mode === 'percent') {
        if (v.ids.some((id) => !(Number(v.percents[id]) > 0))) return 'Enter a percentage for every member';
        if (Math.abs(sumPercent(v) - 100) > 0.001) return `Percentages must add up to 100 (now ${sumPercent(v)})`;
    }
    return null;
};

// Body for the API.
export const toPayload = (v) => ({
    mode: v.mode,
    members: v.ids.map((id) => ({ user_id: Number(id), percent: v.mode === 'percent' ? Number(v.percents[id]) : undefined })),
});

const AssignPicker = ({ value, onChange, teamMembers, total }) => {
    const set = (patch) => onChange({ ...value, ...patch });
    const name = (id) => teamMembers.find((u) => String(u.id) === String(id))?.username || id;
    const counts = previewCounts(value, total);
    const splitEvenly = () => {
        const n = value.ids.length;
        const base = Math.floor((10000 / n)) / 100;
        const percents = {};
        value.ids.forEach((id, i) => (percents[id] = i === n - 1 ? round2(100 - base * (n - 1)) : base));
        set({ percents });
    };
    const err = assignError(value);
    const touched = value.ids.length > 0;

    return (
        <div>
            <PillToggle
                value={value.mode}
                onChange={(mode) => onChange({ ...EMPTY_ASSIGN, mode })}
                data={[
                    { value: 'single', label: 'One person' },
                    { value: 'equal', label: 'Equal split' },
                    { value: 'percent', label: 'Percentage' },
                ]}
            />
            <MultiSelect
                mt="sm"
                data={teamMembers.map((u) => ({ value: String(u.id), label: `${u.username} (${u.role})` }))}
                value={value.ids}
                onChange={(ids) => set({ ids: value.mode === 'single' ? ids.slice(-1) : ids })}
                placeholder={value.mode === 'single' ? 'Select a team member' : 'Select team members'}
                searchable
                clearable
                withinPortal
                maxDropdownHeight={220}
            />

            {value.mode === 'percent' && value.ids.length > 0 && (
                <div className="mt-3">
                    <Group position="apart" mb={4}>
                        <Text size="xs" weight={600} color={Math.abs(sumPercent(value) - 100) < 0.001 ? 'green' : 'red'}>Total: {sumPercent(value)}% / 100%</Text>
                        <Button size="xs" compact variant="light" onClick={splitEvenly}>Split evenly</Button>
                    </Group>
                    <div className="space-y-2">
                        {value.ids.map((id) => (
                            <Group key={id} position="apart" noWrap>
                                <Text size="sm" className="min-w-0 flex-1 truncate">{name(id)}</Text>
                                <NumberInput
                                    size="xs"
                                    w={110}
                                    min={0}
                                    max={100}
                                    precision={2}
                                    hideControls
                                    rightSection={<Text size="xs" color="dimmed">%</Text>}
                                    value={value.percents[id] ?? ''}
                                    onChange={(n) => set({ percents: { ...value.percents, [id]: n === '' ? '' : n } })}
                                />
                            </Group>
                        ))}
                    </div>
                </div>
            )}

            {touched && !err && total > 0 && (
                <div className="mt-3 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800">
                    <Text size="xs" weight={600} mb={4}>{total} lead{total === 1 ? '' : 's'} will be split like this:</Text>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {value.ids.map((id) => <Text key={id} size="xs"><b>{name(id)}</b>: {counts[id] || 0}</Text>)}
                    </div>
                </div>
            )}
            {touched && err && <Text size="xs" color="red" mt={6}>{err}</Text>}
        </div>
    );
};

export default AssignPicker;
