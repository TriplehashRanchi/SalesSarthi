'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader } from '@mantine/core';
import ProposalBuilder from '@/components/proposals/ProposalBuilder';

// /proposals/new?source=fhc|kundli&id=<report id>
function NewProposal() {
    const params = useSearchParams();
    const source = params.get('source');
    const id = params.get('id');
    if (!['fhc', 'kundli'].includes(source) || !id) {
        return <p className="py-16 text-center text-gray-500">Open a Health Check or Financial Kundli result and tap Create Proposal.</p>;
    }
    return <ProposalBuilder key={`${source}-${id}`} sourceType={source} sourceId={id} />;
}

export default function NewProposalPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader /></div>}>
            <NewProposal />
        </Suspense>
    );
}
