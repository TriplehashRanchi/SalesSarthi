"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { showNotification } from "@mantine/notifications";
import { auth, googleProvider } from "@/utils/firebase";
import { useAuth } from "@/context/AuthContext";
import IconLockDots from "@/components/icon/icon-lock-dots";
import IconMail from "@/components/icon/icon-mail";
import IconGoogle from "../icon/icon-google";

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
            router.push("/user-dashboard");
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            router.push("/user-dashboard");
        } catch (err) {
            setError(err.message);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
          return showNotification({
            title: "Enter email first",
            message: "Please type your email address above.",
            color: "red",
          });
        }
        try {
          await sendPasswordResetEmail(auth, email);
          showNotification({
            title: "Email sent",
            message: "Check your inbox for the reset link.",
            color: "green",
          });
        } catch (err) {
          showNotification({
            title: "Error",
            message: err.message,
            color: "red",
          });
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
            <button type="button" onClick={handleGoogleLogin} className="btn shadow-sm w-full"><IconGoogle className="mr-2" />Sign in with Google</button>
             <button
               type="button"
               onClick={handleForgotPassword}
               className="mt-2 text-sm text-blue-500 hover:underline"
             >
               Forgot password?
             </button>

        </form>
    );
};

export default ComponentsAuthLoginForm;
