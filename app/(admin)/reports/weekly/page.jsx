"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const WeeklyReports = () => {
  const [weeklyData, setWeeklyData] = useState([
    { leadName: "John Doe", status: "In Progress", interactions: 5, nextAction: "Follow-up", assignedTo: "Alex" },
    { leadName: "Jane Smith", status: "Converted", interactions: 8, nextAction: "Onboard", assignedTo: "Lisa" },
    { leadName: "Michael Lee", status: "New", interactions: 2, nextAction: "Call", assignedTo: "Sam" },
  ]);

  const teamPerformanceChart = {
    series: [{ name: "Performance", data: [75, 80, 85, 90, 95, 70, 60] }],
    options: {
      chart: { type: "line" },
      xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
      colors: ["#FF4560"],
    },
  };

  return (
    <div className="p-6 bg-white shadow-xl rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        Weekly Reports
      </h2>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-3 border">Lead Name</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Interactions</th>
              <th className="p-3 border">Next Action</th>
              <th className="p-3 border">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {weeklyData.map((lead, index) => (
              <tr key={index} className="border">
                <td className="p-3 border">{lead.leadName}</td>
                <td className="p-3 border">{lead.status}</td>
                <td className="p-3 border">{lead.interactions}</td>
                <td className="p-3 border">{lead.nextAction}</td>
                <td className="p-3 border">{lead.assignedTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CHART */}
      <div className="mt-6 p-4 bg-white shadow-md rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Performance Trend</h3>
        <ReactApexChart options={teamPerformanceChart.options} series={teamPerformanceChart.series} type="line" height={250} />
      </div>

      {/* EXPORT BUTTON */}
      <div className="mt-6 text-center">
        <button className="bg-blue-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600">
          Export to PDF/CSV
        </button>
      </div>
    </div>
  );
};

export default WeeklyReports;
