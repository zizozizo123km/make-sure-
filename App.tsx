
import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { AuthScreen } from './screens/AuthScreen';
import { CustomerScreen } from './screens/CustomerScreen';
import { StoreScreen } from './screens/StoreScreen';
import { DriverScreen } from './screens/DriverScreen';
import { AdminScreen } from './screens/AdminScreen';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';
import { Loader2, Lock, Bell, X, Sparkles, Megaphone, BellRing } from 'lucide-react';
import getFCMToken from './services/fcmService';

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdminPath, setIsAdminPath] = useState(window.location.hash === '#admin');
  const [isLocked, setIsLocked] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('');
  const [lastBroadcast, setLastBroadcast] = useState<number>(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifPermissionStatus, setNotifPermissionStatus] = useState<NotificationPermission>('default');

  const ADMIN_EMAIL = 'downloader@gmail.com';

  useEffect(() => {
    // التحقق من حالة إذن الإشعارات
    if ('Notification' in window) {
      setNotifPermissionStatus(Notification.permission);
    }

    const handleHashChange = () => {
      setIsAdminPath(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);

    const appStateRef = ref(db, 'app_settings');
    onValue(appStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setIsLocked(data.isLocked || false);
        setGlobalMessage(data.globalMessage || '');
        
        const dbLastBroadcast = data.lastBroadcast || 0;
        setLastBroadcast(dbLastBroadcast);

        const localLastSeen = Number(localStorage.getItem('kimo_last_seen_broadcast') || 0);
        if (dbLastBroadcast > localLastSeen && data.globalMessage) {
          setShowNotificationModal(true);
        }
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const customerSnapshot = await get(ref(db, `customers/${user.uid}`));
          if (customerSnapshot.exists()) {
            const data = customerSnapshot.val();
            updateSession(UserRole.CUSTOMER, data.name);
            getFCMToken(UserRole.CUSTOMER);
            setLoading(false);
            return;
          }

          const storeSnapshot = await get(ref(db, `stores/${user.uid}`));
          if (storeSnapshot.exists()) {
            const data = storeSnapshot.val();
            updateSession(UserRole.STORE, data.name);
            getFCMToken(UserRole.STORE);
            setLoading(false);
            return;
          }

          const driverSnapshot = await get(ref(db, `drivers/${user.uid}`));
          if (driverSnapshot.exists()) {
            const data = driverSnapshot.val();
            updateSession(UserRole.DRIVER, data.name);
            getFCMToken(UserRole.DRIVER);
            setLoading(false);
            return;
          }

          fallbackToLocalData();
        } catch (error: any) {
          fallbackToLocalData();
        }
      } else {
        setCurrentRole(null);
        setUserName('');
        localStorage.removeItem('kimo_user_role');
        localStorage.removeItem('kimo_user_name');
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermissionStatus(permission);
    if (permission === 'granted') {
      getFCMToken(currentRole || undefined);
    }
  };

  const updateSession = (role: UserRole, name: string) => {
    setCurrentRole(role);
    setUserName(name || 'مستخدم');
    localStorage.setItem('kimo_user_role', role);
    localStorage.setItem('kimo_user_name', name);
  };

  const fallbackToLocalData = () => {
    const savedRole = localStorage.getItem('kimo_user_role') as UserRole;
    const savedName = localStorage.getItem('kimo_user_name');
    if (savedRole) {
      setCurrentRole(savedRole);
    } else {
      setCurrentRole(null);
    }
    if (savedName) setUserName(savedName);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('kimo_user_role');
      localStorage.removeItem('kimo_user_name');
      setCurrentRole(null);
      setUserName('');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleManualLogin = (role: UserRole, name?: string) => {
    updateSession(role, name || '');
    getFCMToken(role);
  };

  const closeNotification = () => {
    setShowNotificationModal(false);
    localStorage.setItem('kimo_last_seen_broadcast', lastBroadcast.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (isAdminPath) {
    return <AdminScreen onExit={() => { window.location.hash = ''; setIsAdminPath(false); }} />;
  }

  if (isLocked && auth.currentUser?.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center font-cairo">
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Lock className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 tracking-tight">التطبيق مغلق للصيانة</h1>
        <p className="text-slate-400 font-bold max-w-xs mx-auto mb-8 leading-relaxed">نحن نعمل على تحديثات جديدة لجعل "كيمو" أسرع وأفضل. سنعود قريباً جداً!</p>
        {globalMessage && (
           <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 text-orange-400 font-bold text-sm shadow-xl">
             "{globalMessage}"
           </div>
        )}
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentRole) {
      case UserRole.CUSTOMER:
        return <CustomerScreen userName={userName} onLogout={handleLogout} />;
      case UserRole.STORE:
        return <StoreScreen userName={userName} onLogout={handleLogout} />;
      case UserRole.DRIVER:
        return <DriverScreen userName={userName} onLogout={handleLogout} />;
      default:
        return <AuthScreen onLogin={handleManualLogin} />; 
    }
  };

  return (
    <div className="font-sans antialiased text-primary-900 bg-primary-50 min-h-screen selection:bg-orange-200">
      
      {/* شريط طلب تفعيل الإشعارات - يظهر إذا كان الإذن غير معطى */}
      {currentRole && notifPermissionStatus !== 'granted' && (
        <div className="bg-slate-900 text-white p-3 flex items-center justify-between px-6 sticky top-0 z-[1000] border-b border-white/10">
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 text-orange-500 animate-bounce" />
            <p className="text-[10px] font-black">فعل الإشعارات لتوصلك رسائل المسؤول والطلبات فوراً!</p>
          </div>
          <button 
            onClick={requestNotificationPermission}
            className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg active:scale-90 transition-all"
          >
            تفعيل الآن
          </button>
        </div>
      )}

      {/* نافذة الإشعار المنبثقة */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[3.5rem] p-10 relative shadow-2xl animate-scale-up border border-white">
            <button 
              onClick={closeNotification}
              className="absolute top-6 left-6 p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 brand-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/20 animate-bounce">
                <Megaphone className="text-white w-10 h-10 -rotate-12" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center justify-center gap-2">
                تنبيه هام
                <Sparkles className="w-5 h-5 text-orange-500" />
              </h2>
              
              <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 mb-8">
                <p className="text-slate-700 font-black leading-relaxed text-lg">
                  {globalMessage}
                </p>
              </div>

              <button 
                onClick={closeNotification}
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        </div>
      )}

      {renderScreen()}
    </div>
  );
};

export default App;
