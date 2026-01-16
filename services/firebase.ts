
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize analytics conditionally to prevent registration errors
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(err => console.error("Firebase Analytics not supported:", err));

export const db = getDatabase(app);
export const auth = getAuth(app);
export { analytics };
