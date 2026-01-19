
import React, { useState, useEffect, useRef } from 'react';
import { Category, Product, StoreProfile, OrderStatus, Order, Coordinates } from '../types';
import { formatCurrency } from '../utils/helpers';
import { db, auth } from '../services/firebase';
import { ref, onValue, push, set, update, off } from 'firebase/database';
import { 
  Search, Plus, Minus, ShoppingCart, MapPin, Loader2, Home, User, 
  Camera, LogOut, ClipboardList, Trash2, Star, ShieldCheck, 
  LayoutGrid, Save, RefreshCw, Phone, Sparkles, Navigation, X, Bot, Send,
  ChevronLeft, ShoppingBag, Heart, Filter, CheckCircle2, Layout, Bike, PhoneCall,
  Clock, Map as MapIcon, Timer, Truck, ArrowRight, CheckCircle, Edit3, ShoppingBasket,
  Utensils, Shirt, Smartphone, Briefcase, BabyIcon, MessageSquareQuote
} from 'lucide-react';
import { MapVisualizer } from '../components/MapVisualizer';
import { RatingModal } from '../components/RatingModal';

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
    console.error("Cloudinary Error:", error);
    return null; 
  }
};

export const CustomerScreen: React.FC<{onLogout: () => void, userName: string}> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'CATEGORIES' | 'ORDERS' | 'PROFILE'>('HOME');
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [driverLiveCoords, setDriverLiveCoords] = useState<Coordinates | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '', avatar: '', coordinates: null as any });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // مرجع لمنع تحديث الواجهة ببيانات قديمة من السيرفر فور الرفع
  const isUpdatingRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    
    const storesRef = ref(db, 'stores');
    onValue(storesRef, (snap) => {
      const data = snap.val();
      if (data) setStores(Object.keys(data).map(k => ({ id: k, ...data[k] })));
    });

    const productsRef = ref(db, 'products');
    onValue(productsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.keys(data)
          .map(k => ({ id: k, ...data[k] }))
          .filter(p => p.storeId && p.name && p.price !== undefined);
        setAllProducts(list);
      }
      setLoading(false);
    });

    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snap) => {
      const data = snap.val();
      const list: Order[] = [];
      if (data) Object.keys(data).forEach(k => { if (data[k].customerId === user.uid) list.push({ id: k, ...data[k] }); });
      setMyOrders(list.sort((a, b) => b.timestamp - a.timestamp));
      
      if (trackingOrder) {
        const updated = list.find(o => o.id === trackingOrder.id);
        if (updated) setTrackingOrder(updated);
      }
    });

    const userProfileRef = ref(db, `customers/${user.uid}`);
    onValue(userProfileRef, (snap) => {
      // نحدث الحالة فقط إذا لم نكن في مرحلة رفع صورة حالية لمنع "الصورة البيضاء"
      if (snap.exists() && !isUpdatingRef.current) {
        const data = snap.val();
        setProfileData({ 
          name: data.name || '', 
          phone: data.phone || '',
          avatar: data.avatar || '',
          coordinates: data.coordinates || null
        });
      }
    });
  }, [user, trackingOrder]);

  useEffect(() => {
    if (trackingOrder?.driverId) {
      const driverPosRef = ref(db, `drivers/${trackingOrder.driverId}/coordinates`);
      onValue(driverPosRef, (snap) => {
        if (snap.exists()) setDriverLiveCoords(snap.val());
      });
      return () => off(driverPosRef);
    }
  }, [trackingOrder]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      isUpdatingRef.current = true; // تفعيل القفل لمنع تحديثات onValue
      const localPreviewUrl = URL.createObjectURL(file);
      setProfileData(prev => ({ ...prev, avatar: localPreviewUrl }));
      setIsUploadingAvatar(true);
      
      try {
        const remoteUrl = await uploadImage(file);
        if (remoteUrl) {
          // تحديث السيرفر أولاً
          await update(ref(db, `customers/${user.uid}`), { avatar: remoteUrl });
          // تحديث الواجهة فوراً بالرابط الجديد
          setProfileData(prev => ({ ...prev, avatar: remoteUrl }));
          // ننتظر قليلاً قبل السماح لـ onValue بالعمل مرة أخرى لضمان ثبات البيانات في السيرفر
          setTimeout(() => { isUpdatingRef.current = false; }, 4000);
        } else {
          isUpdatingRef.current = false;
        }
      } catch (err) {
        console.error(err);
        isUpdatingRef.current = false;
      } finally {
        setIsUploadingAvatar(false);
      }
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

  const subtotal = cart.reduce((s, i) => s + (i.product.price * i.quantity), 0);
  const deliveryFee = 200;
  const grandTotal = subtotal + deliveryFee;

  const handleCheckout = async () => {
    if (cart.length === 0 || !user) return;
    setIsOrdering(true);
    try {
      const firstProductStoreId = cart[0].product.storeId;
      const store = stores.find(s => s.id === firstProductStoreId);
      
      const orderData = {
        customerId: user.uid, 
        customerName: profileData.name || userName || "زبون كيمو",
        storeId: firstProductStoreId, 
        storeName: store?.name || "متجر كيمو",
        storePhone: store?.phone || '',
        products: JSON.parse(JSON.stringify(cart)),
        totalPrice: grandTotal, 
        deliveryFee: deliveryFee,
        status: OrderStatus.PENDING, 
        timestamp: Date.now(),
        address: "بئر العاتر",
        customerPhone: profileData.phone || '',
        coordinates: profileData.coordinates || { lat: 34.7495, lng: 8.0617 },
        storeCoordinates: store?.coordinates || { lat: 34.7495, lng: 8.0617 }
      };

      const newOrderRef = push(ref(db, 'orders'));
      await set(newOrderRef, orderData);
      setCart([]); 
      setShowCheckout(false);
      setActiveTab('ORDERS');
    } catch (error) {
      alert("حدث خطأ أثناء إتمام الطلب");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !profileData.name) return;
    setIsUpdating(true);
    isUpdatingRef.current = true;
    try {
      await update(ref(db, `customers/${user.uid}`), { 
        name: profileData.name, 
        phone: profileData.phone,
        avatar: profileData.avatar
      });
      setIsEditingProfile(false);
      alert("تم حفظ البيانات بنجاح ✓");
      setTimeout(() => { isUpdatingRef.current = false; }, 3000);
    } catch (e) {
      isUpdatingRef.current = false;
      alert("فشل تحديث البيانات");
    } finally {
      setIsUpdating(false);
    }
  };

  const getCategoryIcon = (cat: Category) => {
    switch (cat) {
      case Category.FOOD: return <Utensils size={32} />;
      case Category.CLOTHES: return <Shirt size={32} />;
      case Category.PHONES: return <Smartphone size={32} />;
      case Category.SERVICES: return <Briefcase size={32} />;
      case Category.KIDS: return <BabyIcon size={32} />;
      default: return <ShoppingBag size={32} />;
    }
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setActiveTab('HOME');
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white space-y-4">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center animate-bounce">
        <ShoppingBasket className="text-orange-500 w-8 h-8" />
      </div>
      <p className="font-black text-slate-400 text-sm animate-pulse">جاري جلب أفضل المنتجات...</p>
    </div>
  );

  const filteredProducts = allProducts
    .filter(p => !selectedCategory || p.category === selectedCategory)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-40 font-cairo text-right" dir="rtl">
      
      {ratingOrder && (
        <RatingModal 
          type="STORE" 
          targetId={ratingOrder.storeId} 
          targetName={ratingOrder.storeName} 
          orderId={ratingOrder.id}
          onClose={() => setRatingOrder(null)} 
        />
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm animate-fade-in flex items-end">
           <div className="w-full bg-white rounded-t-[3rem] p-8 animate-slide-up shadow-2xl flex flex-col max-h-[90vh]">
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 shrink-0"></div>
              
              <div className="flex justify-between items-center mb-8 shrink-0">
                 <h3 className="text-2xl font-black text-slate-800">تأكيد طلبك</h3>
                 <button onClick={() => setShowCheckout(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1">
                 {cart.map(item => (
                   <div key={item.product.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-[2rem]">
                      <img src={item.product.image} className="w-16 h-16 rounded-2xl object-cover" />
                      <div className="flex-1">
                         <h4 className="font-bold text-slate-800 text-sm">{item.product.name}</h4>
                         <p className="text-orange-500 font-black text-xs">{formatCurrency(item.product.price)}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl shadow-sm">
                         <button onClick={() => removeFromCart(item.product.id)} className="text-slate-400"><Minus size={14}/></button>
                         <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                         <button onClick={() => addToCart(item.product)} className="text-orange-500"><Plus size={14}/></button>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.5rem] space-y-3 mb-8 shrink-0">
                 <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>مجموع المنتجات</span>
                    <span>{formatCurrency(subtotal)}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>رسوم التوصيل</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                 </div>
                 <div className="h-px bg-slate-200 my-2"></div>
                 <div className="flex justify-between text-lg font-black text-slate-800">
                    <span>الإجمالي النهائي</span>
                    <span className="text-orange-600">{formatCurrency(grandTotal)}</span>
                 </div>
              </div>

              <button 
                onClick={handleCheckout} 
                disabled={isOrdering}
                className="w-full brand-gradient text-white py-5 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 shrink-0"
              >
                {isOrdering ? <Loader2 className="animate-spin" /> : <><CheckCircle size={24}/> تأكيد وطلب الآن</>}
              </button>
           </div>
        </div>
      )}

      {trackingOrder && (
        <div className="fixed inset-0 z-[1000] bg-white animate-fade-in flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white shadow-sm">
            <button onClick={() => setTrackingOrder(null)} className="p-2 bg-slate-100 rounded-full active:scale-90"><X size={20}/></button>
            <div className="text-center">
               <h3 className="font-black text-slate-800 text-sm">تتبع طلب كيمو المباشر</h3>
               <p className="text-[9px] font-bold text-slate-400">رقم الطلب: #{trackingOrder.id?.slice(-5).toUpperCase()}</p>
            </div>
            <div className="w-10"></div>
          </div>
          
          <div className="flex-1 relative">
            <MapVisualizer 
              height="h-full" 
              zoom={15}
              customerLocation={trackingOrder.coordinates}
              storeLocation={trackingOrder.storeCoordinates}
              driverLocation={driverLiveCoords || undefined}
            />
          </div>

          <div className="bg-white p-6 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] -mt-10 z-[1001] relative border-t border-slate-50">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6"></div>
            
            <div className="flex items-center justify-between mb-8 px-2">
               <StatusStep label="انتظار" active={true} done={trackingOrder.status !== OrderStatus.PENDING} />
               <div className={`flex-1 h-0.5 mx-1 rounded-full ${trackingOrder.status !== OrderStatus.PENDING ? 'bg-orange-500' : 'bg-slate-100'}`}></div>
               <StatusStep label="تجهيز" active={trackingOrder.status !== OrderStatus.PENDING} done={trackingOrder.status === OrderStatus.ACCEPTED_BY_STORE || trackingOrder.status === OrderStatus.ACCEPTED_BY_DRIVER || trackingOrder.status === OrderStatus.PICKED_UP || trackingOrder.status === OrderStatus.DELIVERED} />
               <div className={`flex-1 h-0.5 mx-1 rounded-full ${trackingOrder.status === OrderStatus.ACCEPTED_BY_DRIVER || trackingOrder.status === OrderStatus.PICKED_UP || trackingOrder.status === OrderStatus.DELIVERED ? 'bg-orange-500' : 'bg-slate-100'}`}></div>
               <StatusStep label="المتجر" active={trackingOrder.status === OrderStatus.ACCEPTED_BY_DRIVER} done={trackingOrder.status === OrderStatus.PICKED_UP || trackingOrder.status === OrderStatus.DELIVERED} />
               <div className={`flex-1 h-0.5 mx-1 rounded-full ${trackingOrder.status === OrderStatus.PICKED_UP || trackingOrder.status === OrderStatus.DELIVERED ? 'bg-orange-500' : 'bg-slate-100'}`}></div>
               <StatusStep label="الطريق" active={trackingOrder.status === OrderStatus.PICKED_UP} done={trackingOrder.status === OrderStatus.DELIVERED} />
               <div className={`flex-1 h-0.5 mx-1 rounded-full ${trackingOrder.status === OrderStatus.DELIVERED ? 'bg-orange-500' : 'bg-slate-100'}`}></div>
               <StatusStep label="وصل" active={trackingOrder.status === OrderStatus.DELIVERED} done={trackingOrder.status === OrderStatus.DELIVERED} />
            </div>

            <div className="flex items-center gap-4 mb-6 bg-slate-50 p-4 rounded-[2rem]">
              <div className="w-14 h-14 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Bike size={28} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-slate-800 text-base">{trackingOrder.driverName || 'جاري البحث...'}</h4>
                <p className="text-[10px] text-slate-400 font-bold">
                  {trackingOrder.status === OrderStatus.ACCEPTED_BY_DRIVER ? 'الموصل يتجه للمتجر الآن' : 
                   trackingOrder.status === OrderStatus.PICKED_UP ? 'الموصل في الطريق إليك' : 'موصل كيمو السريع'}
                </p>
              </div>
              {trackingOrder.driverPhone && (
                <a href={`tel:${trackingOrder.driverPhone}`} className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all">
                  <Phone size={20} />
                </a>
              )}
            </div>

            <div className="flex gap-3">
               <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Bot size={16} /> مساعدة كيمو
               </button>
               <button onClick={() => setTrackingOrder(null)} className="px-6 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white sticky top-0 z-[100] px-4 pt-4 pb-2 shadow-sm border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative cursor-pointer mr-1" onClick={() => { if(cart.length > 0) setShowCheckout(true); }}>
            <div className="bg-slate-100 p-2.5 rounded-full relative">
              <ShoppingCart className="w-5 h-5 text-slate-700" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#FF6000] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm">{cart.length}</span>}
            </div>
          </div>
          
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="ابحث عن منتج، مطعم..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F3F4F6] border-none rounded-full py-2.5 pr-10 pl-4 text-xs font-bold outline-none"
            />
            <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto no-scrollbar py-1 px-1">
          {['الكل', ...Object.values(Category)].map((cat) => (
            <button 
              key={cat}
              onClick={() => { setSelectedCategory(cat === 'الكل' ? null : cat); setActiveTab('HOME'); }}
              className={`whitespace-nowrap text-xs font-black pb-2 transition-all relative ${(!selectedCategory && cat === 'الكل') || selectedCategory === cat ? 'text-[#FF6000]' : 'text-slate-400'}`}
            >
              {cat}
              {((!selectedCategory && cat === 'الكل') || selectedCategory === cat) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#FF6000] rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      <main className="p-3 max-w-lg mx-auto">
        {activeTab === 'HOME' && (
          <div className="animate-fade-in-up">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {filteredProducts.map((p) => {
                    const cartItem = cart.find(i => i.product.id === p.id);
                    const store = stores.find(s => s.id === p.storeId);
                    return (
                      <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col relative group border border-slate-50 transition-all hover:shadow-md">
                        <div className="relative h-40 overflow-hidden bg-slate-50">
                          {p.image ? (
                            <img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300"><ShoppingBag /></div>
                          )}
                          {store?.rating && store.rating > 0 && (
                            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm border border-slate-100">
                               <Star size={10} className="text-yellow-400 fill-current" />
                               <span className="text-[9px] font-black text-slate-800">{store.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                          <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1 mb-1 leading-tight">{p.name}</h4>
                          <div className="mt-auto flex justify-between items-center">
                              <span className="text-orange-600 font-black text-sm">{formatCurrency(p.price)}</span>
                              <button onClick={() => addToCart(p)} className="w-8 h-8 rounded-full border border-slate-100 bg-white flex items-center justify-center text-orange-500 shadow-sm active:scale-90 transition-all"><Plus size={16} /></button>
                          </div>
                        </div>
                        {cartItem && <div className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-scale-up">{cartItem.quantity}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                   <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="text-slate-300 w-10 h-10" />
                   </div>
                   <h3 className="font-black text-slate-800 text-lg mb-1">لا توجد منتجات حالياً</h3>
                   <p className="text-slate-400 text-xs font-bold px-10">جرب البحث بكلمات أخرى أو تغيير القسم المختار من القائمة بالأعلى.</p>
                   <button onClick={() => {setSelectedCategory(null); setSearchQuery('');}} className="mt-6 text-orange-500 font-black text-xs underline">إظهار كل المنتجات</button>
                </div>
              )}
          </div>
        )}

        {activeTab === 'CATEGORIES' && (
           <div className="animate-fade-in-up space-y-6">
              <h2 className="text-2xl font-black text-slate-900 mb-6 px-2">أقسام كيمو</h2>
              <div className="grid grid-cols-2 gap-4">
                 {Object.values(Category).map((cat) => (
                   <button 
                    key={cat} 
                    onClick={() => handleCategorySelect(cat)}
                    className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-col items-center text-center gap-4 hover:shadow-md transition-all active:scale-95 group"
                   >
                      <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-[1.5rem] flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all shadow-inner">
                         {getCategoryIcon(cat)}
                      </div>
                      <span className="font-black text-slate-800 text-sm">{cat}</span>
                   </button>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'ORDERS' && (
           <div className="space-y-4 animate-fade-in-up">
              <h2 className="text-2xl font-black text-slate-900 mb-4 px-2">سجل طلباتي</h2>
              {myOrders.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                   <ClipboardList size={80} className="mx-auto mb-4" />
                   <p className="font-bold">لا توجد طلبات بعد</p>
                </div>
              ) : (
                myOrders.map(o => (
                  <div key={o.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="flex justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><ShoppingBag size={20} /></div>
                          <div>
                            <span className="text-sm font-black text-slate-800 block">{o.storeName}</span>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(o.timestamp).toLocaleString('ar-DZ')}</p>
                          </div>
                       </div>
                       <span className={`text-[9px] h-fit font-black px-4 py-1.5 rounded-full ${o.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{o.status}</span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-t border-slate-50">
                       <span className="text-xl font-black text-slate-900 leading-none">{formatCurrency(o.totalPrice)}</span>
                       <div className="flex gap-2">
                         {o.status === OrderStatus.DELIVERED && !(o as any).isRatedByCustomer && (
                           <button onClick={() => setRatingOrder(o)} className="bg-white text-orange-500 border border-orange-500 px-4 py-3 rounded-2xl font-black text-[11px] flex items-center gap-2 active:scale-95 transition-all"><Star size={14} /> تقييم المتجر</button>
                         )}
                         <button onClick={() => setTrackingOrder(o)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[11px] flex items-center gap-2 shadow-lg active:scale-95 transition-all"><MapIcon size={14} /> تتبع الحالة</button>
                       </div>
                    </div>
                  </div>
                ))
              )}
           </div>
        )}

        {activeTab === 'PROFILE' && (
           <div className="animate-fade-in-up">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm text-center border border-slate-50 relative overflow-hidden">
                 <div 
                  className="w-28 h-28 bg-slate-100 rounded-[2.5rem] mx-auto mb-6 border-4 border-white shadow-xl overflow-hidden relative group cursor-pointer"
                  onClick={() => isEditingProfile && !isUploadingAvatar && fileInputRef.current?.click()}
                 >
                    {profileData.avatar ? (
                      <img src={profileData.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                        <User size={40} />
                      </div>
                    )}
                    
                    {isEditingProfile && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white w-6 h-6" />
                      </div>
                    )}
                    
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <Loader2 className="animate-spin text-orange-500 w-6 h-6" />
                      </div>
                    )}
                 </div>
                 
                 <input type="file" id="customer-avatar-input" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                 
                 {!isEditingProfile ? (
                   <>
                     <h3 className="text-2xl font-black text-slate-800 mb-1">{profileData.name || userName}</h3>
                     <p className="text-xs text-slate-400 font-bold mb-8">{profileData.phone || 'لم يتم إضافة هاتف'}</p>
                     
                     <div className="space-y-3">
                       <button onClick={() => setIsEditingProfile(true)} className="w-full bg-slate-100 py-4 rounded-2xl font-black text-slate-700 text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                         <Edit3 size={18} /> تعديل الملف الشخصي
                       </button>
                       <button onClick={onLogout} className="w-full bg-pink-50 py-4 rounded-2xl font-black text-pink-500 text-sm flex items-center justify-center gap-2 mt-6 active:scale-95 transition-all">
                         <LogOut size={18} /> خروج من كيمو
                       </button>
                     </div>
                   </>
                 ) : (
                   <div className="space-y-6 text-right animate-scale-up">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">الاسم بالكامل</label>
                        <input 
                          type="text" 
                          value={profileData.name} 
                          onChange={e => setProfileData({...profileData, name: e.target.value})} 
                          className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 pr-2 uppercase">رقم الهاتف</label>
                        <input 
                          type="tel" 
                          value={profileData.phone} 
                          onChange={e => setProfileData({...profileData, phone: e.target.value})} 
                          className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all"
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={handleUpdateProfile} 
                          disabled={isUpdating || isUploadingAvatar}
                          className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center"
                        >
                          {isUpdating ? <Loader2 className="animate-spin" /> : 'حفظ التغييرات'}
                        </button>
                        <button 
                          onClick={() => { setIsEditingProfile(false); isUpdatingRef.current = false; }} 
                          className="px-6 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-sm"
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

      {cart.length > 0 && !showCheckout && activeTab === 'HOME' && (
        <div className="fixed bottom-24 left-4 right-4 z-[400] animate-slide-up">
           <button 
             onClick={() => setShowCheckout(true)}
             className="w-full brand-gradient text-white p-5 rounded-[2.5rem] shadow-[0_15px_30px_rgba(234,88,12,0.3)] flex items-center justify-between px-8 active:scale-95 transition-all"
           >
              <div className="flex items-center gap-4">
                 <div className="bg-white/20 p-2 rounded-xl"><ShoppingCart size={20}/></div>
                 <div className="text-right">
                    <p className="text-[10px] font-black opacity-80 leading-none">تأكيد الطلبية ({cart.length})</p>
                    <p className="text-lg font-black leading-none">{formatCurrency(grandTotal)}</p>
                 </div>
              </div>
              <ArrowRight size={24} className="rotate-180" />
           </button>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-20 flex justify-around items-center px-4 z-[500] shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        <NavBtn act={activeTab === 'HOME'} onClick={() => { setActiveTab('HOME'); setSelectedCategory(null); }} icon={<Home />} label="الرئيسية" />
        <NavBtn act={activeTab === 'CATEGORIES'} onClick={() => setActiveTab('CATEGORIES')} icon={<LayoutGrid />} label="الأقسام" />
        <NavBtn act={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ClipboardList />} label="طلباتي" />
        <NavBtn act={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} icon={<User />} label="حسابي" />
      </nav>
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

const StatusStep = ({ label, active, done }: { label: string; active: boolean; done: boolean }) => (
  <div className="flex flex-col items-center gap-1">
     <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${done ? 'bg-orange-500 text-white' : active ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-500 ring-offset-2' : 'bg-slate-100 text-slate-300'}`}>
        {done ? <CheckCircle2 size={12} /> : active ? <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div> : <Clock size={12} />}
     </div>
     <span className={`text-[8px] font-black uppercase ${active ? 'text-slate-800' : 'text-slate-300'}`}>{label}</span>
  </div>
);
