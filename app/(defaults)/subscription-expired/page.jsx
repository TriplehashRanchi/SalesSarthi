'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import { useAuth } from '@/context/AuthContext';

export default function SubscriptionExpired() {
  const router          = useRouter();
  const { user, loading } = useAuth();
  const [localLoading, setLocalLoading] = useState(true);

  /* helper: decides if the user really is expired */
  const isExpired = (u) => {
    if (!u) return true;
    const statusOk = u.status.toLowerCase() === 'active' || u.status.toLowerCase() === 'trial';
    const notPast  = new Date(u.expires_at) > new Date();
    return !(statusOk && notPast);
  };

  /* redirect if subscription is still valid */
  useEffect(() => {
    if (loading) return;
    if (!user) { setLocalLoading(false); return; }

    if (isExpired(user)) {
      setLocalLoading(false);        // show paywall
    } else {
      router.replace(
        user.role === 'admin' ? '/dashboard' : '/user-dashboard'
      );
    }
  }, [loading, user, router]);

  const handleLogout = () => signOut(auth).then(() => router.replace('/login'));

  if (loading || localLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading…
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
            Your subscription has ended. Renew or choose a new plan to regain
            access.
          </p>

          {/* One button: go to the new payment flow */}
          <button
            onClick={() => router.push(`/payment?uid=${user.uid}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-8 rounded shadow"
          >
            View Plans &amp; Pricing
          </button>

          <button
            onClick={handleLogout}
            className="mt-6 text-sm underline text-gray-600"
          >
            Logout and switch account
          </button>
        </>
      ) : (
        <>
          <p className="text-gray-700 mb-6 max-w-md">
            Your team’s subscription has expired. Please contact your
            administrator to renew.
          </p>
          <button
            onClick={handleLogout}
            className="text-sm underline text-gray-600"
          >
            Logout and switch account
          </button>
        </>
      )}
    </div>
  );
}
