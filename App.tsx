
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
import { Loader2, Lock, Bell, X, Sparkles, Megaphone, BellRing, RefreshCw } from 'lucide-react';
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
  const [isForceUpdating, setIsForceUpdating] = useState(false);

  const ADMIN_EMAIL = 'downloader@gmail.com';

  useEffect(() => {
    if ('Notification' in window) setNotifPermissionStatus(Notification.permission);

    const handleHashChange = () => setIsAdminPath(window.location.hash === '#admin');
    window.addEventListener('hashchange', handleHashChange);

    const appStateRef = ref(db, 'app_settings');
    onValue(appStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setIsLocked(data.isLocked || false);
        setGlobalMessage(data.globalMessage || '');
        setLastBroadcast(data.lastBroadcast || 0);

        // مراقب التحديث الإجباري
        const remoteVersion = data.versionCode || 0;
        const localVersion = Number(localStorage.getItem('kimo_app_version') || 0);
        
        // إذا كان رقم الإصدار في السيرفر أكبر، نقوم بالتحديث الإجباري
        if (remoteVersion > localVersion) {
          localStorage.setItem('kimo_app_version', remoteVersion.toString());
          setIsForceUpdating(true);
          setTimeout(() => {
            // إجبار المتصفح على تحميل النسخة الجديدة من السيرفر مباشرة
            window.location.reload();
          }, 2000);
        }

        const localLastSeen = Number(localStorage.getItem('kimo_last_seen_broadcast') || 0);
        if (data.lastBroadcast > localLastSeen && data.globalMessage) {
          setShowNotificationModal(true);
        }
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const roles = ['customers', 'stores', 'drivers'];
          for (const rolePath of roles) {
            const snap = await get(ref(db, `${rolePath}/${user.uid}`));
            if (snap.exists()) {
              const data = snap.val();
              const role = rolePath === 'customers' ? UserRole.CUSTOMER : rolePath === 'stores' ? UserRole.STORE : UserRole.DRIVER;
              updateSession(role, data.name);
              getFCMToken(role);
              setLoading(false);
              return;
            }
          }
        } catch (e) { console.error(e); }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const updateSession = (role: UserRole, name: string) => {
    setCurrentRole(role);
    setUserName(name || 'مستخدم');
    localStorage.setItem('kimo_user_role', role);
    localStorage.setItem('kimo_user_name', name);
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    setCurrentRole(null);
  };

  const closeNotification = () => {
    setShowNotificationModal(false);
    localStorage.setItem('kimo_last_seen_broadcast', lastBroadcast.toString());
  };

  if (isForceUpdating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white font-cairo p-10 text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
           <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">جاري تحديث النظام</h1>
        <p className="text-slate-400 font-bold">نقوم الآن بتحسين تجربتك في كيمو، انتظر ثوانٍ معدودة...</p>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-12 h-12 text-orange-500 animate-spin" /></div>;

  if (isAdminPath) return <AdminScreen onExit={() => { window.location.hash = ''; setIsAdminPath(false); }} />;

  if (isLocked && auth.currentUser?.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center font-cairo">
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse"><Lock className="w-12 h-12 text-red-500" /></div>
        <h1 className="text-3xl font-black text-white mb-4">التطبيق في صيانة</h1>
        <p className="text-slate-400 font-bold max-w-xs mx-auto mb-8">{globalMessage || 'سنعود قريباً جداً!'}</p>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-primary-900 bg-primary-50 min-h-screen">
      {currentRole && notifPermissionStatus !== 'granted' && (
        <div className="bg-slate-900 text-white p-3 flex items-center justify-between px-6 sticky top-0 z-[1000]">
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 text-orange-500 animate-bounce" />
            <p className="text-[10px] font-black">فعل الإشعارات لتوصلك رسائل المسؤول فوراً!</p>
          </div>
          <button onClick={() => Notification.requestPermission().then(setNotifPermissionStatus)} className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg">تفعيل</button>
        </div>
      )}

      {showNotificationModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[3.5rem] p-10 relative shadow-2xl animate-scale-up text-center">
            <button onClick={closeNotification} className="absolute top-6 left-6 p-2 bg-slate-100 text-slate-400 rounded-full"><X className="w-5 h-5" /></button>
            <div className="w-20 h-20 brand-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl"><Megaphone className="text-white w-10 h-10 -rotate-12" /></div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center justify-center gap-2">تنبيه كيمو <Sparkles className="w-5 h-5 text-orange-500" /></h2>
            <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 mb-8"><p className="text-slate-700 font-black text-lg">{globalMessage}</p></div>
            <button onClick={closeNotification} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl">فهمت ذلك</button>
          </div>
        </div>
      )}

      {currentRole === UserRole.CUSTOMER ? <CustomerScreen userName={userName} onLogout={handleLogout} /> : 
       currentRole === UserRole.STORE ? <StoreScreen userName={userName} onLogout={handleLogout} /> :
       currentRole === UserRole.DRIVER ? <DriverScreen userName={userName} onLogout={handleLogout} /> :
       <AuthScreen onLogin={(r, n) => updateSession(r, n || '')} />}
    </div>
  );
};

export default App;
