import React, { useState, useRef, useEffect } from 'react';
import { Category, Product, Order, OrderStatus, StoreProfile } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { db, auth } from '../services/firebase';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { Sparkles, Package, Plus, Settings, MapPin, Store as StoreIcon, ChevronRight, Upload, X, Loader2, Trash2, Edit, ArrowLeft, ClipboardList, ShoppingBag, CheckCircle, Clock, TrendingUp, Calendar, Camera } from 'lucide-react';
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
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

export const StoreScreen: React.FC<StoreScreenProps> = ({ onLogout, userName }) => {
  const [view, setView] = useState<'PRODUCTS' | 'ORDERS' | 'SETTINGS'>('PRODUCTS');
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Store Settings State
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storeImageRef = useRef<HTMLInputElement>(null);
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, category: Category.FOOD, image: ''
  });

  const currentStoreId = auth.currentUser?.uid;

  // Listen to current Store Profile for Settings
  useEffect(() => {
    if (!currentStoreId) return;
    const storeRef = ref(db, `stores/${currentStoreId}`);
    const unsubscribe = onValue(storeRef, (snapshot) => {
      if (snapshot.exists()) {
        setStoreInfo(snapshot.val());
      }
    });
    return () => unsubscribe();
  }, [currentStoreId]);

  // Real-time listener for Orders
  useEffect(() => {
    if (!currentStoreId) return;
    setLoadingOrders(true);
    const ordersRef = ref(db, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      const storeOrders: Order[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          const order = { ...data[key], id: key };
          if (order.storeId === currentStoreId) {
            storeOrders.push(order);
          }
        });
      }
      setOrders(storeOrders.sort((a, b) => b.timestamp - a.timestamp));
      setLoadingOrders(false);
    });
    return () => unsubscribe();
  }, [currentStoreId]);

  // Real-time listener for Products
  useEffect(() => {
    if (!currentStoreId) return;
    setLoadingProducts(true);
    const productsRef = ref(db, 'products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const dbProducts: Product[] = [];
      const data = snapshot.val();
      if (data) {
        Object.keys(data).forEach(key => {
          if (data[key].storeId === currentStoreId) {
            dbProducts.push({ ...data[key], id: key });
          }
        });
      }
      setMyProducts(dbProducts.reverse());
      setLoadingProducts(false);
    });
    return () => unsubscribe();
  }, [currentStoreId]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await update(ref(db, `orders/${orderId}`), { status: OrderStatus.ACCEPTED_BY_STORE });
      alert("تم قبول الطلب! جاري انتظار السائق.");
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
    const productData: Product = {
      id: '', name: newProduct.name, description: newProduct.description || '',
      price: newProduct.price, category: newProduct.category || Category.FOOD,
      image: newProduct.image, storeId: currentStoreId
    };
    try {
      const newProductRef = push(ref(db, 'products'));
      productData.id = newProductRef.key || '';
      await set(newProductRef, productData);
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', price: 0, category: Category.FOOD, image: '' });
    } catch (error: any) {
      alert("خطأ في الحفظ: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStoreImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStoreId) return;

    setIsUpdatingStore(true);
    const url = await uploadImage(file);
    if (url) {
      try {
        await update(ref(db, `stores/${currentStoreId}`), { image: url });
        alert("تم تحديث صورة المتجر بنجاح!");
      } catch (error: any) {
        alert("فشل تحديث الصورة في قاعدة البيانات: " + error.message);
      }
    } else {
      alert("فشل رفع الصورة.");
    }
    setIsUpdatingStore(false);
  };

  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);
  const activeOrders = orders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED);
  const totalSales = orders.filter(o => o.status === OrderStatus.DELIVERED).reduce((acc, curr) => acc + curr.totalPrice, 0);

  const StatCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-4xl border border-primary-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
      <div>
        <p className="text-xs font-bold text-primary-400 mb-1 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-primary-800">{value}</p>
      </div>
      <div className={`p-4 rounded-3xl ${color} text-white shadow-lg transition-transform group-hover:scale-110`}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-primary-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-primary-900 text-white hidden md:flex flex-col p-6 m-4 rounded-5xl shadow-2xl relative overflow-hidden">
        <div className="z-10">
          <div className="text-2xl font-black mb-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center"><StoreIcon className="w-6 h-6 text-white" /></div>
            <span>كيمو <span className="text-brand-500">بيزنس</span></span>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setView('PRODUCTS')} className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all ${view === 'PRODUCTS' ? 'bg-brand-600 text-white shadow-lg' : 'text-primary-300 hover:bg-primary-800'}`}>
              <div className="flex items-center gap-3"><Package className="w-5 h-5" /> <span className="font-bold">المنتجات</span></div>
            </button>
            <button onClick={() => setView('ORDERS')} className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all ${view === 'ORDERS' ? 'bg-brand-600 text-white shadow-lg' : 'text-primary-300 hover:bg-primary-800'}`}>
              <div className="flex items-center gap-3"><ClipboardList className="w-5 h-5" /> <span className="font-bold">الطلبات</span></div>
              {pendingOrders.length > 0 && <span className="bg-danger text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingOrders.length}</span>}
            </button>
            <button onClick={() => setView('SETTINGS')} className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all ${view === 'SETTINGS' ? 'bg-brand-600 text-white shadow-lg' : 'text-primary-300 hover:bg-primary-800'}`}>
              <div className="flex items-center gap-3"><Settings className="w-5 h-5" /> <span className="font-bold">الإعدادات</span></div>
            </button>
          </nav>
        </div>
        <div className="mt-auto border-t border-primary-800 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center font-bold text-lg">{storeInfo?.name?.[0] || userName[0]}</div>
            <div><p className="text-sm font-bold">{storeInfo?.name || userName}</p><p className="text-[10px] text-primary-400">مالك المتجر</p></div>
          </div>
          <button onClick={onLogout} className="w-full py-3 bg-danger/10 text-danger rounded-2xl font-bold hover:bg-danger hover:text-white transition-colors">خروج</button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        {view === 'PRODUCTS' && !isAddingProduct && (
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
            <header className="flex justify-between items-center">
              <div><h1 className="text-3xl font-black text-primary-800">لوحة التحكم</h1><p className="text-primary-500">مرحباً بك مجدداً في متجرك</p></div>
              <button onClick={() => setIsAddingProduct(true)} className="bg-primary-900 text-white px-6 py-3 rounded-3xl font-bold flex items-center gap-2 hover:bg-brand-600 transition-all shadow-lg"><Plus className="w-5 h-5" /> إضافة منتج</button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="طلبات نشطة" value={activeOrders.length} icon={<Clock className="w-6 h-6"/>} color="bg-blue-500" />
              <StatCard title="إجمالي المبيعات" value={formatCurrency(totalSales)} icon={<TrendingUp className="w-6 h-6"/>} color="bg-emerald-500" />
              <StatCard title="عدد المنتجات" value={myProducts.length} icon={<Package className="w-6 h-6"/>} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Orders Section */}
              <div className="bg-white rounded-4xl border border-primary-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-primary-50 flex justify-between items-center bg-primary-50/30">
                  <h3 className="font-bold text-lg text-primary-800">الطلبات الأخيرة</h3>
                  <button onClick={() => setView('ORDERS')} className="text-brand-600 text-sm font-bold flex items-center gap-1">عرض الكل <ChevronRight className="w-4 h-4 rotate-180"/></button>
                </div>
                <div className="p-4 flex-1">
                  {loadingOrders ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-300"/></div> : 
                    orders.length === 0 ? <div className="p-10 text-center text-primary-400 text-sm">لا توجد طلبات بعد</div> :
                    orders.slice(0, 4).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 hover:bg-primary-50 rounded-3xl transition-colors mb-2 last:mb-0 group cursor-pointer" onClick={() => setView('ORDERS')}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.status === OrderStatus.PENDING ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-primary-800 text-sm">{order.customerName}</p>
                            <p className="text-[10px] text-primary-400">{new Date(order.timestamp).toLocaleTimeString('ar-DZ')}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-brand-600 text-sm">{formatCurrency(order.totalPrice)}</p>
                          <p className={`text-[10px] font-bold ${order.status === OrderStatus.PENDING ? 'text-warning' : 'text-success'}`}>{order.status === OrderStatus.PENDING ? 'انتظار' : 'مقبول'}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Products Quick View */}
              <div className="bg-white rounded-4xl border border-primary-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-primary-50 flex justify-between items-center bg-primary-50/30">
                  <h3 className="font-bold text-lg text-primary-800">قائمة المنتجات</h3>
                  <button onClick={() => setIsAddingProduct(true)} className="text-brand-600 text-sm font-bold">+ أضف منتج</button>
                </div>
                <div className="p-4 flex-1">
                  {loadingProducts ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-300"/></div> : 
                    myProducts.length === 0 ? <div className="p-10 text-center text-primary-400 text-sm">لا توجد منتجات</div> :
                    myProducts.slice(0, 4).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 hover:bg-primary-50 rounded-2xl transition-colors mb-2 last:mb-0">
                         <div className="flex items-center gap-3">
                           <img src={p.image} className="w-10 h-10 rounded-xl object-cover" />
                           <p className="font-bold text-primary-800 text-sm">{p.name}</p>
                         </div>
                         <p className="font-black text-primary-600 text-sm">{formatCurrency(p.price)}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'ORDERS' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
              <div><h2 className="text-3xl font-black text-primary-800">إدارة الطلبات</h2><p className="text-primary-500">تابع طلبات الزبائن وحالتها</p></div>
            </div>

            {loadingOrders ? <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div> :
              orders.length === 0 ? (
                <div className="bg-white rounded-4xl p-20 text-center border-2 border-dashed border-primary-200">
                  <ShoppingBag className="w-16 h-16 text-primary-200 mx-auto mb-4" />
                  <p className="text-xl font-bold text-primary-400">لا يوجد أي طلبات حالياً</p>
                </div>
              ) : (
                <div className="space-y-6 pb-20">
                  {orders.map(order => (
                    <div key={order.id} className="bg-white rounded-4xl shadow-sm border border-primary-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
                      <div className={`p-4 flex justify-between items-center ${order.status === OrderStatus.PENDING ? 'bg-warning/5' : 'bg-primary-50/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${order.status === OrderStatus.PENDING ? 'bg-warning text-warning-900' : 'bg-primary-700 text-white'}`}>
                             <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-primary-800">{order.customerName}</p>
                            <p className="text-xs text-primary-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.address}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-primary-400">رقم الطلب: #{order.id.slice(-6)}</p>
                          <p className="text-[10px] text-primary-300">{new Date(order.timestamp).toLocaleString('ar-DZ')}</p>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="space-y-3 mb-6">
                          {order.products.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-primary-50/50 p-3 rounded-2xl">
                               <div className="flex items-center gap-3">
                                 <span className="bg-primary-200 text-primary-700 w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold">{item.quantity}</span>
                                 <span className="font-bold text-primary-800">{item.product.name}</span>
                               </div>
                               <span className="text-sm font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center border-t border-primary-50 pt-6">
                          <div>
                            <p className="text-xs text-primary-400 font-bold mb-1">المجموع الكلي</p>
                            <p className="text-2xl font-black text-brand-600">{formatCurrency(order.totalPrice)}</p>
                          </div>
                          
                          <div className="flex gap-3">
                            {order.status === OrderStatus.PENDING ? (
                              <button onClick={() => handleAcceptOrder(order.id)} className="bg-primary-900 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-brand-600 transition-all flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" /> قبول وتجهيز
                              </button>
                            ) : (
                              <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                                order.status === OrderStatus.DELIVERED ? 'bg-success/10 text-success' : 
                                order.status === OrderStatus.ACCEPTED_BY_DRIVER ? 'bg-blue-500 text-white' : 'bg-primary-100 text-primary-600'
                              }`}>
                                <Clock className="w-4 h-4" /> {
                                  order.status === OrderStatus.ACCEPTED_BY_STORE ? 'بانتظار سائق' :
                                  order.status === OrderStatus.ACCEPTED_BY_DRIVER ? 'قيد التوصيل' : 'تم التوصيل'
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {isAddingProduct && (
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-4xl shadow-xl animate-scale-up border border-primary-100">
             <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setIsAddingProduct(false)} className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center hover:bg-primary-100"><ArrowLeft className="w-5 h-5" /></button>
               <h2 className="text-2xl font-black text-primary-800">إضافة منتج جديد</h2>
             </div>
             <div className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-primary-500 mb-2">الصورة</label>
                   <div onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-primary-100 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition-all overflow-hidden relative group">
                      {isUploading ? <Loader2 className="animate-spin text-brand-500" /> : 
                       newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" /> :
                       <div className="text-center"><Upload className="w-10 h-10 text-primary-300 mx-auto mb-2" /><p className="text-sm font-bold text-primary-400">رفع صورة</p></div>
                      }
                      {newProduct.image && <div className="absolute inset-0 bg-primary-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-white" /></div>}
                      <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploading(true);
                          const url = await uploadImage(file);
                          if (url) setNewProduct({...newProduct, image: url});
                          setIsUploading(false);
                        }
                      }} />
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-bold text-primary-500 mb-2">الاسم</label><input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-4 bg-primary-50 border border-primary-100 rounded-2xl font-bold" /></div>
                  <div><label className="block text-sm font-bold text-primary-500 mb-2">السعر (د.ج)</label><input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full p-4 bg-primary-50 border border-primary-100 rounded-2xl font-bold" /></div>
                </div>
                <button onClick={saveProduct} disabled={isSaving || isUploading} className="w-full py-4 bg-primary-900 text-white rounded-3xl font-bold shadow-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" /> : 'حفظ ونشر المنتج'}
                </button>
             </div>
          </div>
        )}

        {view === 'SETTINGS' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
            <div className="bg-white p-8 rounded-4xl border border-primary-100 shadow-sm relative overflow-hidden">
              <h2 className="text-2xl font-black text-primary-800 mb-8 flex items-center gap-3"><Settings className="w-8 h-8 text-primary-400" /> إعدادات المتجر</h2>
              
              <div className="space-y-8">
                {/* Store Image Profile Update */}
                <div className="flex flex-col items-center">
                   <div className="relative group cursor-pointer" onClick={() => storeImageRef.current?.click()}>
                      <div className="w-32 h-32 rounded-4xl overflow-hidden shadow-xl border-4 border-white">
                        {isUpdatingStore ? (
                          <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                            <Loader2 className="animate-spin text-brand-500" />
                          </div>
                        ) : (
                          <img src={storeInfo?.image || `https://picsum.photos/200/200?random=${currentStoreId}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        )}
                      </div>
                      <div className="absolute -bottom-2 -left-2 bg-primary-900 text-white p-2 rounded-2xl shadow-lg group-hover:bg-brand-600 transition-colors">
                        <Camera className="w-5 h-5" />
                      </div>
                      <input type="file" ref={storeImageRef} className="hidden" accept="image/*" onChange={handleUpdateStoreImage} />
                   </div>
                   <p className="mt-4 text-xs font-bold text-primary-400 uppercase tracking-widest">تغيير صورة المتجر</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-primary-500 mb-2">اسم المتجر</label>
                    <input type="text" defaultValue={storeInfo?.name || userName} className="w-full p-4 bg-primary-50 border border-primary-100 rounded-2xl font-bold text-primary-800 focus:bg-white focus:border-brand-500 outline-none transition-all" />
                  </div>

                  <div className="p-6 bg-blue-50/50 rounded-4xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm"><MapPin className="text-blue-600" /></div>
                      <div><p className="font-bold text-blue-900">موقع المتجر</p><p className="text-xs text-blue-500">سيتم استخدامه لحساب مسافة التوصيل</p></div>
                    </div>
                    <button className="text-blue-600 font-bold text-sm bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all">تحديث</button>
                  </div>
                  
                  <button className="w-full py-4 bg-primary-900 text-white rounded-3xl font-bold shadow-xl hover:bg-brand-600 transition-all">حفظ التغييرات</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};