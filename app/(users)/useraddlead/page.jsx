"use client";
// Parent component (e.g., page.jsx)
import LeadForm from '@/components/userforms/leadform';


const ParentComponent = () => {
  return (
    <div>
      {/* Thought of the Day Section */}
      <div className="panel flex items-center justify-between overflow-x-auto whitespace-nowrap p-3 text-primary bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 rounded-md mb-4 shadow-md">
        <div className="text-lg font-semibold text-white">
          Hello Harry Potter !
        </div>
        <div className="text-sm italic text-gray-200">
          You got 4 fresh leads , check them out .
        </div>
      </div>

      {/* LeadForm Component */}
      <LeadForm existingLead={null} />
    </div>
  );
};

export default ParentComponent;
