import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { 
  ShieldCheck, Users, Store, Bike, Lock, Unlock, 
  Send, Loader2, ArrowLeft, LogOut, Bell, Settings,
  Activity, Database, CheckCircle2, Trash2,
  LayoutDashboard, ShoppingBag, Search, Filter, 
  MapPin, Phone, Star, MoreVertical, Eye, CreditCard,
  AlertTriangle, ChevronRight, Package, Radio, Clock, UserCheck
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { Order, OrderStatus, UserRole, StoreProfile } from '../types';

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

    // Listen to everything in real-time
    const unsubCustomers = onValue(ref(db, 'customers'), (s) => {
      const data = s.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
      setCustomers(list);
      setStats(prev => ({ ...prev, customers: list.length }));
    });

    const unsubStores = onValue(ref(db, 'stores'), (s) => {
      const data = s.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
      setStores(list);
      setStats(prev => ({ ...prev, stores: list.length }));
    });

    const unsubDrivers = onValue(ref(db, 'drivers'), (s) => {
      const data = s.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
      setDrivers(list);
      setStats(prev => ({ ...prev, drivers: list.length }));
    });

    const unsubOrders = onValue(ref(db, 'orders'), (s) => {
      const data = s.val() || {};
      const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val })) as Order[];
      setOrders(list.sort((a, b) => b.timestamp - a.timestamp));
      setStats(prev => ({ 
        ...prev, 
        orders: list.length,
        revenue: list.reduce((acc, curr) => acc + (curr.status === OrderStatus.DELIVERED ? curr.totalPrice : 0), 0)
      }));
    });

    const unsubConfig = onValue(ref(db, 'app_settings'), (s) => {
      if (s.exists()) setAppConfig(s.val());
    });

    return () => {
      unsubCustomers(); unsubStores(); unsubDrivers(); unsubOrders(); unsubConfig();
    };
  }, [isAuthenticated]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.email === 'downloader@gmail.com' && loginForm.password === 'kimo1212') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
  };

  const handleAction = async (actionId: string, promise: Promise<any>) => {
    setLoadingAction(actionId);
    try {
      await promise;
      setSuccessAction(actionId);
      setTimeout(() => setSuccessAction(null), 2000);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteItem = (path: string, id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذه العملية.')) {
      remove(ref(db, `${path}/${id}`));
    }
  };

  const toggleLock = () => {
    handleAction('LOCK', update(ref(db, 'app_settings'), { 
      isLocked: !appConfig.isLocked,
      lastUpdated: Date.now()
    }));
  };

  const broadcastMessage = (msg: string) => {
    handleAction('MSG', update(ref(db, 'app_settings'), { 
      globalMessage: msg,
      lastUpdated: Date.now()
    }));
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
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Admin Authorization</p>
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
                <p className="text-[9px] text-orange-400 font-black tracking-widest">KIMO ENTERPRISE</p>
              </div>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} label="نظرة عامة" />
          <NavItem active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} label="الزبائن" count={stats.customers} />
          <NavItem active={activeTab === 'STORES'} onClick={() => setActiveTab('STORES')} icon={<Store />} label="المتاجر" count={stats.stores} />
          <NavItem active={activeTab === 'DRIVERS'} onClick={() => setActiveTab('DRIVERS')} icon={<Bike />} label="الموصلين" count={stats.drivers} />
          <NavItem active={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ShoppingBag />} label="الطلبيات" count={stats.orders} />
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
              <h2 className="text-xl font-black text-slate-800">
                {activeTab === 'DASHBOARD' && 'لوحة التحكم المركزية'}
                {activeTab === 'CUSTOMERS' && 'إدارة الزبائن'}
                {activeTab === 'STORES' && 'إدارة المتاجر'}
                {activeTab === 'DRIVERS' && 'إدارة الموصلين'}
                {activeTab === 'ORDERS' && 'سجل الطلبيات الحية'}
                {activeTab === 'SETTINGS' && 'إعدادات التطبيق'}
              </h2>
              <div className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black flex items-center gap-1.5">
                 <Radio className="w-3 h-3 animate-pulse" /> مباشر
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="relative">
                 <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-100 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm font-bold w-64 outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                 <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
              <button onClick={onExit} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"><ArrowLeft className="w-5 h-5" /></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
           {activeTab === 'DASHBOARD' && (
             <div className="animate-fade-in-up space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <DashboardStatCard icon={<Users className="text-blue-500" />} label="إجمالي المستخدمين" value={stats.customers + stats.stores + stats.drivers} subLabel={`${stats.customers} زبون`} color="blue" />
                   <DashboardStatCard icon={<Store className="text-orange-500" />} label="المتاجر النشطة" value={stats.stores} subLabel="في بئر العاتر" color="orange" />
                   <DashboardStatCard icon={<ShoppingBag className="text-green-500" />} label="إجمالي الطلبات" value={stats.orders} subLabel="منذ البداية" color="green" />
                   <DashboardStatCard icon={<CreditCard className="text-purple-500" />} label="إيرادات المتاجر" value={formatCurrency(stats.revenue)} subLabel="تقديري" color="purple" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Quick Actions & Broadcast */}
                   <div className="lg:col-span-1 space-y-8">
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                         <h3 className="text-lg font-black mb-6 flex items-center gap-2"><Bell className="w-5 h-5 text-orange-500" /> رسالة عامة فورية</h3>
                         <textarea 
                           className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold h-32 outline-none focus:border-orange-500 resize-none transition-all mb-4"
                           placeholder="أدخل الرسالة التي ستظهر لجميع المستخدمين..."
                           value={appConfig.globalMessage}
                           onChange={e => setAppConfig(prev => ({ ...prev, globalMessage: e.target.value }))}
                         />
                         <button 
                           onClick={() => broadcastMessage(appConfig.globalMessage)}
                           disabled={loadingAction === 'MSG'}
                           className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 ${successAction === 'MSG' ? 'bg-green-500' : 'bg-slate-900'}`}
                         >
                           {loadingAction === 'MSG' ? <Loader2 className="animate-spin" /> : successAction === 'MSG' ? <CheckCircle2 /> : <><Send className="w-4 h-4" /> نشر الرسالة الآن</>}
                         </button>
                      </div>

                      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                         <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-red-500" /> وضع الصيانة</h3>
                         <p className="text-xs text-slate-400 font-bold mb-6">غلق التطبيق يمنع جميع المستخدمين من الدخول عدا الأدمن.</p>
                         <div className={`p-4 rounded-2xl flex items-center justify-between mb-4 ${appConfig.isLocked ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                            <span className={`font-black text-sm ${appConfig.isLocked ? 'text-red-600' : 'text-green-600'}`}>{appConfig.isLocked ? 'النظام مغلق' : 'النظام يعمل'}</span>
                            <button onClick={toggleLock} className={`p-3 rounded-xl transition-all shadow-lg ${appConfig.isLocked ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                               {appConfig.isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            </button>
                         </div>
                      </div>
                   </div>

                   {/* Recent Activity */}
                   <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                         <h3 className="text-lg font-black flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> أحدث الطلبات</h3>
                         <button onClick={() => setActiveTab('ORDERS')} className="text-sm font-black text-orange-500 hover:underline">عرض الكل</button>
                      </div>
                      <div className="overflow-x-auto flex-1">
                         <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                               <tr>
                                  <th className="px-8 py-4">الزبون</th>
                                  <th className="px-8 py-4">المتجر</th>
                                  <th className="px-8 py-4">المبلغ</th>
                                  <th className="px-8 py-4">الحالة</th>
                                  <th className="px-8 py-4">الوقت</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {orders.slice(0, 8).map(order => (
                                 <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-4 font-bold text-slate-700">{order.customerName}</td>
                                    <td className="px-8 py-4 font-bold text-slate-700">{order.storeName}</td>
                                    <td className="px-8 py-4 font-black text-orange-500">{formatCurrency(order.totalPrice)}</td>
                                    <td className="px-8 py-4">
                                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                                         order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                       }`}>
                                          {order.status}
                                       </span>
                                    </td>
                                    <td className="px-8 py-4 text-[10px] text-slate-400 font-bold">{new Date(order.timestamp).toLocaleTimeString('ar-DZ')}</td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* Tables for each user type */}
           {(activeTab === 'CUSTOMERS' || activeTab === 'STORES' || activeTab === 'DRIVERS') && (
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                   <h3 className="text-lg font-black">قائمة {activeTab === 'CUSTOMERS' ? 'الزبائن' : activeTab === 'STORES' ? 'المتاجر' : 'الموصلين'}</h3>
                   <div className="text-xs font-black text-slate-400">إجمالي: {
                     activeTab === 'CUSTOMERS' ? customers.length : activeTab === 'STORES' ? stores.length : drivers.length
                   } عنصر</div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                         <tr>
                            <th className="px-8 py-4">الاسم</th>
                            <th className="px-8 py-4">الاتصال</th>
                            <th className="px-8 py-4">الموقع</th>
                            {activeTab === 'STORES' && <th className="px-8 py-4">القسم</th>}
                            {activeTab !== 'CUSTOMERS' && <th className="px-8 py-4">التقييم</th>}
                            <th className="px-8 py-4 text-center">إجراءات</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {(activeTab === 'CUSTOMERS' ? customers : activeTab === 'STORES' ? stores : drivers)
                           .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.phone?.includes(searchQuery))
                           .map((item: any) => (
                           <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                                       <img src={item.image || item.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-black text-slate-800">{item.name}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700">{item.phone || 'غير مسجل'}</span>
                                    <span className="text-[10px] text-slate-400">{item.email}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-sm font-bold text-slate-500">
                                 <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-orange-500" /> بئر العاتر</div>
                              </td>
                              {activeTab === 'STORES' && <td className="px-8 py-5 text-xs font-black text-blue-500">{item.category}</td>}
                              {activeTab !== 'CUSTOMERS' && (
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-1 text-yellow-500 font-black">
                                      <Star className="w-4 h-4 fill-yellow-500" />
                                      {item.rating?.toFixed(1) || '0.0'}
                                   </div>
                                </td>
                              )}
                              <td className="px-8 py-5">
                                 <div className="flex items-center justify-center gap-2">
                                    <button className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Eye className="w-4 h-4" /></button>
                                    <button onClick={() => deleteItem(activeTab!.toLowerCase(), item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
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
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                   <h3 className="text-lg font-black">سجل الطلبيات</h3>
                   <div className="flex gap-4">
                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-500"><Filter className="w-4 h-4" /> تصفية</button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-500"><Database className="w-4 h-4" /> تصدير Excel</button>
                   </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                         <tr>
                            <th className="px-8 py-4">رقم الطلب</th>
                            <th className="px-8 py-4">الزبون</th>
                            <th className="px-8 py-4">المتجر</th>
                            <th className="px-8 py-4">المبلغ الإجمالي</th>
                            <th className="px-8 py-4">الحالة</th>
                            <th className="px-8 py-4">توقيت الطلب</th>
                            <th className="px-8 py-4 text-center">إجراءات</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {orders
                           .filter(o => o.customerName.includes(searchQuery) || o.storeName.includes(searchQuery))
                           .map(order => (
                           <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-5 text-xs font-black text-slate-400">#{order.id.slice(-6).toUpperCase()}</td>
                              <td className="px-8 py-5 font-bold text-slate-700">{order.customerName}</td>
                              <td className="px-8 py-5 font-bold text-slate-700">{order.storeName}</td>
                              <td className="px-8 py-5 font-black text-orange-500">{formatCurrency(order.totalPrice)}</td>
                              <td className="px-8 py-5">
                                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                                   order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 
                                   order.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                 }`}>
                                    {order.status}
                                 </span>
                              </td>
                              <td className="px-8 py-5 text-xs text-slate-400 font-bold">{new Date(order.timestamp).toLocaleString('ar-DZ')}</td>
                              <td className="px-8 py-5">
                                 <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => deleteItem('orders', order.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                                 </div>
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
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                   <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3"><Settings className="w-6 h-6 text-orange-500" /> إعدادات المنصة</h3>
                   
                   <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 pr-2 uppercase tracking-widest">رسوم التوصيل الأساسية</label>
                            <div className="relative">
                               <input type="number" defaultValue={200} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-black outline-none focus:ring-2 focus:ring-orange-500" />
                               <span className="absolute left-4 top-4 text-xs font-bold text-slate-400">د.ج</span>
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 pr-2 uppercase tracking-widest">عمولة المنصة (%)</label>
                            <input type="number" defaultValue={10} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-black outline-none focus:ring-2 focus:ring-orange-500" />
                         </div>
                      </div>

                      <div className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100 flex items-start gap-4">
                         <AlertTriangle className="text-orange-500 shrink-0 w-6 h-6" />
                         <div>
                            <h4 className="font-black text-orange-800 text-sm">تنبيه المزامنة</h4>
                            <p className="text-xs text-orange-600 font-bold mt-1 leading-relaxed">أي تغييرات في الإعدادات سيتم تطبيقها فوراً على جميع الأجهزة المتصلة بخدمات كيمو في بئر العاتر.</p>
                         </div>
                      </div>

                      <button className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all">حفظ الإعدادات الفنية</button>
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
      active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
    blue: "bg-blue-50 border-blue-100 text-blue-600 shadow-blue-500/5",
    orange: "bg-orange-50 border-orange-100 text-orange-600 shadow-orange-500/5",
    green: "bg-green-50 border-green-100 text-green-600 shadow-green-500/5",
    purple: "bg-purple-50 border-purple-100 text-purple-600 shadow-purple-500/5",
  };

  return (
    <div className={`bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 transition-all hover:scale-105 duration-300 group`}>
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${colorClasses[color]} group-hover:rotate-6 transition-transform`}>
          {React.cloneElement(icon, { size: 28 })}
       </div>
       <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">{label}</p>
       <h4 className="text-3xl font-black text-slate-900 mb-2">{value}</h4>
       <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <Activity className="w-3 h-3 text-green-500" /> {subLabel}
       </div>
    </div>
  );
};