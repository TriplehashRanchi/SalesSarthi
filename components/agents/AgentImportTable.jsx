const emptyRow = {
  name: '',
  phone: '',
  employmentType: '',
  dateJoined: '',
  dob: '',
  lastActivity: '',
  meetings: '',
  leads: '',
  sales: '',
  income: '',
};

export default function AgentImportTable({ rows, setRows }) {
  const addRow = () => setRows([...rows, emptyRow]);

  const updateCell = (i, key, value) => {
    const copy = [...rows];
    copy[i][key] = value;
    setRows(copy);
  };

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {Object.keys(emptyRow).map((key) => (
              <th key={key} className="px-3 py-2 text-left capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              {Object.keys(emptyRow).map((key) => (
                <td key={key} className="px-2 py-1">
                  <input
                    value={row[key]}
                    onChange={(e) => updateCell(i, key, e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="p-3">
        <button
          onClick={addRow}
          className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
        >
          + Add Row
        </button>
      </div>
    </div>
  );
}
