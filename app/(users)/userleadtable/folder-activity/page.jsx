'use client';
import FolderActivityHistory from '@/components/Leadtable/FolderActivityHistory';

// Lead Management → Folder Activity (the team member's own folders only).
export default function UserLeadFolderActivityPage() {
    return <FolderActivityHistory backHref="/userleadtable" />;
}
