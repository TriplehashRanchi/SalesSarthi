import Login from '@/components/auth/login';
import React from 'react';

const BannerPage = () => {
    return (
        <div>
            <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 mb-4 rounded-md shadow-md">
                <div className="text-lg font-semibold text-white">
                    Thought of the Day
                </div>
                <div className="text-sm italic text-gray-200">
                    "The only way to do great work is to love what you do." — Steve Jobs
                </div>
            </div>
            <Login />
        </div>
    );
};

export default BannerPage;
