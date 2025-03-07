import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, getIdToken } from "firebase/auth";

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user; // Returns Firebase user object
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

// Sign in with Email & Password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Email Sign-In Error:", error);
    throw error;
  }
};

// Register new user with Email & Password
export const signUpWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Signup Error:", error);
    throw error;
  }
};

// Sign Out
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
};

// Get Firebase Token (for secure API calls)
export const getFirebaseToken = async () => {
  if (auth.currentUser) {
    return await getIdToken(auth.currentUser);
  }
  return null;
};
