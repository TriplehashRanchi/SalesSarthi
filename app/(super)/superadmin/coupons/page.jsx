'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/*────────────────────  COUPON MODAL  ────────────────────*/
function CouponModal({ initial = {}, plans = [], refresh, onClose }) {
  /* ---------- local state ---------- */
  const [form, set] = useState({
    code:            initial.code           || '',
    discount_type:   initial.discount_type  || 'PERCENT',       // PERCENT | FLAT
    discount_value:  initial.discount_value || 0,               // number
    plan_id:         initial.plan_ids?.[0]  || '',              // single-select (first id) or ''
    valid_to:        initial.valid_to ? initial.valid_to.slice(0, 10) : '',
    is_active:       initial.is_active ?? 1,
  });

  /* ---------- submit ---------- */
  const save = async () => {
    const {
      code,
      discount_type,
      discount_value,
      plan_id,
      valid_to,
      is_active,
    } = form;

    /* build payload expected by the API */
    const body = {
      code: code.trim().toUpperCase(),
      discount_type,
      discount_value: Number(discount_value || 0),
      is_active: is_active ? 1 : 0,
      ...(valid_to ? { valid_to } : {}),
      ...(plan_id  ? { plan_ids: [Number(plan_id)] } : {}), // array
    };

    const method = initial.id ? 'PUT' : 'POST';
    const url = `${API}/api/coupons/superadmin${initial.id ? '/' + initial.id : ''}`;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    refresh();
    onClose();
  };

  /* ---------- render ---------- */
  return (
    <div className="fixed inset-0 bg-black/40 grid place-content-center z-50">
      <div className="bg-white p-6 w-[420px] rounded shadow">
        <h3 className="text-lg font-semibold mb-4">
          {initial.id ? 'Edit Coupon' : 'New Coupon'}
        </h3>

        <label className="block mb-2 text-sm">Code
          <input
            className="form-input mt-1 w-full uppercase"
            value={form.code}
            onChange={(e) => set({ ...form, code: e.target.value.toUpperCase() })}
          />
        </label>

        <label className="block mb-2 text-sm">Discount type
          <select
            className="form-select mt-1 w-full"
            value={form.discount_type}
            onChange={(e) => set({ ...form, discount_type: e.target.value })}
          >
            <option value="PERCENT">PERCENT (%)</option>
            <option value="FLAT">FLAT (₹)</option>
          </select>
        </label>

        <label className="block mb-2 text-sm">Discount value
          <input
            type="number"
            className="form-input mt-1 w-full"
            value={form.discount_value}
            onChange={(e) => set({ ...form, discount_value: e.target.value })}
          />
        </label>

        <label className="block mb-2 text-sm">Applies to plan
          <select
            className="form-select mt-1 w-full"
            value={form.plan_id}
            onChange={(e) => set({ ...form, plan_id: e.target.value })}
          >
            <option value="">Any</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block mb-2 text-sm">Valid to
          <input
            type="date"
            className="form-input mt-1 w-full"
            value={form.valid_to}
            onChange={(e) => set({ ...form, valid_to: e.target.value })}
          />
        </label>

        <label className="inline-flex items-center mt-2 text-sm">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={form.is_active}
            onChange={(e) => set({ ...form, is_active: e.target.checked ? 1 : 0 })}
          />
          <span className="ml-2">Active</span>
        </label>

        <div className="text-right mt-5 space-x-2">
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

/*────────────────────  PAGE  ────────────────────*/
export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [plans, setPlans]     = useState([]);
  const [editRow, setEdit]    = useState(null);
  const [loading, setLoad]    = useState(true);

  /* ---------- data fetch ---------- */
  const fetchAll = () =>
    Promise.all([
      fetch(`${API}/api/coupons/superadmin/all`).then((r) => r.json()).then(setCoupons),
      fetch(`${API}/api/plans`).then((r) => r.json()).then(setPlans),
    ]).finally(() => setLoad(false));

  useEffect(() => { fetchAll(); }, []);

  /* ---------- delete ---------- */
  const del = async (id) => {
    if (!confirm('Delete coupon?')) return;
    await fetch(`${API}/api/coupons/superadmin/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  if (loading) return <p className="p-6">Loading…</p>;

  /* ---------- helper to display plan names ---------- */
  const planNameList = (row) => {
    if (!row.plan_ids?.length) return 'Any';
    return row.plan_ids
      .map((id) => plans.find((p) => p.id === id)?.name || `#${id}`)
      .join(', ');
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Coupons</h2>

      <button
        onClick={() => setEdit({})}
        className="mb-4 bg-blue-600 text-white px-4 py-1 rounded"
      >
        + New Coupon
      </button>

      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Plan(s)</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.code}</td>
              <td>{c.discount_type}</td>
              <td>{parseFloat(c.discount_value)}</td>
              <td>{planNameList(c)}</td>
              <td>{c.is_active ? 'Yes' : 'No'}</td>
              <td className="space-x-2 p-2">
                <button onClick={() => setEdit(c)} className="text-blue-600">
                  Edit
                </button>
                <button onClick={() => del(c.id)} className="text-red-600">
                  Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editRow !== null && (
        <CouponModal
          initial={editRow}
          plans={plans}
          refresh={fetchAll}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  );
}
