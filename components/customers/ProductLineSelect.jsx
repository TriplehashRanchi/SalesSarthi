'use client';
import { MultiSelect } from '@mantine/core';
import { useCustomerFolders } from './customerFolderApi';

// Pick one or more product lines (customer folders). value / onChange use folder ids as numbers.
export default function ProductLineSelect({ value = [], onChange, error, required = false, label = 'Product Line', ...rest }) {
  const { folders, loading } = useCustomerFolders();
  const data = folders.map((f) => ({ value: String(f.id), label: f.name }));

  return (
    <MultiSelect
      label={label}
      placeholder={loading ? 'Loading...' : 'Select product line(s)'}
      data={data}
      value={value.map(String)}
      onChange={(ids) => onChange(ids.map(Number))}
      error={error}
      required={required}
      searchable
      clearable
      nothingFound="No product lines"
      withinPortal
      {...rest}
    />
  );
}
