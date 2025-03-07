'use client'
import { useRouter } from "next/navigation";

export default function UserList({ users }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-300 shadow-md bg-white">
        <thead className="bg-gray-200 text-gray-700">
          <tr>
            <th className="p-4 text-left">👤 Name</th>
            <th className="p-4 text-left">📌 Role</th>
            <th className="p-4 text-left">📧 Email</th>
            <th className="p-4 text-left">📞 Phone</th>
            <th className="p-4 text-center">🔍 Action</th>
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((user) => (
              <tr 
                key={user.id} 
                className="border-t hover:bg-gray-100 transition duration-200"
              >
                <td className="p-4">{user.name}</td>
                <td className="p-4">{user.role}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">{user.phone}</td>
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
