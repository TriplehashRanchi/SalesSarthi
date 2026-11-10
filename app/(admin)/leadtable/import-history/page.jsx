'use client';
import ImportHistory from '@/components/CsvUpload/ImportHistory';

// Lead Management → Import History (the admin's own CSV uploads).
export default function LeadImportHistoryPage() {
    return <ImportHistory backHref="/leadtable" />;
}
