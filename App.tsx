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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          // Check in 'customers' node
          const customerSnapshot = await get(ref(db, `customers/${user.uid}`));
          if (customerSnapshot.exists()) {
            const data = customerSnapshot.val();
            updateSession(UserRole.CUSTOMER, data.name);
            setLoading(false);
            return;
          }

          // Check in 'stores' node
          const storeSnapshot = await get(ref(db, `stores/${user.uid}`));
          if (storeSnapshot.exists()) {
            const data = storeSnapshot.val();
            updateSession(UserRole.STORE, data.name);
            setLoading(false);
            return;
          }

          // Check in 'drivers' node
          const driverSnapshot = await get(ref(db, `drivers/${user.uid}`));
          if (driverSnapshot.exists()) {
            const data = driverSnapshot.val();
            updateSession(UserRole.DRIVER, data.name);
            setLoading(false);
            return;
          }

          // Fallback to local storage if not found in DB
          const savedRole = localStorage.getItem('kimo_user_role') as UserRole;
          const savedName = localStorage.getItem('kimo_user_name');
          if (savedRole) {
            setCurrentRole(savedRole);
            setUserName(savedName || 'مستخدم');
          } else {
            setCurrentRole(null);
          }
          
        } catch (error: any) {
          console.error("Auth sync error:", error);
          setCurrentRole(null);
        }
      } else {
        setCurrentRole(null);
        setUserName('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSession = (role: UserRole, name: string) => {
    setCurrentRole(role);
    setUserName(name || 'مستخدم');
    localStorage.setItem('kimo_user_role', role);
    localStorage.setItem('kimo_user_name', name || '');
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 font-cairo">
        <div className="relative mb-8">
          <div className="w-24 h-24 brand-gradient rounded-[2rem] flex items-center justify-center shadow-2xl animate-float">
            <span className="text-white text-5xl font-black italic">K</span>
          </div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin"></div>
        </div>
        <h2 className="text-white font-black text-2xl tracking-widest animate-pulse">كيمو جاري التحميل...</h2>
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
    <div className="font-sans antialiased bg-[#F8FAFC] min-h-screen">
       {renderScreen()}
    </div>
  );
};

export default App;