/* Firebase Cloud Messaging service worker (web push for DG Sarthi).
   The Firebase web config is passed in the registration URL (?config=...) by utils/push.js,
   so it lives in one place (utils/firebase.js). Web config values are public by design. */
/* global importScripts, firebase, clients */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

// Take over right away, so the first "turn on notifications" does not have to wait for a page reload.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

let config = null;
try {
  config = JSON.parse(new URL(self.location.href).searchParams.get('config') || 'null');
} catch (e) {
  config = null;
}

if (config && config.messagingSenderId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  // Data-only messages (the server always sends a "notification" block, which the browser shows itself).
  messaging.onBackgroundMessage((payload) => {
    if (payload.notification) return;
    const d = payload.data || {};
    self.registration.showNotification(d.title || 'DG Sarthi', { body: d.body || '', icon: '/favicon.png', data: { link: d.link || '/' } });
  });
}

// Clicking a notification opens (or focuses) the CRM on the right page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const fcm = data.FCM_MSG && data.FCM_MSG.data;
  const link = (fcm && fcm.link) || data.link || '/';
  const url = new URL(link, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
