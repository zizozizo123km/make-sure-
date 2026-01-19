
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

// ⚠️ ملاحظة هامة جداً لحل مشكلة PERMISSION_DENIED ⚠️
// يجب نسخ القواعد التالية ولصقها في واجهة Firebase (Realtime Database -> Rules):
/*
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "reviews": {
      ".read": "true",
      "$targetId": {
        ".write": "auth != null"
      }
    },
    "orders": {
      "$orderId": {
        ".write": "auth != null && (data.child('customerId').val() == auth.uid || !data.exists())"
      }
    }
  }
}
*/

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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const messaging = getMessaging(app);
