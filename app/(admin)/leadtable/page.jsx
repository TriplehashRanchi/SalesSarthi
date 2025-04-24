
import ComponentsDatatablesMultiColumn from '@/components/Leadtable/leadtable';

import React from 'react';

// MultiColumn.jsx  (or wherever that green-bar button lives)


const MultiColumn = () => {


    return (
        <div>
            <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
                <div className="text-lg font-semibold text-white">Hello USER !</div>
                <div className="text-sm italic text-gray-200">You got 7 fresh leads , Check them out .</div>
            </div>
            {/* Action Buttons Bar */}
          
            <ComponentsDatatablesMultiColumn  userId = {null}/>
        </div>
    );
};

export default MultiColumn;
