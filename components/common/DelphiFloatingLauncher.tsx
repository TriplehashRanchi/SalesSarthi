'use client';

import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import IconPhoneCall from '@/components/icon/icon-phone-call';

const DEFAULT_EMBED_URL = 'https://www.delphi.ai/embeddable/config/98b611f5-1c81-41e8-a5d9-87a0b3a32e5e';

type DelphiFloatingLauncherProps = {
    variant?: 'floating' | 'sidebar';
};

const DelphiFloatingLauncher = ({ variant = 'floating' }: DelphiFloatingLauncherProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const embedUrl = process.env.NEXT_PUBLIC_DELPHI_EMBED_URL || DEFAULT_EMBED_URL;
    const isSidebar = variant === 'sidebar';

    return (
        <>
            {isOpen && (
                <section className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px]" aria-label="Talk to Yogendra Malik">
                    <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setIsOpen(false)} aria-label="Close Delphi backdrop" />

                    <div className="absolute bottom-0 right-0 top-0 z-[91] h-full w-full bg-white shadow-[-24px_0_60px_rgba(15,23,42,0.18)] sm:w-[90vw] md:w-[62vw] lg:w-[48vw] xl:w-[40vw]">
                        <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 sm:hidden">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                aria-label="Close Delphi"
                            >
                                <ChevronRight size={16} />
                                <span>Close</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 z-[92] hidden h-11 w-11 items-center justify-center rounded-full bg-black/10 text-slate-700 backdrop-blur transition hover:bg-black/15 sm:inline-flex"
                            aria-label="Close Delphi"
                            title="Close"
                        >
                            <X size={18} />
                        </button>

                        <iframe
                            src={embedUrl}
                            title="Yogendra Malik Delphi"
                            className="h-[calc(100%-56px)] w-full border-0 sm:h-full"
                            allow="microphone; camera; autoplay; clipboard-read; clipboard-write"
                            allowFullScreen
                        />
                    </div>
                </section>
            )}

            <div className={isSidebar ? '' : 'group fixed bottom-6 right-4 z-[81] hidden md:block md:right-6'}>
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    aria-label={isOpen ? 'Close Yogendra Malik assistant' : 'Open Yogendra Malik assistant'}
                    className={
                        isSidebar
                            ? 'flex w-full items-center text-black dark:text-[#506690] dark:hover:text-white-dark'
                            : 'flex items-center gap-3 overflow-hidden rounded-full border border-white/35 bg-white/16 px-2 py-2 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.24)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/24 dark:text-white supports-[backdrop-filter]:bg-white/10'
                    }
                >
                    <span
                        className={
                            isSidebar
                                ? 'flex shrink-0 items-center justify-center'
                                : 'relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-sky-700 to-cyan-400 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)]'
                        }
                    >
                        {!isSidebar && <span className="absolute inset-[2px] rounded-full border border-white/20" />}
                        <IconPhoneCall className={isSidebar ? 'h-5 w-5' : 'relative z-[1] h-5 w-5'} />
                    </span>

                    {isSidebar ? (
                        <span className="ltr:pl-3 rtl:pr-3">Call</span>
                    ) : (
                        <span className="max-w-0 overflow-hidden whitespace-nowrap pr-0 text-left opacity-0 transition-all duration-300 group-hover:max-w-[220px] group-hover:pr-3 group-hover:opacity-100">
                            {/* <span className="block text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/55">Mirror UI</span> */}
                            <span className="block text-sm font-semibold">Talk to Yogendra Malik</span>
                        </span>
                    )}
                </button>
            </div>
        </>
    );
};

export default DelphiFloatingLauncher;
