"use client";
import Customertable from '@/components/Leadtable/customerTable';
import React from 'react';

import { useAuth } from '@/context/AuthContext';

const MultiColumn = () => {

    const { user } = useAuth();
    return (
        <div>
            <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
                <div className="text-xs md:text-lg font-semibold text-white">{user ? `Hello ${user.displayName || 'User'} !` : 'Hello User !'}</div>
                <div className="hidden md:blocktext-sm italic text-gray-200"> More the customers merrier the business </div>
            </div>
            {/* Action Buttons Bar */}
            {/* <div className="panel flex mt-8 items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-green-500 via-teal-200 to-white-700 rounded-md mb-4 shadow-md">
                <div className="text-lg font-semibold text-white">Actions</div>
                <div className="space-x-4">
                    <button className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg">
                        <span className="flex gap-2 align-center">
                            <IconFacebook />
                            Import from Facebook
                        </span>
                    </button>
                    <button className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg">
                        <span className="flex gap-2 align-center">
                            <IconGoogle />
                            Import from Google
                            
                        </span>
                    </button>
                    <button className="px-4 py-2 bg-green-500 hover:bg-green-700 text-white rounded-lg">CSV Bulk Upload</button>
                </div>
            </div> */}
            <Customertable />
        </div>
    );
};

export default MultiColumn;
