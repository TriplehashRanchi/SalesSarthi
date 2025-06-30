'use client';

import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import IconArrowBackward from '../icon/icon-arrow-backward';
import IconArrowLeft from '../icon/icon-arrow-left';
import LeadTable from './leadtable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function UserPerformance() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    
    const [teamMembers, setTeamMembers] = useState([]);
    const [currentUserIndex, setCurrentUserIndex] = useState(0);
    const [filter, setFilter] = useState(searchParams.get('filter') || 'all');

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    useEffect(() => {
        setFilter(searchParams.get('filter') || 'all');
    }, [searchParams]);

    const fetchTeamMembers = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                alert('You must be logged in!');
                return;
            }

            const token = await user.getIdToken();
            const response = await fetch(`${API_URL}/api/admin/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users.');
            }

            const data = await response.json();
            setTeamMembers(data);
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    const userId = params?.id ? parseInt(params.id) : teamMembers[0]?.id;
    
    useEffect(() => {
        if (teamMembers.length > 0) {
            const index = teamMembers.findIndex((user) => user.id === userId);
            if (index !== -1) setCurrentUserIndex(index);
        }
    }, [userId, teamMembers]);

    const handleNavigation = (direction) => {
        let newIndex = currentUserIndex + direction;
        if (newIndex >= 0 && newIndex < teamMembers.length) {
            router.push(`/user-performance/${teamMembers[newIndex].id}?filter=${filter}`);
        }
    };

    const updateFilter = (newFilter) => {
        router.push(`/user-performance/${userId}?filter=${newFilter}`);
    };

    if (teamMembers.length === 0) return <p>Loading...</p>;

    const currentUser = teamMembers[currentUserIndex];

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            {/* Top Section */}
            <div className="flex items-center justify-between p-6 bg-white shadow-md">
                <button
                    onClick={() => handleNavigation(-1)}
                    disabled={currentUserIndex === 0}
                    className="text-gray-600 text-2xl px-4 py-2 disabled:opacity-50"
                >
                    <IconArrowBackward />
                </button>

                <div className="flex flex-col items-center">
                <img className="w-20 h-20 rounded-full overflow-hidden object-cover" src="/assets/images/profile-16.jpeg" alt="img" />  
                    <h1 className="text-xl font-bold">{currentUser.username}</h1>
                    <p className="text-gray-500">{currentUser.email}</p>
                </div>

                <button
                    onClick={() => handleNavigation(1)}
                    disabled={currentUserIndex === teamMembers.length - 1}
                    className="text-gray-600 text-2xl px-4 py-2 disabled:opacity-50"
                >
                    <IconArrowLeft />
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-5 gap-4 p-6">
                {['hot', 'cold', 'converted', 'contacted', 'all'].map((type) => (
                    <div
                        key={type}
                        className={`p-4 rounded-md text-center font-bold cursor-pointer transition-all ${
                            filter === type ? 'bg-blue-400' : 'bg-blue-200'
                        }`}
                        onClick={() => updateFilter(type)}
                    >
                        {type.toUpperCase()}
                    </div>
                ))}
            </div>

            {/* Leads Table */}
            <LeadTable userId={userId} />
        </div>
    );
}
