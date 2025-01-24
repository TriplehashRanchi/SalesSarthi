"use client";
// Parent component (e.g., page.jsx)
import FollowupForm from '@/components/forms/followupform';

const ParentComponent = () => {


  return (
    <div>
      <FollowupForm leadId={1} />
    </div>
  );
};

export default ParentComponent;
