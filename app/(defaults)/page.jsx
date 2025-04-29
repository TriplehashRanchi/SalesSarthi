// app/page.tsx   ── Next 13/14 (App Router)   ── uses your AuthContext
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';   // adjust import path

export default function Home() {
  const { user, loading } = useAuth();             // from your context
  const router = useRouter();

  useEffect(() => {
    if (loading) return;                           // still checking session

    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/dashboard');
    } else if (user.role === 'user') {
      router.replace('/user-dashboard');
    } else {
      router.replace('/login');                    // fallback
    }
  }, [loading, user, router]);

  // simple spinner / placeholder while redirect decision happens
  return (
    <div className="h-screen flex items-center justify-center text-lg">
      Loading…
    </div>
  );
}
