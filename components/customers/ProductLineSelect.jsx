'use client';
import { MultiSelect } from '@mantine/core';
import { useCustomerFolders } from './customerFolderApi';
import { useFolderList } from './personalFolderApi';

const P = 'p:';

// Pick one or more product lines (customer folders). value / onChange use folder ids as numbers.
// With onPersonalChange, the person's own folders (e.g. "Loan", "Other") are listed too, under "My folders";
// those come back separately through personalValue / onPersonalChange.
export default function ProductLineSelect({ value = [], onChange, personalValue, onPersonalChange, error, required = false, label = 'Product Line', ...rest }) {
  if (onPersonalChange) {
    return <WithPersonal {...{ value, onChange, personalValue, onPersonalChange, error, required, label, ...rest }} />;
  }
  return <Plain {...{ value, onChange, error, required, label, ...rest }} />;
}

function Plain({ value, onChange, error, required, label, ...rest }) {
  const { folders, loading } = useCustomerFolders();
  const data = folders.map((f) => ({ value: String(f.id), label: f.name }));
  return <Picker {...{ data, loading, value: value.map(String), onChange: (ids) => onChange(ids.map(Number)), error, required, label, ...rest }} />;
}

function WithPersonal({ value, onChange, personalValue = [], onPersonalChange, error, required, label, ...rest }) {
  const { folders, loading } = useCustomerFolders();
  const { items } = useFolderList();
  const personal = items.filter((i) => i.type === 'personal');
  const data = [
    ...folders.map((f) => ({ value: String(f.id), label: f.name, group: personal.length ? 'Product lines' : undefined })),
    ...personal.map((f) => ({ value: `${P}${f.id}`, label: f.name, group: 'My folders' })),
  ];
  const picked = [...value.map(String), ...personalValue.map((id) => `${P}${id}`)];
  const change = (vals) => {
    onChange(vals.filter((v) => !v.startsWith(P)).map(Number));
    onPersonalChange(vals.filter((v) => v.startsWith(P)).map((v) => Number(v.slice(P.length))));
  };
  return <Picker {...{ data, loading, value: picked, onChange: change, error, required, label, ...rest }} />;
}

function Picker({ data, loading, ...rest }) {
  return (
    <MultiSelect
      placeholder={loading ? 'Loading...' : 'Select product line(s)'}
      data={data}
      searchable
      clearable
      nothingFound="No product lines"
      withinPortal
      {...rest}
    />
  );
}
