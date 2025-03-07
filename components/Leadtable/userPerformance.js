'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import IconArrowForward from '../icon/icon-arrow-forward';
import IconArrowLeft from '../icon/icon-arrow-left';
import IconArrowBackward from '../icon/icon-arrow-backward';
import IconMultipleForwardRight from '../icon/icon-multiple-forward-right';
import { useAuth } from '@/context/AuthContext';

// Dummy Lead Performance Data
const leadPerformance = {
    1: {
        total: 100,
        hot: 20,
        cold: 50,
        converted: 10,
        contacted: 20,
        leads: [
            { name: 'Lead A', type: 'hot', source: 'Website', contact: '+91 98765 43210' },
            { name: 'Lead B', type: 'hot', source: 'LinkedIn', contact: '+91 99887 76543' },
            { name: 'Lead C', type: 'hot', source: 'Referral', contact: '+91 87654 32109' },
            { name: 'Lead X', type: 'cold', source: 'Cold Call', contact: '+91 91234 56789' },
            { name: 'Lead Y', type: 'cold', source: 'Facebook', contact: '+91 90123 45678' },
            { name: 'Lead M', type: 'converted', source: 'Google Ads', contact: '+91 78901 23456' },
            { name: 'Lead P', type: 'contacted', source: 'Instagram', contact: '+91 67890 12345' },
            { name: 'Lead Q', type: 'contacted', source: 'Twitter', contact: '+91 56789 01234' },
        ],
    },
    2: {
        total: 150,
        hot: 30,
        cold: 70,
        converted: 20,
        contacted: 30,
        leads: [
            { name: 'Lead D', type: 'hot', source: 'Google Ads', contact: '+91 76543 21098' },
            { name: 'Lead E', type: 'hot', source: 'Referral', contact: '+91 65432 10987' },
            { name: 'Lead Z', type: 'cold', source: 'Cold Call', contact: '+91 54321 09876' },
            { name: 'Lead N', type: 'converted', source: 'Website', contact: '+91 43210 98765' },
            { name: 'Lead R', type: 'contacted', source: 'LinkedIn', contact: '+91 32109 87654' },
        ],
    },
    3: {
        total: 80,
        hot: 15,
        cold: 40,
        converted: 5,
        contacted: 20,
        leads: [
            { name: 'Lead F', type: 'hot', source: 'Facebook', contact: '+91 21098 76543' },
            { name: 'Lead W', type: 'cold', source: 'Cold Call', contact: '+91 10987 65432' },
            { name: 'Lead O', type: 'converted', source: 'Referral', contact: '+91 09876 54321' },
            { name: 'Lead S', type: 'contacted', source: 'Instagram', contact: '+91 98765 43210' },
            { name: 'Lead T', type: 'contacted', source: 'Website', contact: '+91 87654 32109' },
        ],
    },
};

// Dummy User Data
const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', avatar: '/avatar1.png' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', avatar: '/avatar2.png' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', avatar: '/avatar3.png' },
];

export default function UserPerformance() {
    const router = useRouter();
    const params = useParams();
    const userId = params?.id ? parseInt(params.id) : users[0].id;
    const [currentUserIndex, setCurrentUserIndex] = useState(0);
    const [filter, setFilter] = useState('all');

    const { user, logout } = useAuth();
    console.log(user);

    useEffect(() => {
        const index = users.findIndex((user) => user.id === userId);
        if (index !== -1) setCurrentUserIndex(index);
    }, [userId]);

    const handleNavigation = (direction) => {
        let newIndex = currentUserIndex + direction;
        if (newIndex >= 0 && newIndex < users.length) {
            setCurrentUserIndex(newIndex);
            router.push(`/user-performance/${users[newIndex].id}`);
        }
    };

    const currentUser = users[currentUserIndex];
    const stats = leadPerformance[currentUser.id];

    // Filter Leads for Table
    const filteredLeads = filter === 'all' ? stats.leads : stats.leads.filter((lead) => lead.type === filter);

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            <button onClick={logout}>Sign Out</button>
            {/* Top Section */}
            <div className="flex items-center justify-between p-6 bg-white shadow-md">
                {/* Left: Previous User */}
                <button
                    onClick={() => handleNavigation(-1)}
                    disabled={currentUserIndex === 0}
                    className="text-gray-600 text-2xl px-4 py-2 disabled:opacity-50"
                >
                    <IconArrowBackward/>
                </button>

                {/* Center: User Info */}
                <div className="flex flex-col items-center">
                <img className="w-20 h-20 rounded-full overflow-hidden object-cover" src="/assets/images/profile-16.jpeg" alt="img" />  
                    <h1 className="text-xl font-bold">{currentUser.name}</h1>
                    <p className="text-gray-500">{currentUser.email}</p>
                </div>

                {/* Right: Next User */}
                <button
                    onClick={() => handleNavigation(1)}
                    disabled={currentUserIndex === users.length - 1}
                    className="text-gray-600 text-2xl px-4 py-2 disabled:opacity-50"
                >
                  <IconArrowLeft/>
                </button>
            </div>  

            {/* Performance Metrics - Clickable */}
            <div className="grid grid-cols-5 gap-4 p-6">
                <div className={`p-4 rounded-md text-center font-bold cursor-pointer transition-all ${filter === 'hot' ? 'bg-blue-400' : 'bg-blue-200'}`} onClick={() => setFilter('hot')}>
                    🔥 Hot Leads: {stats.hot}
                </div>
                <div className={`p-4 rounded-md text-center font-bold cursor-pointer transition-all ${filter === 'cold' ? 'bg-red-400' : 'bg-red-200'}`} onClick={() => setFilter('cold')}>
                    ❄️ Cold Leads: {stats.cold}
                </div>
                <div
                    className={`p-4 rounded-md text-center font-bold cursor-pointer transition-all ${filter === 'converted' ? 'bg-green-400' : 'bg-green-200'}`}
                    onClick={() => setFilter('converted')}
                >
                    ✅ Converted: {stats.converted}
                </div>
                <div
                    className={`p-4 rounded-md text-center font-bold cursor-pointer transition-all ${filter === 'contacted' ? 'bg-yellow-400' : 'bg-yellow-200'}`}
                    onClick={() => setFilter('contacted')}
                >
                    📞 Contacted: {stats.contacted}
                </div>
                <div className="p-4 bg-gray-300 rounded-md text-center font-bold cursor-pointer" onClick={() => setFilter('all')}>
                    📊 Total: {stats.total}
                </div>
            </div>

            {/* Leads Table */}
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Leads</h2>
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-200 text-left">
                                <th className="border p-2">#</th>
                                <th className="border p-2">Lead Name</th>
                                <th className="border p-2">Category</th>
                                <th className="border p-2">Lead Source</th>
                                <th className="border p-2">Status</th>
                                <th className="border p-2">Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.length > 0 ? (
                                filteredLeads.map((lead, index) => (
                                    <tr key={index} className={`border-b ${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}>
                                        <td className="border p-2 text-center">{index + 1}</td>
                                        <td className="border p-2">{lead.name}</td>
                                        <td className="border p-2 capitalize">{lead.type}</td>
                                        <td className="border p-2">{lead.source || 'Website'}</td>
                                        <td className="border p-2">
                                            {lead.type === 'hot' && '🔥 Urgent'}
                                            {lead.type === 'cold' && '❄️ Needs Nurturing'}
                                            {lead.type === 'converted' && '✅ Successful'}
                                            {lead.type === 'contacted' && '📞 Follow-Up'}
                                        </td>
                                        <td className="border p-2">{lead.contact || '+91 98765 43210'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="border p-2 text-center text-gray-500">
                                        No leads available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between p-6">
                <button
                    disabled={currentUserIndex === 0}
                    onClick={() => handleNavigation(-1)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow-md disabled:bg-gray-300 hover:bg-gray-700 transition-all"
                >
                    ← Previous
                </button>
                <button
                    disabled={currentUserIndex === users.length - 1}
                    onClick={() => handleNavigation(1)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md disabled:bg-gray-300 hover:bg-blue-700 transition-all"
                >
                    Next →
                </button>
            </div>
        </div>
    );
}
