import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, remove, set } from 'firebase/database';
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
    if (!isAuthenticated) return;

    // المراقبة الحية لجميع الجداول
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

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.email === 'downloader@gmail.com' && loginForm.password === 'kimo1212') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('بيانات الدخول غير صحيحة');
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

  const toggleLock = async () => {
    setLoadingAction('LOCK');
    try {
      await update(ref(db, 'app_settings'), { isLocked: !appConfig.isLocked });
      setSuccessAction('LOCK');
      setTimeout(() => setSuccessAction(null), 2000);
    } catch (err) {
      alert('فشل في تغيير حالة النظام');
    } finally {
      setLoadingAction(null);
    }
  };

  const broadcastMessage = async () => {
    if (!appConfig.globalMessage && !window.confirm('هل تريد مسح الإشعار الحالي من عند الجميع؟')) return;
    setLoadingAction('MSG');
    try {
      // استخدام update بدلاً من set لضمان عدم الكتابة فوق الإعدادات الأخرى
      await update(ref(db, 'app_settings'), { 
        globalMessage: appConfig.globalMessage,
        lastBroadcast: Date.now()
      });
      setSuccessAction('MSG');
      setTimeout(() => setSuccessAction(null), 2000);
    } catch (err: any) {
      console.error("Firebase Update Error:", err);
      alert('فشل إرسال الإشعار: ' + (err.message || 'خطأ في الاتصال'));
    } finally {
      setLoadingAction(null);
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
               <label className="text-[10px] font-black text-slate-500 mr-4 uppercase">البريد الإداري</label>
               <input type="email" placeholder="admin@kimo.dz" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all shadow-inner" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-500 mr-4 uppercase">كلمة السر</label>
               <input type="password" placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all shadow-inner" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            </div>
            <button className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all mt-4">دخول المسؤول</button>
            <button type="button" onClick={onExit} className="w-full text-slate-500 text-xs font-bold flex items-center justify-center gap-2 mt-4 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /> العودة للتطبيق</button>
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
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg"><Activity className="w-7 h-7" /></div>
              <div>
                <h1 className="font-black text-2xl">نظام كيمو</h1>
                <p className="text-[9px] text-orange-400 font-black tracking-widest uppercase opacity-70">إدارة بئر العاتر</p>
              </div>
           </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          <NavItem active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} label="نظرة عامة" />
          <NavItem active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} label="الزبائن" count={stats.customers} />
          <NavItem active={activeTab === 'STORES'} onClick={() => setActiveTab('STORES')} icon={<Store />} label="المتاجر" count={stats.stores} />
          <NavItem active={activeTab === 'DRIVERS'} onClick={() => setActiveTab('DRIVERS')} icon={<Bike />} label="الموصلين" count={stats.drivers} />
          <NavItem active={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ShoppingBag />} label="الطلبيات" count={stats.orders} />
          <NavItem active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings />} label="إعدادات النظام" />
        </nav>

        <div className="p-8 border-t border-slate-800">
           <button onClick={() => setIsAuthenticated(false)} className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-sm hover:bg-red-500 hover:text-white transition-all">
             <LogOut className="w-5 h-5" /> تسجيل الخروج الآمن
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col max-h-screen overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0 shadow-sm z-40">
           <div className="flex items-center gap-6">
              <h2 className="text-2xl font-black text-slate-800">
                {activeTab === 'DASHBOARD' && 'مركز التحكم المركزي'}
                {activeTab === 'CUSTOMERS' && 'قاعدة بيانات الزبائن'}
                {activeTab === 'STORES' && 'إدارة المتاجر المعتمدة'}
                {activeTab === 'DRIVERS' && 'فريق التوصيل'}
                {activeTab === 'ORDERS' && 'سجل الحركات المالية والطلبات'}
                {activeTab === 'SETTINGS' && 'الضبط الفني'}
              </h2>
              <div className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black flex items-center gap-2 border border-green-100 animate-pulse">
                 <div className="w-2 h-2 bg-green-500 rounded-full"></div> اتصال حي
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="relative">
                 <input type="text" placeholder="بحث عن اسم أو هاتف..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-100 border-none rounded-2xl py-3 pr-12 pl-6 text-sm font-bold w-72 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all" />
                 <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>
              <button onClick={onExit} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"><ArrowLeft className="w-6 h-6" /></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
           {activeTab === 'DASHBOARD' && (
             <div className="animate-fade-in-up space-y-10">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   <StatCard icon={<Users className="text-blue-500" />} label="إجمالي المسجلين" value={stats.customers + stats.stores + stats.drivers} color="blue" />
                   <StatCard icon={<Store className="text-orange-500" />} label="المتاجر" value={stats.stores} color="orange" />
                   <StatCard icon={<ShoppingBag className="text-green-500" />} label="الطلبات" value={stats.orders} color="green" />
                   <StatCard icon={<CreditCard className="text-purple-500" />} label="إجمالي الأرباح" value={formatCurrency(stats.revenue)} color="purple" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   {/* Notification Panel */}
                   <div className="lg:col-span-1 space-y-10">
                      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white">
                         <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Bell className="w-6 h-6 text-orange-500" /> بث إشعار فوري</h3>
                         <p className="text-xs text-slate-400 font-bold mb-6">سيصل هذا الإشعار لجميع مستخدمي التطبيق في بئر العاتر فوراً.</p>
                         <textarea 
                           className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-sm font-bold h-40 outline-none focus:border-orange-500 resize-none transition-all mb-6 shadow-inner"
                           placeholder="اكتب هنا.. مثلاً: يوجد خصم 20% في مطعم كيمو!"
                           value={appConfig.globalMessage}
                           onChange={e => setAppConfig(prev => ({ ...prev, globalMessage: e.target.value }))}
                         />
                         <button 
                           onClick={broadcastMessage}
                           disabled={loadingAction === 'MSG'}
                           className={`w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${successAction === 'MSG' ? 'bg-green-500 scale-95' : 'bg-slate-900 active:scale-95'}`}
                         >
                           {loadingAction === 'MSG' ? <Loader2 className="animate-spin w-6 h-6" /> : successAction === 'MSG' ? <CheckCircle2 className="w-6 h-6" /> : <><Send className="w-5 h-5" /> نشر الإشعار للجميع</>}
                         </button>
                      </div>

                      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white">
                         <h3 className="text-xl font-black mb-4 flex items-center gap-3"><ShieldAlert className="w-6 h-6 text-red-500" /> حالة التطبيق</h3>
                         <p className="text-xs text-slate-400 font-bold mb-8">إغلاق التطبيق يمنع المستخدمين من الدخول أثناء الصيانة.</p>
                         <div className={`p-6 rounded-[2rem] flex items-center justify-between transition-all ${appConfig.isLocked ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                            <span className={`font-black text-sm ${appConfig.isLocked ? 'text-red-600' : 'text-green-600'}`}>{appConfig.isLocked ? 'النظام مغلق' : 'النظام يعمل'}</span>
                            <button onClick={toggleLock} disabled={loadingAction === 'LOCK'} className={`p-4 rounded-xl shadow-lg active:scale-90 transition-all ${appConfig.isLocked ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                               {loadingAction === 'LOCK' ? <Loader2 className="animate-spin w-5 h-5" /> : appConfig.isLocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                            </button>
                         </div>
                      </div>
                   </div>

                   {/* Recent Activity Table */}
                   <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-xl border border-white overflow-hidden flex flex-col">
                      <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                         <h3 className="text-xl font-black flex items-center gap-3 text-slate-800"><Clock className="w-6 h-6 text-blue-500" /> آخر النشاطات</h3>
                         <button onClick={() => setActiveTab('ORDERS')} className="text-xs font-black text-orange-500 hover:underline">عرض الكل</button>
                      </div>
                      <div className="overflow-x-auto flex-1">
                         <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                               <tr>
                                  <th className="px-10 py-5">الزبون</th>
                                  <th className="px-10 py-5">المتجر</th>
                                  <th className="px-10 py-5">المبلغ</th>
                                  <th className="px-10 py-5">الحالة</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {orders.slice(0, 10).map(order => (
                                 <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-10 py-5 font-bold text-slate-700">{order.customerName}</td>
                                    <td className="px-10 py-5 font-bold text-slate-500">{order.storeName}</td>
                                    <td className="px-10 py-5 font-black text-orange-500">{formatCurrency(order.totalPrice)}</td>
                                    <td className="px-10 py-5">
                                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                                         order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
                                       }`}>
                                          {order.status}
                                       </span>
                                    </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* Dynamic Tables for Users */}
           {(activeTab === 'CUSTOMERS' || activeTab === 'STORES' || activeTab === 'DRIVERS') && (
             <div className="bg-white rounded-[3rem] shadow-xl border border-white overflow-hidden animate-fade-in-up">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-800">إدارة {activeTab === 'CUSTOMERS' ? 'الزبائن' : activeTab === 'STORES' ? 'المتاجر' : 'الموصلين'}</h3>
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl">الإجمالي: {
                     activeTab === 'CUSTOMERS' ? customers.length : activeTab === 'STORES' ? stores.length : drivers.length
                   } مستخدم</div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                         <tr>
                            <th className="px-10 py-5">الاسم</th>
                            <th className="px-10 py-5">الاتصال</th>
                            <th className="px-10 py-5">الموقع</th>
                            <th className="px-10 py-5">التقييم</th>
                            <th className="px-10 py-5 text-center">إجراءات</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {(activeTab === 'CUSTOMERS' ? customers : activeTab === 'STORES' ? stores : drivers)
                           .filter(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || item.phone?.includes(searchQuery))
                           .map((item: any) => (
                           <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm shrink-0">
                                       <img src={item.image || item.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-black text-slate-800 text-lg">{item.name}</span>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Phone className="w-3 h-3 text-orange-500" /> {item.phone || 'غير مسجل'}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400"><Mail className="w-3 h-3" /> {item.email}</div>
                                 </div>
                              </td>
                              <td className="px-10 py-6 text-xs font-bold text-slate-500">
                                 <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500" /> {item.coordinates ? 'بئر العاتر (نشط)' : 'بئر العاتر'}</div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-1.5 text-yellow-500 font-black">
                                    <Star className="w-4 h-4 fill-yellow-500" />
                                    {item.rating?.toFixed(1) || '0.0'}
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex items-center justify-center gap-3">
                                    <button onClick={() => deleteItem(activeTab!.toLowerCase(), item.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90">
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {activeTab === 'ORDERS' && (
             <div className="bg-white rounded-[3rem] shadow-xl border border-white overflow-hidden animate-fade-in-up">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-800 text-right">سجل الطلبيات والمبيعات</h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                         <tr>
                            <th className="px-10 py-5">رقم الطلب</th>
                            <th className="px-10 py-5">الزبون</th>
                            <th className="px-10 py-5">المتجر</th>
                            <th className="px-10 py-5">الإجمالي</th>
                            <th className="px-10 py-5">الحالة</th>
                            <th className="px-10 py-5 text-center">حذف</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {orders
                           .filter(o => o.customerName?.includes(searchQuery) || o.storeName?.includes(searchQuery))
                           .map(order => (
                           <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-10 py-6 text-[10px] font-black text-slate-300">#{order.id.slice(-6).toUpperCase()}</td>
                              <td className="px-10 py-6 font-bold text-slate-700">{order.customerName}</td>
                              <td className="px-10 py-6 font-bold text-slate-500">{order.storeName}</td>
                              <td className="px-10 py-6 font-black text-orange-500 text-lg">{formatCurrency(order.totalPrice)}</td>
                              <td className="px-10 py-6">
                                 <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase ${
                                   order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 
                                   order.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                                 }`}>
                                    {order.status}
                                 </span>
                              </td>
                              <td className="px-10 py-6 text-center">
                                 <button onClick={() => deleteItem('orders', order.id)} className="p-2 text-slate-200 hover:text-red-500 transition-all active:scale-90"><Trash2 className="w-5 h-5" /></button>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, count }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center justify-between p-5 rounded-[1.8rem] transition-all duration-500 group ${
      active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-4">
       <span className={`transition-transform duration-500 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{React.cloneElement(icon, { size: 22 })}</span>
       <span className="font-black text-sm">{label}</span>
    </div>
    {count !== undefined && (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${active ? 'bg-white/20 text-white border-white/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
        {count}
      </span>
    )}
  </button>
);

const StatCard = ({ icon, label, value, color }: any) => {
  const colorClasses: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/10",
    orange: "bg-orange-50 text-orange-600 border-orange-100 shadow-orange-500/10",
    green: "bg-green-50 text-green-600 border-green-100 shadow-green-500/10",
    purple: "bg-purple-50 text-purple-600 border-purple-100 shadow-purple-500/10",
  };

  return (
    <div className={`bg-white p-10 rounded-[3rem] shadow-xl border border-white transition-all hover:scale-[1.03] duration-500 group relative overflow-hidden`}>
       <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-lg ${colorClasses[color]} transition-transform duration-700 group-hover:rotate-12`}>
          {React.cloneElement(icon, { size: 32 })}
       </div>
       <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-2 opacity-60">{label}</p>
       <h4 className="text-4xl font-black text-slate-900 tracking-tight">{value}</h4>
       <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-1000"></div>
    </div>
  );
};