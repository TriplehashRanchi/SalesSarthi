'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import superAdminAxios from '@/utils/superAdminAxios';
import { useRouter } from 'next/navigation';
const Superdash = dynamic(() => import('@/components/dashboard/superdash'), {
  ssr: false
});

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
    <Superdash/>
  );
};

export default SuperAdminDashboard;
