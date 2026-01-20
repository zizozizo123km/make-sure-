
import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { 
  ShieldCheck, Users, Store, Bike, Lock, Unlock, 
  Send, Loader2, LogOut, Bell, Settings,
  Activity, Database, CheckCircle2, Trash2,
  LayoutDashboard, ShoppingBag, Search, Filter, 
  MapPin, Phone, Star, Eye, CreditCard,
  AlertTriangle, Radio, Clock, Mail, ShieldAlert,
  UserCheck, ExternalLink, Calendar, RefreshCw, Zap,
  Eraser, Bomb
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { Order, OrderStatus } from '../types';

interface AdminScreenProps {
  onExit: () => void;
}

type AdminTab = 'DASHBOARD' | 'CUSTOMERS' | 'STORES' | 'DRIVERS' | 'ORDERS';

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
  const [appConfig, setAppConfig] = useState({ isLocked: false, globalMessage: '', versionCode: 0 });
  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<string | null>(null);

  const ADMIN_EMAIL = 'downloader@gmail.com';
  const ADMIN_PASSWORD = 'zizozizo';

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

    onValue(ref(db, 'customers'), (s) => {
      const list = s.exists() ? Object.entries(s.val()).map(([id, val]: any) => ({ id, ...val })) : [];
      setCustomers(list);
    });

    onValue(ref(db, 'stores'), (s) => {
      const list = s.exists() ? Object.entries(s.val()).map(([id, val]: any) => ({ id, ...val })) : [];
      setStores(list);
    });

    onValue(ref(db, 'drivers'), (s) => {
      const list = s.exists() ? Object.entries(s.val()).map(([id, val]: any) => ({ id, ...val })) : [];
      setDrivers(list);
    });

    onValue(ref(db, 'orders'), (s) => {
      const list = s.exists() ? Object.entries(s.val()).map(([id, val]: any) => ({ id, ...val })) as Order[] : [];
      setOrders(list.sort((a, b) => b.timestamp - a.timestamp));
    });

    onValue(ref(db, 'app_settings'), (s) => {
      if (s.exists()) setAppConfig(s.val());
    });
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
    
    if (loginForm.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError('هذا البريد غير مخول');
      setIsLoading(false);
      return;
    }

    if (loginForm.password !== ADMIN_PASSWORD) {
      setError('كلمة السر خاطئة');
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError('فشل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const broadcastMessage = async () => {
    setLoadingAction('MSG');
    try {
      await update(ref(db, 'app_settings'), { 
        globalMessage: appConfig.globalMessage,
        lastBroadcast: Date.now()
      });
      setSuccessAction('MSG');
      setTimeout(() => setSuccessAction(null), 2000);
    } finally { setLoadingAction(null); }
  };

  const handleForceUpdateApp = async () => {
    if (!window.confirm('هل تريد فعلاً إجبار جميع المستخدمين على تحديث التطبيق؟')) return;
    setLoadingAction('UPDATE');
    try {
      await update(ref(db, 'app_settings'), { versionCode: Date.now() });
      setSuccessAction('UPDATE');
      setTimeout(() => setSuccessAction(null), 2000);
    } finally { setLoadingAction(null); }
  };

  const toggleLock = async () => {
    setLoadingAction('LOCK');
    try {
      await update(ref(db, 'app_settings'), { isLocked: !appConfig.isLocked });
      setSuccessAction('LOCK');
      setTimeout(() => setSuccessAction(null), 2000);
    } finally { setLoadingAction(null); }
  };

  const handleDeleteAllProducts = async () => {
    const confirm1 = window.confirm('⚠ تحذير نهائي: هل تريد حقاً حذف جميع المنتجات من كافة المتاجر؟ لا يمكن التراجع عن هذه العملية.');
    if (!confirm1) return;
    
    const confirm2 = window.confirm('سوف يتم مسح عقدة المنتجات بالكامل ليكون التطبيق نظيفاً للنشر. هل أنت متأكد؟');
    if (!confirm2) return;

    setLoadingAction('CLEAR_PRODUCTS');
    try {
      await remove(ref(db, 'products'));
      setSuccessAction('CLEAR_PRODUCTS');
      alert("تم مسح كافة المنتجات بنجاح. التطبيق الآن جاهز للنشر بنسخة نظيفة.");
      setTimeout(() => setSuccessAction(null), 3000);
    } catch (err: any) {
      alert("فشل المسح: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteAllOrders = async () => {
    if (!window.confirm('هل تريد مسح سجل الطلبيات بالكامل لتنظيف الداتا بيس؟')) return;
    setLoadingAction('CLEAR_ORDERS');
    try {
      await remove(ref(db, 'orders'));
      setSuccessAction('CLEAR_ORDERS');
      alert("تم مسح سجل الطلبيات.");
      setTimeout(() => setSuccessAction(null), 3000);
    } finally { setLoadingAction(null); }
  };

  const handleDelete = async (path: string, id: string) => {
    if (window.confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذه الخطوة.')) {
      setLoadingAction(`DELETE_${id}`);
      try {
        await remove(ref(db, `${path}/${id}`));
        setSuccessAction(`DELETE_${id}`);
        setTimeout(() => setSuccessAction(null), 1500);
      } catch (err: any) {
        console.error("Delete failed:", err);
        if (err.message.includes("PERMISSION_DENIED")) {
          alert("خطأ: تم رفض الصلاحية. يرجى تحديث قواعد Firebase (Rules) في لوحة التحكم.");
        } else {
          alert("فشل الحذف: " + err.message);
        }
      } finally {
        setLoadingAction(null);
      }
    }
  };

  const getFilteredData = () => {
    const q = searchQuery.toLowerCase();
    switch(activeTab) {
      case 'CUSTOMERS': return customers.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
      case 'STORES': return stores.filter(s => s.name?.toLowerCase().includes(q) || s.phone?.includes(q));
      case 'DRIVERS': return drivers.filter(d => d.name?.toLowerCase().includes(q) || d.phone?.includes(q));
      case 'ORDERS': return orders.filter(o => o.id?.toLowerCase().includes(q) || o.storeName?.toLowerCase().includes(q));
      default: return [];
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-cairo text-right" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl animate-scale-up">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-orange-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
              <ShieldCheck className="text-white w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">لوحة تحكم كيمو</h1>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-5">
            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[11px] font-black text-center">{error}</div>}
            <input type="email" placeholder="البريد" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <input type="password" placeholder="كلمة السر" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button disabled={isLoading} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all mt-4">
              {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'دخول النظام'}
            </button>
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
              <h1 className="font-black text-2xl">نظام كيمو</h1>
           </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          <NavItem active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard size={22}/>} label="نظرة عامة" />
          <NavItem active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users size={22}/>} label="الزبائن" count={stats.customers} />
          <NavItem active={activeTab === 'STORES'} onClick={() => setActiveTab('STORES')} icon={<Store size={22}/>} label="المتاجر" count={stats.stores} />
          <NavItem active={activeTab === 'DRIVERS'} onClick={() => setActiveTab('DRIVERS')} icon={<Bike size={22}/>} label="الموصلين" count={stats.drivers} />
          <NavItem active={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ShoppingBag size={22}/>} label="الطلبيات" count={stats.orders} />
        </nav>

        <div className="p-8 border-t border-slate-800">
           <button onClick={() => { auth.signOut(); setIsAuthenticated(false); }} className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-sm hover:bg-red-500 hover:text-white transition-all">
             <LogOut className="w-5 h-5" /> خروج
           </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col max-h-screen overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0 shadow-sm z-40">
           <h2 className="text-2xl font-black text-slate-800">مركز التحكم المركزي</h2>
           <div className="flex items-center gap-4">
              <div className="relative">
                 <input type="text" placeholder="بحث باسم أو رقم..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-100 border-none rounded-2xl py-3 pr-12 pl-6 text-sm font-bold w-64 outline-none" />
                 <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 pb-20">
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
                      <textarea 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-sm font-bold h-40 outline-none mb-6 resize-none"
                        placeholder="اكتب رسالة للمستخدمين..."
                        value={appConfig.globalMessage}
                        onChange={e => setAppConfig(prev => ({ ...prev, globalMessage: e.target.value }))}
                      />
                      <button onClick={broadcastMessage} disabled={loadingAction === 'MSG'} className={`w-full py-5 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 ${successAction === 'MSG' ? 'bg-green-500' : 'bg-slate-900 active:scale-95'}`}>
                        {loadingAction === 'MSG' ? <Loader2 className="animate-spin" /> : successAction === 'MSG' ? <CheckCircle2 /> : 'نشر الإشعار'}
                      </button>
                   </div>

                   <div className="space-y-6">
                      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-blue-600"><RefreshCw className="w-6 h-6" /> إدارة الإصدارات</h3>
                        <p className="text-xs text-slate-400 font-bold mb-6">إجبار المستخدمين على التحديث لمسح الكاش.</p>
                        <button 
                          onClick={handleForceUpdateApp}
                          disabled={loadingAction === 'UPDATE'}
                          className={`w-full py-5 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all ${successAction === 'UPDATE' ? 'bg-green-500' : 'bg-blue-600 active:scale-95'}`}
                        >
                          {loadingAction === 'UPDATE' ? <Loader2 className="animate-spin" /> : successAction === 'UPDATE' ? <CheckCircle2 /> : <><Zap size={18} /> تحديث التطبيق للجميع</>}
                        </button>
                      </div>

                      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-white">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-red-500"><ShieldAlert className="w-6 h-6" /> حالة التطبيق</h3>
                        <div className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between">
                           <p className="font-black text-slate-800">{appConfig.isLocked ? 'النظام مغلق' : 'النظام مفتوح'}</p>
                           <button onClick={toggleLock} className={`p-4 rounded-2xl text-white shadow-lg active:scale-90 transition-all ${appConfig.isLocked ? 'bg-green-500' : 'bg-red-500'}`}>
                              {appConfig.isLocked ? <Unlock /> : <Lock />}
                           </button>
                        </div>
                      </div>
                   </div>
                </div>

                {/* ⚠ Danger Zone for Cleaning Database before Launch */}
                <div className="bg-red-50 p-10 rounded-[3.5rem] border-2 border-dashed border-red-200">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><Bomb size={24} /></div>
                      <div>
                         <h3 className="text-xl font-black text-red-700">منطقة الخطر (تنظيف ما قبل النشر)</h3>
                         <p className="text-xs text-red-400 font-bold">استخدم هذه الخيارات لمسح بيانات الاختبار قبل إطلاق التطبيق رسمياً.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button 
                        onClick={handleDeleteAllProducts}
                        disabled={loadingAction === 'CLEAR_PRODUCTS'}
                        className="bg-white border-2 border-red-100 hover:border-red-500 p-8 rounded-[2.5rem] transition-all group flex flex-col items-center gap-4"
                      >
                         <div className="p-4 bg-red-50 text-red-500 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-all">
                            {loadingAction === 'CLEAR_PRODUCTS' ? <Loader2 className="animate-spin" /> : <Eraser size={32} />}
                         </div>
                         <div className="text-center">
                            <span className="block font-black text-red-700">حذف كافة المنتجات</span>
                            <span className="text-[10px] text-red-300 font-bold">سيتم مسح جميع المنتجات من كافة المتاجر</span>
                         </div>
                      </button>

                      <button 
                        onClick={handleDeleteAllOrders}
                        disabled={loadingAction === 'CLEAR_ORDERS'}
                        className="bg-white border-2 border-red-100 hover:border-red-500 p-8 rounded-[2.5rem] transition-all group flex flex-col items-center gap-4"
                      >
                         <div className="p-4 bg-red-50 text-red-500 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-all">
                            {loadingAction === 'CLEAR_ORDERS' ? <Loader2 className="animate-spin" /> : <Trash2 size={32} />}
                         </div>
                         <div className="text-center">
                            <span className="block font-black text-red-700">مسح سجل الطلبات</span>
                            <span className="text-[10px] text-red-300 font-bold">سيتم تصفير سجل الطلبيات القديمة بالكامل</span>
                         </div>
                      </button>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'CUSTOMERS' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
               {getFilteredData().map((c: any) => (
                 <div key={c.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-5 relative group overflow-hidden">
                   <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover rounded-2xl" /> : <Users size={28} />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="font-black text-slate-800 truncate">{c.name}</h4>
                     <p className="text-xs text-slate-400 font-bold">{c.phone || 'بدون هاتف'}</p>
                   </div>
                   <button 
                    onClick={() => handleDelete('customers', c.id)} 
                    disabled={loadingAction === `DELETE_${c.id}`}
                    className="p-3 text-slate-300 hover:text-red-500 transition-all active:scale-90 shrink-0"
                   >
                     {loadingAction === `DELETE_${c.id}` ? <Loader2 className="animate-spin w-5 h-5" /> : <Trash2 size={20} />}
                   </button>
                 </div>
               ))}
             </div>
           )}

           {activeTab === 'STORES' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
               {getFilteredData().map((s: any) => (
                 <div key={s.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-5 relative overflow-hidden">
                   <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
                      {s.image ? <img src={s.image} className="w-full h-full object-cover rounded-2xl" /> : <Store size={28} />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="font-black text-slate-800 truncate">{s.name}</h4>
                     <div className="flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-current"/><span className="text-[10px] font-bold text-slate-400">{s.rating?.toFixed(1) || '0.0'}</span></div>
                   </div>
                   <button onClick={() => handleDelete('stores', s.id)} className="p-3 text-slate-300 hover:text-red-500 transition-all shrink-0"><Trash2 size={20} /></button>
                 </div>
               ))}
             </div>
           )}

           {activeTab === 'DRIVERS' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
               {getFilteredData().map((d: any) => (
                 <div key={d.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-5 relative overflow-hidden">
                   <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shrink-0">
                      {d.avatar ? <img src={d.avatar} className="w-full h-full object-cover rounded-2xl" /> : <Bike size={28} />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="font-black text-slate-800 truncate">{d.name}</h4>
                     <p className="text-xs text-slate-400 font-bold">{d.phone || 'بدون هاتف'}</p>
                   </div>
                   <button onClick={() => handleDelete('drivers', d.id)} className="p-3 text-slate-300 hover:text-red-500 transition-all shrink-0"><Trash2 size={20} /></button>
                 </div>
               ))}
             </div>
           )}

           {activeTab === 'ORDERS' && (
             <div className="space-y-4 animate-fade-in-up">
               {getFilteredData().map((o: any) => (
                 <div key={o.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs">#{o.id.slice(-4)}</div>
                       <div>
                          <h4 className="font-black text-slate-800 text-sm">{o.customerName} → {o.storeName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">{formatCurrency(o.totalPrice)} • {o.status}</p>
                       </div>
                    </div>
                    <button onClick={() => handleDelete('orders', o.id)} className="p-3 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={20}/></button>
                 </div>
               ))}
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, count }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-5 rounded-[1.8rem] transition-all ${active ? 'bg-orange-500 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
    <div className="flex items-center gap-4">{icon}<span className="font-black text-sm">{label}</span></div>
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
