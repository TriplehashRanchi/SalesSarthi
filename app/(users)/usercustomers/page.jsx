"use client";
import Customertable from '@/components/usertable/customerTable2';
import IconBell from '@/components/icon/icon-bell';
import React from 'react';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGoogle from '@/components/icon/icon-google';
import { useAuth } from '@/context/AuthContext';

const MultiColumn = () => {
      const { user, profile } = useAuth();
    return (
        <div>
            <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
                <div className="text-xs md:text-lg font-semibold text-white">Hello {user ? user.displayName || 'User' : profile ? profile.name || 'User' : 'User'} !</div>
                <div className="hidden md:block text-sm italic text-gray-200">You got 7 fresh leads , Check them out .</div>
            </div>
            {/* Action Buttons Bar */}
          
            <Customertable />
        </div>
    );
};

export default MultiColumn;
