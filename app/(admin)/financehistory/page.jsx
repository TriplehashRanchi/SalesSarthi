'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function FinancialKundliHistoryPage() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const fetchHistory = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/financial-kundli/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching financial kundli history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const cityOptions = useMemo(() => {
    const set = new Set();
    data.forEach((item) => {
      if (item.city) set.add(item.city);
    });
    return Array.from(set).sort();
  }, [data]);

  const riskOptions = useMemo(() => {
    const set = new Set();
    data.forEach((item) => {
      if (item.primary_risk_key) set.add(item.primary_risk_key);
    });
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minScore !== '' ? Number(minScore) : null;
    const max = maxScore !== '' ? Number(maxScore) : null;

    let result = data.filter((item) => {
      const name = item.client_name || '';
      const phone = item.phone_number || '';
      const city = item.city || '';
      const risk = item.primary_risk_key || '';
      const score = Number(item.overall_health_score || 0);
      const created = item.created_at ? new Date(item.created_at) : null;

      if (q) {
        const blob = `${name} ${phone} ${city}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }

      if (cityFilter !== 'all' && city !== cityFilter) return false;
      if (riskFilter !== 'all' && risk !== riskFilter) return false;
      if (min !== null && score < min) return false;
      if (max !== null && score > max) return false;

      if (startDate && created) {
        const start = new Date(startDate);
        if (created < start) return false;
      }

      if (endDate && created) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }

      return true;
    });

    switch (sortBy) {
      case 'created_asc':
        result = result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'score_desc':
        result = result.sort((a, b) => (Number(b.overall_health_score) || 0) - (Number(a.overall_health_score) || 0));
        break;
      case 'score_asc':
        result = result.sort((a, b) => (Number(a.overall_health_score) || 0) - (Number(b.overall_health_score) || 0));
        break;
      case 'name_asc':
        result = result.sort((a, b) => String(a.client_name || '').localeCompare(String(b.client_name || '')));
        break;
      case 'created_desc':
      default:
        result = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    return result;
  }, [data, search, cityFilter, riskFilter, minScore, maxScore, startDate, endDate, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, cityFilter, riskFilter, minScore, maxScore, startDate, endDate, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paged = filtered.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading financial history...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Kundli History</h1>
          <p className="text-sm text-gray-500">Track, filter, and review financial kundli reports.</p>
        </div>
        <div className="text-sm text-gray-500">
          Total records: <span className="font-semibold text-gray-900">{filtered.length}</span>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Search</label>
            <input
              type="text"
              placeholder="Client, phone, or city"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All cities</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Primary Risk</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All risks</option>
              {riskOptions.map((risk) => (
                <option key={risk} value={risk}>{risk}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
              <option value="score_desc">Score high to low</option>
              <option value="score_asc">Score low to high</option>
              <option value="name_asc">Client name A-Z</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Score range</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Min"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Max"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCityFilter('all');
                setRiskFilter('all');
                setMinScore('');
                setMaxScore('');
                setStartDate('');
                setEndDate('');
                setSortBy('created_desc');
              }}
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full bg-white">
          <thead className="sticky top-0 bg-gray-50 text-sm text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">City</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Primary Risk</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {paged.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-500">
                  No financial kundli records found
                </td>
              </tr>
            )}

            {paged.map(item => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {item.client_name || '—'}
                </td>
                <td className="px-4 py-3">
                  {item.phone_number || '—'}
                </td>
                <td className="px-4 py-3">
                  {item.city || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {item.overall_health_score ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                    {item.primary_risk_key || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      router.push(`/financial-kundli/report/${item.id}`)
                    }
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Showing {filtered.length === 0 ? 0 : startIndex + 1}
          {' '}to {Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-md border px-2 py-1 text-sm"
          >
            {[10, 20, 30, 50].map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
