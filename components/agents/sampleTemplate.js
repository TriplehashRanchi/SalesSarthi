export function downloadSampleAgentCSV() {
  const headers = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'password',
    'employment_type',
    'date_of_birth',
    'last_active_date',
    'leads',
    'meetings',
    'sales',
  ];

  const exampleRow = [
    'John',
    'Doe',
    'john.doe@gmail.com',
    '+919876543210',
    'John@123',
    'Full-time',
    '1990-05-20',
    '2024-11-10',
    '5',
    '8',
    '2',
  ];

  const csvContent = [headers, exampleRow]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'agents_bulk_import_template.csv';

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
