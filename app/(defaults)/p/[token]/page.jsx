// Client-facing proposal: app.../p/<token>. No login. Rendered on the server so WhatsApp shows a proper preview.
import { headers } from 'next/headers';
import PublicProposal from '@/components/proposals/PublicProposal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// One fetch per request (shared by the page and its metadata). Passes on the visitor's IP so the API's
// per-IP rate limit applies to each client, not to this web server as a whole.
async function load(token) {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token || '')) return null;
    const h = await headers();
    const ip = (h.get('x-forwarded-for') || h.get('x-real-ip') || '').split(',')[0].trim();
    try {
        const res = await fetch(`${API_URL}/api/public/proposals/${token}`, { cache: 'no-store', headers: ip ? { 'x-forwarded-for': ip } : {} });
        return res.ok ? await res.json() : null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }) {
    const { token } = await params;
    const p = await load(token);
    // title.absolute: not passed through the root layout's "%s | DG Saarthi …" template
    if (!p) return { title: { absolute: 'Financial proposal | DG Sarthi' }, robots: { index: false } };
    const yearly = `₹${Math.round(p.total_yearly || 0).toLocaleString('en-IN')}`;
    const by = p.advisor?.name || p.advisor?.company_name;
    const description = `${p.items.length} plan${p.items.length === 1 ? '' : 's'} · ${yearly} per year${by ? ` · prepared by ${by}` : ''}`;
    return {
        title: { absolute: `Financial proposal for ${p.client.name} | DG Sarthi` },
        description,
        robots: { index: false, follow: false },
        openGraph: { title: `Financial proposal for ${p.client.name}`, description, siteName: 'DG Sarthi', type: 'website', images: ['/assets/images/dg-sarthi-icon.png'] },
    };
}

export default async function SharedProposalPage({ params }) {
    const { token } = await params;
    const proposal = await load(token);
    return <PublicProposal token={token} proposal={proposal} />;
}
