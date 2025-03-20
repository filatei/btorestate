import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  doc, 
  setDoc, 
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, ref as dbRef, onDisconnect, set, serverTimestamp as rtServerTimestamp } from 'firebase/database';

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
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL // Make sure this is added to your .env
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.log('The current browser doesn\'t support all of the features required to enable persistence');
  }
});

// Initialize presence system
export const initializePresence = (userId: string, estateId: string) => {
  if (!userId || !estateId) return;

  // Firestore presence
  const userPresenceRef = doc(db, 'presence', userId);
  setDoc(userPresenceRef, {
    userId,
    estateId,
    online: true,
    lastSeen: serverTimestamp()
  }, { merge: true });

  // Realtime Database presence
  const userStatusRef = dbRef(rtdb, `/status/${userId}`);
  const userStatusEstateRef = dbRef(rtdb, `/estates/${estateId}/presence/${userId}`);

  // Create a reference to the special '.info/connected' path in Realtime Database
  const connectedRef = dbRef(rtdb, '.info/connected');
  onSnapshot(doc(db, '.info/connected'), (snapshot) => {
    if (snapshot.exists()) {
      // When the client's connection state changes...
      onDisconnect(userStatusRef).set({
        state: 'offline',
        lastSeen: rtServerTimestamp(),
      }).then(() => {
        set(userStatusRef, {
          state: 'online',
          lastSeen: rtServerTimestamp(),
        });
      });

      // Estate-specific presence
      onDisconnect(userStatusEstateRef).remove().then(() => {
        set(userStatusEstateRef, {
          state: 'online',
          lastSeen: rtServerTimestamp(),
        });
      });
    }
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    setDoc(userPresenceRef, {
      online: false,
      lastSeen: serverTimestamp()
    }, { merge: true });
    
    set(userStatusRef, {
      state: 'offline',
      lastSeen: rtServerTimestamp(),
    });
    
    set(userStatusEstateRef, null);
  });
};

// Get online users count for an estate
export const getOnlineUsersCount = (estateId: string, callback: (count: number) => void) => {
  if (!estateId) return;

  const presenceRef = collection(db, 'presence');
  const estatePresenceQuery = query(
    presenceRef,
    where('estateId', '==', estateId),
    where('online', '==', true)
  );

  return onSnapshot(estatePresenceQuery, (snapshot) => {
    callback(snapshot.size);
  });
};