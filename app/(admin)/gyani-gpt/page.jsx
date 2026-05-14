'use client';

const EMBED_URL = process.env.NEXT_PUBLIC_DELPHI_EMBED_URL || 'https://www.delphi.ai/embeddable/config/98b611f5-1c81-41e8-a5d9-87a0b3a32e5e';

const GyaniGptPage = () => {
    return (
        <div className="flex h-[calc(100dvh-60px)] flex-col md:h-[calc(100dvh-80px)]">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 md:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-sky-700 to-cyan-400">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                </div>
                <div>
                    <p className="text-[13px] font-bold text-slate-900">Gyani GPT</p>
                    <p className="text-[11px] text-slate-500">Talk to Yogendra Malik</p>
                </div>
            </div>

            <iframe
                src={EMBED_URL}
                title="Gyani GPT – Talk to Yogendra Malik"
                className="flex-1 w-full border-0"
                allow="microphone; camera; autoplay; clipboard-read; clipboard-write"
                allowFullScreen
            />
        </div>
    );
};

export default GyaniGptPage;
