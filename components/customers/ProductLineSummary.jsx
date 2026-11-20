'use client';
// How many customers each product line has (Life Insurance 120, Health Insurance 45 …), as cards above the
// customer list. Clicking a card opens that product line's customers; clicking a customer opens their profile.
// Clicking the open card again (or "All customers") goes back to the full list.
import { useMantineTheme } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { chipColor } from './CustomerProductsRow';

export default function ProductLineSummary({ items = [], activeKey, onSelect }) {
  const theme = useMantineTheme();
  const lines = items.filter((i) => i.type === 'category');
  if (!lines.length) return null;

  const card = ({ key, name, count, color, icon }) => {
    const picked = (activeKey || null) === key;
    const c = theme.colors[color] || theme.colors.blue;
    return (
      <button
        key={key || 'all'}
        type="button"
        onClick={() => onSelect(picked && key ? null : key)}
        aria-pressed={picked}
        aria-label={count === undefined ? `${name}: show all customers` : `${name}: ${count} customers`}
        title={count === undefined ? 'Show all customers' : `Show the ${count} customer(s) in ${name}`}
        className="flex min-w-[140px] shrink-0 snap-start items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-left transition hover:shadow-md focus:outline-none focus-visible:ring-2 dark:bg-[#0e1726] sm:min-w-0"
        style={{ borderColor: picked ? c[6] : theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3], boxShadow: picked ? `0 0 0 1px ${c[6]}` : undefined }}
      >
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: c[6] }} aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{name}</span>
          <span className="flex items-center gap-1 text-lg font-semibold leading-tight text-gray-800 dark:text-white-light">
            {icon}
            {count === undefined ? 'Show all' : count}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="-mx-1 mb-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 xl:grid-cols-6" role="group" aria-label="Customers by product line">
      {card({ key: null, name: 'All customers', count: undefined, color: 'gray', icon: <IconUsers size={16} /> })}
      {lines.map((l) => card({ key: l.key, name: l.name, count: Number(l.customer_count) || 0, color: chipColor(l.name) }))}
    </div>
  );
}
