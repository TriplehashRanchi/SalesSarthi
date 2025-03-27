"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactApexChart from "react-apexcharts";
import { useSelector } from "react-redux";
import Link from "next/link";
import Dropdown from "@/components/dropdown";
import IconHorizontalDots from "@/components/icon/icon-horizontal-dots";
import IconEye from "@/components/icon/icon-eye";
import { IRootState } from "@/store";

// Function to generate chart options dynamically
const generateChartOptions = (data, color) => ({
  series: [{ data }],
  options: {
    chart: { height: 45, type: "line", sparkline: { enabled: true } },
    stroke: { width: 2 },
    markers: { size: 0 },
    colors: [color],
    grid: { padding: { top: 0, bottom: 0, left: 0 } },
    tooltip: {
      x: { show: false },
      y: { title: { formatter: () => "" } },
    },
    responsive: [
      {
        breakpoint: 576,
        options: {
          chart: { height: 95 },
          grid: { padding: { top: 45, bottom: 0, left: 0 } },
        },
      },
    ],
  },
});

const Superdash = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalUsers: 0,
    totalCustomers: 0,
    totalLeads: 0,
    totalAppointments: 0,
    totalFollowups: 0,
    totalRenewalReminders: 0,
  });

  useEffect(() => {
    setIsMounted(true);
    const fetchStats = async () => {
      try {
        const response = await axios.get("/api/superadmin/stats");
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };
    fetchStats();
  }, []);

  // const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === "rtl";

  const chartData = {
    admins: generateChartOptions([10, 15, 20, 25, 30, 35, 40, 50], "#00ab55"),
    users: generateChartOptions([5, 10, 15, 20, 25, 30, 35, 40], "#e7515a"),
    customers: generateChartOptions([2, 5, 8, 12, 18, 22, 28, 35], "#00ab55"),
  };

  const statsData = [
    { title: "Total Admins", count: stats.totalAdmins, bg: "from-cyan-500 to-cyan-400" },
    { title: "Total Users", count: stats.totalUsers, bg: "from-violet-500 to-violet-400" },
    { title: "Total Customers", count: stats.totalCustomers, bg: "from-blue-500 to-blue-400" },
    { title: "Total Leads", count: stats.totalLeads, bg: "from-fuchsia-500 to-fuchsia-400" },
    { title: "Total Appointments", count: stats.totalAppointments, bg: "from-green-500 to-green-400" },
    { title: "Total Follow-ups", count: stats.totalFollowups, bg: "from-red-500 to-red-400" },
    { title: "Total Renewal Reminders", count: stats.totalRenewalReminders, bg: "from-orange-500 to-orange-400" },
  ];

  return (
    <div>
      {/* Breadcrumb Navigation */}
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

      {/* Statistics Cards */}
      <div className="pt-5">
        <div className="mb-6 grid grid-cols-1 gap-6 text-white sm:grid-cols-2 xl:grid-cols-4">
          {statsData.map((stat, index) => (
            <div key={index} className={`panel bg-gradient-to-r ${stat.bg}`}>
              <div className="flex justify-between">
                <div className="text-md font-semibold">{stat.title}</div>
                <Dropdown
                  offset={[0, 5]}
                  // placement={isRtl ? "bottom-start" : "bottom-end"}
                  btnClassName="hover:opacity-80"
                  button={<IconHorizontalDots className="opacity-70 hover:opacity-80" />}
                >
                  <ul className="text-black dark:text-white-dark">
                    <li>
                      <button type="button">View Report</button>
                    </li>
                    <li>
                      <button type="button">Edit Report</button>
                    </li>
                  </ul>
                </Dropdown>
              </div>
              <div className="mt-5 flex items-center">
                <div className="text-3xl font-bold">{stat.count}</div>
              </div>
              <div className="mt-5 flex items-center font-semibold">
                <IconEye className="shrink-0 ltr:mr-2 rtl:ml-2" />
                View Details
              </div>
            </div>
          ))}
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isMounted &&
            Object.keys(chartData).map((key, index) => (
              <div key={index} className="panel p-4 bg-white dark:bg-gray-800">
                <ReactApexChart
                  options={chartData[key].options}
                  series={chartData[key].series}
                  type="line"
                  height={45}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Superdash;
