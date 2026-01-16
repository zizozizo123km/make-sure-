
import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { 
  ShieldCheck, Users, Store, Bike, Lock, Unlock, 
  Send, Loader2, ArrowLeft, LogOut, Bell, Settings,
  Activity, Database, CheckCircle2, XCircle, Trash2,
  LayoutDashboard, ShoppingBag, Search, Filter, 
  MapPin, Phone, Star, MoreVertical, Eye, CreditCard,
  AlertTriangle, ChevronRight, Package, ToggleRight,
  RefreshCw, Radio, Clock
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { Order, OrderStatus, Product, Category, UserRole, StoreProfile } from '../types';

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
  const [allStores, setAllStores] = useState<StoreProfile[]>([]);
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
        const list = Object.keys(data).map(k => ({ ...data[k], id: k })) as StoreProfile[];
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
    if (!window.confirm('هل أنت متأكد من حذف هذا العنصر؟ سيتم مسح كافة البيانات المرتبطة به.')) return;
    setActionLoading(id);
    try {
      await remove(ref(db, `${path}/${id}`));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleVerifyStore = async (storeId: string, currentStatus: boolean) => {
    await update(ref(db, `stores/${storeId}`), { isVerified: !currentStatus });
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
            <h1 className="text-3xl font-black text-white mb-2">كيمو الإدارة</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">نظام التحكم المركزي V3.0</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-xs font-bold text-center border border-red-500/20">{error}</div>}
            <input type="email" placeholder="البريد الإلكتروني" className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all text-right" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <input type="password" placeholder="كلمة المرور" className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all text-right" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:shadow-orange-500/40 active:scale-95 transition-all mt-4">دخول المسؤول</button>
            <button type="button" onClick={onExit} className="w-full text-slate-500 text-sm font-bold pt-4 hover:text-slate-300 transition-colors text-center">العودة للتطبيق كزبون</button>
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
      {activeTab === tab && <ChevronRight className="w-4 h-4 mr-auto rotate-180" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] font-cairo flex text-right" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-2 fixed h-full z-20 overflow-y-auto">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg"><Activity className="text-white w-6 h-6" /></div>
          <div>
            <h2 className="text-white font-black">كيمو آدمن</h2>
            <p className="text-[10px] text-orange-400 font-bold tracking-tighter uppercase">التحكم في العاتر</p>
          </div>
        </div>

        <SidebarItem tab="DASHBOARD" icon={<LayoutDashboard className="w-5 h-5" />} label="لوحة القيادة" />
        <SidebarItem tab="ORDERS" icon={<ShoppingBag className="w-5 h-5" />} label="الطلبات الحية" />
        <SidebarItem tab="STORES" icon={<Store className="w-5 h-5" />} label="إدارة المتاجر" />
        <SidebarItem tab="DRIVERS" icon={<Bike className="w-5 h-5" />} label="إدارة الموصلين" />
        <SidebarItem tab="CUSTOMERS" icon={<Users className="w-5 h-5" />} label="قائمة الزبائن" />
        <SidebarItem tab="PRODUCTS" icon={<Package className="w-5 h-5" />} label="المنتجات" />
        <SidebarItem tab="SETTINGS" icon={<Settings className="w-5 h-5" />} label="الإعدادات" />

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
              {activeTab === 'DASHBOARD' && 'مرحباً، المسؤول الأعلى'}
              {activeTab === 'CUSTOMERS' && 'إدارة الزبائن'}
              {activeTab === 'STORES' && 'إدارة المتاجر الموثقة'}
              {activeTab === 'DRIVERS' && 'إدارة أسطول الموصلين'}
              {activeTab === 'ORDERS' && 'مركز العمليات والطلبات'}
              {activeTab === 'PRODUCTS' && 'قاعدة بيانات المنتجات'}
              {activeTab === 'SETTINGS' && 'إعدادات النظام العالمي'}
            </h1>
            <p className="text-slate-400 font-bold mt-1 text-sm">أنت تتحكم في كل شيء داخل بئر العاتر الآن</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="ابحث عن اسم، هاتف، أو رقم طلب..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-2xl py-3 pr-12 pl-6 text-white text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all w-80 text-right"
              />
              <Search className="absolute right-4 top-3.5 text-slate-500 w-5 h-5" />
            </div>
            {appConfig.isLocked && (
              <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-xl border border-red-500/20 font-black text-xs animate-pulse">
                <Lock className="w-4 h-4" /> الوضع مغلق
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-4">
            <Loader2 className="animate-spin w-12 h-12 text-orange-500" />
            <p className="font-bold">جاري مزامنة البيانات الحية...</p>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {activeTab === 'DASHBOARD' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard icon={<Users className="text-blue-500" />} label="إجمالي الزبائن" value={stats.customers} color="bg-blue-500/10" border="border-blue-500/20" />
                  <StatCard icon={<Store className="text-orange-500" />} label="المتاجر النشطة" value={stats.stores} color="bg-orange-500/10" border="border-orange-500/20" />
                  <StatCard icon={<Bike className="text-green-500" />} label="الموصلين" value={stats.drivers} color="bg-green-500/10" border="border-green-500/20" />
                  <StatCard icon={<CreditCard className="text-purple-500" />} label="دخل العاتر" value={formatCurrency(stats.totalRevenue)} color="bg-purple-500/10" border="border-purple-500/20" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-white">آخر الحركات</h3>
                      <button onClick={() => setActiveTab('ORDERS')} className="text-orange-500 font-bold text-sm">عرض كل العمليات</button>
                    </div>
                    <div className="space-y-4">
                      {allOrders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl hover:bg-slate-800 transition-all group border border-slate-700/50">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white ${order.status === OrderStatus.DELIVERED ? 'bg-green-500' : 'bg-slate-700'}`}>
                              {order.customerName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-white">{order.customerName}</p>
                              <p className="text-[10px] text-slate-500 font-bold">{order.storeName} • {new Date(order.timestamp).toLocaleTimeString('ar-DZ')}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="font-black text-orange-500">{formatCurrency(order.totalPrice)}</p>
                            <span className="text-[8px] font-black uppercase bg-slate-900 px-2 py-1 rounded-md text-slate-400">{order.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
                    <h3 className="text-xl font-black text-white mb-2">إعلان البث السريع</h3>
                    <textarea 
                      value={appConfig.globalMessage}
                      onChange={(e) => setAppConfig(p => ({ ...p, globalMessage: e.target.value }))}
                      placeholder="اكتب هنا رسالة تظهر لكل المستخدمين..."
                      className="w-full bg-slate-800 border-none rounded-2xl p-4 text-white font-bold outline-none text-sm h-32 resize-none"
                    />
                    <button 
                      onClick={() => updateAppSetting('globalMessage', appConfig.globalMessage)}
                      className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all"
                    >
                      <Send className="w-5 h-5" /> نشر الإعلان فوراً
                    </button>
                    <div className="pt-6 border-t border-slate-800">
                       <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">سيظهر هذا الإعلان في شريط متحرك أعلى شاشة الزبائن فور الضغط على نشر.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'CUSTOMERS' || activeTab === 'STORES' || activeTab === 'DRIVERS') && (
              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
                <table className="w-full text-right">
                  <thead className="bg-slate-800/80 text-slate-400">
                    <tr>
                      <th className="px-8 py-5 text-sm font-black">العنصر</th>
                      <th className="px-8 py-5 text-sm font-black">التواصل</th>
                      <th className="px-8 py-5 text-sm font-black">{activeTab === 'STORES' ? 'الحالة' : 'تاريخ الانضمام'}</th>
                      <th className="px-8 py-5 text-sm font-black text-left">الإدارة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(activeTab === 'CUSTOMERS' ? allUsers : activeTab === 'STORES' ? allStores : allDrivers)
                      .filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone?.includes(searchQuery))
                      .map(user => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-all group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 relative">
                              <img src={user.image || user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} className="w-full h-full object-cover" />
                              {activeTab === 'STORES' && user.isVerified && (
                                <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-slate-900 shadow-lg">
                                  <ShieldCheck className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-black text-white flex items-center gap-2">
                                {user.name}
                                {activeTab === 'STORES' && user.isVerified && <span className="text-[8px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">موثق</span>}
                              </p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{user.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-300 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-500" /> {user.phone || 'بدون رقم'}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          {activeTab === 'STORES' ? (
                            <button 
                              onClick={() => toggleVerifyStore(user.id, !!user.isVerified)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all ${user.isVerified ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                            >
                              {user.isVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              {user.isVerified ? 'موثق رسمياً' : 'توثيق الآن'}
                            </button>
                          ) : (
                            <span className="text-xs font-black text-slate-500">{new Date(user.createdAt || Date.now()).toLocaleDateString('ar-DZ')}</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-left">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button 
                               onClick={() => deleteEntity(activeTab === 'CUSTOMERS' ? 'customers' : activeTab === 'STORES' ? 'stores' : 'drivers', user.id)}
                               className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
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
              <div className="space-y-4">
                {allOrders.filter(o => o.customerName.includes(searchQuery) || o.storeName.includes(searchQuery)).map(order => (
                  <div key={order.id} className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-8 hover:border-orange-500/30 transition-all shadow-xl relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-2 h-full ${order.status === OrderStatus.DELIVERED ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    
                    <div className="flex items-center gap-8 w-full lg:w-auto">
                       <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-2xl ${order.status === OrderStatus.DELIVERED ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                         {order.status === OrderStatus.DELIVERED ? '✓' : '!'}
                       </div>
                       <div>
                          <div className="flex items-center gap-3 mb-2">
                             <h4 className="text-2xl font-black text-white">{order.customerName}</h4>
                             <ArrowLeft className="w-5 h-5 text-slate-700 rotate-180" />
                             <h4 className="text-2xl font-black text-orange-500">{order.storeName}</h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-6">
                             <p className="text-xs text-slate-400 font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-slate-600" /> {new Date(order.timestamp).toLocaleString('ar-DZ')}</p>
                             <p className="text-xs text-slate-400 font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-600" /> {order.address}</p>
                             <p className="text-xs text-slate-400 font-bold flex items-center gap-2"><Phone className="w-4 h-4 text-slate-600" /> {order.customerPhone || 'بدون هاتف'}</p>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-8 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-slate-800 pt-6 lg:pt-0">
                       <div className="text-right">
                          <p className="text-3xl font-black text-orange-500">{formatCurrency(order.totalPrice)}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">السعر الإجمالي للدفع</p>
                       </div>
                       
                       <div className="flex items-center gap-3">
                          <div className="relative">
                            <select 
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                              className="bg-slate-800 border border-slate-700 text-white text-xs font-black rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer hover:bg-slate-700 transition-all min-w-[150px]"
                            >
                              <option value={OrderStatus.PENDING}>قيد الانتظار</option>
                              <option value={OrderStatus.ACCEPTED_BY_STORE}>قيد التحضير</option>
                              <option value={OrderStatus.ACCEPTED_BY_DRIVER}>في الطريق</option>
                              <option value={OrderStatus.DELIVERED}>تم التوصيل</option>
                              <option value={OrderStatus.CANCELLED}>طلب ملغي</option>
                            </select>
                            <MoreVertical className="absolute left-4 top-4 text-slate-500 w-4 h-4 pointer-events-none" />
                          </div>
                          <button 
                            onClick={() => deleteEntity('orders', order.id)}
                            className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
                          >
                             <Trash2 className="w-6 h-6" />
                          </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'PRODUCTS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {allProducts.filter(p => p.name.includes(searchQuery)).map(p => (
                   <div key={p.id} className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden group shadow-xl">
                      <div className="h-56 relative overflow-hidden">
                         <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                         <div className="absolute bottom-6 right-6 text-white text-right">
                            <p className="text-[10px] font-black uppercase opacity-60 mb-1">{p.category}</p>
                            <h4 className="text-xl font-black">{p.name}</h4>
                         </div>
                      </div>
                      <div className="p-6 flex justify-between items-center bg-slate-900">
                         <div className="text-right">
                            <p className="text-2xl font-black text-orange-500">{formatCurrency(p.price)}</p>
                            <p className="text-[8px] text-slate-500 font-bold">المعرف: {p.id.slice(0,8)}</p>
                         </div>
                         <button 
                           onClick={() => deleteEntity('products', p.id)}
                           className="p-4 bg-red-500/10 text-red-500 rounded-[1.5rem] hover:bg-red-500 hover:text-white transition-all shadow-lg"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
            )}

            {activeTab === 'SETTINGS' && (
              <div className="max-w-3xl space-y-10">
                 <div className="bg-slate-900 p-10 rounded-[4rem] border border-slate-800 space-y-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 blur-[100px]"></div>
                    
                    <div className="flex items-center justify-between p-6 bg-slate-800/50 rounded-[2.5rem] border border-slate-700/50">
                       <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${appConfig.isLocked ? 'bg-red-500 shadow-red-500/20' : 'bg-green-500 shadow-green-500/20'} shadow-lg`}>
                             {appConfig.isLocked ? <Lock className="text-white w-7 h-7" /> : <Unlock className="text-white w-7 h-7" />}
                          </div>
                          <div>
                             <h4 className="text-2xl font-black text-white">وضع الصيانة العالمي</h4>
                             <p className="text-slate-500 text-sm font-bold">إغلاق التطبيق فوراً عن جميع الزبائن والمتاجر والموصلين.</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => updateAppSetting('isLocked', !appConfig.isLocked)}
                         className={`w-20 h-10 rounded-full transition-all relative border-2 ${appConfig.isLocked ? 'bg-red-500/20 border-red-500' : 'bg-slate-700 border-slate-600'}`}
                       >
                         <div className={`absolute top-1.5 w-6 h-6 rounded-full bg-white shadow-xl transition-all ${appConfig.isLocked ? 'left-2' : 'left-11'}`}></div>
                       </button>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-3 mb-2 px-2">
                          <Bell className="text-orange-500 w-5 h-5" />
                          <h4 className="text-xl font-black text-white">إعلان البث المباشر</h4>
                       </div>
                       <div className="flex gap-4">
                          <input 
                            type="text" 
                            placeholder="مثلاً: كيمو يرحب بأهل بئر العاتر! اطلب الآن واستفد من عروضنا." 
                            value={appConfig.globalMessage}
                            onChange={(e) => setAppConfig(p => ({ ...p, globalMessage: e.target.value }))}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-3xl p-5 text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all text-right"
                          />
                          <button 
                            onClick={() => updateAppSetting('globalMessage', appConfig.globalMessage)}
                            className="bg-orange-500 text-white px-10 rounded-3xl font-black shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            تحديث البث
                          </button>
                       </div>
                       <p className="text-[10px] text-slate-500 font-bold px-2 italic">ملاحظة: تظهر هذه الرسالة لجميع المستخدمين في الشريط العلوي فور التحديث.</p>
                    </div>

                    <div className="pt-10 border-t border-slate-800 space-y-6">
                       <div className="flex items-center gap-3 mb-4 px-2">
                          <CreditCard className="text-orange-500 w-5 h-5" />
                          <h4 className="text-xl font-black text-white">إعدادات التسعير المركزي</h4>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-2">سعر التوصيل الأساسي (د.ج)</p>
                             <div className="relative">
                               <input 
                                 type="number" 
                                 value={appConfig.deliveryBaseFee || 150}
                                 onChange={(e) => updateAppSetting('deliveryBaseFee', Number(e.target.value))}
                                 className="w-full bg-slate-800 border border-slate-700 rounded-3xl p-5 text-white font-black outline-none focus:ring-2 focus:ring-orange-500 transition-all text-right" 
                               />
                               <div className="absolute left-6 top-5 text-slate-500 font-black">د.ج</div>
                             </div>
                          </div>
                          <div className="flex items-end pb-2">
                             <div className="bg-slate-800/50 p-5 rounded-3xl border border-dashed border-slate-700 flex-1">
                                <p className="text-[9px] text-slate-500 font-bold leading-relaxed">يتم احتساب هذا السعر تلقائياً عند إنشاء أي طلب جديد، ويمكن للمسؤول تعديله لكل طلب على حدة من لوحة العمليات.</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-red-500/5 border border-red-500/10 p-10 rounded-[3.5rem] flex items-start gap-8 shadow-inner">
                    <div className="bg-red-500 p-5 rounded-3xl shadow-2xl shadow-red-500/20 shrink-0">
                       <AlertTriangle className="text-white w-10 h-10" />
                    </div>
                    <div>
                       <h4 className="text-2xl font-black text-red-500 mb-3">منطقة المسؤولية القصوى</h4>
                       <p className="text-slate-400 text-sm font-bold leading-relaxed mb-8 max-w-xl text-right">انتبه! عمليات الحذف والتعديل في هذه اللوحة هي عمليات نهائية يتم تنفيذها فوراً على قاعدة بيانات Firebase. لا يمكن استعادة البيانات المحذوفة أبداً. يرجى التأكد من هوية المستخدم أو المتجر قبل الحذف.</p>
                       <div className="flex gap-4">
                          <button onClick={() => window.print()} className="bg-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black text-xs hover:bg-slate-700 transition-all flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" /> تصدير تقرير النظام (PDF)
                          </button>
                       </div>
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
  <div className={`p-8 rounded-[3rem] border ${border} ${color} transition-all hover:scale-105 duration-300 shadow-lg relative overflow-hidden group`}>
    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
    <div className="mb-6 bg-slate-900/50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border border-white/5">{icon}</div>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className="text-3xl font-black text-white">{value}</p>
  </div>
);
