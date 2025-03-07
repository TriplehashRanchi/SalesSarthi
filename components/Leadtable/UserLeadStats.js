'use client'
import { useState, useEffect } from 'react';
import { Card, Text, Loader } from '@mantine/core';
import axios from 'axios';

const UserLeadStats = ({ user }) => {
    const [leadStats, setLeadStats] = useState(null);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const fetchLeadStats = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/leads/stats/${user.id}`);
                setLeadStats(response.data);
            } catch (error) {
                console.error('Error fetching lead stats:', error);
            }
        };

        fetchLeadStats();
    }, [user]);

    if (!leadStats) return <Loader />;

    return (
        <Card shadow="sm" className="mt-4">
            <Text size="lg" weight={500}>{user.first_name} {user.last_name}'s Lead Performance</Text>
            <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-2 bg-blue-100 rounded">
                    <Text size="sm">Total Leads</Text>
                    <Text weight={700}>{leadStats.total}</Text>
                </div>
                <div className="p-2 bg-red-100 rounded">
                    <Text size="sm">Hot Leads 🔥</Text>
                    <Text weight={700}>{leadStats.hot}</Text>
                </div>
                <div className="p-2 bg-gray-100 rounded">
                    <Text size="sm">Cold Leads ❄️</Text>
                    <Text weight={700}>{leadStats.cold}</Text>
                </div>
                <div className="p-2 bg-green-100 rounded">
                    <Text size="sm">Converted ✅</Text>
                    <Text weight={700}>{leadStats.converted}</Text>
                </div>
                <div className="p-2 bg-yellow-100 rounded">
                    <Text size="sm">Contacted 📞</Text>
                    <Text weight={700}>{leadStats.contacted}</Text>
                </div>
            </div>
        </Card>
    );
};

export default UserLeadStats;
