
import React, { useState, useEffect } from 'react';
import { Category, Product, StoreProfile, OrderStatus, Order } from '../types';
import { formatCurrency } from '../utils/helpers';
import { db, auth } from '../services/firebase';
import { ref, onValue, push, set, update } from 'firebase/database';
import { 
  Search, Plus, Minus, ShoppingCart, MapPin, Loader2, Home, User, 
  Camera, LogOut, ClipboardList, Trash2, Star, ShieldCheck, 
  LayoutGrid, Save, RefreshCw, Phone, Sparkles, Navigation, X, Bot, Send,
  ChevronLeft, ShoppingBag, Heart, Filter, CheckCircle2, Layout
} from 'lucide-react';
import { getKimoAssistantResponse } from '../services/geminiService';

export const CustomerScreen: React.FC<{onLogout: () => void, userName: string}> = ({ onLogout, userName }) => {
  // تحديث أنواع التبويبات لتشمل CATEGORIES
  const [activeTab, setActiveTab] = useState<'HOME' | 'CATEGORIES' | 'ORDERS' | 'PROFILE'>('HOME');
  const [activeStore, setActiveStore] = useState<StoreProfile | null>(null);
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '', coordinates: null as any });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    
    onValue(ref(db, 'stores'), (snap) => {
      const data = snap.val();
      if (data) setStores(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      setLoading(false);
    });

    onValue(ref(db, 'products'), (snap) => {
      const data = snap.val();
      if (data) setAllProducts(Object.keys(data).map(k => ({ id: k, ...data[k] })));
    });

    onValue(ref(db, 'orders'), (snap) => {
      const data = snap.val();
      const list: Order[] = [];
      if (data) Object.keys(data).forEach(k => { if (data[k].customerId === user.uid) list.push({ id: k, ...data[k] }); });
      setMyOrders(list.sort((a, b) => b.timestamp - a.timestamp));
    });

    onValue(ref(db, `customers/${user.uid}`), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setProfileData({ 
          name: data.name || '', 
          phone: data.phone || '',
          coordinates: data.coordinates || null
        });
      }
    });
  }, [user]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? {...i, quantity: i.quantity + 1} : i);
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.map(i => i.product.id === id ? {...i, quantity: i.quantity - 1} : i).filter(i => i.quantity > 0));
  };

  const grandTotal = cart.reduce((s, i) => s + (i.product.price * i.quantity), 0) + 200;

  // تحسين وظيفة الطلب لضمان العمل
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsOrdering(true);
    
    try {
      const firstProductStoreId = cart[0].product.storeId;
      const store = stores.find(s => s.id === firstProductStoreId);

      const orderData = {
        customerId: user!.uid, 
        customerName: profileData.name || userName,
        storeId: firstProductStoreId, 
        storeName: store?.name || "متجر كيمو",
        products: cart, 
        totalPrice: grandTotal, 
        deliveryFee: 200,
        status: OrderStatus.PENDING, 
        timestamp: Date.now(),
        address: "بئر العاتر",
        customerPhone: profileData.phone || '',
        coordinates: profileData.coordinates || { lat: 34.7495, lng: 8.0617 }
      };

      const newOrderRef = push(ref(db, 'orders'));
      await set(newOrderRef, orderData);
      
      alert("تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً.");
      setCart([]); 
      setActiveTab('ORDERS');
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("حدث خطأ أثناء إتمام الطلب، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    await update(ref(db, `customers/${user.uid}`), { name: profileData.name, phone: profileData.phone });
    setIsEditingProfile(false);
    setIsUpdating(false);
  };

  const handleUpdateLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      if (user) {
        update(ref(db, `customers/${user.uid}`), {
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        });
        setProfileData(prev => ({...prev, coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude }}));
        alert("تم تحديد موقعك بنجاح ✓");
      }
      setIsLocating(false);
    }, () => {
      alert("يرجى تفعيل الـ GPS في متصفحك أولاً.");
      setIsLocating(false);
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-orange-500 w-12 h-12" /></div>;

  return (
    <div className="bg-[#F4F4F4] min-h-screen pb-32 font-cairo text-right" dir="rtl">
      
      {/* 1. Promo Header (Temu Style) */}
      {activeTab === 'HOME' && !searchQuery && !selectedCategory && (
        <div className="bg-gradient-to-b from-[#E62E04] to-[#FF6000] pt-12 pb-8 px-6 text-center text-white relative overflow-hidden">
           <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
           <h1 className="text-4xl font-black mb-1 tracking-tighter uppercase italic">KIMO HOME</h1>
           <p className="text-sm font-bold opacity-90">Refresh your home • بئر العاتر</p>
           <p className="text-[8px] mt-4 opacity-60">*السعر الفعلي قد يختلف حسب التوقيت والمنطقة.</p>
        </div>
      )}

      {/* 2. Main Sticky Header */}
      <div className="bg-white sticky top-0 z-[100] px-4 pt-4 pb-2 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="ابحث في كيمو..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F0F0F0] border-none rounded-full py-2.5 pr-10 pl-14 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <Search className="absolute right-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
            <div className="absolute left-1.5 top-1.5 flex items-center gap-1.5">
               <Camera className="w-5 h-5 text-slate-400 p-1" />
               <button className="bg-black text-white p-1.5 rounded-full shadow-lg"><Search className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="relative cursor-pointer" onClick={() => setActiveTab('HOME')}>
            <ShoppingCart className="w-7 h-7 text-slate-700" />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#FF6000] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white">{cart.length}</span>}
          </div>
        </div>

        {/* Category Tabs (Temu Style) */}
        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-1 px-2">
          {['الكل', ...Object.values(Category)].map((cat) => (
            <button 
              key={cat}
              onClick={() => { setSelectedCategory(cat === 'الكل' ? null : cat); setActiveTab('HOME'); }}
              className={`whitespace-nowrap text-sm font-bold pb-2 transition-all relative ${(!selectedCategory && cat === 'الكل') || selectedCategory === cat ? 'text-[#FF6000]' : 'text-slate-500'}`}
            >
              {cat}
              {((!selectedCategory && cat === 'الكل') || selectedCategory === cat) && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6000] rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      <main className="p-3 max-w-lg mx-auto">
        {activeTab === 'HOME' && (
          <div className="animate-fade-in-up">
            
            {/* Circular Category/Stores Row (Temu Look) */}
            {!selectedCategory && !searchQuery && (
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-6 mb-2">
                {stores.slice(0, 6).map((store, i) => (
                  <div key={i} onClick={() => { setActiveStore(store); setSelectedCategory(store.category); }} className="flex flex-col items-center min-w-[75px] gap-2 cursor-pointer">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-50 overflow-hidden p-0.5 hover:scale-105 transition-transform">
                      <img src={store.image} className="w-full h-full object-cover rounded-full" />
                    </div>
                    <span className="text-[9px] font-black text-slate-600 truncate w-16 text-center">{store.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Product Grid (2 Columns) */}
            <div className="grid grid-cols-2 gap-3">
              {allProducts
                .filter(p => !selectedCategory || p.category === selectedCategory)
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((p) => {
                  const cartItem = cart.find(i => i.product.id === p.id);
                  return (
                    <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-sm flex flex-col relative group border border-slate-50">
                      <div className="relative h-48 overflow-hidden bg-slate-50">
                        <img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <button className="absolute top-2 left-2 bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-sm"><Heart className="w-4 h-4 text-slate-400" /></button>
                      </div>
                      
                      <div className="p-3 flex-1 flex flex-col">
                        <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 mb-1 h-8 leading-tight">{p.name}</h4>
                        
                        <div className="flex items-center gap-1 mb-1.5">
                          <div className="flex text-yellow-400">
                             {[1,2,3,4,5].map(s => <Star key={s} size={9} fill="currentColor" />)}
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold">(15,230)</span>
                        </div>
                        
                        <div className="mt-auto">
                          <p className="text-[9px] text-slate-400 font-black mb-1.5 flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-blue-500" /> 10K+ sold</p>
                          <div className="flex justify-between items-center">
                            <span className="text-[#E62E04] font-black text-base">{formatCurrency(p.price)}</span>
                            <button 
                              onClick={() => addToCart(p)}
                              className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#FF6000] hover:text-white hover:border-transparent transition-all shadow-sm active:scale-90"
                            >
                              <Plus className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {cartItem && (
                        <div className="absolute top-2 right-2 bg-[#FF6000] text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-scale-up border-2 border-white">
                          {cartItem.quantity}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* شاشة الأقسام الجديدة (CATEGORIES) */}
        {activeTab === 'CATEGORIES' && (
          <div className="animate-fade-in-up py-4 px-2">
            <h2 className="text-2xl font-black text-slate-900 mb-6">تصفح بـ الفئة</h2>
            <div className="grid grid-cols-2 gap-4">
               {Object.values(Category).map((cat, i) => (
                 <button 
                   key={i} 
                   onClick={() => { setSelectedCategory(cat); setActiveTab('HOME'); }}
                   className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4 active:scale-95 transition-all"
                 >
                    <div className="w-16 h-16 brand-gradient rounded-full flex items-center justify-center text-white shadow-lg">
                       <ShoppingBag />
                    </div>
                    <span className="font-black text-slate-700">{cat}</span>
                 </button>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'ORDERS' && (
           <div className="space-y-4 animate-fade-in-up">
              <h2 className="text-2xl font-black text-slate-900 mb-4 px-2">سجل طلباتي</h2>
              {myOrders.length === 0 ? (
                 <div className="bg-white rounded-[2.5rem] p-16 text-center text-slate-300 border border-dashed border-slate-200">
                   <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-10" />
                   <p className="font-black text-sm text-slate-400">لا توجد طلبات سابقة لعرضها</p>
                 </div>
              ) : (
                myOrders.map(o => (
                  <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between mb-3">
                       <span className="text-sm font-black text-slate-800">{o.storeName}</span>
                       <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${o.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                          {o.status}
                       </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mb-4">{new Date(o.timestamp).toLocaleString('ar-DZ')}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                       <span className="text-[#FF6000] font-black text-xl">{formatCurrency(o.totalPrice)}</span>
                       <button className="text-xs font-black text-slate-600 bg-slate-50 px-5 py-2 rounded-xl border border-slate-100">عرض الفاتورة</button>
                    </div>
                  </div>
                ))
              )}
           </div>
        )}

        {activeTab === 'PROFILE' && (
           <div className="animate-fade-in-up">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm text-center border border-slate-50">
                 <div className="w-28 h-28 bg-slate-50 rounded-full mx-auto mb-6 border-4 border-white shadow-xl overflow-hidden relative group">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} className="w-full h-full" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                       <Camera className="text-white w-6 h-6" />
                    </div>
                 </div>
                 
                 {!isEditingProfile ? (
                   <>
                     <h3 className="text-2xl font-black text-slate-800 mb-1">{profileData.name || userName}</h3>
                     <p className="text-xs text-slate-400 font-bold mb-8">{profileData.phone || 'لم يتم إضافة هاتف'}</p>
                     
                     <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                           <p className="text-[10px] text-slate-400 font-black mb-1 uppercase">الطلبات</p>
                           <p className="text-lg font-black text-slate-800">{myOrders.length}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                           <p className="text-[10px] text-slate-400 font-black mb-1 uppercase">النقاط</p>
                           <p className="text-lg font-black text-orange-500">240</p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <button onClick={() => setIsEditingProfile(true)} className="w-full bg-[#F0F0F0] py-4 rounded-2xl font-black text-slate-700 text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"><User size={18} /> تعديل الحساب</button>
                        <button onClick={onLogout} className="w-full bg-red-50 py-4 rounded-2xl font-black text-red-500 text-sm flex items-center justify-center gap-2 mt-6"><LogOut size={18} /> خروج من كيمو</button>
                     </div>
                   </>
                 ) : (
                    <div className="space-y-4 text-right">
                       <h4 className="text-lg font-black text-slate-800 mb-4">تعديل البيانات</h4>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 pr-2">الاسم الكامل</label>
                          <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 pr-2">رقم الهاتف</label>
                          <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all" />
                       </div>
                       
                       <button onClick={handleUpdateLocation} disabled={isLocating} className="w-full py-4 border-2 border-dashed border-orange-200 text-orange-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 mt-4">
                          {isLocating ? <Loader2 className="animate-spin" /> : <Navigation size={16} />}
                          تحديث موقع التوصيل الحالي
                       </button>

                       <div className="flex gap-3 mt-8">
                          <button onClick={handleUpdateProfile} disabled={isUpdating} className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">حفظ البيانات</button>
                          <button onClick={() => setIsEditingProfile(false)} className="px-6 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-sm">إلغاء</button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        )}
      </main>

      {/* Floating Checkout Button (Fixed and Improved) */}
      {cart.length > 0 && activeTab === 'HOME' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-3 z-[200] border border-white animate-slide-up flex items-center justify-between pl-6">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6000] relative">
                 <ShoppingBag className="w-7 h-7" />
                 <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{cart.length}</span>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase">إجمالي السلة</p>
                 <p className="text-xl font-black text-[#FF6000] leading-none">{formatCurrency(grandTotal)}</p>
              </div>
           </div>
           <button 
             onClick={handleCheckout} 
             disabled={isOrdering}
             className="bg-[#FF6000] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
           >
             {isOrdering ? <Loader2 className="animate-spin" /> : <>إتمام الطلب <ChevronLeft size={18} /></>}
           </button>
        </div>
      )}

      {/* Bottom Navigation Bar (Fixed Tab Navigation) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-20 flex justify-around items-center px-4 z-[500] shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        <NavBtn act={activeTab === 'HOME'} onClick={() => { setActiveTab('HOME'); setSelectedCategory(null); }} icon={<Home />} label="الرئيسية" />
        <NavBtn act={activeTab === 'CATEGORIES'} onClick={() => setActiveTab('CATEGORIES')} icon={<LayoutGrid />} label="الأقسام" />
        <NavBtn act={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ClipboardList />} label="طلباتي" />
        <NavBtn act={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} icon={<User />} label="حسابي" />
      </nav>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const NavBtn = ({ act, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${act ? 'text-[#FF6000]' : 'text-slate-400'}`}>
    <div className={`p-1 ${act ? 'scale-110' : 'scale-100'} transition-transform`}>
      {React.cloneElement(icon, { size: 22, strokeWidth: act ? 3 : 2 })}
    </div>
    <span className="text-[9px] font-black tracking-tighter">{label}</span>
  </button>
);
