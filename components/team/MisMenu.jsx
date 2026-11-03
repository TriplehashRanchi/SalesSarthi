'use client';
import { useEffect, useRef, useState } from 'react';
import { IconDownload, IconChevronDown } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { MIS_FILES, downloadCsv, reportGet } from '@/utils/teamReport';

// Download button for the MIS: team summary, call log, follow-ups (CSV, opens in Excel).
export default function MisMenu({ range, userId, label = 'Download MIS', variant = 'solid' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const download = async (key) => {
    setOpen(false);
    setBusy(true);
    try {
      const data = await reportGet('/mis', { from: range.from, to: range.to, ...(userId ? { userId } : {}) });
      const [cols, rows] = MIS_FILES[key].build(data);
      if (!rows.length) return toast('Nothing to download for this period');
      downloadCsv(`MIS_${key}_${range.from}_to_${range.to}.csv`, cols, rows);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not build the MIS');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={`flex w-full items-center justify-center gap-2 sm:w-auto ${variant === 'outline' ? 'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-200' : 'btn btn-primary'}`} disabled={busy} onClick={() => setOpen((o) => !o)}>
        <IconDownload size={16} /> {busy ? 'Preparing...' : label} <IconChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-full min-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#0e1726] sm:w-56">
          {Object.entries(MIS_FILES).map(([k, f]) => (
            <button key={k} type="button" onClick={() => download(k)}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
              {f.label} <span className="text-xs text-gray-400">.csv</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
