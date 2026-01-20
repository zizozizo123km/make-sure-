
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

// 🔐 القواعد النهائية (انسخ هذه القواعد والصقها في لوحة تحكم Firebase -> قسم Rules):
/*
{
  "rules": {
    ".read": "auth != null",
    "customers": {
      "$uid": {
        ".write": "auth != null && (auth.uid == $uid || auth.token.email == 'downloader@gmail.com')"
      }
    },
    "stores": {
      "$uid": {
        ".write": "auth != null && (auth.uid == $uid || auth.token.email == 'downloader@gmail.com')"
      }
    },
    "drivers": {
      "$uid": {
        ".write": "auth != null && (auth.uid == $uid || auth.token.email == 'downloader@gmail.com')"
      }
    },
    "products": {
      ".indexOn": ["storeId"],
      "$productId": {
        ".write": "auth != null && (!data.exists() || data.child('storeId').val() == auth.uid || auth.token.email == 'downloader@gmail.com')"
      }
    },
    "orders": {
      ".indexOn": ["customerId", "storeId", "driverId", "status"],
      "$orderId": {
        ".write": "auth != null && (
          !data.exists() || 
          data.child('customerId').val() == auth.uid || 
          data.child('storeId').val() == auth.uid || 
          data.child('driverId').val() == auth.uid ||
          (data.child('status').val() == 'ACCEPTED_BY_STORE' && !data.child('driverId').exists() && newData.child('driverId').val() == auth.uid) ||
          auth.token.email == 'downloader@gmail.com'
        )"
      }
    },
    "reviews": {
      ".write": "auth != null"
    },
    "app_settings": {
      ".write": "auth != null && auth.token.email == 'downloader@gmail.com'"
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
