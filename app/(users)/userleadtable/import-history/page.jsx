'use client';
import ImportHistory from '@/components/CsvUpload/ImportHistory';

// Lead Management → Import History (the team member's own CSV uploads).
export default function UserLeadImportHistoryPage() {
    return <ImportHistory backHref="/userleadtable" />;
}
