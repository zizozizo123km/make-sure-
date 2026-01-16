import React, { useState, useEffect, useRef } from 'react';
import { Category, Product, StoreProfile, OrderStatus, Order } from '../types';
import { formatCurrency } from '../utils/helpers';
import { db, auth } from '../services/firebase';
import { ref, onValue, push, set, update } from 'firebase/database';
import { Search, Plus, Minus, ShoppingCart, MapPin, Loader2, Home, User, Camera, LogOut, ClipboardList, Trash2, Star, ShieldCheck, Award } from 'lucide-react';
import { RatingModal } from '../components/RatingModal';

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
      customerId: user!.uid, customerName: userName,
      storeId: activeStore.id, storeName: activeStore.name,
      products: cart, totalPrice: grandTotal, deliveryFee: 200,
      status: OrderStatus.PENDING, timestamp: Date.now(),
      address: "بئر العاتر، حي السلام"
    };
    try {
      await set(push(ref(db, 'orders')), orderData);
      setCart([]); setActiveStore(null); setActiveTab('ORDERS');
    } finally { setIsOrdering(false); }
  };

  const filteredStores = stores.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-32 font-cairo">
      {/* Modals */}
      {ratingOrder && (
        <RatingModal 
          type="STORE" 
          targetId={ratingOrder.storeId} 
          targetName={ratingOrder.storeName} 
          onClose={() => setRatingOrder(null)} 
        />
      )}

      {/* Immersive Header */}
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-slate-100 p-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 brand-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200">
            <span className="text-white font-black text-2xl">K</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-none">أهلاً، {userName}</h2>
            <div className="flex items-center gap-1 mt-1">
               <MapPin className="w-3 h-3 text-brand-500" />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">بئر العاتر • حي السلام</span>
            </div>
          </div>
        </div>
        {activeStore && (
          <button onClick={() => setActiveStore(null)} className="bg-slate-50 text-slate-400 p-3 rounded-2xl hover:bg-slate-100 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </header>

      <main className="p-6 max-w-lg mx-auto">
        {activeTab === 'HOME' ? (
          <>
            {!activeStore ? (
              <div className="space-y-8 animate-fade-in-up">
                <div className="relative group">
                  <input type="text" placeholder="ماذا تريد أن تطلب اليوم؟" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-[2rem] py-5 pr-14 shadow-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all" />
                  <Search className="absolute right-5 top-5 w-6 h-6 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                </div>

                <div className="flex items-center justify-between px-2">
                   <h3 className="text-2xl font-black text-slate-900">أبرز المتاجر</h3>
                   <button className="text-brand-500 font-bold text-sm">عرض الكل</button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-500 w-10 h-10" /></div> : filteredStores.map(s => (
                    <div key={s.id} onClick={() => setActiveStore(s)} className="group bg-white rounded-[2.5rem] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-white hover:shadow-xl transition-all cursor-pointer">
                       <div className="h-56 relative overflow-hidden">
                          <img src={s.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          
                          {/* Live Rating Badge */}
                          <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-black flex items-center gap-1.5 border border-white/10">
                             <Star className={`w-3.5 h-3.5 ${s.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/50'}`} />
                             <span>{s.rating ? s.rating.toFixed(1) : 'جديد'}</span>
                             {s.reviewCount && <span className="text-white/50 text-[8px]">({s.reviewCount})</span>}
                          </div>

                          <div className="absolute bottom-6 right-6 text-white text-right">
                             <h4 className="text-2xl font-black mb-1">{s.name}</h4>
                             <p className="text-xs opacity-80 font-bold flex items-center justify-end gap-1">
                               <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> متجر موثوق في العاتر
                             </p>
                          </div>
                       </div>
                    </div>
                  ))}
                  {filteredStores.length === 0 && !loading && (
                    <div className="text-center py-20 bg-slate-100/50 rounded-[3rem] border border-dashed border-slate-200">
                       <p className="font-bold text-slate-400">لم نجد أي متجر بهذا الاسم</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <div className="relative h-64 rounded-[3rem] overflow-hidden mb-8 shadow-2xl">
                  <img src={activeStore.image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
                    <h2 className="text-4xl font-black mb-2">{activeStore.name}</h2>
                    <div className="flex items-center gap-2">
                      <span className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-full font-bold text-sm">{activeStore.category}</span>
                      <div className="flex items-center gap-1 bg-yellow-400 text-slate-900 px-4 py-2 rounded-full font-black text-xs shadow-lg">
                        <Star className="w-3 h-3 fill-slate-900" /> {activeStore.rating?.toFixed(1) || '0.0'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {activeStoreProducts.map(p => {
                    const item = cart.find(i => i.product.id === p.id);
                    return (
                      <div key={p.id} className="bg-white p-4 rounded-[2.2rem] shadow-sm border border-slate-100 flex gap-5 items-center">
                        <img src={p.image} className="w-24 h-24 rounded-[1.8rem] object-cover shadow-sm" />
                        <div className="flex-1 text-right">
                          <h4 className="font-black text-slate-800 text-lg mb-1">{p.name}</h4>
                          <span className="text-brand-500 font-black text-xl">{formatCurrency(p.price)}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                           <button onClick={() => addToCart(p)} className="w-12 h-12 brand-gradient text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus /></button>
                           {item && <span className="font-black text-slate-700">{item.quantity}</span>}
                           {item && <button onClick={() => removeFromCart(p.id)} className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center active:scale-90 transition-all"><Minus /></button>}
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
             <h2 className="text-3xl font-black text-slate-900 mb-2">تتبع طلباتك</h2>
             {myOrders.length === 0 ? <div className="text-center py-20 text-slate-300 font-bold">لا توجد طلبات سابقة</div> : myOrders.map(o => (
               <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-2 h-full brand-gradient"></div>
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="font-black text-xl text-slate-900">{o.storeName}</h3>
                        <p className="text-[10px] text-slate-400 font-bold">{new Date(o.timestamp).toLocaleString('ar-DZ')}</p>
                     </div>
                     <span className={`px-4 py-2 rounded-2xl text-[10px] font-black ${o.status === OrderStatus.DELIVERED ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                        {o.status === OrderStatus.PENDING ? 'قيد الانتظار' : 
                         o.status === OrderStatus.ACCEPTED_BY_STORE ? 'جاري التحضير' :
                         o.status === OrderStatus.ACCEPTED_BY_DRIVER ? 'في الطريق' : 'تم التوصيل'}
                     </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-slate-50 pt-6">
                     <span className="text-brand-500 font-black text-xl">{formatCurrency(o.totalPrice)}</span>
                     
                     {o.status === OrderStatus.DELIVERED ? (
                        <button 
                          onClick={() => setRatingOrder(o)}
                          className="flex items-center gap-2 bg-yellow-400 text-slate-900 px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-yellow-200 active:scale-95 transition-all"
                        >
                          <Star className="w-4 h-4 fill-slate-900" /> قيّم التجربة
                        </button>
                     ) : (
                        <div className="flex -space-x-3 rtl:space-x-reverse">
                           {o.products.slice(0, 3).map((item, i) => (
                              <img key={i} src={item.product.image} className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
                           ))}
                        </div>
                     )}
                  </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-50 text-center">
               <div className="relative inline-block mb-10">
                 <div className="w-40 h-40 rounded-full border-8 border-slate-50 shadow-2xl p-2 bg-white">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} className="w-full h-full object-cover rounded-full" />
                 </div>
                 <button className="absolute bottom-2 right-2 brand-gradient text-white p-3 rounded-2xl border-4 border-white shadow-xl"><Camera className="w-6 h-6" /></button>
               </div>
               <h3 className="text-3xl font-black text-slate-900 mb-2">{userName}</h3>
               <div className="flex items-center justify-center gap-2 text-slate-400 font-bold mb-10">
                  <Award className="w-4 h-4 text-brand-500" />
                  <span>زبون ذهبي في كيمو</span>
               </div>
               <div className="space-y-4">
                  <button onClick={onLogout} className="w-full bg-red-50 text-red-500 py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                    <LogOut className="w-6 h-6" /> تسجيل الخروج
                  </button>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-8 left-8 right-8 bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] p-3 flex justify-around items-center floating-nav z-[200] border border-white/10">
        <NavBtn act={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} icon={<User />} />
        <NavBtn act={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ClipboardList />} />
        <NavBtn act={activeTab === 'HOME'} onClick={() => setActiveTab('HOME')} icon={<Home />} />
      </nav>

      {/* Cart Drawer */}
      {cart.length > 0 && activeTab === 'HOME' && activeStore && (
        <div className="fixed bottom-32 left-8 right-8 bg-white rounded-[2.8rem] shadow-[0_-20px_80px_rgba(0,0,0,0.15)] p-8 z-[150] animate-slide-up border border-slate-100">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-2xl text-slate-900">سلتك الحالية</h3>
              <button onClick={() => setCart([])} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button>
           </div>
           <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] mb-6">
              <div>
                 <p className="text-xs text-slate-400 font-bold">المجموع الكلي</p>
                 <p className="text-3xl font-black text-brand-500">{formatCurrency(grandTotal)}</p>
              </div>
              <button onClick={handleCheckout} disabled={isOrdering} className="brand-gradient text-white px-10 py-4 rounded-[1.8rem] font-black shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                {isOrdering ? <Loader2 className="animate-spin" /> : <><ShoppingCart /> اطلب الآن</>}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

const NavBtn = ({ act, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-5 rounded-full transition-all duration-500 ${act ? 'bg-brand-500 text-white scale-125 shadow-[0_10px_25px_rgba(249,115,22,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
    {React.cloneElement(icon, { size: 28 })}
  </button>
);