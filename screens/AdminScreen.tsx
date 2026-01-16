import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { 
  ShieldCheck, Users, Store, Bike, Lock, Unlock, 
  Send, Loader2, ArrowLeft, LogOut, Bell, Settings,
  Activity, Database, CheckCircle2, XCircle, Trash2,
  LayoutDashboard, ShoppingBag, Search, Filter, 
  MapPin, Phone, Star, MoreVertical, Eye, CreditCard,
  AlertTriangle, ChevronRight, Package, Tooltip
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { Order, OrderStatus, Product, Category, UserRole } from '../types';

interface AdminScreenProps {
  onExit: () => void;
}

type AdminTab = 'DASHBOARD' | 'CUSTOMERS' | 'STORES' | 'DRIVERS' | 'ORDERS' | 'PRODUCTS' | 'SETTINGS';

export const AdminScreen: React.FC<AdminScreenProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  
  // Data State
  const [stats, setStats] = useState({ customers: 0, stores: 0, drivers: 0, orders: 0, totalRevenue: 0 });
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [appConfig, setAppConfig] = useState({ isLocked: false, globalMessage: '', deliveryBaseFee: 150 });
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    const refs = [
      onValue(ref(db, 'customers'), (s) => {
        const data = s.val() || {};
        setAllUsers(Object.keys(data).map(k => ({ ...data[k], id: k })));
        setStats(p => ({ ...p, customers: Object.keys(data).length }));
      }),
      onValue(ref(db, 'stores'), (s) => {
        const data = s.val() || {};
        const list = Object.keys(data).map(k => ({ ...data[k], id: k }));
        setAllStores(list);
        setStats(p => ({ ...p, stores: list.length }));
      }),
      onValue(ref(db, 'drivers'), (s) => {
        const data = s.val() || {};
        const list = Object.keys(data).map(k => ({ ...data[k], id: k }));
        setAllDrivers(list);
        setStats(p => ({ ...p, drivers: list.length }));
      }),
      onValue(ref(db, 'orders'), (s) => {
        const data = s.val() || {};
        const ordersList = Object.keys(data).map(k => ({ ...data[k], id: k })) as Order[];
        setAllOrders(ordersList.sort((a, b) => b.timestamp - a.timestamp));
        setStats(p => ({ 
          ...p, 
          orders: ordersList.length,
          totalRevenue: ordersList.filter(o => o.status === OrderStatus.DELIVERED).reduce((acc, curr) => acc + (curr.totalPrice || 0), 0)
        }));
      }),
      onValue(ref(db, 'products'), (s) => {
        const data = s.val() || {};
        setAllProducts(Object.keys(data).map(k => ({ ...data[k], id: k })));
      }),
      onValue(ref(db, 'app_settings'), (s) => {
        if (s.exists()) setAppConfig(s.val());
      })
    ];

    setLoading(false);
    return () => refs.forEach(unsub => unsub());
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

  const deleteEntity = async (path: string, id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    setActionLoading(id);
    try {
      await remove(ref(db, `${path}/${id}`));
    } finally {
      setActionLoading(null);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    await update(ref(db, `orders/${orderId}`), { status: newStatus });
  };

  const updateAppSetting = async (key: string, value: any) => {
    await update(ref(db, 'app_settings'), { [key]: value, lastUpdated: Date.now() });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 font-cairo" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-2xl animate-scale-up">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-orange-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/20 rotate-3">
              <ShieldCheck className="text-white w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">كيمو آدمن</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">إدارة النظام المركزي</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-xs font-bold text-center border border-red-500/20">{error}</div>}
            <input type="email" placeholder="المسؤول" className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <input type="password" placeholder="كلمة المرور" className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:shadow-orange-500/40 active:scale-95 transition-all mt-4">دخول النظام</button>
            <button type="button" onClick={onExit} className="w-full text-slate-500 text-sm font-bold pt-4 hover:text-slate-300 transition-colors">العودة للتطبيق</button>
          </form>
        </div>
      </div>
    );
  }

  const SidebarItem = ({ tab, icon, label }: { tab: AdminTab, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${activeTab === tab ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
      {icon}
      <span className="font-bold text-sm">{label}</span>
      {activeTab === tab && <ChevronRight className="w-4 h-4 mr-auto" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] font-cairo flex text-right" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-2 fixed h-full z-20 overflow-y-auto">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg"><Activity className="text-white w-6 h-6" /></div>
          <div>
            <h2 className="text-white font-black">كيمو الإدارة</h2>
            <p className="text-[10px] text-orange-400 font-bold tracking-tighter uppercase">V 2.5 Live Control</p>
          </div>
        </div>

        <SidebarItem tab="DASHBOARD" icon={<LayoutDashboard className="w-5 h-5" />} label="لوحة القيادة" />
        <SidebarItem tab="CUSTOMERS" icon={<Users className="w-5 h-5" />} label="إدارة الزبائن" />
        <SidebarItem tab="STORES" icon={<Store className="w-5 h-5" />} label="إدارة المتاجر" />
        <SidebarItem tab="DRIVERS" icon={<Bike className="w-5 h-5" />} label="إدارة الموصلين" />
        <SidebarItem tab="ORDERS" icon={<ShoppingBag className="w-5 h-5" />} label="مركز الطلبات" />
        <SidebarItem tab="PRODUCTS" icon={<Package className="w-5 h-5" />} label="المنتجات المرفوعة" />
        <SidebarItem tab="SETTINGS" icon={<Settings className="w-5 h-5" />} label="الإعدادات العامة" />

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button onClick={() => setIsAuthenticated(false)} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm">
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 mr-72 p-10 min-h-screen">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-white">
              {activeTab === 'DASHBOARD' && 'مرحباً، المسؤول'}
              {activeTab === 'CUSTOMERS' && 'قائمة الزبائن'}
              {activeTab === 'STORES' && 'إدارة المتاجر'}
              {activeTab === 'DRIVERS' && 'إدارة الموصلين'}
              {activeTab === 'ORDERS' && 'مراقبة الطلبات الحية'}
              {activeTab === 'PRODUCTS' && 'المنتجات المسجلة'}
              {activeTab === 'SETTINGS' && 'إعدادات النظام'}
            </h1>
            <p className="text-slate-400 font-bold mt-1 text-sm">هنا يمكنك مراقبة كل ما يحدث في بئر العاتر</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="بحث..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-2xl py-3 pr-12 pl-6 text-white text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all w-64"
              />
              <Search className="absolute right-4 top-3.5 text-slate-500 w-5 h-5" />
            </div>
            <button className="bg-slate-900 border border-slate-800 text-white p-3 rounded-2xl hover:bg-slate-800 transition-all relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-slate-900"></span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-4">
            <Loader2 className="animate-spin w-12 h-12 text-orange-500" />
            <p className="font-bold">جاري تحميل البيانات الحية...</p>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {activeTab === 'DASHBOARD' && (
              <div className="space-y-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard icon={<Users className="text-blue-500" />} label="إجمالي الزبائن" value={stats.customers} color="bg-blue-500/10" border="border-blue-500/20" />
                  <StatCard icon={<Store className="text-orange-500" />} label="المتاجر النشطة" value={stats.stores} color="bg-orange-500/10" border="border-orange-500/20" />
                  <StatCard icon={<Bike className="text-green-500" />} label="الموصلين" value={stats.drivers} color="bg-green-500/10" border="border-green-500/20" />
                  <StatCard icon={<CreditCard className="text-purple-500" />} label="إجمالي المبيعات" value={formatCurrency(stats.totalRevenue)} color="bg-purple-500/10" border="border-purple-500/20" />
                </div>

                {/* Dashboard Widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-white">أحدث الطلبات</h3>
                      <button onClick={() => setActiveTab('ORDERS')} className="text-orange-500 font-bold text-sm">عرض الكل</button>
                    </div>
                    <div className="space-y-4">
                      {allOrders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl hover:bg-slate-800 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center font-black text-white">
                              {order.customerName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-white">{order.customerName}</p>
                              <p className="text-[10px] text-slate-500 font-bold">{order.storeName} • {new Date(order.timestamp).toLocaleTimeString('ar-DZ')}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="font-black text-orange-500">{formatCurrency(order.totalPrice)}</p>
                            <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">{order.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex flex-col">
                    <h3 className="text-xl font-black text-white mb-8">حالة الخادم</h3>
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between">
                         <span className="text-slate-400 font-bold text-sm">Firebase RTDB</span>
                         <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black">متصل</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-slate-400 font-bold text-sm">تحديث تلقائي</span>
                         <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black">نشط</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-slate-400 font-bold text-sm">سرعة الاستجابة</span>
                         <span className="text-white font-black">32ms</span>
                      </div>
                      
                      <div className="mt-auto pt-6">
                         <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20">
                            <p className="text-orange-500 font-black text-xs mb-1">تنبيه النظام</p>
                            <p className="text-slate-400 text-[10px] font-bold">كل الحركات مسجلة وتخضع للرقابة الأبوية للإدارة العليا.</p>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'CUSTOMERS' || activeTab === 'STORES' || activeTab === 'DRIVERS') && (
              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-slate-800/50 text-slate-400">
                    <tr>
                      <th className="px-8 py-5 text-sm font-black">المستخدم</th>
                      <th className="px-8 py-5 text-sm font-black">بيانات التواصل</th>
                      <th className="px-8 py-5 text-sm font-black">{activeTab === 'STORES' ? 'الفئة' : 'تاريخ التسجيل'}</th>
                      <th className="px-8 py-5 text-sm font-black text-left">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(activeTab === 'CUSTOMERS' ? allUsers : activeTab === 'STORES' ? allStores : allDrivers)
                      .filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone?.includes(searchQuery))
                      .map(user => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-all group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden border border-slate-700">
                              <img src={user.image || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-black text-white">{user.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold">ID: {user.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-300 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-500" /> {user.phone || 'بدون هاتف'}</p>
                            <p className="text-xs text-slate-500 font-bold">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-black text-slate-400">{activeTab === 'STORES' ? (user.category || 'غير مصنف') : new Date(user.createdAt || Date.now()).toLocaleDateString('ar-DZ')}</span>
                        </td>
                        <td className="px-8 py-5 text-left">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:text-white"><Eye className="w-5 h-5" /></button>
                             <button 
                               onClick={() => deleteEntity(activeTab === 'CUSTOMERS' ? 'customers' : activeTab === 'STORES' ? 'stores' : 'drivers', user.id)}
                               className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                             >
                               {actionLoading === user.id ? <Loader2 className="animate-spin w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'ORDERS' && (
              <div className="space-y-6">
                {allOrders.filter(o => o.customerName.includes(searchQuery) || o.storeName.includes(searchQuery)).map(order => (
                  <div key={order.id} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-orange-500/30 transition-all">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl ${order.status === OrderStatus.DELIVERED ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                         {order.status === OrderStatus.DELIVERED ? '✓' : '!'}
                       </div>
                       <div>
                          <h4 className="text-xl font-black text-white">{order.customerName} <span className="text-slate-600 mx-2">←</span> {order.storeName}</h4>
                          <div className="flex items-center gap-4 mt-1">
                             <p className="text-[11px] text-slate-500 font-bold">التوقيت: {new Date(order.timestamp).toLocaleString('ar-DZ')}</p>
                             <p className="text-[11px] text-slate-500 font-bold">العنوان: {order.address}</p>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                       <div className="text-left">
                          <p className="text-2xl font-black text-orange-500">{formatCurrency(order.totalPrice)}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase">السعر الإجمالي</p>
                       </div>
                       
                       <div className="flex items-center gap-2">
                          <select 
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                            className="bg-slate-800 border border-slate-700 text-white text-xs font-black rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value={OrderStatus.PENDING}>قيد الانتظار</option>
                            <option value={OrderStatus.ACCEPTED_BY_STORE}>تحضير</option>
                            <option value={OrderStatus.ACCEPTED_BY_DRIVER}>توصيل</option>
                            <option value={OrderStatus.DELIVERED}>تم التوصيل</option>
                            <option value={OrderStatus.CANCELLED}>ملغي</option>
                          </select>
                          <button 
                            onClick={() => deleteEntity('orders', order.id)}
                            className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                          >
                             <Trash2 className="w-5 h-5" />
                          </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'PRODUCTS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {allProducts.filter(p => p.name.includes(searchQuery)).map(p => (
                   <div key={p.id} className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden group">
                      <div className="h-48 relative overflow-hidden">
                         <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                         <div className="absolute bottom-4 right-4 text-white">
                            <p className="text-xs font-black uppercase opacity-60">{p.category}</p>
                            <h4 className="text-lg font-black">{p.name}</h4>
                         </div>
                      </div>
                      <div className="p-6 flex justify-between items-center">
                         <span className="text-xl font-black text-orange-500">{formatCurrency(p.price)}</span>
                         <button 
                           onClick={() => deleteEntity('products', p.id)}
                           className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
            )}

            {activeTab === 'SETTINGS' && (
              <div className="max-w-2xl space-y-8">
                 <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-8">
                    <div className="flex items-center justify-between">
                       <div>
                          <h4 className="text-xl font-black text-white">وضع الصيانة</h4>
                          <p className="text-slate-400 text-sm font-bold">غلق التطبيق بالكامل عن الزبائن (باستثناء الإدارة)</p>
                       </div>
                       <button 
                         onClick={() => updateAppSetting('isLocked', !appConfig.isLocked)}
                         className={`w-16 h-8 rounded-full transition-all relative ${appConfig.isLocked ? 'bg-red-500' : 'bg-slate-700'}`}
                       >
                         <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${appConfig.isLocked ? 'left-1' : 'left-9'}`}></div>
                       </button>
                    </div>

                    <div className="space-y-3">
                       <label className="text-sm font-black text-slate-400">رسالة بث جماعية (تظهر في الأعلى)</label>
                       <div className="flex gap-3">
                          <input 
                            type="text" 
                            placeholder="مثلاً: كيمو يرحب بكم في بئر العاتر!" 
                            value={appConfig.globalMessage}
                            onChange={(e) => setAppConfig(p => ({ ...p, globalMessage: e.target.value }))}
                            className="flex-1 bg-slate-800 border-none rounded-2xl p-4 text-white font-bold outline-none"
                          />
                          <button 
                            onClick={() => updateAppSetting('globalMessage', appConfig.globalMessage)}
                            className="bg-orange-500 text-white px-8 rounded-2xl font-black shadow-lg"
                          >
                            نشر
                          </button>
                       </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-800">
                       <div className="flex items-center gap-3 mb-2">
                          <CreditCard className="text-orange-500 w-5 h-5" />
                          <h4 className="text-lg font-black text-white">إعدادات التسعير</h4>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <p className="text-[10px] text-slate-500 font-black uppercase">سعر التوصيل الأساسي (د.ج)</p>
                             <input 
                               type="number" 
                               value={appConfig.deliveryBaseFee || 150}
                               onChange={(e) => updateAppSetting('deliveryBaseFee', Number(e.target.value))}
                               className="w-full bg-slate-800 border-none rounded-2xl p-4 text-white font-black outline-none" 
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-orange-500/10 border border-orange-500/20 p-8 rounded-[3rem] flex items-start gap-6">
                    <div className="bg-orange-500 p-4 rounded-2xl shadow-xl shadow-orange-500/20 shrink-0">
                       <AlertTriangle className="text-white w-8 h-8" />
                    </div>
                    <div>
                       <h4 className="text-xl font-black text-orange-500 mb-2">منطقة الخطر</h4>
                       <p className="text-slate-400 text-sm font-bold leading-relaxed mb-6">احذر عند حذف المستخدمين أو المتاجر. يتم مسح كافة البيانات المرتبطة بهم نهائياً من قاعدة بيانات Firebase ولا يمكن استعادتها.</p>
                       <button className="text-red-500 font-black text-sm border-b-2 border-red-500/20 hover:border-red-500 transition-all">تحميل نسخة احتياطية (JSON)</button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, border }: any) => (
  <div className={`p-8 rounded-[2.5rem] border ${border} ${color} transition-all hover:scale-105 duration-300`}>
    <div className="mb-4 bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">{icon}</div>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-white">{value}</p>
  </div>
);