// The proposal as the client sees it from a shared link (no login). Phone-first, same look as the PDF:
// navy header, key figures, one card per plan, the advisor with Call / WhatsApp, Download PDF always in reach.
// No state or effects: renders fully on the server.
import { inr } from './proposalUi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const publicPdfUrl = (token) => `${API_URL}/api/public/proposals/${encodeURIComponent(token)}/pdf`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = (s) => {
    const [y, m] = String(s || '').split('-').map(Number);
    return y && m ? `${MONTHS[m - 1]} ${y}` : '';
};
const longDate = (d) => {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? '' : `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};
const years = (n) => (n ? `${n} ${Number(n) === 1 ? 'yr' : 'yrs'}` : '—');
const PER = { Monthly: 'per month', Quarterly: 'per quarter', 'Half-yearly': 'every 6 months', Yearly: 'per year', Single: 'one-time' };
const SOURCE = { fhc: 'Financial Health Check', kundli: 'Financial Kundli' };
// 98765 43210 → 919876543210 (wa.me needs the country code)
const waNumber = (phone) => {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.length === 10) return `91${d}`;
    if (d.length === 11 && d.startsWith('0')) return `91${d.slice(1)}`;
    return d;
};
const initials = (name) =>
    String(name || '?')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');

const Phone = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
);
const WhatsApp = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.83 0-1.34.7-2 .95-2.28.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.23.54.77 1.89.84 2.03.07.13.11.29.02.47-.09.18-.13.29-.27.45-.13.16-.28.35-.4.47-.13.13-.27.28-.12.55.16.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.13.45.2.52.31.07.11.07.65-.17 1.33z" />
    </svg>
);
const Download = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
);

// Inter, self-hosted (public/fonts/inter, OFL): same typeface as the PDF. latin-ext carries the ₹ sign.
const RANGES = {
    latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
};
const INTER_CSS = [400, 500, 600, 700]
    .flatMap((w) =>
        Object.entries(RANGES).map(
            ([s, r]) => `@font-face{font-family:"InterDG";font-weight:${w};font-display:swap;src:url(/fonts/inter/inter-${s}-${w}-normal.woff2) format("woff2");unicode-range:${r};}`
        )
    )
    .join('');
const FONT = '"InterDG", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const COLS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' };

const Field = ({ label, children, green }) => (
    <div>
        <dt className="text-[11px] text-slate-500">{label}</dt>
        <dd className={`text-[13px] font-semibold ${green ? 'text-emerald-700' : 'text-slate-900'}`}>{children}</dd>
    </div>
);

export default function PublicProposal({ token, proposal: p }) {
    if (!p) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center" style={{ fontFamily: FONT }}>
                <style>{INTER_CSS}</style>
                <div>
                    <img src="/assets/images/dg-sarthi-icon.png" alt="" className="mx-auto mb-4 h-12 w-12" />
                    <h1 className="text-lg font-semibold text-slate-900">This proposal link isn’t available</h1>
                    <p className="mt-1 text-sm text-slate-500">Please ask your financial advisor to send it again.</p>
                </div>
            </main>
        );
    }

    const a = p.advisor || {};
    const advisorName = a.name || a.company_name;
    const role = [a.title, a.name ? a.company_name : null].filter(Boolean).join(' · ');
    const maturity = p.items.reduce((s, it) => s + (Number(it.maturity_amount) || 0), 0);
    const payable = p.items.reduce((s, it) => s + (Number(it.total_payable) || 0), 0);
    const meta = [p.client.age ? `Age ${p.client.age}` : null, p.client.city || null, p.client.family ? `Family: ${p.client.family}` : null].filter(Boolean);
    const wa = waNumber(a.phone);
    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${a.name || ''}, I have a question about my financial proposal (${p.ref}).`.replace('  ', ' '))}` : null;
    const pdf = publicPdfUrl(token);
    const website = a.website ? a.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';

    const figures = [
        { label: 'Plans recommended', value: p.items.length },
        { label: 'Yearly investment', value: inr(p.total_yearly), note: 'excluding taxes' },
        p.total_one_time > 0 && { label: 'One-time investment', value: inr(p.total_one_time), note: 'single payment' },
        maturity > 0 && { label: 'Approx. maturity value', value: inr(maturity), note: 'assumed, not guaranteed', green: true },
    ].filter(Boolean);

    return (
        <main className="min-h-screen bg-slate-50 pb-28 text-slate-900 antialiased sm:pb-12" style={{ fontFamily: FONT, fontFeatureSettings: '"tnum" 1, "cv11" 1' }}>
            <style>{INTER_CSS}</style>
            {/* header */}
            <header className="bg-[#0c2340] text-white">
                <div className="mx-auto max-w-3xl px-5 pb-7 pt-5 sm:px-8 sm:pb-9">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                                <img src="/assets/images/dg-sarthi-icon.png" alt="" className="h-6 w-6" />
                            </span>
                            <div className="leading-tight">
                                <p className="text-[15px] font-semibold">DG Sarthi</p>
                                <p className="text-[11px] text-white/60">Financial planning</p>
                            </div>
                        </div>
                        <div className="text-right text-[11px] leading-relaxed text-white/60">
                            <p>
                                Ref. <span className="font-semibold text-white">{p.ref}</span>
                            </p>
                            <p>{longDate(p.created_at)}</p>
                        </div>
                    </div>
                    <p className="mt-7 text-[13px] text-white/60">Financial proposal for</p>
                    <h1 className="text-[30px] font-bold leading-tight tracking-tight sm:text-4xl">{p.client.name}</h1>
                    {meta.length > 0 && <p className="mt-1 text-[13px] text-white/75">{meta.join('  ·  ')}</p>}
                    <p className="mt-3 text-[12px] text-white/60">
                        Based on your <span className="font-semibold text-white">{SOURCE[p.source_type]}</span>
                    </p>
                </div>
                <div className="h-[3px] bg-[#0f7a4f]" />
            </header>

            <div className="mx-auto max-w-3xl px-4 sm:px-8">
                {p.replaced && (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        This proposal has been updated since it was sent. Please ask your advisor for the latest version.
                    </div>
                )}

                {/* figures */}
                {/* tiles: 2 per row on a phone (an odd last one spans the row), all in one row from sm up */}
                <section className={`mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white ${COLS[figures.length] || 'sm:grid-cols-4'}`}>
                    {figures.map((f, i) => (
                        <div
                            key={f.label}
                            className={[
                                'px-4 py-3.5',
                                i % 2 ? 'border-l border-slate-200' : '',
                                i >= 2 ? 'border-t border-slate-200 sm:border-t-0' : '',
                                i > 0 ? 'sm:border-l' : '',
                                i === figures.length - 1 && figures.length % 2 ? 'col-span-2 sm:col-span-1' : '',
                            ].join(' ')}
                        >
                            <p className="text-[11px] text-slate-500">{f.label}</p>
                            <p className={`mt-0.5 text-[19px] font-semibold tracking-tight ${f.green ? 'text-emerald-700' : 'text-[#0c2340]'}`}>{f.value}</p>
                            {f.note && <p className="text-[11px] text-slate-400">{f.note}</p>}
                        </div>
                    ))}
                </section>

                {/* plans */}
                <div className="mb-3 mt-8 flex items-baseline gap-3">
                    <h2 className="whitespace-nowrap text-[15px] font-semibold">Recommended plans</h2>
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="whitespace-nowrap text-[11px] text-slate-400">Amounts exclude taxes</span>
                </div>
                <ol className="space-y-3">
                    {p.items.map((it, i) => (
                        <li key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 gap-3">
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[11px] font-semibold text-slate-500">{i + 1}</span>
                                    <div className="min-w-0">
                                        <p className="font-semibold leading-snug">{it.product_name}</p>
                                        {it.company_name && <p className="text-[13px] text-slate-500">{it.company_name}</p>}
                                    </div>
                                </div>
                                {it.investment_amount ? (
                                    <div className="shrink-0 text-right">
                                        <p className="text-[17px] font-semibold tracking-tight">{inr(it.investment_amount)}</p>
                                        <p className="text-[11px] text-slate-500">{PER[it.payment_frequency]}</p>
                                    </div>
                                ) : null}
                            </div>

                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-dashed border-slate-200 pt-3 sm:grid-cols-4 sm:pl-9">
                                <Field label="Payment term">{it.payment_frequency === 'Single' ? 'Single payment' : [it.payment_term_years ? years(it.payment_term_years) : null, it.payment_frequency].filter(Boolean).join(' · ')}</Field>
                                <Field label="Plan term">{years(it.plan_term_years)}</Field>
                                <Field label="Period">{it.plan_start_date || it.plan_end_date ? `${month(it.plan_start_date) || '—'} → ${month(it.plan_end_date) || '—'}` : '—'}</Field>
                                <Field label="Approx. maturity" green={!!it.maturity_amount}>
                                    {it.maturity_amount ? inr(it.maturity_amount) : '—'}
                                </Field>
                            </dl>

                            {(it.reason || it.additional_features) && (
                                <div className="mt-3 space-y-1 text-[13px] sm:pl-9">
                                    {it.reason && <p className="text-slate-700">{it.reason}</p>}
                                    {it.additional_features && <p className="text-slate-500">Includes {it.additional_features}</p>}
                                </div>
                            )}
                        </li>
                    ))}
                </ol>

                {/* total */}
                <section className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[13px] font-semibold">Total</p>
                            {payable > 0 && <p className="text-[11px] text-slate-500">Payable over the terms {inr(payable)}</p>}
                        </div>
                        <div className="text-right">
                            <p className="text-[17px] font-semibold tracking-tight">
                                {inr(p.total_yearly)} <span className="text-[12px] font-normal text-slate-500">/ year</span>
                            </p>
                            {p.total_one_time > 0 && <p className="text-[13px] text-slate-700">+ {inr(p.total_one_time)} one-time</p>}
                            {maturity > 0 && <p className="text-[13px] font-semibold text-emerald-700">Approx. maturity {inr(maturity)}</p>}
                        </div>
                    </div>
                </section>

                {/* advisor */}
                <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                        {a.photo_url ? (
                            <img src={a.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                        ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0c2340] font-semibold text-white">{initials(advisorName)}</span>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-slate-500">Your financial advisor</p>
                            <p className="truncate font-semibold">{advisorName}</p>
                            {role && <p className="truncate text-[13px] text-slate-500">{role}</p>}
                        </div>
                        {a.company_logo_url && <img src={a.company_logo_url} alt="" className="hidden max-h-9 max-w-[110px] object-contain sm:block" />}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {a.phone && (
                            <a href={`tel:${a.phone}`} className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                                <Phone /> Call
                            </a>
                        )}
                        {waLink && (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-[#1f9d55] py-2.5 text-sm font-semibold text-white hover:bg-[#188247]">
                                <WhatsApp /> WhatsApp
                            </a>
                        )}
                    </div>
                    {(a.email || website || a.address) && (
                        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">{[a.email, website, a.address].filter(Boolean).join('  ·  ')}</p>
                    )}
                </section>

                <a
                    href={pdf}
                    className="mt-4 hidden w-full items-center justify-center gap-2 rounded-lg bg-[#0c2340] py-3 text-sm font-semibold text-white hover:bg-[#163a66] sm:flex"
                >
                    <Download /> Download PDF
                </a>

                {/* fine print */}
                <section className="mt-8 space-y-1.5 text-[11px] leading-relaxed text-slate-500">
                    {p.notes?.maturity && (
                        <p>
                            <span className="font-semibold text-slate-600">Note.</span> {p.notes.maturity}
                        </p>
                    )}
                    <p>
                        <span className="font-semibold text-slate-600">Disclaimer.</span> {p.notes?.disclaimer}
                    </p>
                </section>
                <p className="mt-6 text-center text-[11px] text-slate-400">
                    Prepared with <span className="font-semibold text-[#0c2340]">DG Sarthi</span>
                </p>
            </div>

            {/* phone: actions always in reach */}
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur sm:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
                <div className="flex gap-2">
                    <a href={pdf} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0c2340] py-3 text-sm font-semibold text-white">
                        <Download /> Download PDF
                    </a>
                    {waLink && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-[#1f9d55] px-4 py-3 text-sm font-semibold text-white" aria-label="WhatsApp your advisor">
                            <WhatsApp />
                        </a>
                    )}
                </div>
            </div>
        </main>
    );
}
