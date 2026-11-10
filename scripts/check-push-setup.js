#!/usr/bin/env node
/* Checks that push notifications are set up for the web and the Android app (add --ios for the iPhone app).
   Run:  npm run check:push        (from the SalesSarthi folder)
   ✅ done   ❌ you still have to do this (the line under it says how)   ⚠️ worth a look
   Nothing here changes any file. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const P = (...p) => path.join(root, ...p);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
const APP_ID = 'com.dgsarthi.app';
const PROJECT = 'sales-sarthii';

const out = [];
let todo = 0;
const section = (t) => out.push(`\n${t}`);
const ok = (t) => out.push(`  ✅ ${t}`);
const bad = (t, how) => {
    todo += 1;
    out.push(`  ❌ ${t}`);
    if (how) out.push(`     → ${how}`);
};
const warn = (t, how) => {
    out.push(`  ⚠️  ${t}`);
    if (how) out.push(`     → ${how}`);
};
const check = (cond, good, notGood, how) => (cond ? ok(good) : bad(notGood, how));

/* ───────── web ───────── */
section('WEB (browser push)');
const env = read(P('.env')) || '';
const vapid = (env.match(/^NEXT_PUBLIC_FIREBASE_VAPID_KEY=(.+)$/m) || [])[1];
check(!!vapid, 'VAPID key is in .env', 'VAPID key missing in .env', 'Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Generate key pair; put it in .env as NEXT_PUBLIC_FIREBASE_VAPID_KEY');
check(fs.existsSync(P('public/firebase-messaging-sw.js')), 'Service worker file is present', 'public/firebase-messaging-sw.js is missing');

/* ───────── android ───────── */
section('ANDROID APP');
const gs = read(P('android/app/google-services.json'));
if (!gs) {
    bad('android/app/google-services.json is missing', `Firebase Console → Project settings → Your apps → Add app → Android → package name ${APP_ID} → download google-services.json into SalesSarthi/android/app/`);
} else {
    try {
        const j = JSON.parse(gs);
        const pkgs = (j.client || []).map((c) => c.client_info?.android_client_info?.package_name);
        check(pkgs.includes(APP_ID), `google-services.json is for ${APP_ID}`, `google-services.json is not for ${APP_ID} (found: ${pkgs.join(', ') || 'nothing'})`, `Add an Android app with package name ${APP_ID} in Firebase and download the file again`);
        check(j.project_info?.project_id === PROJECT, `google-services.json belongs to Firebase project ${PROJECT}`, `google-services.json belongs to "${j.project_info?.project_id}", not ${PROJECT}`, 'The app and the server must use the same Firebase project');
    } catch {
        bad('google-services.json is not valid JSON', 'Download it again from Firebase');
    }
}
const manifest = read(P('android/app/src/main/AndroidManifest.xml')) || '';
check(manifest.includes('POST_NOTIFICATIONS'), 'Android 13+ notification permission declared', 'POST_NOTIFICATIONS permission missing in AndroidManifest.xml');
check(manifest.includes('default_notification_channel_id') && manifest.includes('default_notification_icon'), 'Notification icon and channel declared', 'Notification icon / channel missing in AndroidManifest.xml');
check(fs.existsSync(P('android/app/src/main/res/drawable/ic_stat_notification.xml')), 'Status-bar notification icon exists', 'res/drawable/ic_stat_notification.xml is missing');
check((read(P('android/app/capacitor.build.gradle')) || '').includes('capacitor-push-notifications'), 'Push plugin is added to the Android project', 'Push plugin not in the Android project', 'Run: npx cap sync android');
check((read(P('android/app/build.gradle')) || '').includes('com.google.gms.google-services'), 'Google services plugin is applied (when google-services.json exists)', 'build.gradle does not apply the google-services plugin');

/* ───────── ios (only when asked: npm run check:push -- --ios) ───────── */
if (process.argv.includes('--ios')) {
    /* ───────── ios ───────── */
    section('IPHONE APP');
    const plistPath = P('ios/App/App/GoogleService-Info.plist');
    const plist = read(plistPath);
    if (!plist) {
        bad('ios/App/App/GoogleService-Info.plist is missing', `Firebase Console → Project settings → Your apps → Add app → iOS → bundle ID ${APP_ID} → download GoogleService-Info.plist, then drag it into Xcode under App/App (tick "Copy items" and target "App")`);
    } else {
        const bundle = (plist.match(/<key>BUNDLE_ID<\/key>\s*<string>([^<]+)</) || [])[1];
        const proj = (plist.match(/<key>PROJECT_ID<\/key>\s*<string>([^<]+)</) || [])[1];
        check(bundle === APP_ID, `GoogleService-Info.plist is for ${APP_ID}`, `GoogleService-Info.plist is for "${bundle}", not ${APP_ID}`, 'Add an iOS app with the right bundle ID in Firebase and download the file again');
        check(proj === PROJECT, `GoogleService-Info.plist belongs to Firebase project ${PROJECT}`, `GoogleService-Info.plist belongs to "${proj}", not ${PROJECT}`);
        check((read(P('ios/App/App.xcodeproj/project.pbxproj')) || '').includes('GoogleService-Info.plist'), 'GoogleService-Info.plist is added to the Xcode project', 'GoogleService-Info.plist is in the folder but not added to the Xcode project', 'In Xcode drag the file into App/App and tick target "App"');
    }
    const info = read(P('ios/App/App/Info.plist')) || '';
    check(/UIBackgroundModes[\s\S]*remote-notification/.test(info), 'Background mode "Remote notifications" is on', 'Background mode "Remote notifications" missing in Info.plist');
    const ent = read(P('ios/App/App/App.entitlements')) || '';
    const pbx = read(P('ios/App/App.xcodeproj/project.pbxproj')) || '';
    check(ent.includes('aps-environment') && pbx.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements'), 'Push Notifications capability (entitlements) is set', 'Push Notifications capability missing');
    const del = read(P('ios/App/App/AppDelegate.swift')) || '';
    check(del.includes('FirebaseApp.configure') && del.includes('Messaging.messaging().apnsToken'), 'AppDelegate hands the Firebase token to the app', 'AppDelegate.swift does not start Firebase / pass the token');
    const pod = read(P('ios/App/Podfile')) || '';
    check(pod.includes("pod 'FirebaseMessaging'") && pod.includes('CapacitorPushNotifications'), 'Podfile lists Firebase Messaging and the push plugin', 'Podfile is missing the Firebase / push pods', 'Run: npx cap sync ios');
    check((read(P('ios/App/Podfile.lock')) || '').includes('FirebaseMessaging'), 'Pods are installed (Podfile.lock has Firebase)', 'Pods not installed yet', 'On your Mac with Xcode: cd ios/App && pod update IONFilesystemLib   (this also installs the Firebase pods)');
    if (!/DEVELOPMENT_TEAM = \w+/.test(pbx)) warn('No Apple Developer Team selected in Xcode yet', 'Xcode → target App → Signing & Capabilities → choose your Team (needed for push and for running on a real iPhone)');
    warn('Cannot be checked from here: the APNs key must be uploaded to Firebase', 'Firebase Console → Project settings → Cloud Messaging → Apple app configuration → APNs Authentication Key (.p8, Key ID, Team ID). Without it iPhone push does not arrive.');
    warn('Cannot be checked from here: the App ID must have Push Notifications enabled', `Apple Developer → Identifiers → ${APP_ID} → tick Push Notifications (Xcode does this for you when you add the capability with automatic signing)`);

}
else {
    section('IPHONE APP');
    out.push('  ⏸️  Not set up yet (skipped for now). When you start it: npm run check:push -- --ios');
}

/* ───────── server ───────── */
section('SERVER (sends the pushes)');
const key = read(P('../sarthiapi/key.json'));
if (!key) bad('sarthiapi/key.json (Firebase service account) is missing');
else {
    try {
        const j = JSON.parse(key);
        check(j.project_id === PROJECT, `Server uses Firebase project ${PROJECT}`, `Server uses Firebase project "${j.project_id}", the apps use ${PROJECT}`, 'They must be the same project, or push will not arrive');
    } catch {
        bad('sarthiapi/key.json is not valid JSON');
    }
}

console.log(out.join('\n'));
console.log(`\n${todo === 0 ? '🎉 Everything that can be checked here is set up.' : `${todo} thing${todo === 1 ? '' : 's'} left to do (marked ❌ above).`}\n`);
process.exit(todo === 0 ? 0 : 1);
