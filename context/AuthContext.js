import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { auth } from '@/utils/firebase';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, logout, getFirebaseToken } from '@/utils/auth';
import { useRouter } from 'next/navigation';

// Create Auth Context
/**
 * @typedef {Object} AuthContextValue
 * @property {any} user
 * @property {any} profile
 * @property {boolean} loading
 * @property {(user: any) => void} setUser
 * @property {Function} signInWithGoogle
 * @property {Function} signInWithEmail
 * @property {Function} signUpWithEmail
 * @property {Function} logout
 */
/** @type {import('react').Context<AuthContextValue | null>} */
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // NEW ➜ /me payload
    const [loading, setLoading] = useState(true); // Track loading state
    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Fetch user role from backend
    const fetchUserRole = async (firebase_uid) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firebase_uid }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            return data.role; // "admin" or "user"
        } catch (err) {
            console.error('Error fetching role:', err.message);
            return null;
        }
    };

    // 🔸 Helper – wraps a fetch that needs the Firebase JWT
    const callApi = async (url, token) => {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    };

    useEffect(() => {
  if (typeof window === 'undefined') return;
  getRedirectResult(auth).catch(() => {});
}, []);

    // Listen to Firebase Auth Changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const token = await getFirebaseToken();
                const role = await fetchUserRole(firebaseUser.uid); // Fetch role from DB
                if (!role) {
                    await logout();
                    return;
                }
               // --- THIS IS THE CORRECTED LOGIC ---
                // Define which statuses are allowed to log in.
                const ALLOWED_STATUSES = ['active', 'pending', 'expired'];

                // If the user's status is NOT in the allowed list, block them.
                if (!ALLOWED_STATUSES.includes(role.status)) {
                    console.warn(`⛔ Access blocked for status: ${role.status}`);
                    alert(`Your access is currently ${role.status}. Please contact support.`);
                    await logout();
                    return; // Stop execution here
                }
                
                // ✅ Do NOT logout if status is pending or expired
                setUser({
                    ...firebaseUser,
                    token,
                    role: role.role,
                    admin_id: role.admin_id,
                    status: role.status,
                    expires_at: role.expires_at,
                    trial_used: role.trial_used,
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    // 🔸 Once we have role + token, pull /me
    useEffect(() => {
        if (!user?.token || !user?.role) return;
        let isMounted = true;
        const loadProfile = async () => {
            try {
                const endpoint = user.role === 'admin' ? `${API_URL}/api/admin/me` : `${API_URL}/api/users/me`;
                const data = await callApi(endpoint, user.token);
                if (isMounted) setProfile(data);
            } catch (err) {
                console.error('Failed to fetch profile', err);
            }
        };
        loadProfile();
        return () => {
            isMounted = false;
        };
    }, [user?.token, user?.role]);

    const value = useMemo(
        () => ({
            user,
            profile,
            loading,
            setUser,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            logout,
        }),
        [user, profile, loading],
    );
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook to use Auth Context
/**
 * @returns {AuthContextValue | null}
 */
export const useAuth = () => {
    return useContext(AuthContext);
};
