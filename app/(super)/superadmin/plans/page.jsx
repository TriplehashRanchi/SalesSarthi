'use client';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/* ──────────────────  Modal Form  ────────────────── */
function PlanModal({ initial = {}, onClose, refresh }) {
  const [form, set] = useState({
    name:          initial.name          || '',
    billing_cycle: initial.billing_cycle || 'MONTHLY',
    price:         initial.price_paise   ? String(initial.price_paise / 100) : '',
    trial_days:    initial.trial_days    ? String(initial.trial_days)        : '',
  });

  /* ---------- SAVE ---------- */
  const save = async () => {
    /* 1. Build body without “price” (only price_paise) */
    const { price, ...rest } = form;                  // strip UI field
    const body = {
      ...rest,                                        // name, billing_cycle, trial_days
      price_paise: Number(price || 0) * 100,          // convert rupees → paise
      trial_days : Number(rest.trial_days || 0),
    };

    /* 2. Fire request */
    const method = initial.id ? 'PUT' : 'POST';
    const url    = `${API}/api/plans/superadmin${initial.id ? '/' + initial.id : ''}`;
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    /* 3. Refresh list & close modal */
    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 grid place-content-center">
      <div className="bg-white p-6 w-[400px] rounded shadow">
        <h3 className="text-lg font-semibold mb-4">
          {initial.id ? 'Edit Plan' : 'New Plan'}
        </h3>

        <label className="block mb-2 text-sm">Name
          <input
            className="form-input mt-1 w-full"
            value={form.name}
            onChange={(e) => set({ ...form, name: e.target.value })}
          />
        </label>

        <label className="block mb-2 text-sm">Billing cycle
          <select
            className="form-select mt-1 w-full"
            value={form.billing_cycle}
            onChange={(e) => set({ ...form, billing_cycle: e.target.value })}
          >
            {['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block mb-2 text-sm">Price (₹)
          <input
            type="number"
            className="form-input mt-1 w-full"
            value={form.price}
            onChange={(e) => set({ ...form, price: e.target.value })}
          />
        </label>

        {/* ← keep trial-days editable if you wish */}
        <label className="block mb-4 text-sm">Trial days
          <input
            type="number"
            className="form-input mt-1 w-full"
            value={form.trial_days}
            onChange={(e) => set({ ...form, trial_days: e.target.value })}
          />
        </label>

        <div className="text-right space-x-2">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={save}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────  List Page  ────────────────── */
export default function PlansPage() {
  const [plans, setPlans]   = useState([]);
  const [editRow, setEdit]  = useState(null);
  const [loading, setLoad]  = useState(true);

  const fetchPlans = () =>
    fetch(`${API}/api/plans/superadmin`)
      .then((r) => r.json())
      .then(setPlans)
      .finally(() => setLoad(false));

  useEffect(() => { fetchPlans(); }, []);

  const del = async (id) => {
    if (!confirm('Delete plan?')) return;
    await fetch(`${API}/api/plans/superadmin/${id}`, { method: 'DELETE' });
    fetchPlans();
  };

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Plans</h2>

      <button
        onClick={() => setEdit({})}
        className="mb-4 bg-blue-600 text-white px-4 py-1 rounded"
      >
        + New Plan
      </button>

      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th>Cycle</th>
            <th>Price (₹)</th>
            <th>Trial</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td>{p.billing_cycle}</td>
              <td>{p.price_paise / 100}</td>
              <td>{p.trial_days}</td>
              <td className="space-x-2 p-2">
                <button onClick={() => setEdit(p)} className="text-blue-600">
                  Edit
                </button>
                <button onClick={() => del(p.id)} className="text-red-600">
                  Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editRow !== null && (
        <PlanModal
          initial={editRow}
          refresh={fetchPlans}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  );
}
