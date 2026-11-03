import { getAuth, onAuthStateChanged } from 'firebase/auth';

// { Authorization: 'Bearer <token>' } for the signed-in user. Waits for Firebase to restore the session on page load.
export const authHeaders = () =>
  new Promise((resolve, reject) => {
    const auth = getAuth();
    const done = async (user) => {
      try {
        resolve({ Authorization: `Bearer ${await user.getIdToken()}` });
      } catch (err) {
        reject(err);
      }
    };
    if (auth.currentUser) return done(auth.currentUser);
    const off = onAuthStateChanged(auth, (user) => {
      off();
      if (user) done(user);
      else reject(new Error('Not signed in'));
    });
  });
