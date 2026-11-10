'use client';
// Server-side lead list (GET /api/lead-list): only the rows on screen are loaded.
//   mode 'page'   -> desktop table: one page at a time
//   mode 'append' -> phone list: loadMore() adds the next page (infinite scroll)
// Search text is debounced so typing does not fire a request per key.
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const authHeaders = async () => {
    const user = getAuth().currentUser;
    if (!user) throw new Error('User not authenticated.');
    return { Authorization: `Bearer ${await user.getIdToken()}` };
};

const toParams = (p) => {
    const out = { folder: p.folder ?? 'all' };
    if (p.q) out.q = p.q;
    if (p.status) out.status = p.status;
    if (p.assigned) out.assigned = p.assigned;
    if (p.userId) out.user_id = p.userId;
    if (p.sort) out.sort = p.sort;
    if (p.dir) out.dir = p.dir;
    return out;
};

export const fetchLeadPage = async (p, page, pageSize) =>
    (await axios.get(`${API_URL}/api/lead-list`, { headers: await authHeaders(), params: { ...toParams(p), page, page_size: pageSize } })).data;

export const fetchLeadKpis = async ({ folder, userId, since }) =>
    (await axios.get(`${API_URL}/api/lead-list/kpis`, { headers: await authHeaders(), params: { folder: folder ?? 'all', ...(userId ? { user_id: userId } : {}), ...(since ? { since } : {}) } })).data;

export const fetchLeadExport = async (p) => (await axios.get(`${API_URL}/api/lead-list/export`, { headers: await authHeaders(), params: toParams(p) })).data.rows;

export const useDebounced = (value, ms = 300) => {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
};

// filters: { folder, q, status, assigned, userId, sort, dir }. enabled=false -> does nothing (other screen size).
export const useLeadList = ({ filters, page = 1, pageSize = 20, mode = 'page', enabled = true }) => {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [allCount, setAllCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [appendPage, setAppendPage] = useState(1);
    const [tick, setTick] = useState(0); // reload()
    const reqId = useRef(0);

    const key = JSON.stringify(filters);
    // New filters -> start the phone list again from page 1.
    useEffect(() => {
        setAppendPage(1);
    }, [key, tick]);

    const effectivePage = mode === 'append' ? appendPage : page;

    useEffect(() => {
        if (!enabled) return;
        const id = ++reqId.current;
        setLoading(true);
        fetchLeadPage(filters, effectivePage, pageSize)
            .then((data) => {
                if (id !== reqId.current) return; // a newer request is running
                setRows((prev) => (mode === 'append' && effectivePage > 1 ? [...prev, ...data.rows.filter((r) => !prev.some((p) => p.id === r.id))] : data.rows));
                setTotal(data.total);
                setAllCount(data.all_count);
                setError(null);
            })
            .catch((err) => id === reqId.current && setError(err?.response?.data?.message || err.message || 'Failed to load leads.'))
            .finally(() => id === reqId.current && setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, effectivePage, pageSize, mode, enabled, tick]);

    const reload = useCallback(() => setTick((t) => t + 1), []);
    const hasMore = mode === 'append' && rows.length < total;
    const loadMore = useCallback(() => {
        if (!loading) setAppendPage((p) => p + 1);
    }, [loading]);
    // Change rows on screen right away (e.g. new status) without a reload.
    const patchRow = useCallback((id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))), []);

    return { rows, total, allCount, loading, error, reload, hasMore, loadMore, patchRow };
};
