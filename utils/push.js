'use client';
// Push notifications for this browser / phone, through Firebase Cloud Messaging (FCM).
//   web      : firebase/messaging + public/firebase-messaging-sw.js, needs NEXT_PUBLIC_FIREBASE_VAPID_KEY
//   android/ios (Capacitor app): @capacitor/push-notifications, needs google-services.json / APNs set up in Firebase
// Push is opt-in per device: the person turns it on in Notification settings. The token is remembered
// together with WHO turned it on; if someone else logs in on the same device, the old token is released.
import { Capacitor } from '@capacitor/core';
import { getAuth } from 'firebase/auth';
import { app, firebaseConfig } from './firebase';
import { registerDevice, unregisterDevice, announceChange } from '@/components/notifications/notificationsApi';
import { UserError, userMessage } from './userMessage';

const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const KEY = 'crmPushDevice'; // { token, uid, platform }

const native = () => Capacitor.isNativePlatform();
export const pushPlatform = () => (native() ? Capacitor.getPlatform() : 'web');

const readSaved = () => {
    try {
        return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
        return null;
    }
};
const save = (v) => {
    try {
        if (v) localStorage.setItem(KEY, JSON.stringify(v));
        else localStorage.removeItem(KEY);
    } catch {}
};
const uid = () => getAuth().currentUser?.uid || null;
const label = () => {
    if (native()) return `${Capacitor.getPlatform() === 'ios' ? 'iPhone / iPad' : 'Android'} app`;
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Linux';
    return `${browser} on ${os}`;
};

// Can this device get push? -> { ok, reason }
export const pushSupport = async () => {
    if (typeof window === 'undefined') return { ok: false, reason: '' };
    if (native()) {
        return Capacitor.isPluginAvailable('PushNotifications') ? { ok: true } : { ok: false, reason: 'Please update the DG Sarthi app to get notifications on this phone.' };
    }
    if (!VAPID) return { ok: false, reason: 'Browser notifications are not available right now. Please contact support.' };
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return { ok: false, reason: 'This browser cannot show notifications. Please use Chrome, Edge, Firefox or Safari.' };
    try {
        const { isSupported } = await import('firebase/messaging');
        if (!(await isSupported())) return { ok: false, reason: 'This browser cannot show notifications. On iPhone, first add DG Sarthi to your Home Screen and open it from there.' };
    } catch {
        return { ok: false, reason: 'This browser cannot show notifications. Please use Chrome, Edge, Firefox or Safari.' };
    }
    return { ok: true };
};

// 'granted' | 'denied' | 'default'
export const pushPermission = async () => {
    if (native()) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const p = await PushNotifications.checkPermissions();
        return p.receive === 'granted' ? 'granted' : p.receive === 'denied' ? 'denied' : 'default';
    }
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
};

// Is push on for THIS device and THIS person?
export const isPushOnHere = () => {
    const s = readSaved();
    return !!(s && s.uid && s.uid === uid());
};

// A freshly registered service worker is not active yet; asking for a token before that fails with
// "no active Service Worker". Wait (up to 15 s) until it is active.
const waitForActive = (reg) =>
    new Promise((resolve, reject) => {
        if (reg.active) return resolve(reg);
        const sw = reg.installing || reg.waiting;
        if (!sw) return reject(new Error('service worker missing'));
        const timer = setTimeout(() => reject(new Error('service worker timeout')), 15000);
        sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') {
                clearTimeout(timer);
                resolve(reg);
            } else if (sw.state === 'redundant') {
                clearTimeout(timer);
                reject(new Error('service worker redundant'));
            }
        });
    });

const webToken = async (ask) => {
    if (ask) {
        const perm = await Notification.requestPermission();
        if (perm === 'denied') throw new UserError('Notifications are blocked for this website. Click the lock icon next to the address, allow Notifications, then try again.');
        if (perm !== 'granted') throw new UserError('Notifications were not allowed. Choose "Allow" when your browser asks, then try again.');
    } else if (Notification.permission !== 'granted') return null;
    const reg = await waitForActive(await navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(firebaseConfig))}`));
    const { getMessaging, getToken } = await import('firebase/messaging');
    return getToken(getMessaging(app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
};

const nativeToken = async (ask) => {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
        if (!ask) return null;
        perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') throw new UserError('Notifications are turned off for DG Sarthi. Open your phone Settings, allow Notifications for DG Sarthi, then try again.');
    }
    if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({ id: 'crm_alerts', name: 'CRM alerts', description: 'Lead imports, folder changes and file reminders', importance: 4, visibility: 1 }).catch(() => {});
    }
    return new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn, v) => {
            if (done) return;
            done = true;
            ok.then((h) => h.remove());
            bad.then((h) => h.remove());
            fn(v);
        };
        const ok = PushNotifications.addListener('registration', (t) => finish(resolve, t.value));
        const bad = PushNotifications.addListener('registrationError', (e) => finish(reject, new Error(e?.error || 'registration error')));
        PushNotifications.register().catch((e) => finish(reject, e));
        setTimeout(() => finish(reject, new Error('registration timeout')), 20000);
    });
};

// Turn push on for this device (asks the browser / phone for permission).
// Every failure is turned into a plain sentence for the person (the technical error goes to the console).
export const pushErrorMessage = (err) => {
    if (err instanceof UserError || err?.userMessage) return err.userMessage || err.message;
    const text = String(err?.message || err || '');
    if (/service worker|serviceworker|sw timeout/i.test(text)) return "Notifications couldn't start in this browser just now. Please refresh the page and try again.";
    if (/permission-blocked|permission_blocked|denied/i.test(text)) return 'Notifications are blocked for this website. Click the lock icon next to the address, allow Notifications, then try again.';
    if (/token-subscribe|token-unsubscribe|vapid|applicationserverkey|push service|AbortError|unsupported/i.test(text)) return "We couldn't connect notifications on this device right now. Please try again in a few minutes.";
    if (/registration (error|timeout)|timed out|timeout/i.test(text)) return "We couldn't set up notifications on this phone. Please check your internet connection and try again.";
    return userMessage(err, "Notifications couldn't be turned on. Please try again.");
};

export const enablePush = async () => {
    try {
        const support = await pushSupport();
        if (!support.ok) throw new UserError(support.reason);
        const token = native() ? await nativeToken(true) : await webToken(true);
        if (!token) throw new Error('no token');
        await registerDevice(token, pushPlatform(), label());
        save({ token, uid: uid(), platform: pushPlatform() });
        return token;
    } catch (err) {
        console.error('Turning on push failed:', err);
        throw new UserError(pushErrorMessage(err));
    }
};

// Turn push off for this device.
export const disablePush = async () => {
    const s = readSaved();
    if (s?.token) await unregisterDevice(s.token).catch(() => {});
    try {
        if (native()) {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            await PushNotifications.unregister().catch(() => {});
        } else {
            const { getMessaging, deleteToken } = await import('firebase/messaging');
            await deleteToken(getMessaging(app)).catch(() => {});
        }
    } catch {}
    save(null);
};

// Called once after login (by the bell). Keeps the token fresh, releases a token left by another
// person, and listens for pushes that arrive while the CRM is open.
//   onForeground({ title, body, link, severity }) – show an in-page toast
//   onOpen(link)                                   – a phone notification was tapped
let started = false;
export const initPush = async ({ onForeground, onOpen } = {}) => {
    if (started || typeof window === 'undefined') return;
    started = true;
    const saved = readSaved();
    const me = uid();
    if (saved && saved.uid !== me) {
        if (saved.token) await unregisterDevice(saved.token).catch(() => {});
        save(null);
    }
    const support = await pushSupport().catch(() => ({ ok: false }));
    if (!support.ok) return;

    if (native()) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        // The phone can hand out a new token at any time (reinstall, restore, Firebase rotation): keep the server current.
        PushNotifications.addListener('registration', (t) => {
            if (!isPushOnHere() || !t?.value) return;
            registerDevice(t.value, pushPlatform(), label()).catch(() => {});
            save({ token: t.value, uid: uid(), platform: pushPlatform() });
        });
        PushNotifications.addListener('pushNotificationReceived', (n) => {
            announceChange();
            onForeground?.({ title: n.title, body: n.body, link: n.data?.link, severity: n.data?.severity });
        });
        PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
            announceChange();
            const link = a.notification?.data?.link;
            if (link) onOpen?.(link);
        });
    } else {
        const { getMessaging, onMessage } = await import('firebase/messaging');
        onMessage(getMessaging(app), (p) => {
            announceChange();
            onForeground?.({ title: p.notification?.title, body: p.notification?.body, link: p.data?.link, severity: p.data?.severity });
        });
    }

    // Refresh the token for a device where push is on (tokens change from time to time).
    if (isPushOnHere()) {
        try {
            const token = native() ? await nativeToken(false) : await webToken(false);
            if (token) {
                await registerDevice(token, pushPlatform(), label());
                if (token !== saved?.token && saved?.token) await unregisterDevice(saved.token).catch(() => {});
                save({ token, uid: me, platform: pushPlatform() });
            }
        } catch (err) {
            console.warn('Push refresh failed:', err.message);
        }
    }
};

// Phone only: remove the notifications already shown in the phone's notification shade and reset the icon badge.
// Called when the person has read everything in the CRM.
export const clearDeliveredNotifications = async () => {
    if (!native()) return;
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.removeAllDeliveredNotifications();
    } catch {
        /* nothing to clear */
    }
};

// Call BEFORE signing out: stops pushes for the person who is leaving this device.
export const releasePushOnLogout = async () => {
    const s = readSaved();
    if (s?.token) await unregisterDevice(s.token).catch(() => {});
    save(null);
};
