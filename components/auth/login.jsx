'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';   // ← added useSearchParams
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { signInWithGoogle, /* optional: */ completeWebRedirectIfAny } from '@/utils/auth';
import { showNotification } from '@mantine/notifications';
import { auth, googleProvider } from '@/utils/firebase';
import { useAuth } from '@/context/AuthContext';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import IconGoogle from '../icon/icon-google';

/* tiny spinner icon */
const IconLoader = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default function ComponentsAuthLoginForm() {
  const router           = useRouter();
  const searchParams     = useSearchParams();           // ← new
  const { user }         = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setLoading] = useState(false);

  /* 1️⃣  Show success banner if redirected from checkout */
  useEffect(() => {
    const paymentFlag = searchParams.get('payment');
    const trialFlag   = searchParams.get('trial');

    if (paymentFlag === 'success') {
      showNotification({
        title: 'Payment Successful',
        message: 'Thank you! Please sign in to access your dashboard.',
        color:  'green',
      });
    }
    if (trialFlag === 'started') {
      showNotification({
        title: 'Free Trial Started',
        message: 'Your 7-day trial is active. Sign in to get started!',
        color:  'blue',
      });
    }
    // both params are harmless if absent; no further action needed
  }, [searchParams]);

  /* 2️⃣  normal auth redirect */
  useEffect(() => {
    if (user?.role === 'admin') {
      router.push('/dashboard');
    } else if (user?.role === 'Manager' || user?.role === 'Salesperson') {
      router.push('/user-dashboard');
    }
  }, [user, router]);

  /* handlers unchanged … */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      setLoading(false);
    }
  };

 const handleGoogleLogin = async () => {
  setError('');
  setLoading(true);
  try {
    await signInWithGoogle();
    // success will trigger onAuthStateChanged in your AuthContext
  } catch (e) {
    setError(e?.message || 'Failed to sign in with Google. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const handleForgotPassword = async () => {
    if (!email) {
      return showNotification({
        title: 'Enter Email First',
        message: 'Please type your email address above to reset the password.',
        color: 'orange',
      });
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification({
        title: 'Password Reset Email Sent',
        message: 'Check your inbox for a reset link.',
        color: 'green',
      });
    } catch {
      showNotification({
        title: 'Error Sending Email',
        message: 'Could not send reset email. Please check the address.',
        color: 'red',
      });
    }
  };

  /* UI identical to previous version except for success banner handled above */
  return (
    <form className="space-y-5 dark:text-white" onSubmit={handleLogin}>
      {/* email */}
      <div>
        <label htmlFor="email">Email</label>
        <div className="relative text-white-dark">
          <input
            id="email"
            type="email"
            placeholder="Enter Email"
            className="form-input ps-10 placeholder:text-white-dark disabled:bg-gray-200 dark:disabled:bg-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
          <span className="absolute start-4 top-1/2 -translate-y-1/2">
            <IconMail fill />
          </span>
        </div>
      </div>

      {/* password */}
      <div>
        <label htmlFor="password">Password</label>
        <div className="relative text-white-dark">
          <input
            id="password"
            type="password"
            placeholder="Enter Password"
            className="form-input ps-10 placeholder:text-white-dark disabled:bg-gray-200 dark:disabled:bg-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          <span className="absolute start-4 top-1/2 -translate-y-1/2">
            <IconLockDots fill />
          </span>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* sign in button */}
      <button
        type="submit"
        className="btn btn-gradient w-full flex justify-center items-center"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <IconLoader />
            <span>Signing In…</span>
          </>
        ) : (
          'Sign in'
        )}
      </button>

      {/* divider */}
      <div className="relative my-4 h-5 text-center before:absolute before:inset-0 before:m-auto before:h-[1px] before:w-full before:bg-gray-300 dark:before:bg-gray-600">
        <span className="relative z-[1] inline-block bg-white px-2 dark:bg-gray-800">OR</span>
      </div>

      {/* google button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="btn btn-outline-primary w-full flex justify-center items-center"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <IconLoader />
            <span>Processing…</span>
          </>
        ) : (
          <>
            <IconGoogle className="mr-2" />
            Sign in with Google
          </>
        )}
      </button>

      {/* forgot password */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm text-primary-700 hover:underline dark:text-primary-400"
          disabled={isLoading}
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}
