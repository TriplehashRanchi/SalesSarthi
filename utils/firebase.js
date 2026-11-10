// lib/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: 'AIzaSyCm97eL70own-IQSjfQC_Y80aOl-f0mE8s',
    authDomain: 'sales-sarthii.firebaseapp.com',
    projectId: 'sales-sarthii',
    storageBucket: 'sales-sarthii.firebasestorage.app',
    messagingSenderId: '1015570195056',
    appId: '1:1015570195056:web:7c11d4b7cf8dd33585cab5',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// firebaseConfig + app are also used for push notifications (utils/push.js, public/firebase-messaging-sw.js).
export { auth, googleProvider, app, firebaseConfig };
