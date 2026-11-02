'use client';

import { useParams } from 'next/navigation';
import LeadDetailView from '@/components/Leadtable/LeadDetailView';

const LeadDetailPage = () => {
    const { leadId } = useParams();
    return <LeadDetailView leadId={leadId} />;
};

export default LeadDetailPage;
