import ComponentsDatatablesMultiColumn from '@/components/leadtable/leadtable';
import IconBell from '@/components/icon/icon-bell';
import React from 'react';

const MultiColumn = () => {
    return (
        <div>
            <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-primary">
                My Leads | Sales Sarthi
            </div>
            <ComponentsDatatablesMultiColumn />
        </div>
    );
};

export default MultiColumn;
