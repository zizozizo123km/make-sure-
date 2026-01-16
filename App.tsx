import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { AuthScreen } from './screens/AuthScreen';
import { CustomerScreen } from './screens/CustomerScreen';
import { StoreScreen } from './screens/StoreScreen';
import { DriverScreen } from './screens/DriverScreen';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // مراقبة حالة المصادقة من Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          // محاولة جلب الدور من قاعدة البيانات (الأكثر دقة)
          
          // 1. تحقق من فئة الزبائن
          const customerSnapshot = await get(ref(db, `customers/${user.uid}`));
          if (customerSnapshot.exists()) {
            const data = customerSnapshot.val();
            updateSession(UserRole.CUSTOMER, data.name);
            setLoading(false);
            return;
          }

          // 2. تحقق من فئة المتاجر
          const storeSnapshot = await get(ref(db, `stores/${user.uid}`));
          if (storeSnapshot.exists()) {
            const data = storeSnapshot.val();
            updateSession(UserRole.STORE, data.name);
            setLoading(false);
            return;
          }

          // 3. تحقق من فئة السائقين
          const driverSnapshot = await get(ref(db, `drivers/${user.uid}`));
          if (driverSnapshot.exists()) {
            const data = driverSnapshot.val();
            updateSession(UserRole.DRIVER, data.name);
            setLoading(false);
            return;
          }

          // إذا لم يتم العثور على الدور في قاعدة البيانات، نعتمد على الذاكرة المحلية كحل أخير
          fallbackToLocalData();
          
        } catch (error: any) {
          console.error("خطأ في جلب بيانات المستخدم:", error);
          fallbackToLocalData();
        }
      } else {
        // إذا لم يكن هناك مستخدم مسجل دخول (أو قام بالخروج)
        clearSession();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSession = (role: UserRole, name: string) => {
    setCurrentRole(role);
    setUserName(name || 'مستخدم كيمو');
    localStorage.setItem('kimo_user_role', role);
    localStorage.setItem('kimo_user_name', name || '');
  };

  const clearSession = () => {
    setCurrentRole(null);
    setUserName('');
    localStorage.removeItem('kimo_user_role');
    localStorage.removeItem('kimo_user_name');
  };

  const fallbackToLocalData = () => {
    const savedRole = localStorage.getItem('kimo_user_role') as UserRole;
    const savedName = localStorage.getItem('kimo_user_name');
    
    if (savedRole) {
      setCurrentRole(savedRole);
      setUserName(savedName || 'مستخدم');
    } else {
      clearSession();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearSession();
    } catch (error) {
      console.error("خطأ أثناء تسجيل الخروج:", error);
    }
  };

  const handleManualLogin = (role: UserRole, name?: string) => {
    updateSession(role, name || '');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-900">
        <div className="relative flex flex-col items-center">
          <Loader2 className="w-16 h-16 text-brand-500 animate-spin" />
          <p className="text-white mt-4 font-bold animate-pulse">جاري التحميل...</p>
        </div>
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
       {renderScreen()}
    </div>
  );
};

export default App;