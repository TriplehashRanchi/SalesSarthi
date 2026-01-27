'use client';

import { useMemo } from 'react';
import Link from 'next/link';

const defaultFeatures = [
    'Full premium insight engine',
    'Priority analytics & reports',
    'Export-ready PDF summaries',
];

const PremiumGate = ({ title, subtitle, features = defaultFeatures, ctaLabel = 'Request Access', ctaHref = '/profile' }) => {
    const featureList = useMemo(() => (features.length ? features : defaultFeatures), [features]);

    return (
        <div className="min-h-[70vh] w-full px-6 py-12">
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-emerald-50 shadow-[0_20px_60px_-25px_rgba(16,24,40,0.35)]">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200/60 to-rose-200/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-200/50 to-amber-100/20 blur-3xl" />
                <div className="relative grid gap-8 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-12">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-700 shadow-sm">
                            Premium Access
                        </div>
                        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                            {title}
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
                            {subtitle}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href={ctaHref}
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
                            >
                                {ctaLabel}
                            </Link>
                            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white/70 px-4 py-2 text-xs font-semibold text-amber-700">
                                <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                                Share your Admin ID with Super Admin
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-inner">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/30">
                                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c2.76 0 5 2.24 5 5v2h-10v-2c0-2.76 2.24-5 5-5z" />
                                    <rect x="5" y="11" width="14" height="9" rx="2" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">What you unlock</p>
                                <p className="text-xs text-slate-500">Activate this module to continue</p>
                            </div>
                        </div>
                        <ul className="mt-4 space-y-3 text-sm text-slate-700">
                            {featureList.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
                                            <path d="M7.667 13.2 4.8 10.333l-1.2 1.2 4.067 4.067 8.533-8.533-1.2-1.2-7.333 7.333Z" />
                                        </svg>
                                    </span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-xs text-amber-800">
                            This module is managed by Super Admin. Once enabled, it will appear in your sidebar automatically.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumGate;
