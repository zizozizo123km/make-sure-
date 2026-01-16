import React, { useState, useRef, useEffect } from 'react';
import { Category, Product, Order, OrderStatus } from '../types';
import { db, auth } from '../services/firebase';
import { ref, push, set, onValue, update } from 'firebase/database';
import { Package, Plus, Settings, Store as StoreIcon, ChevronRight, Upload, Loader2, ClipboardList, CheckCircle, Clock, TrendingUp, Calendar, Camera, Bell, AlertCircle, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

const uploadImage = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "makemm");
  const cloudName = 'dkqxgwjnr';
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url || null;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

export const StoreScreen: React.FC<{ onLogout: () => void, userName: string }> = ({ onLogout, userName }) => {
  const [view, setView] = useState<'PRODUCTS' | 'ORDERS' | 'SETTINGS'>('PRODUCTS');
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, category: Category.FOOD, image: ''
  });

  const currentStoreId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentStoreId) return;
    const storeRef = ref(db, `stores/${currentStoreId}`);
    return onValue(storeRef, (snapshot) => {
      if (snapshot.exists()) setStoreInfo(snapshot.val());
    });
  }, [currentStoreId]);

  useEffect(() => {
    if (!currentStoreId) return;
    setLoadingOrders(true);
    const ordersRef = ref(db, 'orders');
    return onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      const storeOrders: Order[] = [];
      let hasNewPending = false;
      if (data) {
        Object.keys(data).forEach(key => {
          const order = { ...data[key], id: key };
          if (order.storeId === currentStoreId) {
            storeOrders.push(order);
            if (order.status === OrderStatus.PENDING) hasNewPending = true;
          }
        });
      }
      
      // إظهار تنبيه في حال وجود طلبات جديدة منذ آخر تحديث
      if (hasNewPending && orders.length > 0 && storeOrders.length > orders.length) {
        setShowNewOrderAlert(true);
      }
      
      setOrders(storeOrders.sort((a, b) => b.timestamp - a.timestamp));
      setLoadingOrders(false);
    });
  }, [currentStoreId, orders.length]);

  useEffect(() => {
    if (!currentStoreId) return;
    setLoadingProducts(true);
    const productsRef = ref(db, 'products');
    return onValue(productsRef, (snapshot) => {
      const dbProducts: Product[] = [];
      const data = snapshot.val();
      if (data) {
        Object.keys(data).forEach(key => {
          if (data[key].storeId === currentStoreId) dbProducts.push({ ...data[key], id: key });
        });
      }
      setMyProducts(dbProducts.reverse());
      setLoadingProducts(false);
    });
  }, [currentStoreId]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await update(ref(db, `orders/${orderId}`), { status: OrderStatus.ACCEPTED_BY_STORE });
      setShowNewOrderAlert(false);
    } catch (error: any) {
      alert("فشل قبول الطلب: " + error.message);
    }
  };

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image || !currentStoreId) {
      alert("يرجى إكمال بيانات المنتج");
      return;
    }
    setIsSaving(true);
    try {
      const newProductRef = push(ref(db, 'products'));
      await set(newProductRef, { ...newProduct, id: newProductRef.key, storeId: currentStoreId });
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', price: 0, category: Category.FOOD, image: '' });
    } catch (error: any) {
      alert("خطأ في الحفظ: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);
  const totalSales = orders.filter(o => o.status === OrderStatus.DELIVERED).reduce((acc, curr) => acc + curr.totalPrice, 0);

  const StatCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-5 rounded-4xl border border-primary-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
      <div>
        <p className="text-xs font-bold text-primary-400 mb-1 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-primary-800">{value}</p>
      </div>
      <div className={`p-3.5 rounded-3xl ${color} text-white shadow-lg transition-transform group-hover:scale-110`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-primary-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-900 text-white hidden lg:flex flex-col p-6 m-4 rounded-5xl shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center"><StoreIcon className="w-6 h-6 text-white" /></div>
          <span className="text-xl font-black">كيمو <span className="text-brand-500">بيزنس</span></span>
        </div>
        <nav className="space-y-2">
          {[
            { id: 'PRODUCTS', icon: <Package />, label: 'المنتجات' },
            { id: 'ORDERS', icon: <ClipboardList />, label: 'الطلبات', badge: pendingOrders.length },
            { id: 'SETTINGS', icon: <Settings />, label: 'الإعدادات' }
          ].map((item: any) => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all ${view === item.id ? 'bg-brand-600 text-white shadow-lg' : 'text-primary-300 hover:bg-primary-800'}`}>
              <div className="flex items-center gap-3">{item.icon} <span className="font-bold">{item.label}</span></div>
              {item.badge > 0 && <span className="bg-danger text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-primary-800 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center font-bold uppercase">{storeInfo?.name?.[0] || userName[0]}</div>
            <div><p className="text-xs font-bold truncate w-24">{storeInfo?.name || userName}</p><p className="text-[10px] text-primary-400">مالك المتجر</p></div>
          </div>
          <button onClick={onLogout} className="w-full py-3 bg-danger/10 text-danger rounded-2xl font-bold hover:bg-danger hover:text-white transition-colors">خروج</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        {showNewOrderAlert && (
          <div className="bg-warning text-warning-900 p-4 rounded-3xl mb-6 flex items-center justify-between shadow-xl animate-bounce-small border-2 border-white cursor-pointer" onClick={() => { setView('ORDERS'); setShowNewOrderAlert(false); }}>
            <div className="flex items-center gap-3"><Bell className="animate-pulse" /><p className="font-black">لديك طلبات جديدة بانتظار الموافقة!</p></div>
            <button onClick={() => { setView('ORDERS'); setShowNewOrderAlert(false); }} className="bg-white/30 px-4 py-2 rounded-2xl font-bold text-sm">عرض الطلبات</button>
          </div>
        )}

        {view === 'PRODUCTS' && !isAddingProduct && (
          <div className="space-y-8 animate-fade-in-up">
            <header className="flex justify-between items-center">
              <div><h1 className="text-3xl font-black text-primary-800">لوحة التحكم</h1><p className="text-primary-500">مرحباً بك مجدداً</p></div>
              <button onClick={() => setIsAddingProduct(true)} className="bg-primary-900 text-white px-6 py-3 rounded-3xl font-bold flex items-center gap-2 shadow-lg hover:bg-brand-600 transition-colors"><Plus /> إضافة منتج</button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="طلبات جديدة" value={pendingOrders.length} icon={<AlertCircle />} color="bg-orange-500" />
              <StatCard title="إجمالي المبيعات" value={formatCurrency(totalSales)} icon={<TrendingUp />} color="bg-emerald-600" />
              <StatCard title="المنتجات" value={myProducts.length} icon={<Package />} color="bg-blue-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-4xl border border-primary-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-primary-50 flex justify-between items-center"><h3 className="font-bold text-lg">أحدث الطلبات</h3><button onClick={() => setView('ORDERS')} className="text-brand-600 text-sm font-bold hover:underline">عرض الكل</button></div>
                <div className="p-4 flex-1 space-y-2">
                  {loadingOrders ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-200" /></div> : orders.length === 0 ? <p className="text-center p-10 text-primary-300">لا توجد طلبات بعد</p> : 
                    orders.slice(0, 5).map(o => (
                      <div key={o.id} className="flex justify-between items-center p-4 hover:bg-primary-50 rounded-2xl transition-colors cursor-pointer" onClick={() => setView('ORDERS')}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${o.status === OrderStatus.PENDING ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}><ShoppingBag size={20}/></div>
                          <div><p className="text-sm font-bold">{o.customerName}</p><p className="text-[10px] text-primary-400">#{o.id.slice(-6)}</p></div>
                        </div>
                        <p className="font-black text-brand-600 text-sm">{formatCurrency(o.totalPrice)}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="bg-white rounded-4xl border border-primary-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-primary-50 flex justify-between items-center"><h3 className="font-bold text-lg">قائمة المنتجات</h3><button onClick={() => setIsAddingProduct(true)} className="text-brand-600 text-sm font-bold hover:underline">إضافة</button></div>
                <div className="p-4 space-y-2">
                  {loadingProducts ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-200" /></div> : myProducts.slice(0, 5).map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-primary-50 rounded-2xl">
                      <div className="flex items-center gap-3"><img src={p.image} className="w-10 h-10 rounded-xl object-cover" /><p className="text-sm font-bold truncate w-32">{p.name}</p></div>
                      <p className="font-black text-primary-600 text-sm">{formatCurrency(p.price)}</p>
                    </div>
                  ))}
                  {!loadingProducts && myProducts.length > 5 && <button onClick={() => setView('PRODUCTS')} className="w-full text-center py-2 text-xs font-bold text-primary-400">وعرض {myProducts.length - 5} منتجات أخرى</button>}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'ORDERS' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-black text-primary-800">إدارة الطلبات</h2>
              <div className="flex gap-2">
                 <span className="bg-white px-4 py-2 rounded-2xl text-xs font-bold border border-primary-100 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div> طلبات جديدة: {pendingOrders.length}
                 </span>
              </div>
            </div>
            
            {loadingOrders ? <div className="flex flex-col items-center py-20"><Loader2 className="animate-spin text-brand-500 mb-4" /><p className="text-primary-400 font-bold">جاري تحميل الطلبات...</p></div> : orders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-4xl border-2 border-dashed border-primary-100"><ClipboardList size={64} className="mx-auto text-primary-100 mb-4" /><p className="text-xl font-bold text-primary-400">لا توجد طلبات متاحة حالياً</p></div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-4xl shadow-sm border border-primary-100 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.status === OrderStatus.PENDING ? 'bg-orange-500 text-white' : 'bg-primary-900 text-white'}`}><Calendar size={24}/></div>
                          <div><h4 className="font-black text-lg">{order.customerName}</h4><p className="text-xs text-primary-400">{new Date(order.timestamp).toLocaleString('ar-DZ')}</p></div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${order.status === OrderStatus.PENDING ? 'bg-warning text-warning-900' : order.status === OrderStatus.DELIVERED ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                          {order.status === OrderStatus.PENDING ? 'طلب جديد' : order.status === OrderStatus.DELIVERED ? 'تم التسليم' : 'قيد المعالجة'}
                        </span>
                      </div>
                      <div className="bg-primary-50 p-4 rounded-3xl space-y-2 border border-primary-100">
                        {order.products.map((p, i) => (
                          <div key={i} className="flex justify-between text-sm"><span className="font-bold text-primary-700">{p.quantity}x {p.product.name}</span><span className="text-primary-400">{formatCurrency(p.product.price * p.quantity)}</span></div>
                        ))}
                      </div>
                      {order.address && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-primary-500">
                          <AlertCircle size={14} className="text-brand-500" />
                          <span>العنوان: {order.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="md:w-56 flex flex-col justify-between items-end border-t md:border-t-0 md:border-r md:pr-6 md:mr-0 border-primary-100 pt-4 md:pt-0">
                      <div className="text-left w-full"><p className="text-xs text-primary-400 font-bold mb-1 uppercase tracking-wider">الإجمالي</p><p className="text-3xl font-black text-brand-600 leading-none">{formatCurrency(order.totalPrice)}</p></div>
                      {order.status === OrderStatus.PENDING ? (
                        <button onClick={() => handleAcceptOrder(order.id)} className="w-full mt-4 bg-primary-900 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transform hover:scale-105 transition-all"><CheckCircle size={20}/> قبول الطلب</button>
                      ) : (
                        <div className="w-full mt-4 p-4 bg-primary-50 rounded-2xl text-center text-primary-600 font-bold flex items-center justify-center gap-2 border border-primary-100"><Clock size={16}/> {order.status === OrderStatus.ACCEPTED_BY_STORE ? 'بانتظار سائق' : 'قيد التوصيل'}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAddingProduct && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-4xl shadow-2xl animate-scale-up border border-primary-100">
             <div className="flex items-center gap-4 mb-8"><button onClick={() => setIsAddingProduct(false)} className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center hover:bg-primary-100 transition-colors"><ChevronRight /></button><h2 className="text-2xl font-black">إضافة منتج جديد</h2></div>
             <div className="space-y-6">
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-56 bg-primary-50 border-2 border-dashed border-primary-200 rounded-4xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-brand-500 transition-colors">
                  {isUploading ? <Loader2 className="animate-spin text-brand-500" /> : newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" /> : <div className="text-center"><Upload className="mx-auto mb-2 text-primary-300 group-hover:text-brand-500 transition-colors" size={32} /><p className="text-sm font-bold text-primary-400">انقر لرفع صورة المنتج</p></div>}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) { setIsUploading(true); const url = await uploadImage(f); if (url) setNewProduct({...newProduct, image: url}); setIsUploading(false); }
                  }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-primary-500 mr-1">اسم المنتج</label>
                    <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-4 bg-primary-50 border border-primary-100 rounded-2xl font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="مثلاً: همبرغر دبل كيمو" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-primary-500 mr-1">السعر (د.ج)</label>
                    <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full p-4 bg-primary-50 border border-primary-100 rounded-2xl font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-primary-500 mr-1">الوصف (اختياري)</label>
                  <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-4 bg-primary-50 border border-primary-100 rounded-2xl font-bold h-24 focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="مكونات المنتج وتفاصيل إضافية..."></textarea>
                </div>
                <button onClick={saveProduct} disabled={isSaving || isUploading} className="w-full py-5 bg-primary-900 text-white rounded-3xl font-bold shadow-xl flex items-center justify-center gap-2 hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin" /> : 'نشر المنتج الآن'}</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};