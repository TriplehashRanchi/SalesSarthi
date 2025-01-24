import ComponentsDatatablesMultiColumn from '@/components/leadtable/leadtable';
import IconBell from '@/components/icon/icon-bell';
import React from 'react';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGoogle from '@/components/icon/icon-google';

const MultiColumn = () => {
    return (
        <div>
            <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
                <div className="text-lg font-semibold text-white">Hello Yogendra !</div>
                <div className="text-sm italic text-gray-200">You got 7 fresh leads , check them out .</div>
            </div>
            {/* Action Buttons Bar */}
            <div className="panel flex mt-8 items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-green-500 via-teal-200 to-white-700 rounded-md mb-4 shadow-md">
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
            </div>
            <ComponentsDatatablesMultiColumn />
        </div>
    );
};

export default MultiColumn;
