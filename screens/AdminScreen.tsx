import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { 
  ShieldCheck, Users, Store, Bike, Lock, Unlock, 
  Send, Loader2, ArrowLeft, LogOut, Bell, Settings,
  Activity, Database, CheckCircle2, Trash2,
  LayoutDashboard, ShoppingBag, Search, Filter, 
  MapPin, Phone, Star, Eye, CreditCard,
  AlertTriangle, Radio, Clock, Mail, ShieldAlert
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { Order, OrderStatus } from '../types';

interface AdminScreenProps {
  onExit: () => void;
}

type AdminTab = 'DASHBOARD' | 'CUSTOMERS' | 'STORES' | 'DRIVERS' | 'ORDERS' | 'SETTINGS';

export const AdminScreen: React.FC<AdminScreenProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  
  // Data State
  const [stats, setStats] = useState({ customers: 0, stores: 0, drivers: 0, orders: 0, revenue: 0 });
  const [customers, setCustomers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appConfig, setAppConfig] = useState({ isLocked: false, globalMessage: '' });
  
  // UI states
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<string | null>(null);

  useEffect(() => {
    if (auth.currentUser?.email === 'downloader@gmail.com') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubCustomers = onValue(ref(db, 'customers'), (s) => {
      const list = s.exists() ? Object.entries(s.val()).map(([id, val]: any) => ({ id, ...val })) : [];
      setCustomers(list);
    });

    const unsubStores = onValue(ref(db, 'stores'), (s) => {
      const list = s.exists() ? Object.entries(s.val()).map(([id, val]: any) => ({ id, ...val })) : [];
      setStores(list);
    });

    const unsubDrivers = onValue(ref(db, 'drivers'), (s) => {
      const list = s.exists() ? Object.entries(s.val()).map(([id, val]: any) => ({ id, ...val })) : [];
      setDrivers(list);
    });

    const unsubOrders = onValue(ref(db, 'orders'), (s) => {
      const list = s.exists() ? Object.entries(s.val()).map(([id, val]: any) => ({ id, ...val })) as Order[] : [];
      setOrders(list.sort((a, b) => b.timestamp - a.timestamp));
    });

    const unsubConfig = onValue(ref(db, 'app_settings'), (s) => {
      if (s.exists()) setAppConfig(s.val());
    });

    return () => {
      unsubCustomers(); unsubStores(); unsubDrivers(); unsubOrders(); unsubConfig();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    setStats({
      customers: customers.length,
      stores: stores.length,
      drivers: drivers.length,
      orders: orders.length,
      revenue: orders.reduce((acc, curr) => acc + (curr.status === OrderStatus.DELIVERED ? curr.totalPrice : 0), 0)
    });
  }, [customers, stores, drivers, orders]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingLogin(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      if (userCredential.user.email === 'downloader@gmail.com') {
        setIsAuthenticated(true);
      } else {
        setError('هذا الحساب لا يملك صلاحيات المسؤول');
        await auth.signOut();
      }
    } catch (err: any) {
      setError('بيانات الدخول غير صحيحة');
    } finally {
      setIsLoadingLogin(false);
    }
  };

  const broadcastMessage = async () => {
    if (!appConfig.globalMessage && !window.confirm('هل تريد مسح الإشعار الحالي؟')) return;
    setLoadingAction('MSG');
    try {
      // نستخدم set لضمان الكتابة حتى لو لم يكن المسار موجوداً
      await set(ref(db, 'app_settings/globalMessage'), appConfig.globalMessage);
      await set(ref(db, 'app_settings/lastBroadcast'), Date.now());
      
      setSuccessAction('MSG');
      setTimeout(() => setSuccessAction(null), 2000);
    } catch (err: any) {
      console.error("Firebase Update Error:", err);
      alert('خطأ PERMISSION_DENIED: يجب عليك تحديث "Rules" في Firebase Console لتسمح للمسؤول بالكتابة.');
    } finally {
      setLoadingAction(null);
    }
  };

  const toggleLock = async () => {
    setLoadingAction('LOCK');
    try {
      await update(ref(db, 'app_settings'), { isLocked: !appConfig.isLocked });
      setSuccessAction('LOCK');
      setTimeout(() => setSuccessAction(null), 2000);
    } catch (err: any) {
      alert('فشل تغيير الحالة: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteItem = async (path: string, id: string) => {
    if (window.confirm('حذف نهائي؟')) {
      try { await remove(ref(db, `${path}/${id}`)); } catch (err) { alert('خطأ: ' + err); }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-cairo text-right" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-orange-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
              <ShieldCheck className="text-white w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">لوحة التحكم</h1>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-5">
            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black text-center border border-red-500/20">{error}</div>}
            <input type="email" placeholder="البريد" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <input type="password" placeholder="كلمة السر" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button disabled={isLoadingLogin} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg active:scale-95 transition-all">
              {isLoadingLogin ? <Loader2 className="animate-spin mx-auto" /> : 'دخول المسؤول'}
            </button>
            <button type="button" onClick={onExit} className="w-full text-slate-500 text-xs font-bold mt-4">العودة للتطبيق</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-cairo flex text-right" dir="rtl">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 text-white flex flex-col sticky top-0 h-screen shadow-2xl shrink-0 z-50">
        <div className="p-10 border-b border-slate-800">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center"><Activity className="w-7 h-7" /></div>
              <h1 className="font-black text-2xl">نظام كيمو</h1>
           </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          <NavItem active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} label="نظرة عامة" />
          <NavItem active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} label="الزبائن" count={stats.customers} />
          <NavItem active={activeTab === 'STORES'} onClick={() => setActiveTab('STORES')} icon={<Store />} label="المتاجر" count={stats.stores} />
          <NavItem active={activeTab === 'DRIVERS'} onClick={() => setActiveTab('DRIVERS')} icon={<Bike />} label="الموصلين" count={stats.drivers} />
          <NavItem active={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ShoppingBag />} label="الطلبيات" count={stats.orders} />
          <NavItem active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings />} label="الإعدادات" />
        </nav>

        <div className="p-8 border-t border-slate-800">
           <button onClick={async () => { await auth.signOut(); setIsAuthenticated(false); }} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-sm">
             <LogOut className="w-5 h-5 mx-auto" />
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col max-h-screen overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
           <h2 className="text-2xl font-black text-slate-800">مركز التحكم</h2>
           <button onClick={onExit} className="p-3 bg-slate-100 text-slate-500 rounded-2xl"><ArrowLeft className="w-6 h-6" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
           {activeTab === 'DASHBOARD' && (
             <div className="animate-fade-in-up space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   <StatCard icon={<Users className="text-blue-500" />} label="المستخدمين" value={stats.customers + stats.stores + stats.drivers} color="blue" />
                   <StatCard icon={<Store className="text-orange-500" />} label="المتاجر" value={stats.stores} color="orange" />
                   <StatCard icon={<ShoppingBag className="text-green-500" />} label="الطلبات" value={stats.orders} color="green" />
                   <StatCard icon={<CreditCard className="text-purple-500" />} label="الأرباح" value={formatCurrency(stats.revenue)} color="purple" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-white">
                      <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Bell className="w-6 h-6 text-orange-500" /> بث إشعار فوري للجميع</h3>
                      <textarea 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-sm font-bold h-40 outline-none focus:border-orange-500 resize-none mb-6"
                        placeholder="اكتب رسالة الإشعار هنا..."
                        value={appConfig.globalMessage}
                        onChange={e => setAppConfig(prev => ({ ...prev, globalMessage: e.target.value }))}
                      />
                      <button 
                        onClick={broadcastMessage}
                        disabled={loadingAction === 'MSG'}
                        className={`w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${successAction === 'MSG' ? 'bg-green-500' : 'bg-slate-900 active:scale-95'}`}
                      >
                        {loadingAction === 'MSG' ? <Loader2 className="animate-spin w-6 h-6" /> : successAction === 'MSG' ? <CheckCircle2 className="w-6 h-6" /> : 'إرسال الإشعار الآن'}
                      </button>
                   </div>

                   <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-white">
                      <h3 className="text-xl font-black mb-4 flex items-center gap-3"><ShieldAlert className="w-6 h-6 text-red-500" /> وضع الصيانة</h3>
                      <div className={`p-6 rounded-[2rem] flex items-center justify-between mt-6 ${appConfig.isLocked ? 'bg-red-50' : 'bg-green-50'}`}>
                         <span className={`font-black ${appConfig.isLocked ? 'text-red-600' : 'text-green-600'}`}>{appConfig.isLocked ? 'التطبيق مغلق' : 'التطبيق متاح'}</span>
                         <button onClick={toggleLock} disabled={loadingAction === 'LOCK'} className={`p-4 rounded-xl text-white ${appConfig.isLocked ? 'bg-green-500' : 'bg-red-500'}`}>
                            {loadingAction === 'LOCK' ? <Loader2 className="animate-spin w-5 h-5" /> : appConfig.isLocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* الجداول الخاصة بالمستخدمين تظهر هنا بناءً على التبويب المختار */}
           {(activeTab === 'CUSTOMERS' || activeTab === 'STORES' || activeTab === 'DRIVERS') && (
              <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden animate-fade-in-up">
                 <div className="p-10 border-b border-slate-50 font-black text-xl">إدارة {activeTab}</div>
                 <div className="p-10 text-center text-slate-400 font-bold">يتم جلب البيانات من قاعدة البيانات...</div>
              </div>
           )}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, count }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-5 rounded-[1.8rem] transition-all ${active ? 'bg-orange-500 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
    <div className="flex items-center gap-4">
       {icon} <span className="font-black text-sm">{label}</span>
    </div>
    {count !== undefined && <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-800 text-slate-500">{count}</span>}
  </button>
);

const StatCard = ({ icon, label, value, color }: any) => (
  <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white">
     <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 bg-slate-50">{icon}</div>
     <p className="text-slate-400 text-[11px] font-black uppercase mb-2">{label}</p>
     <h4 className="text-4xl font-black text-slate-900">{value}</h4>
  </div>
);