// app/(admin)/webhook/[id]/page.jsx
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth'; // 🔐 Import Firebase Auth
import Swal from 'sweetalert2'; // Optional: for user feedback

// Ensure Firebase is initialized somewhere in your app
// import { initializeApp } from 'firebase/app';
// import firebaseConfig from './firebaseConfig'; // Your Firebase config object
// const app = initializeApp(firebaseConfig);


// --- Helper function to get Firebase Auth Token ---
const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    // This should ideally not happen if the page itself is protected,
    // but good to handle.
    console.error("No user logged in.");
    Swal.fire('Unauthorized', 'You must be logged in to perform this action.', 'error');
    throw new Error('User not authenticated');
  }

  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error("Error getting ID token:", error);
    Swal.fire('Authentication Error', 'Could not verify your session. Please try logging in again.', 'error');
    throw new Error('Failed to get authentication token');
  }
};
// ---

export default function WebhookDetail() {
  const params = useParams();
  const webhookId = params.id;

  const [webhook, setWebhook] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [testPayload, setTestPayload] = useState({
    full_name: 'John Doe',
    email: 'john@example.com',
    phone_number: '555-1234',
    date_of_birth: '1990-01-01',
  });
  const [testResponse, setTestResponse] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Combined loading state for initial fetch
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const API_BASE_URL = 'http://localhost:5000/api'; // Define base URL

  // Fetch webhook details & mapping config
  useEffect(() => {
    if (!webhookId) {
        setIsLoading(false); // No ID, nothing to load
        return;
    };

    const loadInitialData = async () => {
        setIsLoading(true);
        setError(''); // Clear previous errors
        try {
            // Fetch both in parallel (optional optimization)
            await Promise.all([
                fetchWebhook(),
                fetchMapping()
            ]);
        } catch (err) {
             // Errors should be set within the fetch functions
             console.error("Error during initial data load:", err)
             // setError("Failed to load initial webhook data. " + err.message); // More general error
        } finally {
            setIsLoading(false);
        }
    };

    loadInitialData();

  }, [webhookId]); // Dependency array includes webhookId

  const fetchWebhook = async () => {
    if (!webhookId) return; // Already checked in useEffect, but good practice

    try {
      const token = await getAuthToken(); // Get auth token
      const res = await fetch(`${API_BASE_URL}/webhook/${webhookId}`, {
          headers: {
              'Authorization': `Bearer ${token}` // Add token to header
          }
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch webhook: ${res.status} ${errorText || res.statusText}`);
      }
      const data = await res.json();
      setWebhook(data);
      setError(''); // Clear error on success
    } catch (err) {
      console.error("Error fetching webhook:", err);
      setError(`Webhook Fetch Error: ${err.message}`);
      setWebhook(null); // Clear stale data on error
      // Re-throw error if called from Promise.all to indicate failure
      // throw err;
    }
  };

  const fetchMapping = async () => {
    if (!webhookId) return;

    try {
      const token = await getAuthToken(); // Get auth token
      const res = await fetch(`${API_BASE_URL}/webhook-mapping/${webhookId}`, {
          headers: {
              'Authorization': `Bearer ${token}` // Add token to header
          }
      });

      if (res.ok) {
        const data = await res.json();
        try {
          // Assuming mapping_config is a JSON *string* in the response
          setMapping(JSON.parse(data.mapping_config || '{}'));
        } catch (parseError) {
          console.error("Error parsing mapping config:", parseError, "Received:", data.mapping_config);
          // If mapping_config might already be an object:
          // setMapping(data.mapping_config || {});
          setError(`Failed to parse mapping config for webhook ${webhookId}`);
          setMapping({});
        }
      } else if (res.status === 404) {
        console.log(`No mapping found for webhook ${webhookId}.`);
        setMapping({});
      } else {
        const errorText = await res.text();
        throw new Error(`Failed to fetch mapping: ${res.status} ${errorText || res.statusText}`);
      }
       setError(''); // Clear error on success or 404
    } catch (err) {
        console.error("Error fetching mapping:", err);
        // Avoid setting error for 404 if it was handled above
        if (!err.message?.includes('Failed to fetch mapping: 404')) {
             setError(`Mapping Fetch Error: ${err.message}`);
        }
        setMapping({}); // Ensure mapping state is default on error
        // Re-throw error if called from Promise.all
        // throw err;
    }
  };

  const handleMappingChange = (targetField, sourceField) => {
    setMapping((prev) => ({
      ...prev,
      [targetField]: { source: sourceField },
    }));
  };

  const saveMapping = async () => {
    if (!webhookId || !mapping || isSaving) return;
    setIsSaving(true);
    setError('');

    try {
       const token = await getAuthToken(); // Get auth token
       const res = await fetch(`${API_BASE_URL}/webhook-mapping`, {
        method: 'POST', // Or PUT - ensure backend handles this correctly
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add token to header
         },
        body: JSON.stringify({
          webhook_id: webhookId,
          // Ensure mapping_config is sent as expected by the backend (string or object)
          mapping_config: mapping, // Sending as object, backend should handle/parse
          description: 'Auto-generated from UI',
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save mapping: ${res.status} ${errorText || res.statusText}`);
      }
      Swal.fire('Success', 'Mapping saved successfully!', 'success'); // Use Swal for feedback
      // Optionally re-fetch mapping to confirm save and get any backend-generated IDs/timestamps
      // await fetchMapping();
    } catch (err) {
      console.error("Error saving mapping:", err);
      setError(`Save Mapping Error: ${err.message}`);
      Swal.fire('Error', `Failed to save mapping: ${err.message}`, 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const testWebhook = async () => {
    // This tests the *target* endpoint using its secret, but the request
    // *from this admin UI* to the backend API that triggers the test still needs auth.
    if (!webhook || !webhookId || isTesting) return;
    setIsTesting(true);
    setTestResponse(null);
    setError('');

    try {
      const token = await getAuthToken(); // Get user's auth token
      const testApiUrl = `${API_BASE_URL}/webhook/${webhookId}?token=${webhook.webhook_secret}`;

      const res = await fetch(testApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Authenticate the user making the test request
        },
        body: JSON.stringify(testPayload),
      });

      const responseBody = await res.text();
      if (!res.ok) {
         // Try to parse error from backend if JSON
         let errorMsg = responseBody;
         try {
             const errJson = JSON.parse(responseBody);
             errorMsg = errJson.message || errJson.error || responseBody;
         } catch(e) { /* ignore parsing error, use raw text */ }
        throw new Error(errorMsg || `Webhook test failed: ${res.status} ${res.statusText}`);
      }

      try {
        const data = JSON.parse(responseBody);
        setTestResponse(data);
      } catch (parseError) {
        console.log("Webhook response was not JSON:", responseBody);
        setTestResponse({ rawResponse: responseBody });
      }
       Swal.fire('Test Sent', 'Test payload sent successfully. Check response below.', 'success');
    } catch (err) {
      console.error("Error testing webhook:", err);
      setError(`Webhook Test Error: ${err.message}`);
      Swal.fire('Test Failed', `Webhook test failed: ${err.message}`, 'error');
    } finally {
        setIsTesting(false);
    }
  };

  // --- Render Logic ---

  if (!webhookId) {
      // This case might be handled by Next.js routing if ID is required
      return <div style={{ padding: 20 }}>Webhook ID not found in URL.</div>;
  }

  if (isLoading) {
       return <div style={{ padding: 20 }}>Loading webhook data...</div>;
  }

  // Display error prominently if it occurs
   if (error && !webhook) { // Show only error if loading failed completely
       return <div style={{ padding: 20 }}><p style={{ color: 'red' }}>Error: {error}</p></div>;
   }


  return (
    <div style={{ padding: 20 }}>
      <h1>Webhook Detail: {webhookId}</h1>
      {/* Show non-critical errors */}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!webhook ? (
         // Should not happen if loading is finished and no major error occurred,
         // but good fallback. Error case handled above.
        <p>Webhook data could not be loaded.</p>
      ) : (
        <div>
           <p><strong>Target URL:</strong> {webhook.target_url || 'N/A'}</p> {/* Example: Display more webhook data */}
           <p><strong>Secret Token:</strong> {webhook.webhook_secret ? `${webhook.webhook_secret.substring(0, 4)}...` : 'N/A'}</p> {/* Show only part of secret */}

          {/* --- Test Webhook Section --- */}
          <h2>Test This Webhook</h2>
          {/* Inputs remain the same */}
           <div><label>Full Name: </label><input type="text" value={testPayload.full_name} onChange={(e) => setTestPayload({ ...testPayload, fullName: e.target.value })}/></div>
           <div><label>Email Address: </label><input type="email" value={testPayload.email} onChange={(e) => setTestPayload({ ...testPayload, emailAddress: e.target.value })}/></div>
           <div><label>Phone: </label><input type="text" value={testPayload.phone_number} onChange={(e) => setTestPayload({ ...testPayload, phone: e.target.value })}/></div>
           <div><label>Date of Birth: </label><input type="date" value={testPayload.date_of_birth} onChange={(e) => setTestPayload({ ...testPayload, dob: e.target.value })}/></div>
           <button onClick={testWebhook} disabled={isTesting}>
               {isTesting ? 'Testing...' : 'Send Test Payload'}
            </button>

          {testResponse && (
            <div style={{ marginTop: 20, padding: 10, border: '1px solid #eee', background: '#f9f9f9' }}>
              <h3>Webhook Test Response</h3>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(testResponse, null, 2)}
              </pre>
            </div>
          )}
          {/* --- End Test Webhook --- */}

          <hr style={{ margin: '20px 0' }}/>

          {/* --- Mapping Configuration Section --- */}
          {mapping !== null ? (
            <>
              <h2>Mapping Configuration</h2>
              <p>Configure how incoming fields map to your system fields.</p>
              {/* Selects remain the same */}
                <div style={{ marginBottom: 10 }}><strong>full_name:</strong> <select value={mapping?.full_name?.source || ''} onChange={(e) => handleMappingChange('full_name', e.target.value)}><option value="">--Select Source--</option>{Object.keys(testPayload).map((key) => (<option key={key} value={key}>{key}</option>))}</select></div>
                <div style={{ marginBottom: 10 }}><strong>email:</strong> <select value={mapping?.email?.source || ''} onChange={(e) => handleMappingChange('email', e.target.value)}><option value="">--Select Source--</option>{Object.keys(testPayload).map((key) => (<option key={key} value={key}>{key}</option>))}</select></div>
              {/* Add more target fields as needed */}
               <button onClick={saveMapping} disabled={isSaving}>
                   {isSaving ? 'Saving...' : 'Save Mapping'}
                </button>
            </>
          ) : (
            // Show mapping loading state only if webhook loaded but mapping didn't (e.g., 404 or error during parallel load)
             !isLoading && <p>Loading mapping configuration...</p>
          )}
           {/* --- End Mapping Config --- */}
        </div>
      )}
    </div>
  );
}