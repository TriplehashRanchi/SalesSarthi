'use client';
import ComponentsDatatablesMultiColumn from '@/components/Leadtable/leadtable';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

// MultiColumn.jsx  (or wherever that green-bar button lives)


const MultiColumn = () => {

    const { user, profile } = useAuth();

    return (
        <div>
            {/* Action Buttons Bar */}
          
            <ComponentsDatatablesMultiColumn  profile = {profile || null}/>
        </div>
    );
};

export default MultiColumn;
