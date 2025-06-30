  'use client';

  import { useState, useEffect, useCallback } from 'react';
  import axios from 'axios';
  import { useRouter, useSearchParams } from 'next/navigation';
  import { getAuth } from 'firebase/auth';
  import { showNotification } from '@mantine/notifications';

  // --- Mock Icons (Replace with your actual icon components) ---
  const IconLoader = () => <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
  const IconTrash = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;
  const IconRefresh = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2m0 0H15"></path></svg>;
  const IconPlus = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>;
  // --- End Mock Icons ---

  const FacebookLeadManager = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Token State
    const [fbToken, setFbToken] = useState(null);
    const [tokenSource, setTokenSource] = useState(null); // 'url', 'local', 'db', or null
    const [tokenCheckComplete, setTokenCheckComplete] = useState(false);

    // Saved Pages State
    const [savedSelections, setSavedSelections] = useState([]);
    const [loadingSavedSelections, setLoadingSavedSelections] = useState(false); // Changed initial to false

    // Available Pages State (Fetched on demand)
    const [availablePages, setAvailablePages] = useState([]);
    const [loadingAvailablePages, setLoadingAvailablePages] = useState(false);
    const [showAvailablePagesSection, setShowAvailablePagesSection] = useState(false);

    // Polling State
    const [polling, setPolling] = useState(false);
    const [pollResult, setPollResult] = useState(null);

    // General State
    const [error, setError] = useState(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // 1. Firebase Auth Listener
    useEffect(() => {
      const auth = getAuth();
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setFirebaseUser(user);
        if (!user) { // Reset state on logout
          setFbToken(null);
          setTokenSource(null);
          setSavedSelections([]);
          setAvailablePages([]);
          setShowAvailablePagesSection(false);
          setError(null);
          setPollResult(null);
          setTokenCheckComplete(false);
          localStorage.removeItem('fbAccessToken');
        }
        setAuthLoading(false);
      });
      return unsubscribe;
    }, []);

    // 2. Fetch Saved Selections (if token exists)
    const fetchSavedSelections = useCallback(async (user, currentFbToken) => {
      if (!user || !currentFbToken) {
          // If no token, ensure loading is false and list is empty
          setSavedSelections([]);
          setLoadingSavedSelections(false);
          return;
      }
      setLoadingSavedSelections(true);
      setError(null); // Clear previous errors when fetching saved list
      try {
        const firebaseToken = await user.getIdToken();
        const response = await axios.get(`${API_URL}/api/leads/savefbpages`, { // GET endpoint for saved pages
          headers: { Authorization: `Bearer ${firebaseToken}` },
        });
        setSavedSelections(response.data.data || []); // Adjust based on API response
      } catch (err) {
        console.error('Error fetching saved selections:', err);
        setError('Failed to load your connected Facebook pages.');
        setSavedSelections([]); // Ensure empty array on error
      } finally {
        setLoadingSavedSelections(false);
      }
    }, [API_URL]); // Dependencies: API_URL only (user/token passed as args)


    // 3. FB Token Handling (URL > DB > LocalStorage) & Initial Saved Fetch
    // 3. FB Token Handling  (THIS IS THE ONLY PART THAT CHANGES)
  useEffect(() => {
    if (authLoading || !firebaseUser || tokenCheckComplete) {
      if (!authLoading && !firebaseUser) setTokenCheckComplete(true);
      return;
    }

    let isMounted = true;

    const handleToken = async () => {
        setError(null);
        // NEW: Check for the `connected` flag from our secure redirect
        const justConnected = searchParams.get('connected') === 'true';
        let currentFbToken = null;
        let source = null;

        try {
            const firebaseToken = await firebaseUser.getIdToken(true);

            // Fetch from DB is now the PRIMARY method
            console.log(justConnected ? "Just connected! Fetching token from DB." : "Checking DB for token...");
            try {
                // Call our new, single endpoint
                const response = await axios.get(`${API_URL}/api/admin/getFbToken`, {
                    headers: { Authorization: `Bearer ${firebaseToken}` },
                });
                
                if (response.data && response.data.fbToken) {
                    console.log('Found FB token in DB');
                    currentFbToken = response.data.fbToken.fb_access_token  ;
                    source = 'db';
                    localStorage.setItem('fbAccessToken', currentFbToken); // Sync to local storage
                } else {
                    // Fallback to LocalStorage if DB has nothing
                    console.log('No FB token in DB, checking LocalStorage...');
                    const storedToken = localStorage.getItem('fbAccessToken');
                    if (storedToken) {
                        console.log('Found FB token in LocalStorage');
                        currentFbToken = storedToken;
                        source = 'local';
                    } else {
                        console.log('No FB token found anywhere.');
                    }
                }
            } catch (fetchError) {
                console.error('Error fetching FB token from DB:', fetchError);
                setError("Could not contact server to check Facebook connection.");
                // Fallback to LocalStorage on API error
                const storedToken = localStorage.getItem('fbAccessToken');
                if (storedToken) {
                    currentFbToken = storedToken;
                    source = 'local';
                }
            }
            
            if (isMounted) {
                if (justConnected) {
                    // Clean the URL after a successful redirect
                    router.replace('/facebook-leads', undefined, { shallow: true });
                }
                setFbToken(currentFbToken);
                setTokenSource(source);
                setTokenCheckComplete(true);
                // The rest of the app relies on fbToken being set, so we fetch after.
                fetchSavedSelections(firebaseUser, currentFbToken);
            }

        } catch (authError) {
            console.error("Error getting Firebase ID token:", authError);
            if (isMounted) {
                setError("Authentication error. Please try signing out and back in.");
                setAuthLoading(false);
                setTokenCheckComplete(true);
            }
        }
    };

    handleToken();
    return () => { isMounted = false; };
  }, [authLoading, firebaseUser, searchParams, router, API_URL, fetchSavedSelections, tokenCheckComplete]);


    // 4. Fetch ALL Available Pages from FB (via Backend) - ON DEMAND
    const fetchAvailablePages = useCallback(async () => {
      if (!fbToken || !firebaseUser) {
          setError("Cannot fetch pages. Facebook connection is missing.");
          return;
      }
      setLoadingAvailablePages(true);
      setShowAvailablePagesSection(true); // Show the section
      setAvailablePages([]); // Clear previous results
      setError(null); // Clear errors specific to this action
      try {
        const firebaseToken = await firebaseUser.getIdToken();
        const response = await axios.get(
          `${API_URL}/api/fb/pages?accessToken=${fbToken}`, // Backend uses this FB token
          { headers: { Authorization: `Bearer ${firebaseToken}` } } // Authenticate request to *our* backend
        );
        const pagesData = response?.data?.data || response?.data || [];
        if (!Array.isArray(pagesData)) {
            console.error("Unexpected format for available pages:", response.data);
            throw new Error("Received unexpected data format for pages.");
        }
        setAvailablePages(pagesData);
      } catch (err) {
        console.error('Error fetching available pages:', err);
        setError('Failed to load available Facebook pages. Ensure connection is valid or try reconnecting.');
        setAvailablePages([]);
      } finally {
        setLoadingAvailablePages(false);
      }
    }, [fbToken, firebaseUser, API_URL]);

    // 5. Action: Initiate Facebook Login
  const handleFacebookLogin = async () => {
    const auth = getAuth();
    const token = await auth.currentUser.getIdToken();

    const res = await fetch(`${API_URL}/auth/facebook/init`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { redirectUrl } = await res.json();

    window.location.href = redirectUrl;
  };


    // 6. Action: Save a NEW Page Selection
    const handlePageSelect = useCallback(async (page) => {
      if (!firebaseUser) return;
      setError(null);
      setPollResult(null); // Clear previous poll results

      try {
        const firebaseToken = await firebaseUser.getIdToken();
        const payload = {
          userId: firebaseUser.uid,
          selections: [{
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token, // Send page token
          }],
        };
        // POST to save
        await axios.post(`${API_URL}/api/leads/savefbpages`, payload, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firebaseToken}` },
        });
        console.log('Page selection saved:', page.name);

        // --- Post-save actions ---
        await fetchSavedSelections(firebaseUser, fbToken); // Refresh saved list
        setShowAvailablePagesSection(false); // Hide available pages section
        setAvailablePages([]); // Clear the available pages state

      } catch (err) {
        console.error('Error saving page selection:', err.response?.data || err.message || err);
        setError(`Failed to save selection for ${page.name}. ${err.response?.data?.message || 'Please try again.'}`);
      }
    }, [firebaseUser, API_URL, fetchSavedSelections, fbToken]);

    // 7. Action: Remove a Saved Page Selection
    const handleRemoveSelection = useCallback(async (pageIdToRemove) => {
      console.log('Removing page selection:', pageIdToRemove);
      if (!firebaseUser) return;
      const pageToRemove = savedSelections.find(p => p.page_id === pageIdToRemove);
      if (!pageToRemove) return;

      // Optional: Confirmation dialog
      // if (!confirm(`Are you sure you want to remove the page "${pageToRemove.pageName}"?`)) {
      //   return;
      // }

      setError(null);
      setPollResult(null);

      try {
        const firebaseToken = await firebaseUser.getIdToken();
        // DELETE request to remove the page
        await axios.delete(`${API_URL}/api/leads/savefbpages/${pageIdToRemove}`, {
          headers: { Authorization: `Bearer ${firebaseToken}` },
        });
        console.log('Page selection removed:', pageIdToRemove);
        // Refresh the list of saved selections
        await fetchSavedSelections(firebaseUser, fbToken);
      } catch (err) {
        console.error('Error removing page selection:', err);
        setError(`Failed to remove page "${pageToRemove.pageName}". Please try again.`);
      }
    }, [firebaseUser, API_URL, fetchSavedSelections, fbToken, savedSelections]);

    // 8. Action: Trigger Manual Lead Polling
    const pollFacebookLeads = useCallback(async () => {
      if (!firebaseUser || savedSelections.length === 0) {
        setError("No connected pages to poll.");
        return;
      }
      setPolling(true);
      setPollResult(null);
      setError(null);
      try {
        const firebaseToken = await firebaseUser.getIdToken();
        const response = await axios.post(
          `${API_URL}/api/fb/leads/poll`,
          {}, // Backend uses firebaseToken to find user's pages
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );
        console.log('Polling result:', response.data);
        setPollResult(response.data);
      } catch (err) {
        console.error('Error polling Facebook leads:', err.response?.data || err.message || err);
        setError(`Failed to poll Facebook leads. ${err.response?.data?.message || 'Check connection or logs.'}`);
        setPollResult(null);
      } finally {
        setPolling(false);
      }
    }, [firebaseUser, savedSelections, API_URL]);

    const handleFacebookDisconnect = async () => {
      if (!firebaseUser) return;
      try {
        // 1. Remove from your backend DB
        const firebaseToken = await firebaseUser.getIdToken();
        await axios.post(
          `${API_URL}/api/admin/updateFbToken`,
          { fbToken: null, fbExpiry: null },
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );

        await axios.delete(
          `${API_URL}/api/leads/savefbpages`,
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );
    
        // 2. Remove from localStorage and reset UI state
        localStorage.removeItem('fbAccessToken');
        setFbToken(null);
        setTokenSource(null);
        setSavedSelections([]);
        setAvailablePages([]);
        setShowAvailablePagesSection(false);
        setError(null);
        setPollResult(null);
    
        showNotification({
          title: 'Disconnected',
          message: 'Facebook integration has been removed.',
          color: 'green',
        });
      } catch (err) {
        console.error('Error disconnecting Facebook:', err);
        showNotification({
          title: 'Error',
          message: 'Could not disconnect Facebook. Please try again.',
          color: 'red',
        });
      }
    };
    

    // --- Render Logic ---

    if (authLoading) {
      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border p-6 text-center shadow-md dark:border-gray-700 dark:bg-gray-800">
          <IconLoader /> <span className="ml-3 text-lg text-gray-700 dark:text-gray-300">Loading authentication...</span>
        </div>
      );
    }

    if (!firebaseUser) {
      return (
        <div className="panel rounded-md border border-danger p-10 text-center shadow-md dark:border-danger/50 dark:bg-gray-800">
          <h1 className="mb-4 text-2xl font-semibold">Please Sign In</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">You need to be signed in to manage Facebook lead connections.</p>
          {/* Optional: Link/button to sign-in page */}
        </div>
      );
    }

    if (!fbToken && tokenCheckComplete) {
      return (
        <div className="panel flex flex-col items-center justify-center rounded-md border border-warning p-10 text-center shadow-md dark:border-warning/50 dark:bg-gray-800">
          <h1 className="mb-4 text-2xl font-semibold">Connect Facebook Account</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">To fetch leads, please connect your Facebook account.</p>
          <button onClick={handleFacebookLogin} className="btn btn-primary">Login with Facebook</button>
          {error && <div className="mt-6 w-full rounded border border-danger bg-danger/10 p-3 text-sm text-danger">{error}</div>}
        </div>
      );
    }

    // Main Manager View (User logged in, token check done)
    return (
      <div className="panel rounded-md border p-4 shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Facebook Lead Integration</h1>
            {fbToken && tokenSource && <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">FB Connected </span>}
            {!fbToken && !tokenCheckComplete && (
              <div className="flex items-center text-sm text-gray-500">
                  <IconLoader /> <span className="ml-2">Checking connection...</span>
              </div>
            )}
        </div>

        {error && <div className="mb-4 rounded border border-danger bg-danger/10 p-3 text-sm text-danger">{error}</div>}

        {/* --- Saved Selections Section --- */}
        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-medium text-gray-800 dark:text-gray-100">
                  Connected Pages ({savedSelections.length})
              </h2>
              {/* Action Buttons - only show if FB token exists */}
              {fbToken && (
                  <div className="flex items-center gap-2">
                      {savedSelections.length > 0 && (
                          <button onClick={pollFacebookLeads} className="btn btn-outline-secondary btn-sm" disabled={polling || loadingAvailablePages}>
                              {polling ? <><IconLoader/> Checking...</> : <><IconRefresh/> Poll New Leads</>}
                          </button>
                      )}
                      <button onClick={fetchAvailablePages} className="btn btn-outline-primary btn-sm" disabled={loadingAvailablePages}>
                          {loadingAvailablePages ? <><IconLoader/> Loading...</> : <><IconPlus/> Add / Manage Pages</>}
                      </button>
                      <button onClick={handleFacebookDisconnect} className="btn btn-danger btn-sm ml-2"> Disconnect Facebook </button>
                  </div>
              )}
          </div>

          {loadingSavedSelections ? (
              <div className="flex items-center justify-center p-5"><IconLoader/> <span className="ml-2 text-gray-600 dark:text-gray-300">Loading connected pages...</span></div>
          ) : savedSelections.length > 0 ? (
              <ul className="space-y-2">
              {savedSelections.map((selection) => (
                  <li key={selection.page_id} className="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-gray-700/50 dark:border dark:border-gray-600">
                  <span className="font-medium text-gray-700 dark:text-gray-200">{selection.page_name}</span>
                  <button onClick={() => handleRemoveSelection(selection.page_id)} className="text-danger hover:text-danger/80" title={`Remove ${selection.page_name}`}>
                      <IconTrash/>
                  </button>
                  </li>
              ))}
              </ul>
          ) : tokenCheckComplete && fbToken ? ( // Only show "No pages" message if token exists and check is done
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No pages are currently connected. Click "Add / Manage Pages" to select pages.</p>
          ) : null } {/* Don't show "no pages" if still checking token */}
        </div>


        {/* --- Available Pages Section (conditionally rendered) --- */}
        {showAvailablePagesSection && fbToken && (
          <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-600">
            <h2 className="mb-4 text-xl font-medium text-gray-800 dark:text-gray-100">Select Pages to Connect:</h2>
            {loadingAvailablePages ? (
              <div className="flex items-center justify-center p-5"><IconLoader/> <span className="ml-2 text-gray-600 dark:text-gray-300">Loading available pages...</span></div>
            ) : availablePages.length > 0 ? (
              <ul className="space-y-3">
                {/* Filter out pages that are already saved */}
                {availablePages
                  .filter(page => !savedSelections.some(s => s.page_id === page.id))
                  .map((page) => (
                    <li key={page.id} className="flex flex-col items-start gap-2 rounded border border-gray-300 p-3 dark:border-gray-600 sm:flex-row sm:items-center sm:justify-between">
                      <div className='flex flex-col'>
                          <span className="font-medium text-gray-800 dark:text-gray-100">{page.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">ID: {page.id}</span>
                      </div>
                      <button onClick={() => handlePageSelect(page)} className="btn btn-secondary btn-sm w-full sm:w-auto">Connect This Page</button>
                    </li>
                ))}
                {/* Message if all available pages are already selected */}
                {availablePages.length > 0 && availablePages.every(p => savedSelections.some(s => s.page_id === p.id)) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">All available pages from your Facebook account are already connected.</p>
                )}
                {/* Message if filter results in empty list but there were pages initially */}
                {availablePages.length > 0 && availablePages.filter(page => !savedSelections.some(s => s.page_id === page.id)).length === 0 && !availablePages.every(p => savedSelections.some(s => s.pageId === p.id)) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No new pages found to connect.</p>
                )}

              </ul>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No pages found for this Facebook account, or required permissions might be missing.</p>
            )}
          </div>
        )}


        {/* --- Polling Results --- */}
        {polling && (
          <div className="mt-6 flex items-center justify-center p-4 text-gray-600 dark:text-gray-300">
              <IconLoader/> <span className="ml-2">Checking for new leads...</span>
          </div>
        )}
        {pollResult && !polling && (
          <div className="mt-6 rounded border border-success bg-success/10 p-4 dark:border-success/50">
            <h3 className="mb-2 text-lg font-medium text-success">Polling Result:</h3>
            <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs dark:bg-gray-900/50 dark:text-gray-200">{JSON.stringify(pollResult, null, 2)}</pre>
          </div>
        )}

      </div>
    );
  };

  export default FacebookLeadManager;


