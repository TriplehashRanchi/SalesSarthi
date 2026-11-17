'use client';
import { useParams } from 'next/navigation';
import ProposalBuilder from '@/components/proposals/ProposalBuilder';

// One proposal: edit while it is a draft, otherwise view, share, mark the outcome or make a new version.
export default function ProposalPage() {
    const { id } = useParams();
    return <ProposalBuilder key={id} proposalId={id} />;
}
