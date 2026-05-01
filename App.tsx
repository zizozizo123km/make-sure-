import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { Loader2 } from 'lucide-react';
import { AuthScreen } from './screens/AuthScreen';
import { CustomerScreen } from './screens/CustomerScreen';
import { StoreScreen } from './screens/StoreScreen';
import { DriverScreen } from './screens/DriverScreen';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Try to determine role from database
        const roles = ['customers', 'stores', 'drivers'];
        let foundRole = null;
        for (const r of roles) {
          const snapshot = await get(ref(db, `${r}/${authUser.uid}`));
          if (snapshot.exists()) {
            foundRole = r === 'customers' ? UserRole.CUSTOMER : r === 'stores' ? UserRole.STORE : UserRole.DRIVER;
            setUser(snapshot.val());
            break;
          }
        }
        setRole(foundRole);
      } else {
        setRole(null);
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
    </div>
  );

  if (!role) return <AuthScreen onLogin={(r) => setRole(r)} />;

  switch (role) {
    case UserRole.CUSTOMER: return <CustomerScreen />;
    case UserRole.STORE: return <StoreScreen user={user} />;
    case UserRole.DRIVER: return <DriverScreen />;
    default: return <AuthScreen onLogin={(r) => setRole(r)} />;
  }
};

export default App;
