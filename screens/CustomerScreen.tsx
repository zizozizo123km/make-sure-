import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, Product, StoreProfile, OrderStatus, Order } from '../types';
import { calculateDistance, formatCurrency, BIR_EL_ATER_CENTER } from '../utils/helpers';
import { db, auth } from '../services/firebase';
import { ref, onValue, push, set, update } from 'firebase/database';
import { Search, Star, Plus, Minus, ShoppingCart, MapPin, X, CheckCircle, Clock, Loader2, Home, User, Camera, LogOut, Navigation, ClipboardList, Trash2 } from 'lucide-react';

interface CustomerScreenProps {
  onLogout: () => void;
  userName: string;
}

const DEFAULT_LOCATION = { lat: 34.7495, lng: 8.0617 };

export const CustomerScreen: React.FC<CustomerScreenProps> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'ORDERS' | 'PROFILE'>('HOME');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [activeStore, setActiveStore] = useState<StoreProfile | null>(null);
  const [activeStoreProducts, setActiveStoreProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number}>(DEFAULT_LOCATION);
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile Edit
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [newName, setNewName] = useState(userName);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Get User Profile
      onValue(ref(db, `customers/${user.uid}`), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUserProfile(data);
          setNewName(data.name || userName);
          if (data.coordinates) setUserCoords(data.coordinates);
        }
      });

      // Get User Orders
      onValue(ref(db, 'orders'), (snapshot) => {
        const data = snapshot.val();
        const orders: Order[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            if (data[key].customerId === user.uid) {
              orders.push({ ...data[key], id: key });
            }
          });
        }
        setMyOrders(orders.sort((a, b) => b.timestamp - a.timestamp));
      });
    }

    // Get Stores
    onValue(ref(db, 'stores'), (snapshot) => {
        const data = snapshot.val();
        let loadedStores: StoreProfile[] = [];
        if (data) {
            loadedStores = Object.keys(data).map(key => ({
                id: key, 
                ...data[key]
            }));
        }
        setStores(loadedStores);
        setLoadingStores(false);
    });
  }, []);

  useEffect(() => {
    if (activeStore) {
      setLoadingProducts(true);
      onValue(ref(db, 'products'), (snapshot) => {
        let storeProducts: Product[] = [];
        const data = snapshot.val();
        if (data) {
          Object.keys(data).forEach(key => {
            if (data[key].storeId === activeStore.id) {
              storeProducts.push({ ...data[key], id: key });
            }
          });
        }
        setActiveStoreProducts(storeProducts);
        setLoadingProducts(false);
      });
    }
  }, [activeStore]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev.map(item => item.product.id === product.id ? {...item, quantity: item.quantity + 1} : item);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.map(item => item.product.id === productId ? {...item, quantity: Math.max(0, item.quantity - 1)} : item).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const grandTotal = cartTotal > 0 ? cartTotal + 200 : 0;

  const handleCheckout = async () => {
    if (!auth.currentUser || !activeStore || cart.length === 0) return;
    setIsOrdering(true);
    const orderData = {
      customerId: auth.currentUser.uid,
      customerName: userProfile?.name || userName,
      customerPhone: userProfile?.phone || "", // أضفنا رقم الهاتف
      storeId: activeStore.id,
      storeName: activeStore.name,
      storePhone: activeStore.phone || "", // أضفنا رقم هاتف المتجر
      products: cart,
      totalPrice: grandTotal,
      deliveryFee: 200,
      status: OrderStatus.PENDING,
      timestamp: Date.now(),
      address: "بئر العاتر، حي السلام",
      coordinates: userCoords,
      storeCoordinates: activeStore.coordinates
    };
    try {
      await set(push(ref(db, 'orders')), orderData);
      setCart([]);
      setShowCart(false);
      setActiveTab('ORDERS');
      alert("تم إرسال طلبك بنجاح!");
    } catch (e) { alert("حدث خطأ أثناء الطلب"); }
    finally { setIsOrdering(false); }
  };

  return (
    <div className="bg-[#F8F9FA] min-h-screen pb-28 font-cairo select-none">
      {/* Header - Matching Screenshot */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md py-4 px-6 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <div className="w-10 h-10 bg-[#F97316] rounded-full flex items-center justify-center shadow-lg shadow-orange-200">
          <span className="text-white font-black text-lg">K</span>
        </div>
        
        <div className="text-center flex-1">
          <h2 className="text-sm font-black text-[#2B2F3B]">مرحباً، {userProfile?.name || userName}</h2>
          <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1 font-bold">
            <MapPin className="w-2.5 h-2.5 text-[#F97316]" /> حي السلام، بئر العاتر
          </p>
        </div>

        <button 
          onClick={() => { setActiveStore(null); setCart([]); }} 
          className={`text-gray-400 text-[10px] font-black border border-gray-100 px-3 py-1.5 rounded-xl transition-all hover:bg-gray-50 ${activeStore ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        >
          إغلاق المتجر
        </button>
      </header>

      <div className="container max-w-lg mx-auto pt-24 px-6">
        {activeTab === 'HOME' ? (
          <>
            {!activeStore ? (
              <div className="space-y-6 animate-fade-in-up">
                <div className="relative">
                   <input type="text" placeholder="ابحث عن متجر..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-gray-100 rounded-3xl py-4 pr-12 shadow-sm font-bold focus:ring-2 focus:ring-[#F97316]/20 outline-none transition-all" />
                   <Search className="absolute right-4 top-4 w-6 h-6 text-gray-300" />
                </div>

                <div className="space-y-4">
                  {loadingStores ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#F97316]" /></div> : stores.map(store => (
                    <div key={store.id} onClick={() => setActiveStore(store)} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-all">
                      <div className="h-44 relative">
                        <img src={store.image} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute bottom-4 right-4 text-white text-right">
                           <h3 className="font-black text-xl leading-none mb-1">{store.name}</h3>
                           <p className="text-[10px] opacity-80 font-bold">{store.category}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-fade-in-up">
                {/* Store Banner */}
                <div className="relative h-56 rounded-[2.5rem] overflow-hidden mb-6 shadow-xl border border-white">
                  <img src={activeStore.image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-6 right-6 text-white text-right">
                    <h2 className="text-3xl font-black">{activeStore.name}</h2>
                    <p className="text-xs opacity-70 font-bold">{activeStore.category}</p>
                  </div>
                </div>

                {/* Product List - Matching Screenshot */}
                <div className="space-y-3">
                  {loadingProducts ? <div className="flex justify-center"><Loader2 className="animate-spin text-[#F97316]" /></div> : 
                    activeStoreProducts.length > 0 ? activeStoreProducts.map(p => {
                      const cartItem = cart.find(i => i.product.id === p.id);
                      return (
                        <div key={p.id} className="bg-white p-3 rounded-[1.8rem] shadow-sm border border-gray-100 flex gap-4 items-center">
                          {/* Quantity Controls - Left Side */}
                          <div className="flex items-center gap-1">
                             <button onClick={() => addToCart(p)} className="w-8 h-8 bg-[#8E949A] text-white rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
                             {cartItem && (
                               <>
                                 <span className="w-6 text-center font-black text-xs text-[#2B2F3B]">{cartItem.quantity}</span>
                                 <button onClick={() => removeFromCart(p.id)} className="w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center active:scale-90 transition-all"><Minus className="w-4 h-4" /></button>
                               </>
                             )}
                          </div>
                          
                          {/* Product Info - Center */}
                          <div className="flex-1 text-right">
                            <h4 className="font-bold text-[#8E949A] text-[13px] mb-1">{p.name}</h4>
                            <span className="text-sm font-black text-[#F97316]">{formatCurrency(p.price)}</span>
                          </div>

                          {/* Image - Right Side */}
                          <img src={p.image} className="w-16 h-16 rounded-[1.2rem] object-cover shadow-sm bg-gray-50" />
                        </div>
                      );
                    }) : (
                      <div className="text-center py-10 text-gray-300 font-bold">لا توجد منتجات حالياً</div>
                    )
                  }
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'ORDERS' ? (
          <div className="animate-fade-in-up space-y-4">
             <h2 className="text-lg font-black text-[#2B2F3B] mb-2 px-2">حالة طلباتي</h2>
             {myOrders.length === 0 ? (
               <div className="text-center py-20 text-gray-300 font-bold">لم تطلب أي شيء بعد</div>
             ) : (
               myOrders.map(order => (
                 <div key={order.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                       <div className="text-right">
                          <h3 className="font-black text-[#2B2F3B] text-sm">{order.storeName}</h3>
                          <p className="text-[10px] text-gray-400 font-bold">{new Date(order.timestamp).toLocaleString('ar-DZ')}</p>
                       </div>
                       <span className={`text-[10px] px-3 py-1 rounded-full font-black ${
                          order.status === OrderStatus.PENDING ? 'bg-orange-50 text-orange-500' :
                          order.status === OrderStatus.DELIVERED ? 'bg-green-50 text-green-500' :
                          'bg-blue-50 text-blue-500'
                       }`}>
                          {order.status === OrderStatus.PENDING ? 'قيد الانتظار' : 
                           order.status === OrderStatus.ACCEPTED_BY_STORE ? 'جاري التحضير' :
                           order.status === OrderStatus.ACCEPTED_BY_DRIVER ? 'في الطريق إليك' : 'تم التوصيل'}
                       </span>
                    </div>
                    <div className="flex justify-between items-end border-t border-gray-50 pt-3">
                       <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
                          {order.products.slice(0, 3).map((item, idx) => (
                             <img key={idx} src={item.product.image} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
                          ))}
                          {order.products.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-gray-400">+{order.products.length - 3}</div>
                          )}
                       </div>
                       <div className="text-left">
                          <p className="text-[10px] text-gray-400 font-bold">الإجمالي</p>
                          <p className="text-sm font-black text-[#F97316]">{formatCurrency(order.totalPrice)}</p>
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>
        ) : (
          <div className="animate-fade-in-up space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 text-center">
               <div className="relative inline-block mb-6">
                 <div className="w-32 h-32 rounded-full border-4 border-gray-50 shadow-lg bg-gray-50">
                   <img src={userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} className="w-full h-full object-cover rounded-full" />
                 </div>
                 <button onClick={() => profileImageInputRef.current?.click()} className="absolute bottom-0 right-0 bg-[#F97316] text-white p-2.5 rounded-full border-2 border-white shadow-lg"><Camera className="w-5 h-5" /></button>
                 <input type="file" ref={profileImageInputRef} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && auth.currentUser) {
                      setIsUpdatingProfile(true);
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("upload_preset", "makemm");
                      const res = await fetch(`https://api.cloudinary.com/v1_1/dkqxgwjnr/image/upload`, { method: "POST", body: formData });
                      const data = await res.json();
                      if (data.secure_url) await update(ref(db, `customers/${auth.currentUser.uid}`), { avatar: data.secure_url });
                      setIsUpdatingProfile(false);
                    }
                 }} className="hidden" accept="image/*" />
               </div>
               <div className="space-y-6">
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-black text-center outline-none border border-gray-100 focus:border-[#F97316]" placeholder="الاسم" />
                  <button onClick={async () => {
                    if (auth.currentUser) {
                      setIsUpdatingProfile(true);
                      await update(ref(db, `customers/${auth.currentUser.uid}`), { name: newName });
                      setIsUpdatingProfile(false);
                      alert("تم التحديث");
                    }
                  }} disabled={isUpdatingProfile} className="w-full bg-[#2B2F3B] text-white py-4 rounded-2xl font-black shadow-lg">حفظ التغييرات</button>
                  <button onClick={onLogout} className="w-full bg-red-50 text-red-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all hover:bg-red-500 hover:text-white"><LogOut className="w-5 h-5" /> تسجيل الخروج</button>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Matches Screenshot Style */}
      <nav className="fixed bottom-6 left-6 right-6 bg-[#2B2F3B] rounded-[2.5rem] p-2 flex justify-around items-center shadow-2xl z-50">
        <button onClick={() => setActiveTab('PROFILE')} className={`p-4 rounded-full transition-all duration-300 ${activeTab === 'PROFILE' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>
          <User className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('ORDERS')} className={`p-4 rounded-full transition-all duration-300 ${activeTab === 'ORDERS' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>
          <ClipboardList className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('HOME')} className={`p-4 rounded-full transition-all duration-300 ${activeTab === 'HOME' ? 'bg-[#F97316] text-white scale-110 shadow-lg shadow-orange-500/20' : 'text-gray-500'}`}>
          <Home className="w-6 h-6" />
        </button>
      </nav>

      {/* Cart Summary - Animated Floating Panel */}
      {cart.length > 0 && activeTab === 'HOME' && activeStore && (
        <div className="fixed bottom-24 left-6 right-6 bg-white rounded-[2.2rem] shadow-2xl border border-gray-100 p-5 z-40 animate-slide-up">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-[#2B2F3B]">سلة المشتريات ({cart.length})</h3>
              <button onClick={() => setCart([])} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
           </div>
           <div className="max-h-32 overflow-y-auto mb-4 scrollbar-hide space-y-2">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-xl">
                   <span className="text-xs font-bold text-[#8E949A]">{item.product.name} x {item.quantity}</span>
                   <span className="text-xs font-black text-[#F97316]">{formatCurrency(item.product.price * item.quantity)}</span>
                </div>
              ))}
           </div>
           <div className="flex justify-between items-center border-t border-gray-100 pt-4">
              <div>
                 <p className="text-[10px] text-gray-400 font-bold">الإجمالي مع التوصيل</p>
                 <p className="text-xl font-black text-[#F97316]">{formatCurrency(grandTotal)}</p>
              </div>
              <button 
                onClick={handleCheckout} 
                disabled={isOrdering}
                className="bg-[#2B2F3B] text-white px-8 py-3 rounded-2xl font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isOrdering ? <Loader2 className="animate-spin w-4 h-4" /> : <><ShoppingCart className="w-4 h-4" /> اطلب الآن</>}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};