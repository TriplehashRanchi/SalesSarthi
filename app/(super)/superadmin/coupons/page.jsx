'use client';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function CouponModal({ initial={}, onClose, refresh, plans }) {
  const [form, set] = useState({
    code:            initial.code            || '',
    discount_type:   initial.discount_type   || 'PERCENT',
    discount_value:  initial.discount_value  || 0,
    plan_id:         initial.plan_id         || '',
    expires_at:      initial.expires_at ? initial.expires_at.slice(0,10) : '',
    is_active:       initial.is_active ?? 1,
  });
  const save = async () => {
  /* 1 — build clean payload */
  const {
    code,
    discount_type,
    discount_value,
    plan_id,
    expires_at,          // UI field
    is_active,
  } = form;

  const body = {
    code: code.toUpperCase(),
    discount_type,
    discount_value: Number(discount_value || 0),
    is_active: is_active ? 1 : 0,
    /* send NULL if blank so column default or NULL works */
    valid_to: expires_at ? expires_at : null,
    /* omit plan_id when “Any” */
    ...(plan_id ? { plan_id } : {}),
  };

  const method = initial.id ? 'PUT' : 'POST';
  const url = `${API}/api/coupons/superadmin${initial.id ? '/' + initial.id : ''}`;

  /* 2 — fire request */
  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  /* 3 — refresh list & close */
  refresh();
  onClose();
};

  return (
    <div className="fixed inset-0 bg-black/40 grid place-content-center">
      <div className="bg-white p-6 w-[400px] rounded">
        <h3 className="font-semibold mb-4">{initial.id?'Edit':'New'} Coupon</h3>
        <label className="block mb-2">Code
          <input className="form-input mt-1 w-full uppercase"
            value={form.code}
            onChange={e=>set({...form,code:e.target.value.toUpperCase()})}/>
        </label>
        <label className="block mb-2">Type
          <select className="form-select mt-1 w-full"
            value={form.discount_type}
            onChange={e=>set({...form,discount_type:e.target.value})}>
            <option>PERCENT</option><option>FLAT</option>
          </select>
        </label>
        <label className="block mb-2">Value
          <input type="number" className="form-input mt-1 w-full"
            value={form.discount_value}
            onChange={e=>set({...form,discount_value:+e.target.value})}/>
        </label>
        <label className="block mb-2">Applies to plan
          <select className="form-select mt-1 w-full"
            value={form.plan_id}
            onChange={e=>set({...form,plan_id:e.target.value})}>
            <option value="">Any</option>
            {plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="block mb-2">Expires at
          <input type="date" className="form-input mt-1 w-full"
            value={form.expires_at}
            onChange={e=>set({...form,expires_at:e.target.value})}/>
        </label>
        <label className="inline-flex items-center mt-2">
          <input type="checkbox" className="form-checkbox"
            checked={form.is_active}
            onChange={e=>set({...form,is_active:e.target.checked?1:0})}/> Active
        </label>
        <div className="text-right mt-4 space-x-2">
          <button onClick={onClose}>Cancel</button>
          <button onClick={save} className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const [coupons,setCoupons] = useState([]);
  const [plans,setPlans]     = useState([]);
  const [edit,setEdit]       = useState(null);
  const [loading,setLoad]    = useState(true);

  console.log(coupons);

  const loadAll = () => Promise.all([
    fetch(`${API}/api/coupons/superadmin/all`).then(r=>r.json()).then(setCoupons),
    fetch(`${API}/api/plans`).then(r=>r.json()).then(setPlans),
  ]).finally(()=>setLoad(false));

  useEffect(()=>{
     loadAll(); 
    }, []);

  const del = async(id)=>{
    if(!confirm('Delete coupon?')) return;
    await fetch(`${API}/api/coupons/superadmin/${id}`,{method:'DELETE'});
    loadAll();
  };

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Coupons</h2>
      <button onClick={()=>setEdit({})}
        className="mb-4 bg-blue-600 text-white px-4 py-1 rounded">+ New Coupon</button>

      <table className="w-full text-sm border">
        <thead><tr className="bg-gray-100 text-left">
          <th className="p-2">Code</th><th>Type</th><th>Value</th><th>Plan</th><th>Active</th><th></th>
        </tr></thead>
        <tbody>
          {coupons?.map(c=>(
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.code}</td>
              <td>{c.discount_type}</td>
              <td>{c.discount_value}</td>
              <td>{plans.find(p=>p.id===c.plan_id)?.name||'Any'}</td>
              <td>{c.is_active ? 'Yes' : 'No'}</td>
              <td className="space-x-2 p-2">
                <button onClick={()=>setEdit(c)} className="text-blue-600">Edit</button>
                <button onClick={()=>del(c.id)} className="text-red-600">Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {edit!==null && (
        <CouponModal initial={edit} plans={plans}
          refresh={loadAll} onClose={()=>setEdit(null)} />
      )}
    </div>
  );
}
