'use client';
import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '@/utils/teamReport';

const OUTCOMES = ['Connected', 'Not Answered', 'Busy', 'Switched Off', 'Wrong Number', 'Call Back'];

// Team member records how a call went: outcome, talk time, notes.
export default function LogCallModal({ lead, onClose, onSaved }) {
  const [outcome, setOutcome] = useState('Connected');
  const [min, setMin] = useState('');
  const [sec, setSec] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const seconds = outcome === 'Connected' ? (Number(min) || 0) * 60 + (Number(sec) || 0) : 0;
    setSaving(true);
    try {
      const token = await getAuth().currentUser.getIdToken();
      await axios.post(`${API_URL}/api/calls`, { lead_id: lead.id, outcome, duration_seconds: seconds, notes },
        { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Call logged');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not log the call');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[#0e1726] sm:max-w-md sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log call</h3>
        <p className="mb-4 text-sm text-gray-500">{lead.full_name} · {lead.phone_number}</p>

        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">What happened?</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {OUTCOMES.map((o) => (
            <button key={o} type="button" onClick={() => setOutcome(o)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${outcome === o ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-700 hover:border-primary/50 dark:border-gray-700 dark:text-gray-300'}`}>
              {o}
            </button>
          ))}
        </div>

        {outcome === 'Connected' && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Talk time</p>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="numeric" min="0" max="360" placeholder="0" className="form-input w-full" value={min} onChange={(e) => setMin(e.target.value)} />
              <span className="text-sm text-gray-500">min</span>
              <input type="number" inputMode="numeric" min="0" max="59" placeholder="0" className="form-input w-full" value={sec} onChange={(e) => setSec(e.target.value)} />
              <span className="text-sm text-gray-500">sec</span>
            </div>
          </div>
        )}

        <textarea rows={2} maxLength={500} className="form-textarea mb-5 w-full" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn btn-outline-dark" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save call'}</button>
        </div>
      </div>
    </div>
  );
}
