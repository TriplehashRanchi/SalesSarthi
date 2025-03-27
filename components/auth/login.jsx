"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/utils/firebase";
import { useAuth } from "@/context/AuthContext";
import IconLockDots from "@/components/icon/icon-lock-dots";
import IconMail from "@/components/icon/icon-mail";

const ComponentsAuthLoginForm = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/userdashboard");
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            router.push("/userdashboard");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <form className="space-y-5 dark:text-white" onSubmit={handleLogin}>
            <div>
                <label>Email</label>
                <div className="relative text-white-dark">
                    <input
                        type="email"
                        placeholder="Enter Email"
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>
            <div>
                <label>Password</label>
                <div className="relative text-white-dark">
                    <input
                        type="password"
                        placeholder="Enter Password"
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <button type="submit" className="btn btn-gradient w-full">Sign in</button>
            <button type="button" onClick={handleGoogleLogin} className="btn btn-google w-full">Sign in with Google</button>
        </form>
    );
};

export default ComponentsAuthLoginForm;
