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
import { Loader2, Lock, Bell } from 'lucide-react';
import getFCMToken from './services/fcmService';

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdminPath, setIsAdminPath] = useState(window.location.hash === '#admin');
  const [isLocked, setIsLocked] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('');

  useEffect(() => {
    // مراقبة تغيير الهاش في الرابط لفتح لوحة التحكم
    const handleHashChange = () => {
      setIsAdminPath(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);

    // مراقبة إعدادات التطبيق (وضع الصيانة والرسائل العامة)
    const appStateRef = ref(db, 'app_settings');
    onValue(appStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setIsLocked(data.isLocked || false);
        setGlobalMessage(data.globalMessage || '');
      }
    });

    // مراقبة حالة تسجيل الدخول وتحديد دور المستخدم
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // التحقق من كونه زبون
          const customerSnapshot = await get(ref(db, `customers/${user.uid}`));
          if (customerSnapshot.exists()) {
            const data = customerSnapshot.val();
            updateSession(UserRole.CUSTOMER, data.name);
            getFCMToken(UserRole.CUSTOMER); // الحصول على توكن الإشعارات
            setLoading(false);
            return;
          }

          // التحقق من كونه متجر
          const storeSnapshot = await get(ref(db, `stores/${user.uid}`));
          if (storeSnapshot.exists()) {
            const data = storeSnapshot.val();
            updateSession(UserRole.STORE, data.name);
            getFCMToken(UserRole.STORE);
            setLoading(false);
            return;
          }

          // التحقق من كونه موصل
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
          console.error("Auth check error:", error);
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

  const updateSession = (role: UserRole, name: string) => {
    setCurrentRole(role);
    setUserName(name || 'مستخدم');
    localStorage.setItem('kimo_user_role', role);
    localStorage.setItem('kimo_user_name', name);
  };

  const fallbackToLocalData = () => {
    const savedRole = localStorage.getItem('kimo_user_role') as UserRole;
    const savedName = localStorage.getItem('kimo_user_name');
    if (savedRole) setCurrentRole(savedRole);
    else setCurrentRole(null);
    if (savedName) setUserName(savedName || '');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  // صفحة المسؤول تظهر دائماً عبر الهاش #admin
  if (isAdminPath) {
    return <AdminScreen onExit={() => { window.location.hash = ''; setIsAdminPath(false); }} />;
  }

  // وضع الصيانة (يستثنى منه حساب المسؤول الرئيسي)
  if (isLocked && auth.currentUser?.email !== 'downloader@gmail.com') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center font-cairo">
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Lock className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">التطبيق مغلق حالياً</h1>
        <p className="text-slate-400 font-bold max-w-xs mx-auto mb-8">نحن نقوم ببعض التحديثات الضرورية لتحسين تجربة كيمو. سنعود قريباً!</p>
        {globalMessage && (
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-[2rem] text-orange-400 font-bold text-sm shadow-2xl flex items-center gap-4 max-w-sm">
            <Bell className="w-8 h-8 shrink-0 text-orange-500" />
            <div className="text-right">
               <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">رسالة من الإدارة</p>
               <p>{globalMessage}</p>
            </div>
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
    <div className="font-sans antialiased text-primary-900 bg-primary-50 min-h-screen">
       {/* الإشعار العلوي العام */}
       {currentRole && globalMessage && (
          <div className="bg-orange-500 text-white p-3 text-center text-xs font-black animate-pulse z-[2000] sticky top-0 shadow-lg flex items-center justify-center gap-2">
            <Bell className="w-4 h-4" />
            {globalMessage}
          </div>
       )}
       {renderScreen()}
    </div>
  );
};

export default App;