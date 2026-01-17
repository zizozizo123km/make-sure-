
import React, { useState, useEffect, useRef } from 'react';
import { Category, Product, StoreProfile, OrderStatus, Order } from '../types';
import { formatCurrency } from '../utils/helpers';
import { db, auth } from '../services/firebase';
import { ref, onValue, push, set, update } from 'firebase/database';
import { 
  Search, Plus, Minus, ShoppingCart, MapPin, Loader2, Home, User, 
  Camera, LogOut, ClipboardList, Trash2, Star, ShieldCheck, Award,
  Utensils, Shirt, Smartphone, Briefcase, Baby, LayoutGrid, Save, RefreshCw,
  Phone, Bike, MessageSquare, Send, X, Bot, Sparkles, Navigation 
} from 'lucide-react';
import { RatingModal } from '../components/RatingModal';
import { getKimoAssistantResponse } from '../services/geminiService';
import { MapVisualizer } from '../components/MapVisualizer';

export const CustomerScreen: React.FC<{onLogout: () => void, userName: string}> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'ORDERS' | 'PROFILE'>('HOME');
  const [activeStore, setActiveStore] = useState<StoreProfile | null>(null);
  const [activeStoreProducts, setActiveStoreProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // AI Assistant State
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Rating State
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    onValue(ref(db, 'stores'), (snap) => {
      const data = snap.val();
      if (data) setStores(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      setLoading(false);
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
        setProfileData({ name: data.name || '', phone: data.phone || '' });
      }
    });
  }, [user]);

  useEffect(() => {
    if (activeStore) {
      onValue(ref(db, 'products'), (snap) => {
        const data = snap.val();
        const list: Product[] = [];
        if (data) Object.keys(data).forEach(k => { if (data[k].storeId === activeStore.id) list.push({ id: k, ...data[k] }); });
        setActiveStoreProducts(list);
      });
    }
  }, [activeStore]);

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAiThinking(true);
    setAiResponse(null);
    const response = await getKimoAssistantResponse(aiQuery, stores);
    setAiResponse(response);
    setIsAiThinking(false);
  };

  const handleUpdateProfile = async () => {
    if (!user || !profileData.name || !profileData.phone) return;
    setIsUpdating(true);
    try {
      await update(ref(db, `customers/${user.uid}`), { name: profileData.name, phone: profileData.phone });
      setIsEditingProfile(false);
      alert("تم تحديث بيانات ملفك الشخصي بنجاح ✓");
    } catch (e) {
      alert("فشل تحديث البيانات، يرجى المحاولة لاحقاً.");
    } finally { setIsUpdating(false); }
  };

  const handleUpdateLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (user) {
            await update(ref(db, `customers/${user.uid}`), {
              coordinates: { 
                lat: position.coords.latitude, 
                lng: position.coords.longitude 
              }
            });
            alert("تم تحديث موقعك الجغرافي بنجاح ✓");
          }
          setIsLocating(false);
        },
        (error) => {
          alert("يرجى تفعيل الـ GPS لتحديث الموقع بدقة.");
          setIsLocating(false);
        }
      );
    } else {
      alert("المتصفح لا يدعم تحديد الموقع.");
      setIsLocating(false);
    }
  };

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

  const handleCheckout = async () => {
    if (!activeStore) return;
    setIsOrdering(true);
    const orderData = {
      customerId: user!.uid, customerName: profileData.name || userName,
      storeId: activeStore.id, storeName: activeStore.name,
      products: cart, totalPrice: grandTotal, deliveryFee: 200,
      status: OrderStatus.PENDING, timestamp: Date.now(),
      address: "بئر العاتر، حي السلام",
      customerPhone: profileData.phone || '',
      storePhone: activeStore.phone || '',
      storeCoordinates: activeStore.coordinates,
      coordinates: profileData.coordinates || { lat: 34.7495, lng: 8.0617 } // Default for now
    };
    try {
      await set(push(ref(db, 'orders')), orderData);
      setCart([]); setActiveStore(null); setActiveTab('ORDERS');
    } finally { setIsOrdering(false); }
  };

  const filteredStores = stores.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-32 font-cairo text-right" dir="rtl">
      {/* AI Chat Drawer */}
      {showAiChat && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-end justify-center animate-fade-in">
           <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><Bot className="w-6 h-6" /></div>
                    <div>
                       <h3 className="font-black text-slate-800 text-lg">مساعد كيمو الذكي</h3>
                       <p className="text-[10px] text-orange-500 font-bold">مدعوم بـ Gemini AI</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAiChat(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
                 <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none text-right">
                    <p className="text-sm font-bold text-slate-600">أهلاً بك! أنا مساعدك الذكي. اسألني عن أي متجر أو توصية وسأجيبك فوراً.</p>
                 </div>
                 {aiResponse && (
                    <div className="bg-orange-500 text-white p-4 rounded-2xl rounded-tr-none text-right animate-scale-up shadow-lg">
                       <p className="text-sm font-black leading-relaxed">{aiResponse}</p>
                    </div>
                 )}
                 {isAiThinking && (
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                       <Loader2 className="animate-spin w-4 h-4" /> مساعد كيمو يفكر...
                    </div>
                 )}
              </div>

              <form onSubmit={handleAiAsk} className="relative">
                 <input 
                   type="text" 
                   value={aiQuery}
                   onChange={(e) => setAiQuery(e.target.value)}
                   placeholder="مثلاً: وين نلقى أحسن مطعم؟" 
                   className="w-full bg-slate-100 border-none rounded-2xl p-4 pr-14 pl-6 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all text-right"
                 />
                 <button type="submit" className="absolute left-2 top-2 w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                    <Send className="w-4 h-4 rotate-180" />
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Floating AI Action Button */}
      <button 
        onClick={() => setShowAiChat(true)}
        className="fixed bottom-32 left-8 w-16 h-16 brand-gradient rounded-full flex items-center justify-center shadow-2xl z-[500] animate-bounce hover:scale-110 transition-transform active:scale-95 border-4 border-white"
      >
        <Sparkles className="text-white w-8 h-8" />
      </button>

      {/* Header */}
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-slate-100 p-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 brand-gradient rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <span className="text-white font-black text-2xl">K</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-slate-900 truncate">أهلاً، {profileData.name || userName}</h2>
            <div className="flex items-center gap-1 mt-1">
               <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
               <span className="text-[10px] font-bold text-slate-400 truncate">الموقع مفعل • دقة عالية</span>
            </div>
          </div>
        </div>
        {activeStore && (
          <button onClick={() => setActiveStore(null)} className="bg-slate-50 text-slate-400 p-3 rounded-2xl"><LogOut className="w-5 h-5" /></button>
        )}
      </header>

      <main className="p-6 max-w-lg mx-auto">
        {activeTab === 'HOME' ? (
          <>
            {!activeStore ? (
              <div className="space-y-8 animate-fade-in-up">
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="ابحث عن متجر أو منتج..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-[2rem] py-5 pr-14 shadow-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 transition-all text-right" 
                  />
                  <Search className="absolute right-5 top-5 w-6 h-6 text-slate-300" />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {filteredStores.map(s => (
                    <div key={s.id} onClick={() => setActiveStore(s)} className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-50 hover:shadow-xl transition-all cursor-pointer relative">
                       <div className="h-52 relative overflow-hidden">
                          <img src={s.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                          <div className="absolute top-4 left-4 flex gap-2">
                             <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-black flex items-center gap-1 border border-white/10">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{s.rating?.toFixed(1) || '0.0'}</span>
                             </div>
                             {s.isVerified && <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg"><ShieldCheck className="w-3 h-3" /> موثق</div>}
                          </div>
                          <div className="absolute bottom-6 right-6 text-white text-right">
                             <h4 className="text-2xl font-black mb-1">{s.name}</h4>
                             <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">{s.category}</p>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <div className="bg-white p-4 rounded-[2.5rem] shadow-sm mb-6 flex gap-4 items-center">
                   <img src={activeStore.image} className="w-20 h-20 rounded-2xl object-cover" />
                   <div className="text-right">
                      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {activeStore.name}
                        {activeStore.isVerified && <ShieldCheck className="w-5 h-5 text-blue-500" />}
                      </h2>
                      <p className="text-xs text-slate-400 font-bold">{activeStore.category}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  {activeStoreProducts.map(p => {
                    const item = cart.find(i => i.product.id === p.id);
                    return (
                      <div key={p.id} className="bg-white p-4 rounded-[2rem] border border-slate-50 flex gap-4 items-center group">
                        <img src={p.image} className="w-24 h-24 rounded-2xl object-cover" />
                        <div className="flex-1 text-right">
                          <h4 className="font-black text-slate-800">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold mb-2 leading-relaxed">{p.description}</p>
                          <span className="text-brand-500 font-black text-lg">{formatCurrency(p.price)}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                           <button onClick={() => addToCart(p)} className="w-10 h-10 brand-gradient text-white rounded-xl flex items-center justify-center shadow-lg"><Plus /></button>
                           {item && <span className="font-black text-xs">{item.quantity}</span>}
                           {item && <button onClick={() => removeFromCart(p.id)} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center"><Minus /></button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'ORDERS' ? (
          <div className="animate-fade-in-up space-y-6">
             <h2 className="text-3xl font-black text-slate-900">طلباتي</h2>
             {myOrders.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center text-slate-300 border border-dashed border-slate-200">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-black text-sm">لا توجد طلبات سابقة</p>
                </div>
             ) : (
                myOrders.map(o => (
                  <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-2 h-full ${o.status === OrderStatus.DELIVERED ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-black text-xl text-slate-900">{o.storeName}</h3>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(o.timestamp).toLocaleString('ar-DZ')}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black ${o.status === OrderStatus.DELIVERED ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                            {o.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                        <span className="text-brand-500 font-black text-xl">{formatCurrency(o.totalPrice)}</span>
                        {o.status === OrderStatus.DELIVERED && (
                            <button onClick={() => setRatingOrder(o)} className="flex items-center gap-2 bg-yellow-400 px-4 py-2 rounded-xl font-black text-xs"><Star className="w-4 h-4" /> تقييم</button>
                        )}
                      </div>
                  </div>
                ))
             )}
          </div>
        ) : (
          <div className="animate-fade-in-up text-center">
             <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-2 brand-gradient"></div>
                
                <div className="w-32 h-32 rounded-[2.5rem] border-4 border-slate-50 overflow-hidden shadow-xl mx-auto mb-8 bg-slate-50 p-1">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} className="w-full h-full object-cover rounded-[2rem] bg-slate-100" />
                </div>
                
                {!isEditingProfile ? (
                  <>
                    <h3 className="text-2xl font-black mb-1 text-slate-800">{profileData.name || userName}</h3>
                    <p className="text-orange-500 font-black text-xs mb-2 uppercase tracking-widest">زبون كيمو المميز</p>
                    <p className="text-slate-400 font-bold mb-10 flex items-center justify-center gap-2"><Phone className="w-4 h-4" /> {profileData.phone || 'لا يوجد رقم'}</p>
                    
                    <div className="space-y-4">
                       <button onClick={() => setIsEditingProfile(true)} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all hover:bg-slate-200">
                         تعديل البيانات
                       </button>
                       <button onClick={onLogout} className="w-full bg-red-50 text-red-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                         <LogOut className="w-5 h-5" /> تسجيل الخروج
                       </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-5 text-right">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 pr-3 uppercase">الاسم الكامل</label>
                       <input 
                         type="text" 
                         value={profileData.name} 
                         onChange={e => setProfileData({...profileData, name: e.target.value})}
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-orange-500 transition-all text-right"
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 pr-3 uppercase">رقم الهاتف</label>
                       <input 
                         type="tel" 
                         value={profileData.phone} 
                         onChange={e => setProfileData({...profileData, phone: e.target.value})}
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-orange-500 transition-all text-right"
                       />
                    </div>

                    <button 
                      onClick={handleUpdateLocation}
                      disabled={isLocating}
                      className="w-full py-4 border-2 border-dashed border-orange-200 text-orange-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 bg-orange-50/50 hover:bg-orange-50 transition-all"
                    >
                      {isLocating ? <Loader2 className="animate-spin w-4 h-4" /> : <Navigation className="w-4 h-4" />}
                      تحديث موقعي الحالي (GPS)
                    </button>

                    <div className="flex gap-4 pt-6">
                       <button 
                         onClick={handleUpdateProfile}
                         disabled={isUpdating}
                         className="flex-1 brand-gradient text-white py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                       >
                         {isUpdating ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                         حفظ التغييرات
                       </button>
                       <button 
                         onClick={() => setIsEditingProfile(false)}
                         className="px-8 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
                       >
                         إلغاء
                       </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-8 right-8 bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] p-3 flex justify-around items-center floating-nav z-[200]">
        <NavBtn act={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} icon={<User />} />
        <NavBtn act={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ClipboardList />} />
        <NavBtn act={activeTab === 'HOME'} onClick={() => setActiveTab('HOME')} icon={<Home />} />
      </nav>

      {cart.length > 0 && activeTab === 'HOME' && activeStore && (
        <div className="fixed bottom-32 left-8 right-8 bg-white rounded-[2.5rem] shadow-2xl p-6 z-[150] animate-slide-up border border-slate-100">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl text-slate-900">سلتك</h3>
              <button onClick={() => setCart([])} className="text-slate-300"><Trash2 className="w-5 h-5" /></button>
           </div>
           <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
              <p className="text-2xl font-black text-brand-500">{formatCurrency(grandTotal)}</p>
              <button onClick={handleCheckout} disabled={isOrdering} className="brand-gradient text-white px-8 py-3 rounded-xl font-black shadow-lg">
                {isOrdering ? <Loader2 className="animate-spin" /> : 'اطلب الآن'}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

const NavBtn = ({ act, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-5 rounded-full transition-all ${act ? 'bg-brand-500 text-white scale-110 shadow-lg' : 'text-slate-500'}`}>
    {React.cloneElement(icon, { size: 28 })}
  </button>
);
