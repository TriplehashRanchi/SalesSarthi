'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';

// An icon component for checkmarks in the feature list
const CheckIcon = () => (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
    </svg>
);

const PaymentPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const uid = searchParams.get('uid');
    const [plan, setPlan] = useState('');
    const [coupon, setCoupon] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [discount, setDiscount] = useState(0); // State to hold the discount percentage

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // --- NEW: PRE-DEFINED COUPON CODES ---
    const specialCoupons = {
        'SAARTHI50': 50, // 50% discount
        'LAUNCH25': 25, // 25% discount
        'EARLYBIRD': 90
    };
    // --- END OF NEW ---
    
    // --- MODIFIED: Handle coupon changes ---
    useEffect(() => {
        const uppercaseCoupon = coupon.trim().toUpperCase();
        if (specialCoupons[uppercaseCoupon]) {
            setDiscount(specialCoupons[uppercaseCoupon]);
        } else {
            setDiscount(0); // Reset discount if coupon is invalid or empty
        }
    }, [coupon]); // This effect runs whenever the coupon input changes
    // --- END OF MODIFIED ---

const handlePayment = async () => {
    if (!uid || !plan) {
        setError('Please select a plan to continue.');
        return;
    }

    setError('');
    setLoading(true);

    try {
        const basePrices = { monthly: 49900, yearly: 499900 };
        const originalAmount = basePrices[plan];
        const finalAmount = discount ? Math.round(originalAmount * (1 - discount / 100)) : originalAmount;

        const orderRes = await fetch(`${API_URL}/api/payment/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, plan, finalAmount }), // ✅ Send finalAmount
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create Razorpay order');

        const { id: order_id, amount, currency, key_id } = orderData;

        let planDescription = plan === 'monthly' ? 'Monthly Subscription' : 'Yearly Subscription';
        if (coupon.trim()) {
            planDescription += ` (Coupon Applied: ${coupon.trim().toUpperCase()})`;
        }

        const options = {
            key: key_id,
            amount,
            currency,
            name: 'Saarthi Subscription',
            description: planDescription,
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
                            amount
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
    } catch (err) {
        setError(err.message || 'Error during payment process');
        setLoading(false);
    }
};


    useEffect(() => {
        if (!uid) {
            setError('User ID not provided. Please go back and try again.');
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); }
    }, [uid]);

    // --- MODIFIED: Plan details now a function to calculate prices dynamically ---
    const getPlanDetails = () => {
        const monthlyPrice = 499;
        const yearlyPrice = 4999;

        const calculateDiscountedPrice = (price, discountPercent) => {
            if (discountPercent === 0) return null;
            const discounted = price - (price * discountPercent / 100);
            return `₹${Math.round(discounted)}`;
        };

        return {
            monthly: {
                name: 'Monthly',
                price: `₹${monthlyPrice}`,
                discountedPrice: calculateDiscountedPrice(monthlyPrice, discount),
                period: '/month',
                features: ['Full Access to All Features', 'Unlimited Lead Management', 'Standard Email Support', 'Cancel Anytime']
            },
            yearly: {
                name: 'Yearly',
                price: `₹${yearlyPrice}`,
                discountedPrice: calculateDiscountedPrice(yearlyPrice, discount),
                period: '/year',
                features: ['Full Access to All Features', 'Unlimited Lead Management', 'Priority Email & Chat Support', '2 Months Free (Save 15%)'],
                badge: 'Best Value'
            }
        };
    };
    // --- END OF MODIFIED ---

    const planDetails = getPlanDetails();

    return (
       <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-12">
            <Image src="/assets/images/logox.png" alt="Saarthi Logo" width={100} height={100} className="mx-auto" />
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Join Saarthi and supercharge your lead management with our premium features.
          </p>
        </div>

        {/* --- MODIFIED: Plan cards now display discounted price --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {Object.entries(planDetails).map(([planKey, details]) => (
            <div
              key={planKey}
              className={`group rounded-2xl border-2 p-8 cursor-pointer transition-all duration-500 relative overflow-hidden backdrop-blur-sm ${
                plan === planKey
                  ? "border-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-900/20 dark:via-gray-800 dark:to-indigo-900/20 shadow-2xl shadow-blue-500/20 scale-105 transform"
                  : "border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 hover:scale-102 hover:-translate-y-1"
              }`}
              onClick={() => setPlan(planKey)}
            >
              {/* Gradient overlay for selected state */}
              {plan === planKey && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>
              )}

              {details.badge && (
                <div className="absolute  top-6 right-4 -mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                  {details.badge}
                </div>
              )}

              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {details.name}
                </h2>

                <div className="mb-8">
                  {details.discountedPrice ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-semibold text-gray-400 dark:text-gray-500 line-through">
                        {details.price}
                      </span>
                      <span className="text-5xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                        {details.discountedPrice}
                      </span>
                    </div>
                  ) : (
                    <span className="text-5xl font-extrabold text-gray-900 dark:text-white">{details.price}</span>
                  )}
                  <span className="text-lg text-gray-500 dark:text-gray-400 ml-2">{details.period}</span>
                </div>

                <ul className="space-y-4 text-gray-700 dark:text-gray-300">
                  {details.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 group/item">
                      <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mt-0.5 group-hover/item:scale-110 transition-transform duration-200">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-base leading-relaxed group-hover/item:text-gray-900 dark:group-hover/item:text-white transition-colors duration-200">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selection indicator */}
              {plan === planKey && (
                <div className="absolute top-4 left-4 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
        {/* --- END OF MODIFIED --- */}

        <div className="max-w-lg mx-auto w-full ">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="mb-8">
              <label
                htmlFor="coupon"
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wide"
              >
                Have a coupon?
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="coupon"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Enter coupon code"
                  className="w-full px-2 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-all duration-300 backdrop-blur-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full opacity-0 animate-pulse"></div>
                </div>
              </div>
            </div>

            <button
              className="w-full text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 font-bold rounded-xl text-lg px-4 py-2 text-center transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 active:scale-95 relative overflow-hidden group"
              onClick={handlePayment}
              disabled={loading || !uid || !plan}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <span className="relative z-10">
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  "Proceed to Pay"
                )}
              </span>
            </button>

            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-center text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    );
};

export default PaymentPage;