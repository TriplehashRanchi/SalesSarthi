'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, } from '@/utils/firebase';
import { 
    createUserWithEmailAndPassword,
    getAdditionalUserInfo           // ← Import this helper
} from 'firebase/auth';
import { signInWithGoogle } from '@/utils/auth'; 
import { useAuth } from '@/context/AuthContext';
import { showNotification } from '@mantine/notifications';

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
     // --- NEW: Add state to track if the device is mobile ---
    const [isMobile, setIsMobile] = useState(false);

    // --- NEW: Add a loading state ---
    const [isLoading, setIsLoading] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // ✅ Redirect logic remains the same.
    useEffect(() => {
        // if (user?.role === 'admin') {
        //     router.push('/dashboard');
        // } else if (user?.role === 'user') {
        //     router.push('/user-dashboard');
        // }
    }, [user, router]);

      // --- NEW: Add a useEffect to detect the device type on component mount ---
    useEffect(() => {
        // This check runs only on the client side
        const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(mobileCheck);
    }, []); 

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

       const startFreeTrial = async (firebase_uid) => {
        const response = await fetch(`${API_URL}/api/trial/start-trial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebase_uid }),
        });

        if (!response.ok) {
            throw new Error('Could not start your free trial.');
        }
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
             if (isMobile) {
                // On mobile, start trial and redirect to login
                await startFreeTrial(firebase_uid);
                router.push('/login?trial=started');
            } else {
                // On desktop, go to the payment page
                router.push(`/payment?uid=${firebase_uid}`);
            }


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

// Replace the existing handleGoogleSignIn function with this improved version:
const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
        // 1. Call your centralized signInWithGoogle function
        const result = await signInWithGoogle();

        // Handle cases like redirects where the result might be null initially
        if (!result) {
            // The redirect is in progress, no need to do anything else here.
            return;
        }

        // 2. Get the additional user info from the result
        const additionalInfo = getAdditionalUserInfo(result);
        const firebaseUser = result.user;

        // 3. Check if the user is NEW
        if (additionalInfo?.isNewUser) {
            // This is the registration "happy path" for a brand new user
            console.log("New user detected, proceeding with registration...");
            
            // Register the user on your backend
            await registerAdmin(firebaseUser.uid, firebaseUser.displayName, firebaseUser.email, '');

            // Apply the mobile vs. desktop logic
            if (isMobile) {
                await startFreeTrial(firebaseUser.uid);
                router.push('/login?trial=started');
            } else {
                router.push(`/payment?uid=${firebaseUser.uid}`);
            }
        } else {
            // --- ✅ FIX STARTS HERE ---
            // The user ALREADY EXISTS. Treat this as a login.
            console.log("Existing user signed in. AuthContext will handle the redirect.");
            showNotification({
                title: 'Welcome Back!',
                message: 'You have been successfully signed in.',
                color: 'green',
            });
            // The `onAuthStateChanged` listener in your AuthContext will
            // automatically detect the signed-in user and redirect them to their dashboard.
            // No further action is needed here, we can simply stop loading.
            setIsLoading(false);
            // --- ✅ FIX ENDS HERE ---
        }

    } catch (err) {
         // Handle common errors
        if (err.code === 'auth/account-exists-with-different-credential') {
             setError('An account already exists with this email address. Please sign in using the original method you used.');
        } else if (err.code === 'auth/popup-closed-by-user') {
            // This is not a real error, so we don't need to show a message.
            console.log("User closed the Google Sign-In popup.");
        } else {
             setError(err.message);
        }
        setIsLoading(false);
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