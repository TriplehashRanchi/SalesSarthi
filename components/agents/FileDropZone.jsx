'use client';
import { useRef } from 'react';

export default function FileDropZone({ file, setFile }) {
  const inputRef = useRef(null);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    if (
      !selectedFile.name.endsWith('.csv') &&
      !selectedFile.name.endsWith('.xlsx') &&
      !selectedFile.name.endsWith('.xls')
    ) {
      alert('Only CSV or Excel files allowed');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB');
      return;
    }

    setFile(selectedFile);
  };

  return (
    <div
      onClick={() => inputRef.current.click()}
      className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:bg-gray-50 transition"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {!file ? (
        <>
          <div className="text-4xl mb-3">⬆️</div>
          <p className="font-medium">
            Click to upload or drag and drop
          </p>
          <p className="text-sm text-gray-500">
            CSV / Excel files up to 10MB
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold text-gray-800">{file.name}</p>
          <p className="text-sm text-gray-500">
            {(file.size / 1024).toFixed(1)} KB
          </p>
        </>
      )}
    </div>
  );
}
