'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function FinancialKundliHistoryPage() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
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
        setFiltered(json.data);
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

  // 🔍 Search by Client Name
  useEffect(() => {
    if (!search) {
      setFiltered(data);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        data.filter(item =>
          item.client_name?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, data]);

  if (loading) return ;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Financial Kundli History
        </h1>

        <input
          type="text"
          placeholder="Search by Client Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-md px-3 py-2 w-72"
        />
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 text-sm">
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-500">
                  No financial kundli records found
                </td>
              </tr>
            )}

            {filtered.map(item => (
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
                  {item.overall_health_score}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
                    {item.primary_risk_key}
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
    </div>
  );
}
