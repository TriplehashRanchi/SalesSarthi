'use client'
import { useState } from "react";
import UserList from "@/components/Leadtable/usertable"; // Import table component

export default function ViewUsers() {
  const [filter, setFilter] = useState("");

  // Dummy User Data
  const users = [
    { id: 1, name: "John Doe", role: "Salesperson", email: "john@example.com", phone: "9876543210" },
    { id: 2, name: "Jane Smith", role: "Manager", email: "jane@example.com", phone: "8765432109" },
    { id: 3, name: "Mike Johnson", role: "Salesperson", email: "mike@example.com", phone: "7654321098" },
    { id: 4, name: "Sarah Lee", role: "Admin", email: "sarah@example.com", phone: "6543210987" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-700 mb-6">👥 Team Members</h1>

      {/* Filter Section */}
      <div className="flex items-center justify-between mb-4">
        <label className="text-gray-600 font-medium text-lg">Filter by Role:</label>
        <select 
          onChange={(e) => setFilter(e.target.value)}
          className="w-1/4 p-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-300"
        >
          <option value="">All Roles</option>
          <option value="Manager">Manager</option>
          <option value="Salesperson">Salesperson</option>
        </select>
      </div>

      {/* User List Table */}
      <UserList users={users.filter(user => (filter ? user.role === filter : true))} />
    </div>
  );
}
