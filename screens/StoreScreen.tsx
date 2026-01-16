import React, { useState, useRef, useEffect } from 'react';
import { Category, Product, Order, OrderStatus, StoreProfile } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { db, auth } from '../services/firebase';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { 
  Sparkles, Package, Plus, Settings, MapPin, Store as StoreIcon, 
  ChevronRight, Upload, X, Loader2, Trash2, Edit, ArrowLeft, 
  ClipboardList, ShoppingBag, CheckCircle, Clock, LayoutDashboard,
  TrendingUp, Users, DollarSign, Home, LogOut
} from 'lucide-react';
import { BIR_EL_ATER_CENTER, formatCurrency } from '../utils/helpers';

interface StoreScreenProps {
  onLogout: () => void;
  userName: string;
}

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
    console.error("Cloudinary error:", error);
    return null;
  }
};

export const StoreScreen: React.FC<StoreScreenProps> = ({ onLogout, userName }) => {
  const [view, setView] = useState<'DASHBOARD' | 'PRODUCTS' | 'ORDERS' | 'SETTINGS'>('DASHBOARD');
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, category: Category.FOOD, image: ''
  });

  const currentStoreId = auth.currentUser?.uid;

  const stats = {
    totalSales: orders.filter(o => o.status === OrderStatus.DELIVERED).reduce((acc, curr) => acc + curr.totalPrice, 0),
    activeOrders: orders.filter(o => [OrderStatus.PENDING, OrderStatus.ACCEPTED_BY_STORE, OrderStatus.ACCEPTED_BY_DRIVER].includes(o.status)).length,
    productsCount: myProducts.length,
    pendingOrders: orders.filter(o => o.status === OrderStatus.PENDING).length
  };

  useEffect(() => {
    if (!currentStoreId) return;

    const productsRef = ref(db, 'products');
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const list: Product[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          if (data[key].storeId === currentStoreId) {
            list.push({ ...data[key], id: key });
          }
        });
      }
      setMyProducts(list.reverse());
    });

    const ordersRef = ref(db, 'orders');
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      const list: Order[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          if (data[key].storeId === currentStoreId) {
            list.push({ ...data[key], id: key });
          }
        });
      }
      setOrders(list.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [currentStoreId]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await update(ref(db, `orders/${orderId}`), { status: OrderStatus.ACCEPTED_BY_STORE });
    } catch (error) { alert("حدث خطأ في قبول الطلب"); }
  };

  const handleAIHelp = async () => {
    if (!newProduct.name || !newProduct.category) return alert("أدخل الاسم والتصنيف أولاً");
    setIsGenerating(true);
    const desc = await generateProductDescription(newProduct.name, newProduct.category);
    setNewProduct(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const url = await uploadImage(file);
      if (url) setNewProduct(prev => ({ ...prev, image: url }));
      setIsUploading(false);
    }
  };

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image || !currentStoreId) return alert("أكمل البيانات");
    setIsSaving(true);
    try {
      const newRef = push(ref(db, 'products'));
      await set(newRef, { ...newProduct, storeId: currentStoreId, id: newRef.key });
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', price: 0, category: Category.FOOD, image: '' });
    } catch (e) { alert("خطأ في الحفظ"); }
    finally { setIsSaving(false); }
  };

  const NavItem = ({ icon, label, id, badge }: any) => (
    <button 
      onClick={() => { setView(id); setIsAddingProduct(false); }}
      className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all duration-300 ${
        view === id ? 'bg-brand-600 text-white shadow-lg' : 'text-primary-300 hover:bg-primary-800 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon} <span className="font-bold">{label}</span>
      </div>
      {badge && <span className="bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-primary-900"><Loader2 className="w-10 h-10 text-brand-500 animate-spin" /></div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-primary-50">
      
      {/* Logout Confirmation Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-primary-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-4xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-up">
            <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
              <LogOut className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-primary-900 mb-2">تسجيل الخروج؟</h3>
            <p className="text-primary-500 mb-8">هل أنت متأكد أنك تريد الخروج والعودة لصفحة البداية؟</p>
            <div className="flex gap-3">
              <button onClick={onLogout} className="flex-1 bg-danger text-white py-4 rounded-2xl font-bold hover:bg-danger/90 transition-colors">خروج</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-primary-100 text-primary-700 py-4 rounded-2xl font-bold hover:bg-primary-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <aside className="w-72 bg-primary-900 text-white hidden md:flex flex-col p-6 m-4 rounded-5xl shadow-2xl overflow-hidden relative">
        <div className="text-2xl font-black mb-12 flex items-center gap-3 z-10">
           <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center"><StoreIcon className="w-6 h-6" /></div>
           <span>كيمو <span className="text-brand-500">بيزنس</span></span>
        </div>
        <nav className="space-y-3 flex-1 z-10">
          <NavItem id="DASHBOARD" label="لوحة التحكم" icon={<LayoutDashboard className="w-5 h-5" />} />
          <NavItem id="ORDERS" label="الطلبيات" icon={<ClipboardList className="w-5 h-5" />} badge={stats.pendingOrders || undefined} />
          <NavItem id="PRODUCTS" label="المنتجات" icon={<Package className="w-5 h-5" />} />
          <NavItem id="SETTINGS" label="الإعدادات" icon={<Settings className="w-5 h-5" />} />
        </nav>
        <div className="mt-auto border-t border-primary-800 pt-6">
           <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-4 bg-danger/10 text-danger rounded-2xl font-bold hover:bg-danger hover:text-white transition-all flex items-center justify-center gap-2">
             <LogOut className="w-5 h-5" /> تسجيل الخروج
           </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-primary-900 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center"><StoreIcon className="w-5 h-5" /></div>
          <span className="font-black text-lg">كيمو <span className="text-brand-500">بيزنس</span></span>
        </div>
        <button onClick={() => setShowLogoutConfirm(true)} className="bg-white/10 p-2.5 rounded-xl hover:bg-danger transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {view === 'DASHBOARD' && (
          <div className="max-w-5xl mx-auto animate-fade-in-up">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-black text-primary-900 mb-1">أهلاً بك، {userName} 👋</h1>
                <p className="text-primary-500 font-medium">إليك ملخص أداء متجرك اليوم في بئر العاتر</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
              <StatCard title="المبيعات" val={formatCurrency(stats.totalSales)} icon={<DollarSign className="text-emerald-500"/>} bg="bg-emerald-50" />
              <StatCard title="نشطة" val={stats.activeOrders} icon={<TrendingUp className="text-blue-500"/>} bg="bg-blue-50" />
              <StatCard title="المنتجات" val={stats.productsCount} icon={<Package className="text-orange-500"/>} bg="bg-orange-50" />
              <StatCard title="بانتظار" val={stats.pendingOrders} icon={<Clock className="text-warning"/>} bg="bg-amber-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-4xl shadow-sm border border-primary-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-primary-800">أحدث الطلبيات</h2>
                  <button onClick={() => setView('ORDERS')} className="text-brand-600 text-sm font-bold">عرض الكل</button>
                </div>
                {orders.length === 0 ? (
                  <p className="text-center text-primary-400 py-10">لا توجد طلبيات حالياً</p>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 4).map(o => (
                      <div key={o.id} className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl">
                        <div>
                          <p className="font-bold text-primary-800">{o.customerName}</p>
                          <p className="text-xs text-primary-400">{new Date(o.timestamp).toLocaleTimeString('ar-DZ')}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-brand-600">{formatCurrency(o.totalPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-primary-900 to-primary-800 p-8 rounded-4xl text-white flex flex-col justify-center shadow-xl">
                   <h2 className="text-2xl font-black mb-4">أضف منتجاً جديداً</h2>
                   <p className="text-primary-300 mb-8 text-sm">ارفع صورة، ضع السعر، واستخدم الذكاء الاصطناعي لوصف منتجك.</p>
                   <button onClick={() => { setView('PRODUCTS'); setIsAddingProduct(true); }} className="bg-brand-500 text-white py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-brand-600 transition-all">
                      <Plus className="w-6 h-6" /> إضافة منتج
                   </button>
                </div>
                
                {/* خانة الخروج الواضحة في الداشبورد */}
                <div className="bg-white p-6 rounded-4xl border-2 border-dashed border-danger/20 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-danger/5 text-danger rounded-2xl flex items-center justify-center">
                        <LogOut className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-primary-800">تسجيل الخروج</p>
                        <p className="text-xs text-primary-400">للعودة إلى شاشة اختيار الفئات</p>
                      </div>
                   </div>
                   <button onClick={() => setShowLogoutConfirm(true)} className="text-danger font-black text-sm bg-danger/10 px-6 py-2.5 rounded-xl hover:bg-danger hover:text-white transition-all">خروج</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'ORDERS' && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <h2 className="text-2xl font-black text-primary-800 mb-8">إدارة الطلبيات</h2>
            {orders.length === 0 ? (
              <div className="bg-white p-20 rounded-4xl text-center shadow-sm border border-primary-100">
                <ShoppingBag className="w-16 h-16 text-primary-200 mx-auto mb-4" />
                <p className="text-primary-400 font-bold">لم تصلك أي طلبيات بعد</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-4xl shadow-sm border border-primary-100 overflow-hidden relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-black text-primary-800">{order.customerName}</h3>
                        <p className="text-xs text-primary-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(order.timestamp).toLocaleString('ar-DZ')}</p>
                      </div>
                      <div className="text-left">
                         <p className="text-xl font-black text-brand-600">{formatCurrency(order.totalPrice)}</p>
                         <p className="text-[10px] text-primary-400">#{order.id.slice(-6)}</p>
                      </div>
                    </div>
                    <div className="bg-primary-50 p-4 rounded-3xl mb-4">
                       {order.products.map((item, i) => (
                         <div key={i} className="flex justify-between py-1 text-sm">
                           <span className="font-bold text-primary-700">{item.quantity}x {item.product.name}</span>
                           <span className="text-primary-500">{formatCurrency(item.product.price * item.quantity)}</span>
                         </div>
                       ))}
                    </div>
                    <div className="flex gap-3">
                      {order.status === OrderStatus.PENDING ? (
                        <button onClick={() => handleAcceptOrder(order.id)} className="flex-1 bg-primary-900 text-white py-3.5 rounded-2xl font-bold hover:bg-success transition-colors flex items-center justify-center gap-2">
                           <CheckCircle className="w-5 h-5" /> قبول وتجهيز الطلب
                        </button>
                      ) : (
                        <div className="w-full bg-primary-50 text-primary-500 py-3 rounded-2xl text-center font-bold text-sm">
                           الحالة الحالية: {order.status}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'PRODUCTS' && (
          <div className="max-w-4xl mx-auto">
             {!isAddingProduct ? (
               <div className="animate-fade-in-up">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-2xl font-black text-primary-800">منتجاتي ({myProducts.length})</h2>
                     <button onClick={() => setIsAddingProduct(true)} className="bg-primary-900 text-white px-6 py-3 rounded-3xl font-bold flex items-center gap-2 shadow-lg"><Plus className="w-5 h-5"/> إضافة</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {myProducts.map(p => (
                       <div key={p.id} className="bg-white p-4 rounded-4xl shadow-sm border border-primary-100 flex gap-4">
                          <img src={p.image} className="w-24 h-24 rounded-3xl object-cover shrink-0" />
                          <div className="flex-1 flex flex-col justify-between">
                             <h4 className="font-bold text-primary-800">{p.name}</h4>
                             <p className="text-xl font-black text-brand-600">{formatCurrency(p.price)}</p>
                             <div className="flex justify-end gap-2">
                               <button className="p-2 text-primary-400 hover:text-brand-500 transition-colors"><Edit className="w-4 h-4"/></button>
                               <button onClick={() => remove(ref(db, `products/${p.id}`))} className="p-2 text-primary-400 hover:text-danger transition-colors"><Trash2 className="w-4 h-4"/></button>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
             ) : (
               <div className="bg-white p-8 rounded-4xl shadow-xl border border-primary-100 animate-scale-up">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setIsAddingProduct(false)} className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600"><ArrowLeft className="w-5 h-5"/></button>
                      <h2 className="text-2xl font-black text-primary-800">إضافة منتج</h2>
                    </div>
                    <button onClick={() => { setView('DASHBOARD'); setIsAddingProduct(false); }} className="flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2.5 rounded-2xl font-bold text-sm">
                      <Home className="w-4 h-4" />
                      <span>الرئيسية</span>
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-primary-200 rounded-4xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition-all overflow-hidden relative">
                       {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" /> : (
                         <div className="text-center">
                           {isUploading ? <Loader2 className="animate-spin text-brand-500" /> : <><Upload className="w-8 h-8 text-primary-300 mx-auto mb-2" /><p className="text-primary-500 font-bold">ارفع صورة</p></>}
                         </div>
                       )}
                       <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    </div>
                    <input type="text" placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-4 bg-primary-50 border-2 border-transparent rounded-3xl font-bold focus:bg-white focus:border-brand-500 outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="number" placeholder="السعر" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full p-4 bg-primary-50 border-2 border-transparent rounded-3xl font-bold focus:bg-white focus:border-brand-500 outline-none" />
                       <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as Category})} className="w-full p-4 bg-primary-50 border-2 border-transparent rounded-3xl font-bold focus:bg-white focus:border-brand-500 outline-none">
                         {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="relative">
                       <textarea rows={3} placeholder="وصف المنتج..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-4 bg-primary-50 border-2 border-transparent rounded-3xl font-bold focus:bg-white focus:border-brand-500 outline-none" />
                       <button onClick={handleAIHelp} disabled={isGenerating} className="absolute bottom-4 left-4 bg-primary-900 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                         <Sparkles className="w-3 h-3"/> {isGenerating ? 'توليد...' : 'ذكاء اصطناعي'}
                       </button>
                    </div>
                    <button onClick={saveProduct} disabled={isSaving || isUploading} className="w-full bg-brand-600 text-white py-4 rounded-3xl font-black text-lg shadow-xl hover:bg-brand-700 disabled:opacity-50">
                       {isSaving ? 'جاري الحفظ...' : 'حفظ المنتج'}
                    </button>
                  </div>
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ title, val, icon, bg }: any) => (
  <div className={`${bg} p-4 md:p-6 rounded-3xl md:rounded-4xl border border-white/50 shadow-sm`}>
    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 shadow-sm">{icon}</div>
    <p className="text-[10px] md:text-xs text-primary-500 font-bold mb-1">{title}</p>
    <p className="text-lg md:text-2xl font-black text-primary-900 truncate">{val}</p>
  </div>
);
