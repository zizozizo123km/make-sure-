import { getToken } from "firebase/messaging";
import { messaging, db, auth } from "./firebase";
import { ref, update } from "firebase/database";
import { UserRole } from "../types";

const getFCMToken = async (role?: UserRole) => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BLg6yzknUBqznW8Y0kMulCwz1a-u8pelTCDIqvUaS7wB0Ia3rzHfNC1B_NJzXkqM_D7DumkhUicYojiHGsMsTIY"
      });

      if (token) {
        console.log("✅ FCM TOKEN:", token);
        
        const user = auth.currentUser;
        if (user && role) {
          const dbPath = role === UserRole.CUSTOMER ? 'customers' : role === UserRole.STORE ? 'stores' : 'drivers';
          await update(ref(db, `${dbPath}/${user.uid}`), {
            fcmToken: token,
            lastTokenUpdate: Date.now()
          });
        }
      } else {
        console.log("❌ لم يتم توليد Token");
      }
    } else {
      console.log("❌ المستخدم رفض الإشعارات");
    }
  } catch (error) {
    console.error("FCM Error:", error);
  }
};

export default getFCMToken;