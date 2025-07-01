"use client"
import ComponentsDatatablesMultiColumn from '@/components/usertable/leadtable2';
import IconBell from '@/components/icon/icon-bell';
import React from 'react';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGoogle from '@/components/icon/icon-google';
import { getAuth } from 'firebase/auth';

const MultiColumn = () => {
    const auth = getAuth();
    const user = auth.currentUser;

    return (
        <div>
             <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
                <div className="text-sm md:text-lg font-semibold text-white">{user ? `Hello ${user.displayName || 'User'} !` : 'Hello User !'}</div>
                <div className="hidden md:block text-sm italic text-gray-200">Your leads are awaiting your attention</div>
            </div>
            <ComponentsDatatablesMultiColumn />
        </div>
    );
};

export default MultiColumn;
