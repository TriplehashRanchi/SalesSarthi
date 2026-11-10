'use client';
import FolderActivityHistory from '@/components/Leadtable/FolderActivityHistory';

// Lead Management → Folder Activity (the admin's own folders only).
export default function LeadFolderActivityPage() {
    return <FolderActivityHistory backHref="/leadtable" />;
}
