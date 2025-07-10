'use client';

import { useEffect, useState } from 'react';
import superAdminAxios from '@/utils/superAdminAxios';
import { useRouter } from 'next/navigation';

const SuperAdminDashboard = () => {
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      router.replace('/superadmin/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const { data } = await superAdminAxios.get('/api/superadmin/stats');
        setStats(data);
      } catch {
        router.replace('/superadmin/login');
      }
    };

    fetchStats();
  }, []);

  if (!stats) return <div className="text-center mt-10">Loading dashboard...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Super Admin Dashboard</h1>
      <p>Total Admins: {stats.totalAdmins}</p>
      <p>Total Revenue: ₹{stats.totalRevenue}</p>
    </div>
  );
};

export default SuperAdminDashboard;
