import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { 
  ShieldCheck, Users, Store, Bike, Lock, Unlock, 
  Send, Loader2, ArrowLeft, LogOut, Bell, Settings,
  Activity, Database, CheckCircle2, Trash2,
  LayoutDashboard, ShoppingBag, Search, Filter, 
  MapPin, Phone, Star, Eye, CreditCard,
  AlertTriangle, Radio, Clock
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { Order, OrderStatus, UserRole } from '../types';

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
  
  // Loading & Success states
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // جلب البيانات من قاعدة البيانات فورياً
    const unsubCustomers = onValue(ref(db, 'customers'), (s) => {
      const data = s.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
      setCustomers(list);
    });

    const unsubStores = onValue(ref(db, 'stores'), (s) => {
      const data = s.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
      setStores(list);
    });

    const unsubDrivers = onValue(ref(db, 'drivers'), (s) => {
      const data = s.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
      setDrivers(list);
    });

    const unsubOrders = onValue(ref(db, 'orders'), (s) => {
      const data = s.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val })) as Order[];
      setOrders(list.sort((a, b) => b.timestamp - a.timestamp));
    });

    const unsubConfig = onValue(ref(db, 'app_settings'), (s) => {
      if (s.exists()) setAppConfig(s.val());
    });

    return () => {
      unsubCustomers(); unsubStores(); unsubDrivers(); unsubOrders(); unsubConfig();
    };
  }, [isAuthenticated]);

  // تحديث الإحصائيات عند تغير القوائم
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
    // بيانات دخول الأدمن ثابتة للتجربة
    if (loginForm.email === 'downloader@gmail.com' && loginForm.password === 'kimo1212') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
  };

  const deleteItem = (path: string, id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذه العملية.')) {
      remove(ref(db, `${path}/${id}`));
    }
  };

  const toggleLock = async () => {
    setLoadingAction('LOCK');
    try {
      await update(ref(db, 'app_settings'), { 
        isLocked: !appConfig.isLocked,
        lastUpdated: Date.now()
      });
      setSuccessAction('LOCK');
      setTimeout(() => setSuccessAction(null), 2000);
    } catch (err) {
      alert('خطأ في الاتصال');
    } finally {
      setLoadingAction(null);
    }
  };

  const broadcastMessage = async (msg: string) => {
    setLoadingAction('MSG');
    try {
      await update(ref(db, 'app_settings'), { 
        globalMessage: msg,
        lastUpdated: Date.now()
      });
      setSuccessAction('MSG');
      setTimeout(() => setSuccessAction(null), 2000);
    } catch (err) {
      alert('فشل إرسال الإشعار');
    } finally {
      setLoadingAction(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-cairo" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl animate-scale-up">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-orange-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/20">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">لوحة تحكم كيمو</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">الإدارة المركزية</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs font-bold text-center border border-red-500/20">{error}</div>}
            <input type="email" placeholder="البريد الإلكتروني" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <input type="password" placeholder="كلمة المرور" className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all">دخول آمن</button>
            <button type="button" onClick={onExit} className="w-full text-slate-500 text-sm font-bold flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" /> العودة للتطبيق</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-cairo flex" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col sticky top-0 h-screen shadow-2xl shrink-0 z-50">
        <div className="p-8 border-b border-slate-800">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg"><Activity className="w-6 h-6" /></div>
              <div>
                <h1 className="font-black text-xl">لوحة الإدارة</h1>
                <p className="text-[9px] text-orange-400 font-black tracking-widest">KIMO SYSTEM</p>
              </div>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} label="نظرة عامة" />
          <NavItem active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} label="إدارة الزبائن" count={stats.customers} />
          <NavItem active={activeTab === 'STORES'} onClick={() => setActiveTab('STORES')} icon={<Store />} label="إدارة المتاجر" count={stats.stores} />
          <NavItem active={activeTab === 'DRIVERS'} onClick={() => setActiveTab('DRIVERS')} icon={<Bike />} label="إدارة الموصلين" count={stats.drivers} />
          <NavItem active={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ShoppingBag />} label="سجل الطلبيات" count={stats.orders} />
          <NavItem active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings />} label="إعدادات النظام" />
        </nav>

        <div className="p-6 border-t border-slate-800">
           <button onClick={() => setIsAuthenticated(false)} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all">
             <LogOut className="w-4 h-4" /> تسجيل الخروج
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col max-h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
           <div className="flex items-center gap-4">
              <h2 className="text-xl font-black text-slate-800 uppercase">
                {activeTab === 'DASHBOARD' && 'مركز التحكم'}
                {activeTab === 'CUSTOMERS' && 'قاعدة بيانات الزبائن'}
                {activeTab === 'STORES' && 'دليل المتاجر'}
                {activeTab === 'DRIVERS' && 'شبكة الموصلين'}
                {activeTab === 'ORDERS' && 'مراقبة الطلبيات الحية'}
                {activeTab === 'SETTINGS' && 'الضبط الفني'}
              </h2>
              <div className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black flex items-center gap-1.5 animate-pulse">
                 <Radio className="w-3 h-3" /> مزامنة حية
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="relative">
                 <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-100 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm font-bold w-64 outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                 <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
              <button onClick={onExit} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
           {activeTab === 'DASHBOARD' && (
             <div className="animate-fade-in-up space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <DashboardStatCard icon={<Users className="text-blue-500" />} label="إجمالي المسجلين" value={stats.customers + stats.stores + stats.drivers} subLabel={`${stats.customers} زبون نشط`} color="blue" />
                   <DashboardStatCard icon={<Store className="text-orange-500" />} label="المتاجر الموثقة" value={stats.stores} subLabel="في بئر العاتر" color="orange" />
                   <DashboardStatCard icon={<ShoppingBag className="text-green-500" />} label="إجمالي الطلبيات" value={stats.orders} subLabel="مكتملة ومعلقة" color="green" />
                   <DashboardStatCard icon={<CreditCard className="text-purple-500" />} label="حجم التداول" value={formatCurrency(stats.revenue)} subLabel="تقديري للمبيعات" color="purple" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Broadcast Notification Panel */}
                   <div className="lg:col-span-1 space-y-8">
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
                         <h3 className="text-lg font-black mb-6 flex items-center gap-2"><Bell className="w-5 h-5 text-orange-500" /> بث إشعار للجميع</h3>
                         <textarea 
                           className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold h-32 outline-none focus:border-orange-500 resize-none transition-all mb-4 shadow-inner"
                           placeholder="اكتب رسالة تظهر لكل مستخدم يفتح التطبيق الآن..."
                           value={appConfig.globalMessage}
                           onChange={e => setAppConfig(prev => ({ ...prev, globalMessage: e.target.value }))}
                         />
                         <button 
                           onClick={() => broadcastMessage(appConfig.globalMessage)}
                           disabled={loadingAction === 'MSG'}
                           className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 ${successAction === 'MSG' ? 'bg-green-500 scale-95' : 'bg-slate-900 active:scale-95'}`}
                         >
                           {loadingAction === 'MSG' ? <Loader2 className="animate-spin" /> : successAction === 'MSG' ? <CheckCircle2 className="animate-bounce" /> : <><Send className="w-4 h-4" /> نشر الإشعار فوراً</>}
                         </button>
                      </div>

                      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
                         <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-red-500" /> وضع الصيانة</h3>
                         <p className="text-[10px] text-slate-400 font-bold mb-6">عند التفعيل، سيتم إغلاق التطبيق في وجه جميع الزبائن والسائقين لأعمال التحديث.</p>
                         <div className={`p-5 rounded-2xl flex items-center justify-between transition-colors ${appConfig.isLocked ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                            <span className={`font-black text-xs ${appConfig.isLocked ? 'text-red-600' : 'text-green-600'}`}>{appConfig.isLocked ? 'النظام مغلق الآن' : 'النظام يعمل بشكل طبيعي'}</span>
                            <button onClick={toggleLock} disabled={loadingAction === 'LOCK'} className={`p-4 rounded-xl transition-all shadow-lg active:scale-90 ${appConfig.isLocked ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                               {loadingAction === 'LOCK' ? <Loader2 className="animate-spin w-5 h-5" /> : appConfig.isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            </button>
                         </div>
                      </div>
                   </div>

                   {/* Quick Orders List */}
                   <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-xl border border-white overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                         <h3 className="text-lg font-black flex items-center gap-2 text-slate-800"><Clock className="w-5 h-5 text-blue-500" /> أحدث النشاطات</h3>
                         <button onClick={() => setActiveTab('ORDERS')} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline">عرض جميع الطلبيات</button>
                      </div>
                      <div className="overflow-x-auto flex-1">
                         <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                               <tr>
                                  <th className="px-8 py-4">الزبون</th>
                                  <th className="px-8 py-4">المتجر</th>
                                  <th className="px-8 py-4">المبلغ</th>
                                  <th className="px-8 py-4">الحالة</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {orders.slice(0, 10).map(order => (
                                 <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-4 font-bold text-slate-700">{order.customerName}</td>
                                    <td className="px-8 py-4 font-bold text-slate-500">{order.storeName}</td>
                                    <td className="px-8 py-4 font-black text-orange-500">{formatCurrency(order.totalPrice)}</td>
                                    <td className="px-8 py-4">
                                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
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

           {/* User Lists (Customers, Stores, Drivers) */}
           {(activeTab === 'CUSTOMERS' || activeTab === 'STORES' || activeTab === 'DRIVERS') && (
             <div className="bg-white rounded-[2.5rem] shadow-xl border border-white overflow-hidden animate-fade-in-up">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                   <h3 className="text-lg font-black text-slate-800">إدارة {activeTab === 'CUSTOMERS' ? 'الزبائن' : activeTab === 'STORES' ? 'المتاجر' : 'الموصلين'}</h3>
                   <div className="text-[10px] font-black text-slate-400 uppercase">العدد الإجمالي: {
                     activeTab === 'CUSTOMERS' ? customers.length : activeTab === 'STORES' ? stores.length : drivers.length
                   } عنصر</div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                         <tr>
                            <th className="px-8 py-4">الاسم</th>
                            <th className="px-8 py-4">الاتصال</th>
                            <th className="px-8 py-4">الموقع</th>
                            {activeTab !== 'CUSTOMERS' && <th className="px-8 py-4">التقييم</th>}
                            <th className="px-8 py-4 text-center">الإجراءات</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {(activeTab === 'CUSTOMERS' ? customers : activeTab === 'STORES' ? stores : drivers)
                           .filter(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || item.phone?.includes(searchQuery))
                           .map((item: any) => (
                           <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                                       <img src={item.image || item.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <span className="font-black text-slate-800">{item.name}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700">{item.phone || 'غير متاح'}</span>
                                    <span className="text-[10px] text-slate-400">{item.email}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-xs font-bold text-slate-500">
                                 <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-orange-500" /> بئر العاتر</div>
                              </td>
                              {activeTab !== 'CUSTOMERS' && (
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-1 text-yellow-500 font-black">
                                      <Star className="w-3.5 h-3.5 fill-yellow-500" />
                                      {item.rating?.toFixed(1) || 'جديد'}
                                   </div>
                                </td>
                              )}
                              <td className="px-8 py-5">
                                 <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => deleteItem(activeTab!.toLowerCase(), item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"><Trash2 className="w-4 h-4" /></button>
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
             <div className="bg-white rounded-[2.5rem] shadow-xl border border-white overflow-hidden animate-fade-in-up">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                   <h3 className="text-lg font-black text-slate-800">سجل الطلبيات بالكامل</h3>
                   <div className="flex gap-4">
                      <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"><Filter className="w-4 h-4" /> تصفية</button>
                      <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"><Database className="w-4 h-4" /> تصدير بيانات</button>
                   </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                         <tr>
                            <th className="px-8 py-4">رقم الطلب</th>
                            <th className="px-8 py-4">الزبون</th>
                            <th className="px-8 py-4">المتجر</th>
                            <th className="px-8 py-4">المبلغ</th>
                            <th className="px-8 py-4">الحالة</th>
                            <th className="px-8 py-4 text-center">حذف</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {orders
                           .filter(o => o.customerName?.includes(searchQuery) || o.storeName?.includes(searchQuery))
                           .map(order => (
                           <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-5 text-[10px] font-black text-slate-300">#{order.id.slice(-6).toUpperCase()}</td>
                              <td className="px-8 py-5 font-bold text-slate-700">{order.customerName}</td>
                              <td className="px-8 py-5 font-bold text-slate-500">{order.storeName}</td>
                              <td className="px-8 py-5 font-black text-orange-500">{formatCurrency(order.totalPrice)}</td>
                              <td className="px-8 py-5">
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                   order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 
                                   order.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                                 }`}>
                                    {order.status}
                                 </span>
                              </td>
                              <td className="px-8 py-5 text-center">
                                 <button onClick={() => deleteItem('orders', order.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {activeTab === 'SETTINGS' && (
             <div className="max-w-2xl animate-fade-in-up space-y-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-white">
                   <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3"><Settings className="w-6 h-6 text-orange-500" /> ضبط معايير النظام</h3>
                   
                   <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 pr-2 uppercase tracking-widest">رسوم التوصيل الأساسية (د.ج)</label>
                            <input type="number" defaultValue={200} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-black outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 pr-2 uppercase tracking-widest">عمولة كيمو من المتاجر (%)</label>
                            <input type="number" defaultValue={10} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-black outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner" />
                         </div>
                      </div>

                      <div className="p-6 bg-orange-50 rounded-[2.5rem] border border-orange-100 flex items-start gap-4">
                         <AlertTriangle className="text-orange-500 shrink-0 w-6 h-6" />
                         <div>
                            <h4 className="font-black text-orange-800 text-sm">تنبيه المزامنة الفورية</h4>
                            <p className="text-xs text-orange-600 font-bold mt-1 leading-relaxed">أي تغيير في هذه الإعدادات سيتم تطبيقه فوراً على تطبيقات جميع الزبائن والمتاجر في بئر العاتر دون الحاجة لتحديث التطبيق.</p>
                         </div>
                      </div>

                      <button className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all">حفظ التكوين الفني</button>
                   </div>
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
    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${
      active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-4">
       <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{React.cloneElement(icon, { size: 20 })}</span>
       <span className="font-black text-sm">{label}</span>
    </div>
    {count !== undefined && (
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
        {count}
      </span>
    )}
  </button>
);

const DashboardStatCard = ({ icon, label, value, subLabel, color }: any) => {
  const colorClasses: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/10",
    orange: "bg-orange-50 text-orange-600 border-orange-100 shadow-orange-500/10",
    green: "bg-green-50 text-green-600 border-green-100 shadow-green-500/10",
    purple: "bg-purple-50 text-purple-600 border-purple-100 shadow-purple-500/10",
  };

  return (
    <div className={`bg-white p-8 rounded-[3rem] shadow-xl border border-white transition-all hover:scale-[1.02] duration-300 group relative overflow-hidden`}>
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${colorClasses[color]} transition-transform duration-500 group-hover:rotate-12`}>
          {React.cloneElement(icon, { size: 28 })}
       </div>
       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
       <h4 className="text-3xl font-black text-slate-900 mb-2">{value}</h4>
       <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <Activity className="w-3 h-3 text-green-500" /> {subLabel}
       </div>
       <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
    </div>
  );
};