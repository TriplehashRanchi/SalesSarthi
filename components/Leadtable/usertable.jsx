'use client';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UserList({ users }) {

  const [TeamMembers, setTeamMembers] = useState([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
            setTeamMembers(data); // Assuming API returns an array of team members
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const router = useRouter();

    return (
        <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 shadow-md bg-white">
                <thead className="bg-gray-200 text-gray-700">
                    <tr>
                        <th className="p-4 text-left">👤 Name</th>
                        <th className="p-4 text-left">📌 Role</th>
                        <th className="p-4 text-left">📧 Email</th>
                        {/* <th className="p-4 text-left">📞 Phone</th> */}
                        <th className="p-4 text-center">🔍 Action</th>
                    </tr>
                </thead>
                <tbody>
                    {TeamMembers.length > 0 ? (
                        TeamMembers.map((user) => (
                            <tr key={user.id} className="border-t hover:bg-gray-100 transition duration-200">
                                <td className="p-4">{user.username}</td>
                                <td className="p-4">{user.role}</td>
                                <td className="p-4">{user.email}</td>
                                {/* <td className="p-4">{user.phone}</td> */}
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => router.push(`/user-performance/${user.id}`)}
                                        className="px-5 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-all"
                                    >
                                        View Leads
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className="p-4 text-center text-gray-500">
                                No users found!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
