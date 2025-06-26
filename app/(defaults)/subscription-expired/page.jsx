'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/utils/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const SubscriptionExpired = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.status === 'active') {
        router.push('/dashboard');
      } else {
        setLocalLoading(false);
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
  }, []);
  

  const handlePayment = async (plan) => {
    setError('');
    setProcessing(true);

    try {
      const createOrderRes = await fetch(`${API_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, plan }),
      });

      const order = await createOrderRes.json();
      if (!createOrderRes.ok) throw new Error(order.message || 'Order creation failed');

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Saarthi Subscription',
        description: `${plan} Plan`,
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                firebase_uid: user.uid,
                plan,
              }),
            });

            const result = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(result.message || 'Verification failed');

            router.push('/dashboard');
          } catch (verifyErr) {
            setError(verifyErr.message);
            setProcessing(false);
          }
        },
        theme: { color: '#2fabe5' },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setProcessing(false);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => router.push('/login'));
  };

  if (loading || localLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 text-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-4 text-red-600">Subscription Expired</h1>

      {user?.role === 'admin' ? (
        <>
          <p className="text-gray-700 mb-6 max-w-md">
            Your subscription has expired. To continue using the platform, please renew or upgrade your plan.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={() => handlePayment('monthly')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded"
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Renew Monthly Plan'}
            </button>
            <button
              onClick={() => handlePayment('yearly')}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded"
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Upgrade to Yearly Plan'}
            </button>
          </div>

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
            Your team’s subscription has expired. Please contact your administrator to renew or upgrade the plan.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 text-sm underline text-gray-600"
          >
            Logout and switch account
          </button>
        </>
      )}

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      <div className="mt-6 text-sm text-gray-500">
        Need help? <a href="/contact" className="text-blue-600 underline">Contact Support</a>
      </div>
    </div>
  );
};

export default SubscriptionExpired;
