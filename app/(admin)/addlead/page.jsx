"use client";
// Parent component (e.g., page.jsx)
import {useAuth} from "@/context/AuthContext";
import LeadForm from '@/components/forms/leadform';


const ParentComponent = () => {
  const { user } = useAuth();
  return (
    <div>
      {/* Thought of the Day Section */}
      <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
        <div className="text-lg font-semibold text-white">
         {user ? `Hello ${user.displayName || 'User'} !` : 'Hello User !'}
        </div>
        <div className="text-sm hidden md:block italic text-gray-200">
         A new lead is a start of a new adventure.
        </div>
      </div>

      {/* LeadForm Component */}
      <LeadForm existingLead={null} />
      {/* <a href="https://sarthiapi.vercel.app/auth/facebook">Sign in with Facebook</a> */}




    </div>
  );
};

export default ParentComponent;
