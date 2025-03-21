"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider } from "@/utils/firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";

const ComponentsAuthRegisterForm = () => {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Handle Email/Password Signup
    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebase_uid = userCredential.user.uid;

            await registerAdmin(firebase_uid, name, email, phone);
        } catch (err) {
            setError(err.message);
        }
    };

    // Handle Google Signup
    const handleGoogleSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const firebase_uid = result.user.uid;
            const userEmail = result.user.email;
            const userName = result.user.displayName;

            await registerAdmin(firebase_uid, userName, userEmail, ""); // No phone from Google

        } catch (err) {
            setError(err.message);
        }
    };

    // Send data to backend for database storage
    const registerAdmin = async (firebase_uid, name, email, phone) => {
        try {
            const response = await fetch(`${API_URL}/api/admin/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firebase_uid, name, email, phone }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            router.push("/dashboard");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <form className="space-y-5 dark:text-white" onSubmit={handleRegister}>
            <div>
                <label>Name</label>
                <input
                    type="text"
                    placeholder="Enter Name"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Email</label>
                <input
                    type="email"
                    placeholder="Enter Email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Phone</label>
                <input
                    type="tel"
                    placeholder="Enter Phone"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <div>
                <label>Password</label>
                <input
                    type="password"
                    placeholder="Enter Password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <button type="submit" className="btn btn-gradient w-full">Sign Up</button>
            <button type="button" onClick={handleGoogleSignIn} className="btn btn-outline w-full mt-3">
                Sign Up with Google
            </button>
        </form>
    );
};

export default ComponentsAuthRegisterForm;
