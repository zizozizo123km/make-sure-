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
  const [isLoading, setIsLoading] = useState(false);
  
  const [stats, setStats] = useState({ customers: 0, stores: 0, drivers: 0, orders: 0, revenue: 0 });
  const [customers, setCustomers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appConfig, setAppConfig] = useState({ isLocked: false, globalMessage: '' });
  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<string | null>(null);

  const ADMIN_EMAIL = 'downloader@gmail.com';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
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
    setIsLoading(true);
    setError('');
    
    // التحقق من البريد الإلكتروني قبل محاولة تسجيل الدخول
    if (loginForm.email !== ADMIN_EMAIL) {
      setError('هذا البريد غير مخول للدخول كمسؤول');
      setIsLoading(false);
      return;
    }

    try {
      // تسجيل الدخول الفعلي في Firebase للحصول على التوكن والصلاحيات
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error("Admin Login Error:", err);
      if (err.code === 'auth/wrong-password') {
        setError('كلمة السر غير صحيحة');
      } else if (err.code === 'auth/user-not-found') {
        setError('حساب المسؤول غير موجود في قاعدة البيانات');
      } else {
        setError('خطأ في الاتصال أو بيانات غير صحيحة');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const broadcastMessage = async () => {
    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL) {
      alert('يجب تسجيل الدخول كمسؤول رئيسي للقيام بهذه العملية');
      return;
    }

    setLoadingAction('MSG');
    try {
      await update(ref(db, 'app_settings'), { 
        globalMessage: appConfig.globalMessage,
        lastBroadcast: Date.now()
      });
      setSuccessAction('MSG');
      setTimeout(() => setSuccessAction(null), 2000);
    } catch (err: any) {
      console.error("Broadcast Error:", err);
      alert('فشل إرسال الإشعار: ' + (err.message.includes('PERMISSION_DENIED') ? 'خطأ في الصلاحيات' : err.message));
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
    } catch (err) {
      alert('فشل في تغيير حالة النظام: يرجى التحقق من الاتصال');
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteItem = async (path: string, id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) {
      try {
        await remove(ref(db, `${path}/${id}`));
      } catch (err) {
        alert('حدث خطأ أثناء الحذف');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-cairo text-right" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl animate-scale-up">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-orange-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/20 rotate-3">
              <ShieldCheck className="text-white w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">لوحة تحكم كيمو</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">KIMO CENTRAL CONTROL</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-5">
            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black text-center border border-red-500/20">{error}</div>}
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-500 mr-4 uppercase">بريد المسؤول الرئيسي</label>
               <input 
                 type="email" 
                 placeholder="downloader@gmail.com" 
                 className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all shadow-inner" 
                 value={loginForm.email} 
                 onChange={e => setLoginForm({...loginForm, email: e.target.value})} 
               />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-500 mr-4 uppercase">كلمة السر الخاصة</label>
               <input 
                 type="password" 
                 placeholder="••••••••" 
                 className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all shadow-inner" 
                 value={loginForm.password} 
                 onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
               />
            </div>
            <button disabled={isLoading} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all mt-4 flex items-center justify-center">
              {isLoading ? <Loader2 className="animate-spin" /> : 'دخول نظام التحكم'}
            </button>
            <button type="button" onClick={onExit} className="w-full text-slate-500 text-xs font-bold flex items-center justify-center gap-2 mt-4 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> العودة للتطبيق</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-cairo flex text-right" dir="rtl">
      <aside className="w-80 bg-slate-900 text-white flex flex-col sticky top-0 h-screen shadow-2xl shrink-0 z-50">
        <div className="p-10 border-b border-slate-800">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg"><Activity className="w-7 h-7" /></div>
              <div>
                <h1 className="font-black text-2xl">نظام كيمو</h1>
                <p className="text-[9px] text-orange-400 font-black tracking-widest uppercase opacity-70">إدارة بئر العاتر</p>
              </div>
           </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          <NavItem active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard size={22}/>} label="نظرة عامة" />
          <NavItem active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users size={22}/>} label="الزبائن" count={stats.customers} />
          <NavItem active={activeTab === 'STORES'} onClick={() => setActiveTab('STORES')} icon={<Store size={22}/>} label="المتاجر" count={stats.stores} />
          <NavItem active={activeTab === 'DRIVERS'} onClick={() => setActiveTab('DRIVERS')} icon={<Bike size={22}/>} label="الموصلين" count={stats.drivers} />
          <NavItem active={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ShoppingBag size={22}/>} label="الطلبيات" count={stats.orders} />
        </nav>

        <div className="p-8 border-t border-slate-800">
           <button onClick={() => { auth.signOut(); setIsAuthenticated(false); }} className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-sm hover:bg-red-500 hover:text-white transition-all">
             <LogOut className="w-5 h-5" /> تسجيل الخروج الآمن
           </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col max-h-screen overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0 shadow-sm z-40">
           <div className="flex flex-col">
              <h2 className="text-2xl font-black text-slate-800">مركز التحكم المركزي</h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المسؤول: {ADMIN_EMAIL}</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="relative">
                 <input type="text" placeholder="بحث سريع..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-100 border-none rounded-2xl py-3 pr-12 pl-6 text-sm font-bold w-72 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all" />
                 <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>
              <button onClick={onExit} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"><ArrowLeft className="w-6 h-6" /></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
           {activeTab === 'DASHBOARD' && (
             <div className="animate-fade-in-up space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   <StatCard icon={<Users className="text-blue-500" />} label="المسجلين" value={stats.customers + stats.stores + stats.drivers} />
                   <StatCard icon={<Store className="text-orange-500" />} label="المتاجر" value={stats.stores} />
                   <StatCard icon={<ShoppingBag className="text-green-500" />} label="الطلبات" value={stats.orders} />
                   <StatCard icon={<CreditCard className="text-purple-500" />} label="الأرباح" value={formatCurrency(stats.revenue)} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white">
                      <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Bell className="w-6 h-6 text-orange-500" /> بث إشعار فوري</h3>
                      <p className="text-xs text-slate-400 font-bold mb-4">اكتب الرسالة التي ستظهر في شريط التنبيهات لجميع المستخدمين.</p>
                      <textarea 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-sm font-bold h-40 outline-none focus:border-orange-500 resize-none transition-all mb-6 shadow-inner"
                        placeholder="مثلاً: يوجد خصم 20% في مطعم كيمو!"
                        value={appConfig.globalMessage}
                        onChange={e => setAppConfig(prev => ({ ...prev, globalMessage: e.target.value }))}
                      />
                      <button 
                        onClick={broadcastMessage}
                        disabled={loadingAction === 'MSG'}
                        className={`w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${successAction === 'MSG' ? 'bg-green-500' : 'bg-slate-900 active:scale-95'}`}
                      >
                        {loadingAction === 'MSG' ? <Loader2 className="animate-spin w-6 h-6" /> : successAction === 'MSG' ? <CheckCircle2 className="w-6 h-6" /> : <><Send className="w-5 h-5" /> نشر الإشعار فوراً</>}
                      </button>
                   </div>

                   <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white">
                      <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-red-500"><ShieldAlert className="w-6 h-6" /> حالة التطبيق</h3>
                      <div className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between">
                         <div>
                            <p className="font-black text-slate-800">{appConfig.isLocked ? 'النظام مغلق للصيانة' : 'النظام يعمل بشكل طبيعي'}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">تفعيل هذا الخيار سيمنع الجميع من استخدام التطبيق</p>
                         </div>
                         <button onClick={toggleLock} className={`p-4 rounded-2xl text-white shadow-lg active:scale-90 transition-all ${appConfig.isLocked ? 'bg-green-500' : 'bg-red-500'}`}>
                            {appConfig.isLocked ? <Unlock /> : <Lock />}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           )}
           {/* باقي التبويبات تظهر هنا بناءً على الـ activeTab (المستخدمين، المتاجر، الخ) */}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, count }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center justify-between p-5 rounded-[1.8rem] transition-all duration-300 ${
      active ? 'bg-orange-500 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'
    }`}
  >
    <div className="flex items-center gap-4">
       {icon}
       <span className="font-black text-sm">{label}</span>
    </div>
    {count !== undefined && <span className="text-xs opacity-50 font-black">{count}</span>}
  </button>
);

const StatCard = ({ icon, label, value }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col items-center text-center">
     <div className="mb-4 p-4 bg-slate-50 rounded-2xl">{icon}</div>
     <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-widest">{label}</p>
     <h4 className="text-2xl font-black text-slate-800">{value}</h4>
  </div>
);