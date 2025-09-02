'use client';

import { useMemo } from 'react';
import { daysUntil, formatIST } from '@/utils/date';
import { useRouter } from 'next/navigation';

export default function SubscriptionBanner({
  subscription,
  whatsappNumber = '7011979448', // pass a different one if needed
}) {
  const router = useRouter();

  const { daysLeft, isExpiringWindow, isExpired } = useMemo(() => {
    const d = daysUntil(subscription?.expires_at);
    return {
      daysLeft: d,
      isExpiringWindow: typeof d === 'number' && d < 8, // 7..-∞
      isExpired: typeof d === 'number' && d <= 0,
    };
  }, [subscription?.expires_at]);

  const show =
    isExpiringWindow &&
    ['Active', 'Trial', 'Pending'].includes(
      subscription?.subscription_status || subscription?.status || 'Active'
    );

  if (!show) return null;

  const plan = subscription?.plan || subscription?.subscription_plan || 'Plan';

  const tone = isExpired
    ? 'bg-red-200 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
    : 'bg-amber-300 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-100';

  // Build WhatsApp link (international format without "+")
  const digits = String(whatsappNumber || '').replace(/\D/g, '');
  const intlWhatsApp = digits.startsWith('91') ? digits : `91${digits}`;
  const waText =
    typeof daysLeft === 'number'
      ? isExpired
        ? 'I want to renew my subscription. My plan has expired.'
        : `I want to renew my subscription. My ${plan} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
      : 'I want to renew my subscription.';
  const waLink = `https://wa.me/${intlWhatsApp}?text=${encodeURIComponent(waText)}`;

  return (
    <div className={`mb-4 rounded-lg border ${tone}`}>
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="font-semibold">
            {isExpired
              ? `Your ${plan} plan has expired`
              : `Your ${plan} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
          </p>
          <p className="text-sm/6 opacity-80">
            {isExpired
              ? 'Please renew to continue using all features.'
              : `Renew by ${formatIST(subscription?.expires_at)} to avoid interruption.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile: WhatsApp button */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block sm:hidden px-3 py-2 rounded-md text-sm mt-1 font-medium bg-[#25D366] text-white hover:opacity-90"
          >
            Contact Customer Support 
          </a>

          {/* ≥ sm screens: Go to Plans button */}
          <button
            onClick={() => router.push('/payment')}
            className={`hidden sm:inline-flex px-3 py-2 rounded-md text-sm mt-1 font-medium ${
              isExpired ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            Go to Plans
          </button>
        </div>
      </div>
    </div>
  );
}
