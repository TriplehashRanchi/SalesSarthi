'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import toast from 'react-hot-toast';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { API_URL } from '@/utils/teamReport';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const Field = ({ label, error, required, wide, children }) => (
  <label className={`block ${wide ? 'col-span-2' : ''}`}>
    <span className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
      {label}{required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
  </label>
);

const Group = ({ title }) => (
  <div className="col-span-2 mt-2 flex items-center gap-3">
    <span className="h-4 w-1 rounded-full bg-blue-600" />
    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h4>
    <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
  </div>
);

// Admin edits a team member's details. Role is changed from the pencil next to the role.
export default function EditMemberModal({ profile, onClose, onSaved }) {
  const p = profile;
  const [f, setF] = useState({
    username: p.username || '', email: p.email || '', phone: (p.phone || '').replace(/^\+/, ''),
    fathers_name: p.fathers_name || '', pan: p.pan || '', blood_group: p.blood_group || '',
    birthday: p.date_of_birth || '', anniversary: p.anniversary_date || '', address: p.address || '',
    emergency_contact_name: p.emergency_contact_name || '', emergency_contact_phone: (p.emergency_contact_phone || '').replace(/^\+/, ''),
    bank_account_holder: p.bank_account_holder || '', bank_name: p.bank_name || '',
    bank_account_number: p.bank_account_number || '', bank_ifsc: p.bank_ifsc || '',
    manager_id: p.manager_id ? String(p.manager_id) : '',
  });
  const [managers, setManagers] = useState([]);
  useEffect(() => {
    if (p.role === 'Manager') return;
    getAuth().currentUser?.getIdToken().then((token) =>
      axios.get(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setManagers(data.filter((u) => u.role === 'Manager' && u.id !== p.id)))
    ).catch(() => {});
  }, [p.role, p.id]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const hasBank = p.bank_account_number !== undefined; // bank and PAN are admin-only fields
  const today = new Date().toISOString().slice(0, 10);

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e)); };
  const text = (k, extra = {}) => (
    <input className="form-input w-full" value={f[k]} onChange={(e) => set(k, e.target.value)} {...extra} />
  );

  const save = async () => {
    const e = {};
    if (!f.username.trim()) e.username = 'Required';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email';
    if (f.phone.length < 8) e.phone = 'Enter a valid phone';
    if (f.pan && !PAN_RE.test(f.pan)) e.pan = 'Format: ABCDE1234F';
    if (f.bank_ifsc && !IFSC_RE.test(f.bank_ifsc)) e.bank_ifsc = 'Invalid IFSC';
    if (f.bank_account_number && !/^\d{6,30}$/.test(f.bank_account_number)) e.bank_account_number = '6-30 digits only';
    setErrors(e);
    if (Object.keys(e).length) return toast.error('Please fix the highlighted fields');

    const plus = (v) => (v && v.length > 4 ? (v.startsWith('+') ? v : `+${v}`) : '');
    setSaving(true);
    try {
      const token = await getAuth().currentUser.getIdToken();
      const body = { ...f, phone: plus(f.phone), emergency_contact_phone: plus(f.emergency_contact_phone) };
      // only send the reporting manager when it changed
      if (f.manager_id === (p.manager_id ? String(p.manager_id) : '')) delete body.manager_id;
      await axios.put(`${API_URL}/api/admin/users/${p.id}/profile`,
        body,
        { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Details updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const phoneProps = { country: 'in', enableSearch: true, containerClass: '!w-full', inputClass: 'form-input !w-full' };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => !saving && onClose()}>
      <div className="flex max-h-[94vh] w-full flex-col rounded-t-2xl bg-white shadow-xl dark:bg-[#0e1726] sm:max-w-2xl sm:rounded-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit details</h3>
          <p className="text-xs text-gray-500">{p.username}</p>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-4 overflow-y-auto px-5 py-4 sm:gap-x-5">
          <Group title="Basic details" />
          <Field label="Full name" required wide error={errors.username}>{text('username')}</Field>
          <Field label="Email" required wide error={errors.email}>{text('email', { type: 'email' })}</Field>
          <Field label="Phone" required wide error={errors.phone}>
            <PhoneInput {...phoneProps} value={f.phone} onChange={(v) => set('phone', v)} />
          </Field>
          <Field label="Father's name">{text('fathers_name')}</Field>
          {hasBank && <Field label="PAN" error={errors.pan}>{text('pan', { maxLength: 10, onChange: (e) => set('pan', e.target.value.toUpperCase()) })}</Field>}
          <Field label="Birthday">{text('birthday', { type: 'date', max: today })}</Field>
          <Field label="Anniversary">{text('anniversary', { type: 'date', max: today })}</Field>
          <Field label="Blood group">
            <select className="form-select w-full" value={f.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          {p.role !== 'Manager' && (
            <Field label="Reporting manager" wide>
              <select className="form-select w-full" value={f.manager_id} onChange={(e) => set('manager_id', e.target.value)}>
                <option value="">None (handled by admin)</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.username}</option>)}
              </select>
            </Field>
          )}
          <Field label="Address" wide>
            <textarea className="form-textarea w-full" rows={2} maxLength={500} value={f.address} onChange={(e) => set('address', e.target.value)} />
          </Field>

          <Group title="Emergency contact" />
          <Field label="Contact name" wide>{text('emergency_contact_name')}</Field>
          <Field label="Contact number" wide>
            <PhoneInput {...phoneProps} value={f.emergency_contact_phone} onChange={(v) => set('emergency_contact_phone', v)} />
          </Field>

          {hasBank && (
            <>
              <Group title="Bank account" />
              <Field label="Account holder" wide>{text('bank_account_holder')}</Field>
              <Field label="Bank name">{text('bank_name')}</Field>
              <Field label="IFSC" error={errors.bank_ifsc}>{text('bank_ifsc', { maxLength: 11, onChange: (e) => set('bank_ifsc', e.target.value.toUpperCase()) })}</Field>
              <Field label="Account number" wide error={errors.bank_account_number}>
                {text('bank_account_number', { inputMode: 'numeric', maxLength: 30, onChange: (e) => set('bank_account_number', e.target.value.replace(/\D/g, '')) })}
              </Field>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:justify-end">
          <button className="btn btn-outline-dark" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}
