'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const PaymentPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const uid = searchParams.get('uid');
    const [plan, setPlan] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const handlePayment = async () => {
        if (!uid || !plan) {
            setError('Please select a plan.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const orderRes = await fetch(`${API_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, plan }),
            });

            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create Razorpay order');

            const { id: order_id, amount, currency, key_id } = orderData;

            const options = {
                key: key_id,
                amount,
                currency,
                name: 'Saarthi Subscription',
                description: `${plan} Plan`,
                order_id,
                handler: async (response) => {
                    try {
                        const verifyRes = await fetch(`${API_URL}/api/payment/verify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                firebase_uid: uid,
                                plan,
                            }),
                        });

                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok) throw new Error(verifyData.message || 'Payment verification failed');

                        router.push('/dashboard');
                    } catch (err) {
                        setError(err.message || 'Payment verification error');
                        setLoading(false);
                    }
                },
                theme: { color: '#2fabe5' },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Error during payment process');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!uid) {
            setError('User ID not provided.');
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(script);
    }, [uid]);

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-6">
            <h1 className="text-2xl font-semibold mb-4">Choose a Subscription Plan</h1>

            <div className="flex gap-4 mb-6">
                <button
                    className={`btn ${plan === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setPlan('monthly')}
                >
                    Monthly Plan
                </button>
                <button
                    className={`btn ${plan === 'yearly' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setPlan('yearly')}
                >
                    Yearly Plan
                </button>
            </div>

            <button
                className="btn btn-gradient"
                onClick={handlePayment}
                disabled={loading || !uid}
            >
                {loading ? 'Processing...' : 'Proceed to Pay'}
            </button>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
    );
};

export default PaymentPage;
