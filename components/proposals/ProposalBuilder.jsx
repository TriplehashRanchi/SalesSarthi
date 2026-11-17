'use client';
// Proposal builder. New: /proposals/new?source=fhc|kundli&id=<report id>. Existing: /proposals/<id>.
// Top to bottom: client details, products suggested from the report's gaps (one tap to add), the plans, and a
// summary with Save / PDF / Share and the status (draft → shared → accepted / rejected; changes after sharing = new version).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Badge, Button, Loader, Menu, Modal, NumberInput, Select, Textarea, TextInput, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import {
    IconAlertCircle,
    IconArrowLeft,
    IconCheck,
    IconCircleCheck,
    IconCircleX,
    IconCopy,
    IconDeviceFloppy,
    IconDots,
    IconFileTypePdf,
    IconPlus,
    IconSend,
    IconShare,
    IconSparkles,
    IconTrash,
    IconUser,
} from '@tabler/icons-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import ConvertLeadModal from '@/components/customers/ConvertLeadModal';
import { userMessage } from '@/utils/userMessage';
import { authHeaders } from '@/utils/authHeaders';
import axios from 'axios';
import ProposalItemCard from './ProposalItemCard';
import {
    createProposal,
    deleteProposal,
    fetchProposalPdf,
    getProposal,
    prefillProposal,
    reviseProposal,
    setProposalStatus,
    updateProposal,
} from './proposalsApi';
import { emptyItem, inr, inrShort, itemFromSuggestion, itemToApi, itemToForm, REJECT_REASONS, saveBlob, shortDate, SOURCE_LABEL, STATUS, totals } from './proposalUi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_ITEMS = 10;
const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(blob);
    });

const snapshot = (client, items) => JSON.stringify({ client, items: items.map(itemToApi) });

export default function ProposalBuilder({ proposalId = null, sourceType = null, sourceId = null }) {
    const router = useRouter();
    const isNew = !proposalId;

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [proposal, setProposal] = useState(null); // saved row (null while new)
    const [source, setSource] = useState(null); // { type, id }
    const [client, setClient] = useState({ name: '', age: '', city: '', family: '' });
    const [items, setItems] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [versions, setVersions] = useState([]);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(''); // 'save' | 'pdf' | 'share' | 'status' | ...
    const [rejectOpen, setRejectOpen] = useState(false);
    const [reject, setReject] = useState({ reason: '', note: '' });
    const [convert, setConvert] = useState(null); // { lead, prefill }
    const saved = useRef('');

    const status = proposal?.status || 'draft';
    const readOnly = status !== 'draft';
    const dirty = !readOnly && snapshot(client, items) !== saved.current;
    const sum = useMemo(() => totals(items), [items]);
    const added = useMemo(() => new Set(items.map((i) => i.suggestion_key).filter(Boolean)), [items]);

    const applyProposal = (p) => {
        const c = { name: p.client?.name || '', age: p.client?.age ?? '', city: p.client?.city || '', family: p.client?.family || '' };
        const its = (p.items || []).map(itemToForm);
        setProposal(p);
        setClient(c);
        setItems(its);
        setErrors({});
        saved.current = snapshot(c, its);
    };

    /* ───────── load ───────── */
    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            if (isNew) {
                const pre = await prefillProposal(sourceType, sourceId);
                const c = { name: pre.client?.name || '', age: pre.client?.age ?? '', city: pre.client?.city || '', family: pre.client?.family || '' };
                setSource(pre.source);
                setClient(c);
                setItems([]);
                setSuggestions(pre.suggestions || []);
                setVersions(pre.existing || []);
                saved.current = snapshot(c, []);
            } else {
                const p = await getProposal(proposalId);
                applyProposal(p);
                setSource({ type: p.source_type, id: p.source_id });
                // Suggestions and other versions come from the report; not fatal if it is gone.
                try {
                    const pre = await prefillProposal(p.source_type, p.source_id);
                    setSuggestions(pre.suggestions || []);
                    setVersions(pre.existing || []);
                } catch {
                    setSuggestions([]);
                }
            }
        } catch (err) {
            setLoadError(userMessage(err, 'Could not open this proposal.'));
        } finally {
            setLoading(false);
        }
    }, [isNew, proposalId, sourceType, sourceId]);

    useEffect(() => {
        load();
    }, [load]);

    // Warn before leaving with unsaved changes.
    useEffect(() => {
        if (!dirty) return undefined;
        const warn = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    /* ───────── editing ───────── */
    const updateItem = (key, next) => setItems((list) => list.map((it) => (it._key === key ? next : it)));
    const removeItem = (key) => setItems((list) => list.filter((it) => it._key !== key));
    const moveItem = (index, dir) =>
        setItems((list) => {
            const next = [...list];
            const [it] = next.splice(index, 1);
            next.splice(index + dir, 0, it);
            return next;
        });
    const addItem = (item) => {
        if (items.length >= MAX_ITEMS) {
            showNotification({ title: `Up to ${MAX_ITEMS} plans`, message: 'Remove a plan to add another.', color: 'yellow' });
            return;
        }
        setItems((list) => [...list, item]);
        setTimeout(() => document.getElementById(`item-${item._key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    };

    const showErrors = (err, title) => {
        const errs = err?.response?.data?.errors;
        if (errs) setErrors(errs);
        showNotification({ title, message: userMessage(err), color: 'red', icon: <IconAlertCircle size={18} /> });
    };

    /* ───────── save ───────── */
    // Returns the saved proposal (or null). New → created and the URL changes to /proposals/<id>.
    const save = async ({ quiet = false } = {}) => {
        if (!client.name.trim()) {
            setErrors({ 'client.name': 'Client name is required' });
            showNotification({ title: 'Client name is required', message: 'Add the client’s name at the top.', color: 'red' });
            return null;
        }
        setBusy('save');
        setErrors({});
        const body = { client: { ...client, age: client.age === '' ? null : client.age }, items: items.map(itemToApi) };
        try {
            let p;
            if (isNew) {
                p = await createProposal({ ...body, source_type: sourceType, source_id: Number(sourceId) });
                saved.current = snapshot(client, items);
                router.replace(`/proposals/${p.id}`);
            } else {
                p = await updateProposal(proposal.id, body);
                applyProposal(p);
            }
            if (!quiet) showNotification({ title: 'Saved', message: 'Your proposal is saved as a draft.', color: 'green', icon: <IconCheck size={18} /> });
            return p;
        } catch (err) {
            showErrors(err, 'Could not save');
            return null;
        } finally {
            setBusy('');
        }
    };

    // Saves first when there are unsaved changes; returns the proposal id to use.
    const ensureSaved = async () => {
        if (isNew || dirty) {
            const p = await save({ quiet: true });
            return p?.id || null;
        }
        return proposal.id;
    };

    /* ───────── PDF ───────── */
    const getPdf = async () => {
        const id = await ensureSaved();
        if (!id) return null;
        return fetchProposalPdf(id);
    };

    const downloadPdf = async () => {
        setBusy('pdf');
        try {
            const pdf = await getPdf();
            if (!pdf) return;
            if (Capacitor.isNativePlatform()) {
                await Filesystem.writeFile({ path: pdf.fileName, data: await blobToBase64(pdf.blob), directory: Directory.Documents });
                showNotification({ title: 'PDF saved', message: `${pdf.fileName} is in your Documents.`, color: 'green' });
            } else {
                saveBlob(pdf.blob, pdf.fileName);
            }
        } catch (err) {
            showNotification({ title: 'Could not make the PDF', message: userMessage(err), color: 'red' });
        } finally {
            setBusy('');
        }
    };

    // Phone share sheet (WhatsApp, email, …) with the PDF attached; falls back to download.
    const sharePdf = async () => {
        setBusy('share');
        try {
            const pdf = await getPdf();
            if (!pdf) return;
            const text = `Dear ${client.name}, as discussed, please find your financial plan proposal attached.`;
            if (Capacitor.isNativePlatform()) {
                await Filesystem.writeFile({ path: pdf.fileName, data: await blobToBase64(pdf.blob), directory: Directory.Cache });
                const { uri } = await Filesystem.getUri({ path: pdf.fileName, directory: Directory.Cache });
                await Share.share({ title: 'Financial Proposal', text, files: [uri], dialogTitle: 'Share proposal' });
                return;
            }
            const file = new File([pdf.blob], pdf.fileName, { type: 'application/pdf' });
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ title: 'Financial Proposal', text, files: [file] });
            } else {
                saveBlob(pdf.blob, pdf.fileName);
                showNotification({ title: 'PDF downloaded', message: 'Sharing files is not supported in this browser. Attach the downloaded PDF in WhatsApp.', color: 'blue' });
            }
        } catch (err) {
            if (err?.name !== 'AbortError') showNotification({ title: 'Could not share', message: userMessage(err), color: 'red' });
        } finally {
            setBusy('');
        }
    };

    /* ───────── status ───────── */
    const changeStatus = async (next, extra = {}) => {
        let id = proposal?.id;
        if (next === 'shared') {
            id = await ensureSaved();
            if (!id) return;
        }
        setBusy('status');
        setErrors({});
        try {
            const p = await setProposalStatus(id, next, extra);
            applyProposal(p);
            setRejectOpen(false);
            showNotification({ title: `Marked ${STATUS[next].label.toLowerCase()}`, message: next === 'shared' ? 'To change it now, create a new version.' : '', color: STATUS[next].color });
            if (next === 'accepted' && p.convert?.lead_id) {
                try {
                    const { data: lead } = await axios.get(`${API_URL}/api/leads/${p.convert.lead_id}`, { headers: await authHeaders() });
                    setConvert({ lead, prefill: { product_name: p.convert.product_name, premium: p.convert.premium } });
                } catch {
                    /* lead gone or not visible: nothing to convert */
                }
            }
        } catch (err) {
            showErrors(err, next === 'shared' ? 'Complete the proposal first' : 'Could not change the status');
        } finally {
            setBusy('');
        }
    };

    const revise = async () => {
        setBusy('revise');
        try {
            const p = await reviseProposal(proposal.id);
            showNotification({ title: `Version ${p.version} created`, message: 'Edit it and share again.', color: 'green' });
            router.push(`/proposals/${p.id}`);
        } catch (err) {
            showNotification({ title: 'Could not create a new version', message: userMessage(err), color: 'red' });
        } finally {
            setBusy('');
        }
    };

    const remove = async () => {
        if (!window.confirm('Delete this draft? This cannot be undone.')) return;
        setBusy('delete');
        try {
            await deleteProposal(proposal.id);
            saved.current = snapshot(client, items);
            showNotification({ title: 'Draft deleted', message: '', color: 'gray' });
            router.push('/proposals');
        } catch (err) {
            showNotification({ title: 'Could not delete', message: userMessage(err), color: 'red' });
        } finally {
            setBusy('');
        }
    };

    /* ───────── render ───────── */
    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader />
            </div>
        );
    }
    if (loadError) {
        return (
            <div className="mx-auto max-w-lg py-16 text-center">
                <IconAlertCircle className="mx-auto mb-3 text-red-400" size={40} />
                <p className="mb-4 text-gray-600 dark:text-gray-300">{loadError}</p>
                <Button variant="default" onClick={() => router.back()} leftIcon={<IconArrowLeft size={16} />}>
                    Go back
                </Button>
            </div>
        );
    }

    const st = STATUS[status];
    const hasErrors = Object.keys(errors).length > 0;

    const SummaryCard = (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#1b2e4b] dark:bg-[#0e1726]">
            <div className="bg-gradient-to-br from-[#0b1f4b] via-[#1d4ed8] to-[#4361ee] p-5 text-white">
                <p className="text-xs uppercase tracking-widest text-white/70">Yearly investment</p>
                <p className="mt-1 text-3xl font-bold">{inr(sum.yearly)}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-white/60">Plans</p>
                        <p className="font-semibold">{items.length}</p>
                    </div>
                    <div>
                        <p className="text-white/60">One-time</p>
                        <p className="font-semibold">{inrShort(sum.oneTime)}</p>
                    </div>
                    <div>
                        <p className="text-white/60">Total payable</p>
                        <p className="font-semibold">{inrShort(sum.payable + sum.oneTime)}</p>
                    </div>
                    <div>
                        <p className="text-white/60">Approx. maturity</p>
                        <p className="font-semibold text-emerald-300">{inrShort(sum.maturity)}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 p-4">
                {!readOnly && (
                    <Button fullWidth leftIcon={<IconDeviceFloppy size={18} />} onClick={() => save()} loading={busy === 'save'} disabled={!!busy && busy !== 'save'} variant={dirty || isNew ? 'filled' : 'light'}>
                        {isNew ? 'Save draft' : dirty ? 'Save changes' : 'Saved'}
                    </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="light" leftIcon={<IconFileTypePdf size={18} />} onClick={downloadPdf} loading={busy === 'pdf'} disabled={!!busy && busy !== 'pdf'}>
                        PDF
                    </Button>
                    <Button variant="light" color="teal" leftIcon={<IconShare size={18} />} onClick={sharePdf} loading={busy === 'share'} disabled={!!busy && busy !== 'share'}>
                        Share
                    </Button>
                </div>

                {status === 'draft' && (
                    <Tooltip label="Checks the proposal is complete, then locks it. Changes after this make a new version." withArrow multiline width={240}>
                        <Button fullWidth color="indigo" variant="outline" leftIcon={<IconSend size={18} />} onClick={() => changeStatus('shared')} loading={busy === 'status'} disabled={!!busy && busy !== 'status'}>
                            Mark as shared with client
                        </Button>
                    </Tooltip>
                )}
                {status === 'shared' && (
                    <div className="grid grid-cols-2 gap-2">
                        <Button color="green" leftIcon={<IconCircleCheck size={18} />} onClick={() => changeStatus('accepted')} loading={busy === 'status'} disabled={!!busy}>
                            Accepted
                        </Button>
                        <Button color="red" variant="outline" leftIcon={<IconCircleX size={18} />} onClick={() => setRejectOpen(true)} disabled={!!busy}>
                            Rejected
                        </Button>
                    </div>
                )}
                {readOnly && (
                    <Button fullWidth variant="default" leftIcon={<IconCopy size={18} />} onClick={revise} loading={busy === 'revise'} disabled={!!busy && busy !== 'revise'}>
                        Create new version to edit
                    </Button>
                )}
                {status === 'accepted' && proposal?.client_type === 'lead' && (
                    <p className="text-center text-xs text-gray-500">Accepted. You can convert the lead to a customer from Leads.</p>
                )}
                {status === 'rejected' && proposal?.reject_reason && <p className="text-center text-xs text-red-500">Reason: {proposal.reject_reason}</p>}
            </div>

            {versions.length > 0 && (
                <div className="border-t border-gray-100 p-4 dark:border-[#1b2e4b]">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Proposals from this report</p>
                    <ul className="space-y-1">
                        {versions.map((v) => (
                            <li key={v.id}>
                                <Link
                                    href={`/proposals/${v.id}`}
                                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-[#1b2e4b]/50 ${v.id === proposal?.id ? 'bg-primary/10 font-semibold text-primary' : ''}`}
                                >
                                    <span>
                                        v{v.version} · {shortDate(v.created_at)}
                                    </span>
                                    <Badge size="xs" color={STATUS[v.status]?.color} variant="light">
                                        {STATUS[v.status]?.label}
                                    </Badge>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    return (
        <div className="pb-28 lg:pb-8">
            {/* header */}
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <Link href="/proposals" className="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
                        <IconArrowLeft size={15} /> All proposals
                    </Link>
                    <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{client.name ? `Proposal for ${client.name}` : 'New proposal'}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <Badge color={st.color} variant="light">
                            {isNew ? 'New' : st.label}
                        </Badge>
                        {proposal && <span>Version {proposal.version}</span>}
                        {source && (
                            <span>
                                · From {SOURCE_LABEL[source.type]} #{source.id}
                            </span>
                        )}
                        {dirty && !isNew && <span className="text-amber-600">· Unsaved changes</span>}
                    </div>
                </div>
                {proposal && status === 'draft' && (
                    <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                            <Button variant="subtle" color="gray" px="xs" aria-label="More">
                                <IconDots size={18} />
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item color="red" icon={<IconTrash size={16} />} onClick={remove}>
                                Delete draft
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                )}
            </div>

            {readOnly && (
                <Alert icon={<IconAlertCircle size={18} />} color={st.color} mb="md" radius="lg">
                    This proposal is <b>{st.label.toLowerCase()}</b>, so it can no longer be edited. Use <b>Create new version</b> to make changes.
                </Alert>
            )}
            {hasErrors && (
                <Alert icon={<IconAlertCircle size={18} />} color="red" mb="md" radius="lg" withCloseButton onClose={() => setErrors({})}>
                    Please check the highlighted fields.{errors.items ? ` ${errors.items}` : ''}
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    {/* client */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#1b2e4b] dark:bg-[#0e1726] sm:p-5">
                        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
                            <IconUser size={18} className="text-primary" /> Client
                        </h2>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <TextInput
                                label="Name"
                                required
                                value={client.name}
                                onChange={(e) => setClient({ ...client, name: e.currentTarget.value })}
                                error={errors['client.name']}
                                readOnly={readOnly}
                                maxLength={120}
                                className="lg:col-span-2"
                            />
                            <NumberInput label="Age" hideControls min={0} max={120} value={client.age === '' ? '' : Number(client.age)} onChange={(v) => setClient({ ...client, age: v ?? '' })} readOnly={readOnly} />
                            <TextInput label="City" value={client.city} onChange={(e) => setClient({ ...client, city: e.currentTarget.value })} readOnly={readOnly} maxLength={80} />
                            <TextInput
                                label="Family"
                                placeholder="e.g. Spouse, 2 children"
                                value={client.family}
                                onChange={(e) => setClient({ ...client, family: e.currentTarget.value })}
                                readOnly={readOnly}
                                maxLength={300}
                                className="sm:col-span-2 lg:col-span-4"
                            />
                        </div>
                    </section>

                    {/* suggestions */}
                    {!readOnly && (
                        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-[#0e1726] sm:p-5">
                            <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
                                <IconSparkles size={18} className="text-emerald-500" /> Suggested from the {source ? SOURCE_LABEL[source.type] : 'report'}
                            </h2>
                            <p className="mb-3 text-sm text-gray-500">Gaps found in the result. Tap Add to start a plan for it, then fill in the company and amounts.</p>
                            {suggestions.length === 0 ? (
                                <p className="rounded-xl bg-white/70 p-3 text-sm text-gray-500 dark:bg-transparent">No gaps found in this report. Add plans yourself below.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {suggestions.map((s) => {
                                        const isAdded = added.has(s.key);
                                        return (
                                            <div key={s.key} className="flex items-start justify-between gap-3 rounded-xl border border-white bg-white p-3 shadow-sm dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-800 dark:text-white">{s.product}</p>
                                                    <p className="line-clamp-2 text-xs text-gray-500">{s.reason}</p>
                                                    <p className="mt-1 text-xs">
                                                        <span className="text-gray-400">{s.amount_label}: </span>
                                                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{inrShort(s.amount)}</span>
                                                    </p>
                                                </div>
                                                <Button
                                                    size="xs"
                                                    radius="xl"
                                                    variant={isAdded ? 'light' : 'filled'}
                                                    color={isAdded ? 'gray' : 'teal'}
                                                    leftIcon={isAdded ? <IconCheck size={14} /> : <IconPlus size={14} />}
                                                    disabled={isAdded}
                                                    onClick={() => addItem(itemFromSuggestion(s))}
                                                >
                                                    {isAdded ? 'Added' : 'Add'}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* plans */}
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 dark:text-white">
                                Plans <span className="text-sm font-normal text-gray-400">({items.length}/{MAX_ITEMS})</span>
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {items.map((it, i) => (
                                <div id={`item-${it._key}`} key={it._key}>
                                    <ProposalItemCard
                                        index={i}
                                        item={it}
                                        errors={errors}
                                        readOnly={readOnly}
                                        isFirst={i === 0}
                                        isLast={i === items.length - 1}
                                        onChange={(next) => updateItem(it._key, next)}
                                        onRemove={() => removeItem(it._key)}
                                        onMove={(dir) => moveItem(i, dir)}
                                    />
                                </div>
                            ))}
                            {items.length === 0 && readOnly && <p className="text-sm text-gray-500">No plans in this proposal.</p>}
                            {!readOnly && items.length < MAX_ITEMS && (
                                <button
                                    type="button"
                                    onClick={() => addItem(emptyItem())}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-5 text-sm font-semibold text-gray-500 transition hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-[#1b2e4b]"
                                >
                                    <IconPlus size={18} /> {items.length ? 'Add another plan' : 'Add a plan'}
                                </button>
                            )}
                        </div>
                    </section>
                </div>

                <aside className="hidden lg:block">
                    <div className="sticky top-24">{SummaryCard}</div>
                </aside>
                <div className="lg:hidden">{SummaryCard}</div>
            </div>

            {/* phone: total + save always in reach */}
            {!readOnly && (
                <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-[#1b2e4b] dark:bg-[#0e1726]/95 lg:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">Per year</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{inr(sum.yearly)}</p>
                    </div>
                    <Button leftIcon={<IconDeviceFloppy size={18} />} onClick={() => save()} loading={busy === 'save'} disabled={!!busy && busy !== 'save'}>
                        {isNew ? 'Save draft' : 'Save'}
                    </Button>
                </div>
            )}

            {/* rejected: reason */}
            <Modal opened={rejectOpen} onClose={() => setRejectOpen(false)} title="Why did the client reject it?" centered>
                <Select label="Reason" required data={REJECT_REASONS} value={reject.reason} onChange={(v) => setReject({ ...reject, reason: v })} withinPortal />
                <Textarea label="Note (optional)" mt="sm" maxLength={200} value={reject.note} onChange={(e) => setReject({ ...reject, note: e.currentTarget.value })} />
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="default" onClick={() => setRejectOpen(false)}>
                        Cancel
                    </Button>
                    <Button color="red" disabled={!reject.reason} loading={busy === 'status'} onClick={() => changeStatus('rejected', reject)}>
                        Mark rejected
                    </Button>
                </div>
            </Modal>

            {convert && <ConvertLeadModal lead={convert.lead} prefill={convert.prefill} onClose={() => setConvert(null)} onConverted={() => setConvert(null)} />}
        </div>
    );
}
