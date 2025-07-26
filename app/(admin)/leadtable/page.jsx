'use client';
import ComponentsDatatablesMultiColumn from '@/components/Leadtable/leadtable';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

// MultiColumn.jsx  (or wherever that green-bar button lives)


const MultiColumn = () => {

    const { user, profile } = useAuth();

    return (
        <div>
            <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
                <div className="text-sm md:text-lg font-semibold text-white">{user ? `Hello ${user.displayName || 'User'} !` : 'Hello User !'}</div>
                <div className="hidden md:block text-sm italic text-gray-200">Your leads are awaiting your attention</div>
            </div>
            {/* Action Buttons Bar */}
          
            <ComponentsDatatablesMultiColumn  profile = {profile || null}/>
        </div>
    );
};

export default MultiColumn;
