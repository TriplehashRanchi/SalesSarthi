'use client';
import { useState } from 'react';
import FileDropZone from './FileDropZone';
import { downloadSampleAgentCSV } from '../../components/agents/sampleTemplate';
import { getAuth } from 'firebase/auth';
import Papa from 'papaparse';

export default function ImportAgentsModal({ isOpen, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    // ✅ CSV → JSON parser
    const parseCsvFile = (file) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => resolve(result.data),
                error: (err) => reject(err),
            });
        });
    };

    const handleImport = async () => {
        if (!file) {
            alert('Please upload a CSV file');
            return;
        }

        try {
            setLoading(true);

            // 1️⃣ Parse CSV
            const parsedRows = await parseCsvFile(file);

            if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
                alert('CSV file is empty or invalid');
                return;
            }

            // 2️⃣ Normalize payload (matches backend)
            const payload = parsedRows.map((row) => ({
                first_name: row['first_name'],
                last_name: row['last_name'],
                email: row['email'],
                phone: row['phone'],
                password: row['password'],
                employment_type: row['employment_type'],
                date_of_birth: row['date_of_birth'] || null,
                last_active_date: row['last_active_date'] || null,
                leads: Number(row['leads'] || 0),
                meetings: Number(row['meetings'] || 0),
                sales: Number(row['sales'] || 0),
            }));

            // 3️⃣ Firebase token
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            if (!token) {
                alert('Authentication error. Please login again.');
                return;
            }

            // 4️⃣ Send JSON array to backend
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/bulk-upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || 'Bulk upload failed');
                return;
            }

            alert(`Uploaded ${data.summary.success} agents successfully`);
            onClose();
            onSuccess?.();
        } catch (err) {
            console.error('Import error:', err);
            alert('Something went wrong during import');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Import Agents</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                {/* Step 1 */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-2">Step 1: Download Sample Template</h3>
                    <button onClick={downloadSampleAgentCSV} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                        ⬇️ Download Sample CSV
                    </button>
                </div>

                {/* Step 2 */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-2">Step 2: Prepare Your Data</h3>
                    <ul className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <li>• Name</li>
                        <li>• Phone</li>
                        <li>• Employment Type</li>
                        <li>• Date Joined</li>
                        <li>• Date of Birth (optional)</li>
                        <li>• Last Activity Date (optional)</li>
                        <li>• Meetings (last 30 days)</li>
                        <li>• Leads (last 30 days)</li>
                        <li>• Sales (last 90 days)</li>
                    </ul>
                </div>

                {/* Step 3 */}
                <div className="mb-8">
                    <h3 className="font-semibold mb-2">Step 3: Upload Your CSV</h3>
                    <FileDropZone file={file} setFile={setFile} />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border rounded-lg">
                        Cancel
                    </button>
                    <button onClick={handleImport} disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                        {loading ? 'Importing…' : 'Import Agents'}
                    </button>
                </div>
            </div>
        </div>
    );
}
