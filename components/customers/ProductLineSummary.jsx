'use client';
// Folder tabs above the customers list, same look as the leads page: "All Customers" then one pill per
// category / own folder with its customer count. The open one is a solid blue pill; clicking the open pill
// again goes back to all customers. On a phone the row scrolls sideways; on desktop ‹ › arrows scroll it.
import { useEffect, useRef, useState } from 'react';
import { ActionIcon } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconFolder } from '@tabler/icons-react';

export default function ProductLineSummary({ items = [], activeKey, onSelect }) {
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = () => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    updateEdges();
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length]);

  if (!items.length) return null;

  const scrollBy = (dir) => scroller.current?.scrollBy({ left: dir * Math.max(200, (scroller.current.clientWidth || 400) * 0.7), behavior: 'smooth' });
  const chip = (on) =>
    `flex h-8 flex-shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full py-1 pl-3 pr-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      on ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-blue-300 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700'
    }`;
  const badge = (on) => `rounded-full px-1.5 text-[11px] font-semibold leading-5 ${on ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`;
  const arrow = (dir) => (
    <ActionIcon className="hidden flex-shrink-0 md:flex" variant="subtle" radius="xl" size="md" onClick={() => scrollBy(dir)} disabled={dir < 0 ? !edges.left : !edges.right} aria-label={dir < 0 ? 'Scroll folders left' : 'Scroll folders right'}>
      {dir < 0 ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
    </ActionIcon>
  );

  return (
    <div className="mb-3 flex min-w-0 items-center gap-1 rounded-2xl bg-gray-50 p-2 dark:bg-gray-800/60" role="group" aria-label="Customer folders">
      {arrow(-1)}
      <div ref={scroller} onScroll={updateEdges} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scroll-smooth px-0.5 py-0.5" style={{ scrollbarWidth: 'none' }}>
        <button type="button" aria-pressed={!activeKey} onClick={() => onSelect(null)} className={chip(!activeKey)}>
          All Customers
        </button>
        {items.map((f) => {
          const on = activeKey === f.key;
          return (
            <button key={f.key} type="button" aria-pressed={on} onClick={() => onSelect(on ? null : f.key)} className={chip(on)} title={`${f.name} (${Number(f.customer_count) || 0})`}>
              <IconFolder size={15} className="flex-shrink-0 opacity-80" />
              <span className="max-w-[160px] truncate lg:max-w-[200px]">{f.name}</span>
              <span className={badge(on)}>{Number(f.customer_count) || 0}</span>
            </button>
          );
        })}
      </div>
      {arrow(1)}
    </div>
  );
}
