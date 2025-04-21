import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getApps, getApp } from 'firebase/app';

// Your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyCqGdNnttC66vQ8vL9aIqlLxfRD11lWk-M",
  projectId: "jkamma-9fd45",
  storageBucket: "jkamma-9fd45.appspot.com",
  appId: "1:37155909399:android:53283cf008146b78125152",
  authDomain: "jkamma-9fd45.firebaseapp.com",
  messagingSenderId: "37155909399",
};

// Check if Firebase has already been initialized to avoid errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);  // Firebase authentication
export const db = getFirestore(app);  // Firestore
