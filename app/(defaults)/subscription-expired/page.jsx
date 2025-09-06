'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import { useAuth } from '@/context/AuthContext';
// 1. Import Capacitor to check the platform
import { Capacitor } from '@capacitor/core';

export default function SubscriptionExpired() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [localLoading, setLocalLoading] = useState(true);
  // 2. Add state to track if the platform is native
  const [isNative, setIsNative] = useState(false);

  // 3. Check the platform only on the client-side
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  /* helper: decides if the user really is expired */
  const isExpired = (u) => {
    if (!u) return true;
    // An active status is always valid, regardless of date (e.g., lifetime plans)
    if (u.status?.toLowerCase() === 'active') return false;
    // For other statuses like 'trial' or 'expired', the date matters
    if (!u.expires_at || new Date(u.expires_at) < new Date()) {
      return true; // No expiry date or it's in the past
    }
    return false;
  };

  /* redirect if subscription is still valid */
  useEffect(() => {
    if (loading) return; // Wait for the auth context to finish loading
    
    // If there's no user, we are definitely on the paywall/login page, so stop loading.
    if (!user) {
      setLocalLoading(false);
      return;
    }

    // If the user's subscription is not expired, redirect them to their dashboard
    if (!isExpired(user)) {
      router.replace(user.role === 'admin' ? '/dashboard' : '/user-dashboard');
    } else {
      // Otherwise, the subscription is expired, so show the paywall content
      setLocalLoading(false);
    }
  }, [loading, user, router]);

  const handleLogout = () => signOut(auth).then(() => router.replace('/login'));

  if (loading || localLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  /* --- UI --- */
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 text-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-4 text-red-600">
        Subscription Expired
      </h1>

      {user?.role === 'admin' ? (
        <>
          <p className="text-gray-700 mb-6 max-w-md">
            Your subscription has ended. Please renew your plan to regain full access.
          </p>

          {/* 4. Conditionally render payment options based on the platform */}
          {isNative ? (
            // --- NATIVE MOBILE UI (Google Play Compliant) ---
            <div className="w-full max-w-md">
              <a
                href="https://wa.me/917011979448?text=I%20want%20to%20renew%20my%20DG%20Sarthi%20subscription"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block px-6 py-3 rounded-lg text-md font-medium bg-[#25D366] text-white hover:opacity-90 shadow-md"
              >
                Contact Support to Renew
              </a>
              <div className="mt-4 rounded-md bg-white p-3 text-xs leading-relaxed text-gray-600 border">
                <p>
                  To manage your subscription and payment details, please visit our web portal at{' '}
                  <a href="https://app.digitalgyanisaarthi.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-blue-600">
                    app.digitalgyanisaarthi.com
                  </a>.
                </p>
                <p className="mt-2 pt-2 border-t">
                  For assistance, call us at:{' '}
                  <a href="tel:+917011979448" className="underline">7011979448 </a>
                </p>
              </div>
            </div>
          ) : (
            // --- WEB BROWSER UI ---
            <button
              onClick={() => router.push(`/payment?uid=${user.uid}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-8 rounded shadow-md"
            >
              View Plans & Renew
            </button>
          )}

          <button onClick={handleLogout} className="mt-6 text-sm underline text-gray-600">
            Logout and switch account
          </button>
        </>
      ) : (
        // --- NON-ADMIN UI (Same for all platforms) ---
        <>
          <p className="text-gray-700 mb-6 max-w-md">
            Your team’s subscription has expired. Please contact your administrator to renew access.
          </p>
          <button onClick={handleLogout} className="text-sm underline text-gray-600">
            Logout and switch account
          </button>
        </>
      )}
    </div>
  );
}