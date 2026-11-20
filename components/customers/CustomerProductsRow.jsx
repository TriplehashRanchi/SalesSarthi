'use client';
import { Badge, Text, Tooltip } from '@mantine/core';
import { useCustomerFolders } from './customerFolderApi';

// Product line names of a customer (their categories + each product's), in order, once each.
// Without any product line, the product names themselves.
export function productLineNames(record, folderName = {}) {
  const ids = [...(record.folder_ids || []), ...(record.products || []).flatMap((p) => p.folder_ids || [])];
  const names = [...new Set(ids.map((id) => folderName[id]).filter(Boolean))];
  if (names.length) return names;
  return [...new Set((record.products || []).map((p) => p.product_name || p.company_name).filter(Boolean))];
}
const CHIP_COLORS = { 'life insurance': 'blue', 'health insurance': 'violet', 'mutual fund': 'orange', 'general insurance': 'grape' };
const OTHER_COLORS = ['teal', 'cyan', 'pink', 'green', 'indigo', 'lime'];
export const chipColor = (name) => {
  const k = String(name).trim().toLowerCase();
  if (CHIP_COLORS[k]) return CHIP_COLORS[k];
  const h = [...k].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return OTHER_COLORS[h % OTHER_COLORS.length];
};

// "Products / Policies" column of the customer list (coloured chips, all names on hover).
//   const products = useProductExpansion();
//   <DataTable rowExpansion={products.rowExpansion} columns={[..., products.column, ...]} />
export function useProductExpansion() {
  const { folders } = useCustomerFolders();
  const folderName = Object.fromEntries((folders || []).map((f) => [f.id, f.name]));

  // First product line as a coloured chip, then "+N" for the rest (N = how many more); hovering shows all of them.
  const column = {
    accessor: 'products',
    title: 'Products / Policies',
    render: (record) => {
      const names = productLineNames(record, folderName);
      if (!names.length) return <Text color="dimmed" size="sm">—</Text>;
      const chip = (name) => (
        <Badge key={name} color={chipColor(name)} variant="light" radius="xl" size="md" styles={{ root: { textTransform: 'none', fontWeight: 600 } }}>
          {name}
        </Badge>
      );
      // Display only: nothing opens under the row; a click on the row opens the profile as usual.
      const button = (
        <div className="flex items-center gap-1" aria-label={`Products: ${names.join(', ')}`}>
          {chip(names[0])}
          {names.length > 1 && (
            <Badge color="gray" variant="light" radius="xl" size="md" styles={{ root: { textTransform: 'none', fontWeight: 700 } }}>
              +{names.length - 1}
            </Badge>
          )}
        </div>
      );
      if (names.length === 1) return button;
      return (
        <Tooltip
          withinPortal
          withArrow
          position="bottom-start"
          label={<span className="flex flex-col items-start gap-1 py-0.5" data-testid="products-hover">{names.map(chip)}</span>}
          styles={{ tooltip: { backgroundColor: '#fff', color: '#111827', boxShadow: '0 4px 14px rgba(0,0,0,.12)', border: '1px solid #e5e7eb' }, arrow: { backgroundColor: '#fff', border: '1px solid #e5e7eb' } }}
        >
          {/* Tooltip needs a plain element to attach to */}
          <div className="inline-block">{button}</div>
        </Tooltip>
      );
    },
  };

  // No product list opens under the row any more (rowExpansion stays undefined so the tables need no change).
  const rowExpansion = undefined;

  return { column, rowExpansion };
}

// One line for the mobile card: first product name and how many more.
export function productsSummary(products = []) {
  if (!products.length) return '';
  const first = products[0].product_name || products[0].company_name || products[0].policy_number || 'Product';
  return products.length > 1 ? `${first} +${products.length - 1} more` : first;
}
