// components/assessment/WelcomeStep.jsx
import { ArrowRight } from 'lucide-react';

export default function WelcomeStep({ onStart }) {
    return (
        // No background colors here. Just content.
        <div className="w-full flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700 px-4">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-gray-600 font-semibold text-sm mb-6 border border-orange-100 shadow-sm">✨ by Digital Gyani</div>

            <h1
                className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 
                bg-gradient-to-r from-purple-600 via-blue-600 to-blue-400 
                bg-clip-text text-transparent"
            >
                Freedom Kundli
            </h1>

            <h2 className="text-xl md:text-2xl text-gray-700 font-medium mb-6">Discover Your Path to Financial Freedom</h2>

            <p className="max-w-2xl text-gray-600 text-base md:text-lg leading-relaxed font-medium mb-10">
                Take our comprehensive assessment to understand your financial potential and discover how you can transform your life as a Financial Advisor.
            </p>

            <button
                onClick={onStart}
                className="bg-gradient-to-r from-[#FF7A30] to-[#FFB347] 
             hover:opacity-90 
             text-white font-semibold 
             py-3 px-12 
             rounded-2xl 
             text-lg 
             shadow-md 
             transition-all duration-300 flex items-center gap-3"
            >
                Start Your Journey
                <ArrowRight size={22} />
            </button>

            {/* Glassmorphism Stats Box */}
            <div className="grid grid-cols-3 gap-5 w-full mt-20 max-w-2xl mb-10">
                <div className="text-center">
                    <p className="text-3xl font-extrabold text-orange-500">10</p>
                    <p className="text-xs text-gray-800 font-bold uppercase mt-1">Questions</p>
                </div>
                <div className="text-center border-l border-r border-gray-400/20">
                    <p className="text-3xl font-extrabold text-blue-600">5 min</p>
                    <p className="text-xs text-gray-800 font-bold uppercase mt-1">Assessment</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-extrabold text-green-600">100%</p>
                    <p className="text-xs text-gray-800 font-bold uppercase mt-1">Free</p>
                </div>
            </div>
        </div>
    );
}
