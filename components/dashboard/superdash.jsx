'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import Link from 'next/link';
import Dropdown from '@/components/dropdown';
import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
import IconEye from '@/components/icon/icon-eye';

const Superdash = () => {
  const [stats, setStats] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('superadmin_token');
        const res = await axios.get(`${API_URL}/api/superadmin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

  if (!stats) return <p className="text-center mt-10">Loading dashboard...</p>;

  const statsData = [
    { title: 'Total Admins', count: stats.totals.admins, bg: 'from-cyan-500 to-cyan-400' },
    { title: 'Total Users', count: stats.totals.users, bg: 'from-violet-500 to-violet-400' },
    { title: 'Total Customers', count: stats.totals.customers, bg: 'from-blue-500 to-blue-400' },
    { title: 'Total Leads', count: stats.totals.leads, bg: 'from-fuchsia-500 to-fuchsia-400' },
    { title: 'Total Appointments', count: stats.totals.appointments, bg: 'from-green-500 to-green-400' },
    { title: 'Total Follow-ups', count: stats.totals.followups, bg: 'from-red-500 to-red-400' },
    { title: 'Total Renewal Reminders', count: stats.totals.renewals, bg: 'from-orange-500 to-orange-400' },
  ];

  const weeklyLeadChart = {
    series: [{ name: 'Leads', data: stats.weeklyLeads.map((item) => item.count) }],
    options: {
      chart: { type: 'line', height: 300 },
      xaxis: { categories: stats.weeklyLeads.map((item) => item.date) },
      title: { text: 'Weekly Leads', align: 'center' },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth' },
    },
  };

  const adminLeadChart = {
    series: [{ name: 'Leads', data: stats.adminLeads.map((item) => item.total) }],
    options: {
      chart: { type: 'bar', height: 300 },
      xaxis: { categories: stats.adminLeads.map((item) => item.admin) },
      title: { text: 'Leads per Admin', align: 'center' },
      plotOptions: { bar: { distributed: true } },
      dataLabels: { enabled: true },
    },
  };

  return (
    <div>
      {/* Breadcrumb */}
      <ul className="flex space-x-2 rtl:space-x-reverse">
        <li>
          <Link href="/" className="text-primary hover:underline">
            Dashboard
          </Link>
        </li>
        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
          <span>Super Admin</span>
        </li>
      </ul>

      {/* KPI Cards */}
      <div className="pt-5">
        <div className="mb-6 grid grid-cols-1 gap-6 text-white sm:grid-cols-2 xl:grid-cols-4">
          {statsData.map((stat, index) => (
            <div key={index} className={`panel bg-gradient-to-r ${stat.bg}`}>
              <div className="flex justify-between">
                <div className="text-md font-semibold">{stat.title}</div>
                <Dropdown
                  offset={[0, 5]}
                  btnClassName="hover:opacity-80"
                  button={<IconHorizontalDots className="opacity-70 hover:opacity-80" />}
                >
                  <ul className="text-black dark:text-white-dark">
                    <li><button type="button">View Report</button></li>
                    <li><button type="button">Edit Report</button></li>
                  </ul>
                </Dropdown>
              </div>
              <div className="mt-5 text-3xl font-bold">{stat.count}</div>
            </div>
          ))}
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="panel p-4 bg-white dark:bg-gray-800">
            <ReactApexChart options={weeklyLeadChart.options} series={weeklyLeadChart.series} type="line" height={300} />
          </div>
          <div className="panel p-4 bg-white dark:bg-gray-800">
            <ReactApexChart options={adminLeadChart.options} series={adminLeadChart.series} type="bar" height={300} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Superdash;
