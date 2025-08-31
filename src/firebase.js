// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDxzi70xuS1KxemDBF1logZ6zyHxINFfp4",
  authDomain: "porko-c0f87.firebaseapp.com",
  projectId: "porko-c0f87",
  storageBucket: "porko-c0f87.firebasestorage.app",
  messagingSenderId: "1050714930836",
  appId: "1:1050714930836:web:5b4c9bdf93e95748a23e81",
  measurementId: "G-3LCKP815FM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

// Example Firestore data models
// users: { uid, displayName, photoURL, bio }
// restaurants: { id, name, address, location: { lat, lng }, description }
// reviews: { id, restaurantId, userId, rating, text, photoURL, createdAt }
// checkins: { id, restaurantId, userId, comment, photoURL, createdAt }
// follows: { followerId, followingId }

export { auth, provider, signInWithPopup, signOut, db, storage };
