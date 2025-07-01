'use client';
import Calc from '@/components/forms/calcform3';
import IconBell from '@/components/icon/icon-bell';
import { IconArrowBack, IconArrowLeft } from '@tabler/icons-react';
import React from 'react';

const Calculator = () => {
    return (
        <div>
            <div className="panel hidden md:flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 m-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 mb-4 rounded-md shadow-md">
                <div className="text-lg font-semibold text-white">
                    Thought of the Day
                </div>
                <div className="text-sm italic text-gray-200">
                    "The only way to do great work is to love what you do." — Steve Jobs
                </div>
            </div>
            <div className='flex py-2 top-4 left-4 md:hidden'><IconArrowLeft onClick={() => window.history.back()} className='cursor-pointer' />Go back</div>
            <Calc/>
        </div>
    );
};

export default Calculator;
