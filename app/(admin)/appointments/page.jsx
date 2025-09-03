import AppointmentTable from '@/components/Leadtable/appointmentTable';
import IconBell from '@/components/icon/icon-bell';
import React from 'react';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGoogle from '@/components/icon/icon-google';

const Appointment = () => {
    return (
        <div>
            {/* <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
                <div className="text-lg font-semibold text-white">Hello Yogendra !</div>
                <div className="text-sm italic text-gray-200">You got 7 fresh leads , check them out .</div>
            </div> */}
            {/* Action Buttons Bar */}
          
            <AppointmentTable />
        </div>
    );
};

export default Appointment;
