'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import LeadForm from '@/components/forms/leadform'; // Adjust the path based on your structure

const EditLeadPage = ({ params }) => {
  const { id } = params; // Get the lead ID from the route params
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leadData, setLeadData] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Fetch the lead data by ID
  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/leads/${id}`);
        setLeadData(response.data);
      } catch (error) {
        console.error('Error fetching lead:', error);
        Swal.fire('Error', 'Failed to fetch lead data', 'error');
        router.push('/leads'); // Redirect if lead not found
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id, router]);

  if (loading) {
    return <div>Loading lead data...</div>; // Show a loading state
  }

  if (!leadData) {
    return null; // Handle case where lead data is not available
  }

  return (
    <div className="container mx-auto mt-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Lead</h1>
      <LeadForm
        existingLead={leadData} // Pass the fetched lead to the form
        onClose={() => router.push('/leads')} // Redirect back after editing
      />
    </div>
  );
};

export default EditLeadPage;
