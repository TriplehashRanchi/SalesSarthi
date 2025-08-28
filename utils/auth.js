// utils/auth.js
import { auth, googleProvider } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  getIdToken,
} from "firebase/auth";

import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";

// ──────────────────────────────────────────────────────────────
// Put YOUR Web OAuth Client ID (from Google Cloud) here:
const WEB_CLIENT_ID =
  "1015570195056-o6afslncovbr4960a7oaqh96irop4jr6.apps.googleusercontent.com";
// ──────────────────────────────────────────────────────────────

// Lazy init to avoid multiple initializations
let socialLoginInitialized = false;
async function ensureSocialLoginInit() {
  if (socialLoginInitialized) return;
  await SocialLogin.initialize({
    google: { webClientId: WEB_CLIENT_ID },
  });
  socialLoginInitialized = true;
}

// -------- Google Sign-in (native vs web) --------
export const signInWithGoogle = async () => {
  console.log('isNative?', Capacitor.isNativePlatform());
  if (Capacitor.isNativePlatform()) {
    console.log('Using native Google login');
    // ✅ Native: get Google ID token, then sign into Firebase Web SDK
    await ensureSocialLoginInit();
    const res = await SocialLogin.login({ provider: "google" });

    const idToken =
      res?.idToken ||
      res?.credential?.idToken ||
      res?.authentication?.idToken ||
      res?.token;

    if (!idToken) throw new Error("No Google ID token from native login");

    const cred = GoogleAuthProvider.credential(idToken);
    return (await signInWithCredential(auth, cred)).user;
  }
  console.log('Using web Google login');

  // ✅ Web/PWA: popup → redirect fallback
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch {
    await signInWithRedirect(auth, googleProvider);
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  }
};

// -------- Email / Password --------
export const signInWithEmail = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const signUpWithEmail = async (email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  return user;
};

// -------- Logout (both native & web) --------
export const logout = async () => {
  try {
    await SocialLogin.logout({ provider: "google" }); // safe if not logged in natively
  } catch {}
  await fbSignOut(auth);
};

// -------- Get Firebase JWT for API calls --------
export const getFirebaseToken = async () => {
  if (auth.currentUser) {
    return await getIdToken(auth.currentUser, true); // force refresh
  }
  return null;
};
