'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const GST_RATE = 0.18;

/* --- util --- */
const CheckIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);
const fmt = (paise) => (paise / 100).toLocaleString('en-IN');     // 2,400

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const uid          = searchParams.get('uid');

  const [plans, setPlans]           = useState([]);
  const [planId, setPlanId]         = useState(null);

  const [coupon, setCoupon]         = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponMsg, setCouponMsg]   = useState('');

  const [loading, setLoading]       = useState(false);
  const [error,   setError]         = useState('');

  const { user, logout } = useAuth();

  /* 1️⃣  fetch active plans */
  useEffect(() => {
    fetch(`${API_URL}/api/plans`)
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => setError('Could not load plans – try again later.'));
  }, []);

  /* 2️⃣  validate coupon (only for selected plan) */
  useEffect(() => {
    if (!coupon) { setCouponInfo(null); setCouponMsg(''); return; }

    const t = setTimeout(async () => {
      if (!planId) { setCouponMsg('Select a plan first'); return; }

      try {
        const res = await fetch(
          `${API_URL}/api/coupons/${coupon.trim().toUpperCase()}?plan=${planId}`
        );
        if (res.status === 409) {
          setCouponInfo(null);
          setCouponMsg('Coupon is valid, but for a different plan');
          return;
        }
        if (!res.ok) throw new Error();
        setCouponInfo(await res.json());
        setCouponMsg('Coupon applied!');
      } catch {
        setCouponInfo(null);
        setCouponMsg('Invalid or expired coupon');
      }
    }, 400);

    return () => clearTimeout(t);
  }, [coupon, planId]);

  /* 3️⃣  build card data – coupon discount only affects the selected card */
  const cards = useMemo(() => {
    const titleMap = { MONTHLY:'Monthly', QUARTERLY:'Quarterly', HALF_YEARLY:'Half-Yearly', YEARLY:'Yearly' };
    const perMap   = { MONTHLY:'/month',  QUARTERLY:'/quarter',  HALF_YEARLY:'/6 mo',        YEARLY:'/year' };

    return plans.map((plan) => {
      const discount =
        plan.id === planId && couponInfo
          ? couponInfo.discount_type === 'PERCENT'
            ? Math.round(plan.price_paise * (couponInfo.discount_value / 100))
            : couponInfo.discount_value * 100
          : 0;

      const finalPaise = Math.max(plan.price_paise - discount, 0);

      return {
        id:        plan.id,
        title:     titleMap[plan.billing_cycle] ?? plan.name,
        period:    perMap[plan.billing_cycle] ?? '',
        baseStr:   fmt(plan.price_paise),
        finalStr:  fmt(finalPaise),
        savePct:   discount ? Math.round((discount / plan.price_paise) * 100) : null,
        badge:     plan.billing_cycle === 'YEARLY' ? 'Best Value' : null,
        features: [
          '7-day free trial',
          `Then ₹${fmt(finalPaise)} ${perMap[plan.billing_cycle] ?? ''}`,
        ],
      };
    });
  }, [plans, couponInfo, planId]);

  /* 4️⃣  Razorpay checkout */
  const handlePay = async () => {
    if (!uid || !planId) { setError('Select a plan first'); return; }
    setLoading(true); setError('');

    try {
      const order = await fetch(`${API_URL}/api/payment/create-order`, {
        method : 'POST',
        headers: { 'Content-Type':'application/json' },
        body   : JSON.stringify({
          firebase_uid: uid,
          plan_id    : planId,
          coupon_code: coupon.trim().toUpperCase() || undefined,
        }),
      }).then(r => r.json());

      const rzp = new window.Razorpay({
        key       : order.key_id,
        amount    : order.amount,
        currency  : order.currency,
        name      : 'Saarthi Subscription',
        description: cards.find(c => c.id === planId)?.title ?? '',
        order_id  : order.order_id,
        handler: async (resp) => {
          const ok = await fetch(`${API_URL}/api/payment/verify`, {
            method : 'POST',
            headers: { 'Content-Type':'application/json' },
            body   : JSON.stringify({
              razorpay_order_id  : resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature : resp.razorpay_signature,
              firebase_uid       : uid,
              plan_id            : planId,
              amount             : order.amount,
            }),
          }).then(r => r.ok);
          if (ok) logout().then(() => router.replace('/login?payment=success') );
          else    setError('Verification failed');
        },
        theme: { color:'#2fabe5' },
      });
      rzp.open();
    } catch (e) {
      setError(e.message); setLoading(false);
    }
  };

  /* 5️⃣  Start trial – backend should mark status = 'Active', expires_at = NOW()+7 */
  const handleTrial = async () => {
    if (!uid) { setError('User ID missing'); return; }
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/trial/start-trial`, {
        method : 'POST',
        headers: { 'Content-Type':'application/json' },
        body   : JSON.stringify({ firebase_uid: uid }),
      });
      router.replace('/login?trial=started');
    } catch {
      setError('Unable to start trial');
    }
  };

  /* 6️⃣  load Razorpay script once */
  useEffect(() => {
    if (!uid) { setError('User ID missing'); return; }
    const s = document.createElement('script');
    s.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
    return () => document.body.removeChild(s);
  }, [uid]);

  /* ─── UI ─── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 p-4 flex flex-col items-center">
      <div className="w-full max-w-5xl">

        {/* header */}
        <div className="text-center mb-10">
          <Image src="/assets/images/logox.png" alt="logo" width={90} height={90} className="mx-auto" />
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent mt-4">
            Choose Your Plan
          </h1>
        </div>

        {/* plan grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {cards.map((c) => (
            <div
              key={c.id}
              onClick={() => setPlanId(c.id)}
              className={`relative rounded-2xl border p-6 cursor-pointer transition-all ${
                planId === c.id
                  ? 'border-blue-500 shadow-xl scale-105 bg-white dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 hover:shadow-lg'
              }`}
            >
              {c.badge && (
                <span className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {c.badge}
                </span>
              )}
              {c.savePct && (
                <span className="absolute top-4 left-4 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  SAVE {c.savePct}%
                </span>
              )}

              <h2 className="text-2xl font-bold mb-3">{c.title}</h2>

              <p className="mb-1">
                {c.savePct && (
                  <span className="line-through text-gray-400 mr-2">₹{c.baseStr}</span>
                )}
                <span className="text-4xl font-extrabold">₹{c.finalStr}</span>
                <span className="text-sm text-gray-500">{c.period}</span>
              </p>
              <p className="text-xs text-gray-500 mb-4">+18 % GST</p>

              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                {c.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <CheckIcon />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {planId === c.id && (
                <div className="absolute top-4 left-4 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <CheckIcon />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* coupon + actions */}
        <div className="max-w-lg mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-2xl border">
            <label className="block text-sm font-semibold mb-1">Have a coupon?</label>
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-700/50"
              placeholder="Enter coupon code"
            />
            {coupon && <p className="mt-1 text-sm">{couponMsg}</p>}

            <button
              onClick={handlePay}
              disabled={loading || !uid || !planId}
              className="mt-6 w-full py-2 text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded font-bold disabled:opacity-50"
            >
              {loading ? 'Processing…' : 'Proceed to Pay'}
            </button>

           {(!user?.trial_used) && (
  <button
    onClick={handleTrial}
    disabled={loading || !uid}
    className="mt-3 w-full py-2 border border-blue-600 text-blue-600 rounded font-bold disabled:opacity-50"
  >
    Start Free 7-Day Trial
  </button>
)}


            {error && (
              <p className="mt-4 text-center text-red-600 text-sm">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
