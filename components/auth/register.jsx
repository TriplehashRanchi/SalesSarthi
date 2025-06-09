'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from '@/utils/firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';

// Add a simple loader icon component
const IconLoader = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ComponentsAuthRegisterForm = () => {
    const router = useRouter();
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // --- NEW: Add a loading state ---
    const [isLoading, setIsLoading] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // ✅ Redirect logic remains the same.
    useEffect(() => {
        if (user?.role === 'admin') {
            router.push('/dashboard');
        } else if (user?.role === 'user') {
            router.push('/user-dashboard');
        }
    }, [user, router]);

    // Helper to register the user on your backend
    const registerAdmin = async (firebase_uid, name, email, phone) => {
        const response = await fetch(`${API_URL}/api/admin/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebase_uid, name, email, phone }),
        });

        const data = await response.json();
        if (!response.ok) {
            // Throw an error that will be caught by the calling function
            throw new Error(data.message || 'Failed to register on our server.');
        }
        // Success! The useEffect will handle the redirect.
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true); // --- 1. Start loading ---

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebase_uid = userCredential.user.uid;

            // This will throw an error if it fails, which will be caught below
            await registerAdmin(firebase_uid, name, email, phone);

            // The redirect will happen via useEffect, so we don't need to do anything here.
            // We don't even need to set isLoading(false) on success, because the page will navigate away.
        } catch (err) {
            // Handle common Firebase errors for better UX
            if (err.code === 'auth/email-already-in-use') {
                setError('This email address is already in use. Please try logging in.');
            } else {
                setError(err.message);
            }
            setIsLoading(false); // --- 3. Stop loading on error ---
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true); // --- 1. Start loading ---

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const firebase_uid = result.user.uid;
            const userEmail = result.user.email;
            const userName = result.user.displayName;

            // This will throw an error if it fails
            await registerAdmin(firebase_uid, userName, userEmail, '');

        } catch (err) {
             // Handle common Firebase errors
            if (err.code === 'auth/account-exists-with-different-credential') {
                 setError('An account already exists with this email address. Please sign in with the original method.');
            } else {
                 setError(err.message);
            }
            setIsLoading(false); // --- 3. Stop loading on error ---
        }
    };

    return (
        <form className="space-y-5 dark:text-white" onSubmit={handleRegister}>
            {/* Input fields remain the same */}
            <div>
                <label>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} required className="form-input disabled:bg-gray-200" />
            </div>
            <div>
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required className="form-input disabled:bg-gray-200" />
            </div>
            <div>
                <label>Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading} className="form-input disabled:bg-gray-200" />
            </div>
            <div>
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required className="form-input disabled:bg-gray-200" />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* --- MODIFIED: Submit Button with Loading State --- */}
            <button type="submit" className="btn btn-gradient w-full flex justify-center items-center" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <IconLoader />
                        <span>Signing Up...</span>
                    </>
                ) : (
                    'Sign Up'
                )}
            </button>
            
            {/* --- MODIFIED: Google Button with Loading State --- */}
            <div className="relative my-4 h-5 text-center before:absolute before:inset-0 before:m-auto before:h-[1px] before:w-full before:bg-gray-300 dark:before:bg-gray-600">
                <span className="relative z-[1] inline-block bg-white px-2 dark:bg-gray-800">OR</span>
            </div>
            <button type="button" onClick={handleGoogleSignIn} className="btn btn-outline-primary w-full flex justify-center items-center" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <IconLoader />
                        <span>Processing...</span>
                    </>
                ) : (
                    'Sign Up with Google'
                )}
            </button>
        </form>
    );
};

export default ComponentsAuthRegisterForm;