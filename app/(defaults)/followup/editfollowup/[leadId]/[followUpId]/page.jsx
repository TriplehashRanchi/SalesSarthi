'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import FollowupForm from '@/components/forms/followupform';
import swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

const EditFollowUp = ({ params }) => {
    const [existingFollowUp, setExistingFollowUp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Extract leadId and followUpId from params
    const { leadId, followUpId } = params;

    useEffect(() => {
        if (leadId && followUpId) {
            const fetchFollowUp = async () => {
                try {
                    const response = await axios.get(`${API_URL}/api/followups/followup/${followUpId}`);
                    setExistingFollowUp(response.data);
                    setLoading(false);
                } catch (err) {
                    console.error('Error fetching follow-up data:', err);
                    setError('Error fetching follow-up data');
                    setLoading(false);
                }
            };

            fetchFollowUp();
        }
    }, [leadId, followUpId]);

    // Handle success after form submission
    const handleFormSuccess = () => {
        swal.fire('Success', 'Follow-up updated successfully', 'success');
        router.push(`/lead/${leadId}`); // Redirect to the lead page or another page after success
    };

    // Handle errors
    const handleFormError = (errorMessage) => {
        setError(errorMessage);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    if (!existingFollowUp) {
        return <div>Error: Follow-up not found.</div>;
    }

    return (
        <div>
            <h2>Edit Follow-Up</h2>
            <FollowupForm 
                leadId={leadId} 
                existingFollowUp={existingFollowUp} 
                onSuccess={handleFormSuccess} 
                onError={handleFormError}
            />
        </div>
    );
};

export default EditFollowUp;
