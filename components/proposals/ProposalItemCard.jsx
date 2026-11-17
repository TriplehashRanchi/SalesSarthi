'use client';
// One plan in a proposal: company, product, payment term + frequency, plan term, investment, extra features,
// start date, end date (worked out from start + plan term until the user types their own) and approx maturity.
import { ActionIcon, Badge, NumberInput, Select, Textarea, TextInput, Tooltip } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconSparkles, IconTrash, IconWand } from '@tabler/icons-react';
import { addYears, FREQUENCIES, inr, itemMoney } from './proposalUi';

const moneyProps = {
    hideControls: true,
    min: 0,
    icon: <span className="text-sm font-semibold text-gray-500">₹</span>,
    parser: (v) => v.replace(/[^\d.]/g, ''),
    formatter: (v) => (v && !Number.isNaN(Number(v)) ? Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : v),
};
const yearsProps = { hideControls: true, min: 1, max: 100, rightSection: <span className="pr-2 text-xs text-gray-400">yrs</span>, rightSectionWidth: 36 };

const toNum = (v) => (v === undefined || v === null || Number.isNaN(v) ? '' : v);

export default function ProposalItemCard({ index, item, errors = {}, readOnly, onChange, onRemove, onMove, isFirst, isLast }) {
    const err = (k) => errors[`items.${index}.${k}`];
    const single = item.payment_frequency === 'Single';
    const money = itemMoney(item);

    // Keeps the end date in step with start + plan term until the user picks their own end date.
    const set = (patch) => {
        const next = { ...item, ...patch };
        if ('plan_end_date' in patch) next.endAuto = !patch.plan_end_date;
        else if (next.endAuto !== false && ('plan_start_date' in patch || 'plan_term_years' in patch)) {
            next.plan_end_date = addYears(next.plan_start_date, next.plan_term_years);
            next.endAuto = true;
        }
        onChange(next);
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-[#1b2e4b] dark:bg-[#0e1726] sm:p-5">
            {/* head */}
            <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{index + 1}</div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextInput
                        label="Product name"
                        placeholder="e.g. Term Insurance"
                        required
                        value={item.product_name}
                        onChange={(e) => set({ product_name: e.currentTarget.value })}
                        error={err('product_name')}
                        readOnly={readOnly}
                        maxLength={120}
                    />
                    <TextInput
                        label="Company name"
                        placeholder="e.g. HDFC Life"
                        required
                        value={item.company_name}
                        onChange={(e) => set({ company_name: e.currentTarget.value })}
                        error={err('company_name')}
                        readOnly={readOnly}
                        maxLength={120}
                    />
                </div>
                {!readOnly && (
                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        <Tooltip label="Move up" withArrow>
                            <ActionIcon variant="subtle" disabled={isFirst} onClick={() => onMove(-1)} aria-label="Move up">
                                <IconArrowUp size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Move down" withArrow>
                            <ActionIcon variant="subtle" disabled={isLast} onClick={() => onMove(1)} aria-label="Move down">
                                <IconArrowDown size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Remove" withArrow>
                            <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label="Remove item">
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </div>
                )}
            </div>

            {(item.reason || !readOnly) && (
                <div className="mt-3 sm:pl-11">
                    <TextInput
                        icon={<IconSparkles size={15} className="text-emerald-500" />}
                        placeholder="Why this plan? (shown on the proposal)"
                        value={item.reason}
                        onChange={(e) => set({ reason: e.currentTarget.value })}
                        readOnly={readOnly}
                        maxLength={200}
                        size="xs"
                        styles={{ input: { background: 'rgba(16,185,129,.07)', borderColor: 'rgba(16,185,129,.25)' } }}
                    />
                </div>
            )}

            {/* fields */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:pl-11 lg:grid-cols-4">
                <NumberInput
                    {...moneyProps}
                    label="Investment amount"
                    description="Without tax"
                    required
                    value={toNum(item.investment_amount)}
                    onChange={(v) => set({ investment_amount: toNum(v) })}
                    error={err('investment_amount')}
                    readOnly={readOnly}
                    precision={0}
                />
                <Select
                    label="Paid"
                    description="How often"
                    data={FREQUENCIES.map((f) => ({ value: f, label: f === 'Single' ? 'Single (one-time)' : f }))}
                    value={item.payment_frequency}
                    onChange={(v) => set({ payment_frequency: v, ...(v === 'Single' ? { payment_term_years: '' } : {}) })}
                    error={err('payment_frequency')}
                    readOnly={readOnly}
                    withinPortal
                />
                <NumberInput
                    {...yearsProps}
                    label="Payment term"
                    description={single ? 'Not needed for single' : 'Years of paying'}
                    value={toNum(item.payment_term_years)}
                    onChange={(v) => set({ payment_term_years: toNum(v) })}
                    error={err('payment_term_years')}
                    readOnly={readOnly}
                    disabled={single}
                />
                <NumberInput
                    {...yearsProps}
                    label="Plan term"
                    description="Years of cover / plan"
                    value={toNum(item.plan_term_years)}
                    onChange={(v) => set({ plan_term_years: toNum(v) })}
                    error={err('plan_term_years')}
                    readOnly={readOnly}
                />
                <TextInput
                    type="date"
                    label="Plan start date"
                    value={item.plan_start_date || ''}
                    onChange={(e) => set({ plan_start_date: e.currentTarget.value })}
                    error={err('plan_start_date')}
                    readOnly={readOnly}
                />
                <TextInput
                    type="date"
                    label={
                        <span className="inline-flex items-center gap-1">
                            Plan end date
                            {item.endAuto !== false && item.plan_end_date && (
                                <Badge size="xs" variant="light" color="teal" leftSection={<IconWand size={10} />}>
                                    auto
                                </Badge>
                            )}
                        </span>
                    }
                    value={item.plan_end_date || ''}
                    onChange={(e) => set({ plan_end_date: e.currentTarget.value })}
                    error={err('plan_end_date')}
                    readOnly={readOnly}
                />
                <NumberInput
                    {...moneyProps}
                    label="Approx. maturity amount"
                    description="Assumed, not guaranteed"
                    value={toNum(item.maturity_amount)}
                    onChange={(v) => set({ maturity_amount: toNum(v) })}
                    error={err('maturity_amount')}
                    readOnly={readOnly}
                    precision={0}
                    className="col-span-2 lg:col-span-1"
                />
                <div className="col-span-2 flex flex-col justify-end rounded-xl bg-gray-50 px-3 py-2 dark:bg-[#1b2e4b]/40 lg:col-span-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-500">{single ? 'One-time' : 'Per year'}</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{inr(single ? money.oneTime : money.yearly)}</span>
                    {!single && money.payable > 0 && <span className="text-xs text-gray-500">Total payable {inr(money.payable)}</span>}
                </div>
            </div>

            <div className="mt-3 sm:pl-11">
                <Textarea
                    label="Additional features"
                    placeholder="Riders, top-ups, loan facility…"
                    autosize
                    minRows={1}
                    maxRows={3}
                    value={item.additional_features}
                    onChange={(e) => set({ additional_features: e.currentTarget.value })}
                    readOnly={readOnly}
                    maxLength={300}
                />
            </div>
        </div>
    );
}
