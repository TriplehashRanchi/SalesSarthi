import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, logout, getFirebaseToken } from '@/utils/auth';
import { useRouter } from 'next/navigation';

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Track loading state
    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

                // ✅ Do NOT logout if status is pending or expired
                setUser({
                    ...firebaseUser,
                    token,
                    role: role.role,
                    admin_id: role.admin_id,
                    status: role.status,
                    expires_at: role.expires_at,
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    return <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>{children}</AuthContext.Provider>;
};

// Custom Hook to use Auth Context
export const useAuth = () => {
    return useContext(AuthContext);
};
