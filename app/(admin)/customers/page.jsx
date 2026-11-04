"use client";
import Customertable from '@/components/Leadtable/customerTable';
import CustomerFolders from '@/components/customers/CustomerFolders';
import React from 'react';

import { useAuth } from '@/context/AuthContext';

const MultiColumn = () => {

    const { user, profile } = useAuth();
    return (
        <div>
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
            <CustomerFolders isAdmin>
                <Customertable profile={profile || null}/>
            </CustomerFolders>
        </div>
    );
};

export default MultiColumn;
