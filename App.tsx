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

          // If not found in specific nodes (or error), fallback to local storage
          fallbackToLocalData();
          
        } catch (error: any) {
          console.warn("Database access failed, using Local Storage fallback.");
          fallbackToLocalData();
        }
      } else {
        // User is signed out
        setCurrentRole(null);
        setUserName('');
        localStorage.removeItem('kimo_user_role');
        localStorage.removeItem('kimo_user_name');
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
    
    if (savedRole) {
      setCurrentRole(savedRole);
    } else {
      setCurrentRole(null);
    }

    if (savedName) {
      setUserName(savedName);
    }
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
    // Called by AuthScreen for immediate update
    updateSession(role, name || '');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-900">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-16 h-16 text-brand-500 animate-spin-slow" />
          <div className="absolute w-24 h-24 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
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