"use client";

import { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconMail from "@/components/icon/icon-mail";
import IconChatDot from "@/components/icon/icon-chat-dot";

const ReportingDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalLeads: 120,
    newLeads: 30,
    inProgressLeads: 50,
    convertedLeads: 40,
    totalAppointments: 80,
    scheduledAppointments: 50,
    completedAppointments: 25,
    missedAppointments: 5,
    customerConversions: 40,
    bestPerformer: "John Doe",
    avgResponseTime: "3 hours",
    upcomingMeetings: [
        { id: 1, client: "Rahul Sharma", time: "10:30 AM", status: "Scheduled", assignedTo: "John Doe" },
        { id: 2, client: "Sneha Mehta", time: "3:00 PM", status: "Rescheduled", assignedTo: "Sarah Lee" }
      ],
      upcomingRenewals: [
        { id: 1, customer: "Amit Verma", dueDate: "15th March", amount: "$500", status: "Pending" },
        { id: 2, customer: "Priya Kapoor", dueDate: "18th March", amount: "$250", status: "Pending" }
      ],
      pendingFollowUps: [
        { id: 1, name: "Suresh Nair", lastInteraction: "7th March", nextAction: "Call", assignedTo: "John Doe" },
        { id: 2, name: "Meenal Desai", lastInteraction: "9th March", nextAction: "Email", assignedTo: "Sarah Lee" }
      ]
  });

  const leadConversionRate = ((dashboardData.convertedLeads / dashboardData.totalLeads) * 100).toFixed(1);
  const missedAppointmentsRate = ((dashboardData.missedAppointments / dashboardData.totalAppointments) * 100).toFixed(1);

  const leadsChart = {
    series: [dashboardData.newLeads, dashboardData.inProgressLeads, dashboardData.convertedLeads],
    options: {
      labels: ["New", "In Progress", "Converted"],
      chart: { type: "donut" },
      colors: ["#00C49F", "#FFBB28", "#FF4842"],
    },
  };

  const teamPerformanceChart = {
    series: [{ name: "Performance", data: [70, 80, 65, 90, 75, 85] }],
    options: {
      chart: { type: "bar" },
      xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
      colors: ["#008FFB"],
    },
  };

  const appointmentChart = {
    series: [
      { name: "Scheduled", data: [50] },
      { name: "Completed", data: [25] },
      { name: "Missed", data: [5] },
    ],
    options: {
      chart: { type: "bar", stacked: true },
      xaxis: { categories: ["Appointments"] },
      colors: ["#008FFB", "#00E396", "#FF4560"],
    },
  };

  return (
    <div className="p-6 bg-white shadow-xl rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        Reporting Dashboard
      </h2>

      {/* TOP METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-white">
        <div className="bg-gradient-to-r from-green-500 to-green-400 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Leads</h3>
          <p className="text-3xl font-bold">{dashboardData.totalLeads}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-400 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Appointments</h3>
          <p className="text-3xl font-bold">{dashboardData.totalAppointments}</p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Customer Conversions</h3>
          <p className="text-3xl font-bold">{dashboardData.customerConversions}</p>
        </div>
      </div>

      {/* ADDITIONAL METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-400 p-4 rounded-lg shadow text-white">
          <h3 className="text-lg font-semibold">Lead Conversion Rate</h3>
          <p className="text-3xl font-bold">{leadConversionRate}%</p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-red-400 p-4 rounded-lg shadow text-white">
          <h3 className="text-lg font-semibold">Missed Appointments</h3>
          <p className="text-3xl font-bold">{missedAppointmentsRate}%</p>
        </div>
        <div className="bg-gradient-to-r from-gray-600 to-gray-500 p-4 rounded-lg shadow text-white">
          <h3 className="text-lg font-semibold">Best Performer</h3>
          <p className="text-xl font-bold">{dashboardData.bestPerformer}</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        <div className="p-4 bg-white shadow-md rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Leads Breakdown</h3>
          <ReactApexChart options={leadsChart.options} series={leadsChart.series} type="donut" height={250} />
        </div>
        <div className="p-4 bg-white shadow-md rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointments Analysis</h3>
          <ReactApexChart options={appointmentChart.options} series={appointmentChart.series} type="bar" height={250} />
        </div>
      </div>

      {/* UPCOMING REMINDERS */}
     {/* UPCOMING REMINDERS */}
<div className="mt-8">
  <h3 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Reminders</h3>
  <div className="bg-gray-100 p-4 rounded-lg shadow-md">
    
    {/* Today's Meetings */}
    <h4 className="text-lg font-semibold text-gray-700 mb-2">Today's Meetings</h4>
    {dashboardData.upcomingMeetings.length > 0 ? (
      dashboardData.upcomingMeetings.map((meeting) => (
        <div key={meeting.id} className="flex justify-between border-b py-2">
          <p className="text-gray-700">{meeting.client} - {meeting.time}</p>
          <span className="text-sm text-gray-600">{meeting.status}</span>
        </div>
      ))
    ) : (
      <p className="text-gray-500">No meetings scheduled</p>
    )}

    {/* Upcoming Renewals */}
    <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Upcoming Renewals</h4>
    {dashboardData.upcomingRenewals.length > 0 ? (
      dashboardData.upcomingRenewals.map((renewal) => (
        <div key={renewal.id} className="flex justify-between border-b py-2">
          <p className="text-gray-700">{renewal.customer} - {renewal.dueDate}</p>
          <span className="text-sm text-gray-600">${renewal.amount}</span>
        </div>
      ))
    ) : (
      <p className="text-gray-500">No upcoming renewals</p>
    )}

    {/* Pending Follow-ups */}
    <h4 className="text-lg font-semibold text-gray-700 mt-4 mb-2">Pending Follow-ups</h4>
    {dashboardData.pendingFollowUps.length > 0 ? (
      dashboardData.pendingFollowUps.map((followup) => (
        <div key={followup.id} className="flex justify-between border-b py-2">
          <p className="text-gray-700">{followup.name} - {followup.lastInteraction}</p>
          <span className="text-sm text-gray-600">{followup.nextAction}</span>
        </div>
      ))
    ) : (
      <p className="text-gray-500">No pending follow-ups</p>
    )}
  </div>
</div>

    </div>
  );
};

export default ReportingDashboard;
