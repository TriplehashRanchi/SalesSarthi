'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { showNotification } from '@mantine/notifications';
import { auth, googleProvider } from '@/utils/firebase';
import { useAuth } from '@/context/AuthContext';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import IconGoogle from '../icon/icon-google';

// Add a simple loader icon component
const IconLoader = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const ComponentsAuthLoginForm = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // --- NEW: Add a loading state ---
    const [isLoading, setIsLoading] = useState(false);

    // ✅ Redirect logic remains the same.
    useEffect(() => {
        if (user?.role === 'admin') {
            router.push('/dashboard');
        } else if (user?.role === 'Manager' || user?.role === 'Salesperson') {
            router.push('/user-dashboard');
        }
    }, [user, router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true); // --- 1. Start loading ---

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // On success, the useEffect will handle the redirect.
            // No need to set isLoading(false) as the page will navigate away.
        } catch (err) {
            // Provide more user-friendly error messages
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please try again.');
            } else {
                setError('An unexpected error occurred. Please try again later.');
            }
            setIsLoading(false); // --- 3. Stop loading on error ---
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true); // --- 1. Start loading ---

        try {
            await signInWithPopup(auth, googleProvider);
            // On success, the useEffect will handle the redirect.
        } catch (err) {
            setError('Failed to sign in with Google. Please try again.');
            setIsLoading(false); // --- 3. Stop loading on error ---
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            return showNotification({
                title: 'Enter Email First',
                message: 'Please type your email address in the field above to reset the password.',
                color: 'orange',
            });
        }
        // We can also show a loading state here if we want, but it's usually fast.
        try {
            await sendPasswordResetEmail(auth, email);
            showNotification({
                title: 'Password Reset Email Sent',
                message: 'Please check your inbox for a link to reset your password.',
                color: 'green',
            });
        } catch (err) {
            showNotification({
                title: 'Error Sending Email',
                message: 'Could not send reset email. Please ensure the email address is correct.',
                color: 'red',
            });
        }
    };

    return (
        <form className="space-y-5 dark:text-white" onSubmit={handleLogin}>
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
                        disabled={isLoading} // --- Disable input when loading ---
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>
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
                        disabled={isLoading} // --- Disable input when loading ---
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* --- MODIFIED: Submit Button with Loading State --- */}
            <button type="submit" className="btn btn-gradient w-full flex justify-center items-center" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <IconLoader />
                        <span>Signing In...</span>
                    </>
                ) : (
                    'Sign in'
                )}
            </button>

            <div className="relative my-4 h-5 text-center before:absolute before:inset-0 before:m-auto before:h-[1px] before:w-full before:bg-gray-300 dark:before:bg-gray-600">
                 <span className="relative z-[1] inline-block bg-white px-2 dark:bg-gray-800">OR</span>
            </div>

            {/* --- MODIFIED: Google Button with Loading State --- */}
            <button type="button" onClick={handleGoogleLogin} className="btn btn-outline-primary shadow-sm w-full flex justify-center items-center" disabled={isLoading}>
                 {isLoading ? (
                    <>
                        <IconLoader />
                        <span>Processing...</span>
                    </>
                ) : (
                   <>
                    <IconGoogle className="mr-2" />
                    Sign in with Google
                   </>
                )}
            </button>
            
            <div className="text-center mt-4">
                 <button type="button" onClick={handleForgotPassword} className="text-sm text-primary-700 hover:underline dark:text-primary-400" disabled={isLoading}>
                    Forgot password?
                 </button>
            </div>
        </form>
    );
};

export default ComponentsAuthLoginForm;