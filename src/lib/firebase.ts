import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  collection,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// Ensure we're using the correct localhost URL format
const getAuthDomain = () => {
  const domain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  if (window.location.hostname === 'localhost') {
    return 'localhost';
  }
  return domain;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: getAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.log('The current browser doesn\'t support all of the features required to enable persistence');
    }
  });

// Initialize presence system
const presenceRef = collection(db, 'presence');

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userPresenceRef = doc(presenceRef, user.uid);
    
    // Set initial presence
    await setDoc(userPresenceRef, {
      userId: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      online: true,
      lastSeen: serverTimestamp(),
    });

    // Update presence when window closes or user navigates away
    window.addEventListener('beforeunload', async () => {
      await setDoc(userPresenceRef, {
        userId: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        online: false,
        lastSeen: serverTimestamp(),
      });
    });
  }
});