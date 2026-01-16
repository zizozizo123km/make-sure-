import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAmPFwV1ld4H6CWukHtEoKPg9E2tHWkyxE",
  authDomain: "not-b25f1.firebaseapp.com",
  databaseURL: "https://not-b25f1-default-rtdb.firebaseio.com",
  projectId: "not-b25f1",
  storageBucket: "not-b25f1.firebasestorage.app",
  messagingSenderId: "554877315906",
  appId: "1:554877315906:web:234309f8a149e60afd36db",
  measurementId: "G-9PLRDRTYND"
};

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export services directly.
// These functions correctly register the components within the initialized app.
export const auth = getAuth(app);
export const db = getDatabase(app);

// Exporting null for analytics as it's not being utilized in this version.
export const analytics = null;
