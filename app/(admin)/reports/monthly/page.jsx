"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const MonthlyReports = () => {
  const [selectedMonth, setSelectedMonth] = useState("March 2025");

  const financialChart = {
    series: [{ name: "Revenue", data: [1000, 1500, 2000, 2500, 3000, 3500] }],
    options: {
      chart: { type: "bar" },
      xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
      colors: ["#00E396"],
    },
  };

  return (
    <div className="p-6 bg-white shadow-xl rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        Monthly Reports
      </h2>

      {/* FILTER */}
      <div className="mb-4 flex justify-end">
        <select className="p-2 border border-gray-300 rounded-lg" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option>March 2025</option>
          <option>February 2025</option>
          <option>January 2025</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-3 border">Lead Name</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Interactions</th>
              <th className="p-3 border">Customer Feedback</th>
              <th className="p-3 border">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border">
              <td className="p-3 border">John Doe</td>
              <td className="p-3 border">Converted</td>
              <td className="p-3 border">12</td>
              <td className="p-3 border">Very Satisfied</td>
              <td className="p-3 border">Lisa</td>
            </tr>
            <tr className="border">
              <td className="p-3 border">Jane Smith</td>
              <td className="p-3 border">In Progress</td>
              <td className="p-3 border">8</td>
              <td className="p-3 border">Neutral</td>
              <td className="p-3 border">Sam</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FINANCIAL REPORTS */}
      <div className="mt-6 p-4 bg-white shadow-md rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Planning Progress</h3>
        <ReactApexChart options={financialChart.options} series={financialChart.series} type="bar" height={250} />
      </div>

      {/* EXPORT BUTTON */}
      <div className="mt-6 text-center">
        <button className="bg-blue-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600">
          Export to PDF/Email Report
        </button>
      </div>
    </div>
  );
};

export default MonthlyReports;
