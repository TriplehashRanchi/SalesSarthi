// utils/auth.js
console.log("🚀 utils/auth.js is loaded in the bundle");

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

// ── DEBUG SWITCH ─────────────────────────────────────────────
const DEBUG_AUTH = true;       // set to false when done
const SHOW_ALERTS = true;      // set to false to silence alerts
// ────────────────────────────────────────────────────────────

// Put YOUR Web OAuth Client ID (from Google Cloud):
const WEB_CLIENT_ID =
  "1015570195056-o6afslncovbr4960a7oaqh96irop4jr6.apps.googleusercontent.com";

// Ensure Google chooses account each time on web
try {
  googleProvider.setCustomParameters?.({ prompt: "select_account" });
} catch {}

// Lazy init (native)
let socialLoginInitialized = false;
async function ensureSocialLoginInit() {
  if (socialLoginInitialized) return;
  await SocialLogin.initialize({
    google: { webClientId: WEB_CLIENT_ID },
  });
  socialLoginInitialized = true;
}

function log(...args) { if (DEBUG_AUTH) console.log("[AUTH]", ...args); }
function warn(...args) { if (DEBUG_AUTH) console.warn("[AUTH]", ...args); }
function err(...args) { if (DEBUG_AUTH) console.error("[AUTH]", ...args); }
function maybeAlert(msg) { if (SHOW_ALERTS) alert(msg); }



// -------- Google Sign-in (native vs web) --------
export const signInWithGoogle = async () => {
  const platform = Capacitor.getPlatform?.() || "web(?)";
  const isNative = platform === "android" || platform === "ios";

  log("signInWithGoogle() called. platform =", platform, "isNative =", isNative);

  if (isNative) {
    try {
      await ensureSocialLoginInit();
      log("Using native SocialLogin…");

      // Ask for openid/email/profile to ensure an ID token is minted
      const res = await SocialLogin.login({
        provider: "google",
        options: { scopes: ["openid", "email", "profile"] },
      });

      // Helpful debug: see what the plugin actually returned
      log(
        "SocialLogin.login() keys:",
        Object.keys(res || {}).join(","),
        "result keys:",
        Object.keys(res?.result || {}).join(",")
      );

      // ✅ Capgo returns idToken here:
      const idToken =
        res?.result?.idToken ||
        res?.result?.authentication?.idToken || // (some versions)
        res?.authentication?.idToken ||         // (very old fallbacks)
        null;

      if (!idToken) {
        maybeAlert("Native login: no idToken returned");
        throw new Error("No Google ID token from native login");
      }

      const cred = GoogleAuthProvider.credential(idToken);
      const { user } = await signInWithCredential(auth, cred);
      log("Native Firebase sign-in OK, uid =", user?.uid);
      maybeAlert("Native Google sign-in success");
      return user;
    } catch (e) {
      err("Native sign-in failed:", e);
      maybeAlert(`Native sign-in failed: ${e?.message || e}`);
      throw e;
    }
  }


  // Web / PWA path
  log("Using web popup → redirect fallback");
  try {
    const res = await signInWithPopup(auth, googleProvider);
    log("Popup success. uid =", res?.user?.uid);
    maybeAlert("Web popup success");
    return res.user ?? null;
  } catch (e) {
    warn("Popup failed, falling back to redirect. error =", e?.code, e?.message);
    try {
      await signInWithRedirect(auth, googleProvider);
      // The page will navigate; on return, a separate call to getRedirectResult will resolve.
      return null;
    } catch (e2) {
      err("Redirect start failed:", e2?.code, e2?.message);
      maybeAlert(`Redirect failed: ${e2?.message || e2}`);
      throw e2;
    }
  }
};

// Call this once on page load (web) to complete redirect flows
export const completeWebRedirectIfAny = async () => {
  try {
    const res = await getRedirectResult(auth);
    if (res?.user) {
      log("getRedirectResult: success. uid =", res.user.uid);
      maybeAlert("Redirect completed: signed in");
      return res.user;
    }
    log("getRedirectResult: no pending redirect");
    return null;
  } catch (e) {
    err("getRedirectResult error:", e?.code, e?.message);
    return null;
  }
};

// -------- Email / Password --------
export const signInWithEmail = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  log("Email sign-in uid =", user?.uid);
  return user;
};

export const signUpWithEmail = async (email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  log("Signup uid =", user?.uid);
  return user;
};

// -------- Logout (both native & web) --------
export const logout = async () => {
  try {
    await SocialLogin.logout({ provider: "google" });
    log("SocialLogin.logout OK");
  } catch (e) {
    warn("SocialLogin.logout ignored:", e?.message || e);
  }
  await fbSignOut(auth);
  log("Firebase signOut OK");
};

// -------- Get Firebase JWT for API calls --------
export const getFirebaseToken = async () => {
  if (auth.currentUser) {
    const t = await getIdToken(auth.currentUser, true);
    log("getFirebaseToken len =", t?.length);
    return t;
  }
  log("getFirebaseToken: no currentUser");
  return null;
};


if (typeof window !== 'undefined') window._testGoogle = signInWithGoogle;
