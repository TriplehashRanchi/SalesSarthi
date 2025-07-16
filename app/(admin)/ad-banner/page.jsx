'use client';
import Banner from '@/components/banner/banner';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

const BannerPage = () => {
    const { user } = useAuth();
    return (
        <div>
            <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 mb-4 rounded-md shadow-md">
                <div className="text-sm md:text-lg font-semibold text-white">
                    {user ? `Hello ${user.displayName || 'User'} !` : 'Hello User !'}
                </div>
                <div className="hidden md:blocktext-sm italic text-gray-200">
                    Welcome to world of Craffted banners By Digital Gyani Saarthi
                </div>
            </div>
            <Banner />
        </div>
    );
};

export default BannerPage;
