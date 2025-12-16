'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { QUESTIONS } from './data'; // Ensure this path is correct relative to this file

export default function QuizStep({ onComplete }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // Stores { questionId: score }
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const question = QUESTIONS[currentIndex];
    // Calculate progress based on (Current Index + 1) / Total
    const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

    const handleOptionClick = (score) => {
        setSelectedOption(score);
    };

    const handleNext = () => {
        if (selectedOption === null) return;

        // 1. Update the answers object locally
        const newAnswers = { ...answers, [question.id]: selectedOption };
        setAnswers(newAnswers);

        setIsAnimating(true);

        // Small delay for animation
        setTimeout(() => {
            if (currentIndex < QUESTIONS.length - 1) {
                // MOVE TO NEXT QUESTION
                setCurrentIndex((prev) => prev + 1);
                setSelectedOption(null);
                setIsAnimating(false);
            } else {
                // FINISH ASSESSMENT
                // 1. Calculate Total Score
                const totalScore = Object.values(newAnswers).reduce((a, b) => a + b, 0);
                
                // 2. Format Answers for Backend: Convert Object to Array [3, 2, 4...]
                // We map over QUESTIONS to ensure the order is strictly Question 1 to 10
                const answersArray = QUESTIONS.map((q) => newAnswers[q.id]);

                // 3. Pass data to parent
                onComplete(totalScore, answersArray);
            }
        }, 260);
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
            // Retrieve previous answer to show it as selected
            const prevAnswer = answers[QUESTIONS[currentIndex - 1].id];
            setSelectedOption(prevAnswer ?? null);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 md:px-0 py-10">
            {/* Top Header */}
            <div className="flex justify-between text-gray-600 text-sm mb-2 font-medium">
                <span>
                    Question {currentIndex + 1} of {QUESTIONS.length}
                </span>
                <span>{Math.round(progress)}% Complete</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden mb-10">
                <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }} 
                />
            </div>

            {/* Question Box */}
            <div className={`bg-white border border-gray-100 shadow-xl rounded-3xl p-8 md:p-12 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                
                {/* Number Badge + Question Text */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="w-12 h-12 rounded-full bg-[#FF7A1A] flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {question.id}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
                        {question.text}
                    </h2>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    {question.options.map((option, idx) => {
                        const isSelected = selectedOption === option.score;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionClick(option.score)}
                                className={`
                                    w-full p-5 flex items-center gap-4 border-2 rounded-2xl text-left transition-all duration-200
                                    ${isSelected 
                                        ? 'border-blue-600 bg-orange-50/50 shadow-md' 
                                        : 'border-gray-200 hover:border-orange-300 bg-white hover:bg-gray-50'
                                    }
                                `}
                            >
                                {/* Custom Radio Circle */}
                                <div className={`
                                    w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                                    ${isSelected ? 'border-orange-500' : 'border-gray-300'}
                                `}>
                                    {isSelected && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                                </div>

                                <span className={`text-lg font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {option.text}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Footer Navigation */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                    {/* Previous Button */}
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-gray-500 font-medium transition-colors
                            ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-gray-50 hover:text-gray-800'}
                        `}
                    >
                        <ArrowLeft size={20} /> Previous
                    </button>

                    {/* Next / Finish Button */}
                    <button
                        onClick={handleNext}
                        disabled={selectedOption === null}
                        className={`
                            flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all transform
                            ${selectedOption === null 
                                ? 'bg-orange-300 cursor-not-allowed' 
                                : 'bg-[#FF7A1A] hover:bg-orange-600 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                            }
                        `}
                    >
                        {currentIndex === QUESTIONS.length - 1 ? 'Finish' : 'Next'}
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}