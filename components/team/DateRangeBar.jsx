'use client';
import { useState } from 'react';
import { presetRange } from '@/utils/teamReport';

const PRESETS = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['month', 'This month'],
];

export default function DateRangeBar({ range, onChange }) {
  const [active, setActive] = useState('30d');
  const pick = (key) => {
    setActive(key);
    if (key !== 'custom') onChange(presetRange(key));
  };
  const chip = (on) =>
    `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? 'bg-primary text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:pb-0">
        {PRESETS.map(([k, label]) => (
          <button key={k} type="button" className={chip(active === k)} onClick={() => pick(k)}>{label}</button>
        ))}
        <button type="button" className={chip(active === 'custom')} onClick={() => pick('custom')}>Custom</button>
      </div>
      {active === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" className="form-input h-9 w-full text-sm sm:w-auto" value={range.from} max={range.to}
            onChange={(e) => e.target.value && onChange({ ...range, from: e.target.value })} />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" className="form-input h-9 w-full text-sm sm:w-auto" value={range.to} min={range.from}
            onChange={(e) => e.target.value && onChange({ ...range, to: e.target.value })} />
        </div>
      )}
    </div>
  );
}
