'use client';

import { useEffect } from 'react';

export default function CelebrationPopup({ item, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 20000); // auto close after 20s
        return () => clearTimeout(timer);
    }, [onClose]);

    const isBirthday = item.type === 'birthday';

    return (
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-300
                        bg-white border border-slate-200 shadow-xl rounded-2xl
                        p-4 w-80 relative">
            
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
            >
                ✕
            </button>

            <div className="flex items-start gap-3">
                <div className="text-3xl">
                    {isBirthday ? '🎂' : '🎉'}
                </div>

                <div className="flex-1">
                    <div className="font-bold text-slate-900">
                        {isBirthday
                            ? `Today is ${item.username}'s Birthday`
                            : `${item.username}'s Work Anniversary`}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                        {isBirthday
                            ? 'Wish them a great year ahead!'
                            : item.years_completed > 0
                                ? `${item.years_completed} years completed 🎊`
                                : 'Celebrate the journey 🎊'}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-3">
                        <button
                            onClick={onClose}
                            className="text-xs px-3 py-1 rounded-full
                                       bg-slate-100 hover:bg-slate-200
                                       text-slate-600 font-semibold"
                        >
                            Seen
                        </button>

                        <button
                            onClick={onClose}
                            className="text-xs px-3 py-1 rounded-full
                                       bg-red-50 hover:bg-red-100
                                       text-red-600 font-semibold"
                        >
                            Not Interested
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
