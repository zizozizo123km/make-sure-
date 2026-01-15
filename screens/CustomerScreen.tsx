
import React, { useState, useMemo, useEffect } from 'react';
import { Category, Product, StoreProfile, OrderStatus } from '../types';
import { calculateDistance, calculateDeliveryFee, formatCurrency, BIR_EL_ATER_CENTER } from '../utils/helpers';
import { MapVisualizer } from '../components/MapVisualizer';
import { RatingModal } from '../components/RatingModal';
import { db, auth } from '../services/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { Search, Star, Plus, Minus, ShoppingCart, ShoppingBag, MapPin, X, ShieldCheck, Bike, CheckCircle, ChevronLeft, Clock, ArrowRight, Loader2, Store, Utensils, Home } from 'lucide-react';

interface CustomerScreenProps {
  onLogout: () => void;
  userName: string;
}

const USER_LOCATION = { lat: 34.7520, lng: 8.0550 };

export const CustomerScreen: React.FC<CustomerScreenProps> = ({ onLogout, userName }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [activeStore, setActiveStore] = useState<StoreProfile | null>(null);
  const [activeStoreProducts, setActiveStoreProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>([]);
  const [showCart, setShowCart] = useState(false);
  
  // Real Order Tracking State
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [showTracking, setShowTracking] = useState(false);
  
  const [showRating, setShowRating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  // Handle Scroll Effect for Header
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch REAL Stores
  useEffect(() => {
    const storesRef = ref(db, 'stores');
    const unsubscribe = onValue(storesRef, (snapshot) => {
        const data = snapshot.val();
        let loadedStores: StoreProfile[] = [];
        if (data) {
            loadedStores = Object.keys(data).map(key => ({
                id: key, 
                name: data[key].name || 'متجر',
                rating: data[key].rating || 4.5,
                reviewCount: data[key].reviewCount || 0,
                isVerified: data[key].isVerified || false,
                category: data[key].category || Category.FOOD,
                location: data[key].location || 'بئر العاتر',
                coordinates: data[key].coordinates || BIR_EL_ATER_CENTER,
                image: data[key].image || `https://picsum.photos/200/200?random=${key}`
            }));
        }
        setStores(loadedStores);
        setLoadingStores(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch products
  useEffect(() => {
    if (activeStore) {
      setLoadingProducts(true);
      const productsRef = ref(db, 'products');
      const unsubscribe = onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        let allProducts: Product[] = [];
        if (data) {
          Object.keys(data).forEach(key => {
            if (data[key].storeId === activeStore.id) {
              allProducts.push({ ...data[key], id: key });
            }
          });
        }
        setActiveStoreProducts(allProducts);
        setLoadingProducts(false);
      });
      return () => unsubscribe();
    }
  }, [activeStore]);

  // TRACK ORDER STATUS
  useEffect(() => {
    if (currentOrderId) {
        const orderRef = ref(db, `orders/${currentOrderId}`);
        const unsubscribe = onValue(orderRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setOrderStatus(data.status);
            }
        });
        return () => unsubscribe();
    }
  }, [currentOrderId]);

  const storesWithDistance = useMemo(() => {
    return stores.map(store => ({
      ...store,
      distance: calculateDistance(USER_LOCATION, store.coordinates)
    })).sort((a, b) => a.distance - b.distance);
  }, [stores]);

  const filteredStores = useMemo(() => {
    let result = storesWithDistance;
    if (selectedCategory !== 'ALL') {
      result = result.filter(s => s.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [selectedCategory, searchQuery, storesWithDistance]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? {...item, quantity: item.quantity + 1} : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
        if (item.product.id === productId) {
            return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
    }).filter(item => item.quantity > 0));
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryDistance = activeStore ? calculateDistance(USER_LOCATION, activeStore.coordinates) : 0;
  const deliveryFee = calculateDeliveryFee(deliveryDistance, cartTotal);
  const grandTotal = cartTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !auth.currentUser || !activeStore) return;
    const orderData = {
        customerId: auth.currentUser.uid,
        customerName: userName,
        storeId: activeStore.id,
        storeName: activeStore.name,
        products: cart,
        totalPrice: grandTotal,
        deliveryFee: deliveryFee,
        status: OrderStatus.PENDING,
        timestamp: Date.now(),
        address: 'حي السلام، بئر العاتر',
        coordinates: USER_LOCATION,
        storeCoordinates: activeStore.coordinates
    };

    try {
        const newOrderRef = push(ref(db, 'orders'));
        await set(newOrderRef, orderData);
        setCurrentOrderId(newOrderRef.key);
        setOrderStatus(OrderStatus.PENDING);
        setShowTracking(true);
        setShowCart(false);
    } catch (error) {
        console.error("Error placing order:", error);
    }
  };

  const closeOrderFlow = () => {
    setShowRating(true);
    setCart([]);
    setActiveStore(null);
    setCurrentOrderId(null);
    setOrderStatus(null);
    setShowTracking(false);
  };

  // ORDER TRACKING SCREEN
  if (showTracking && currentOrderId && orderStatus) {
    let stage = 1;
    let message = 'يتم إرسال طلبك للمتجر...';
    let icon = <Loader2 className="w-14 h-14 text-brand-500 animate-spin" />;

    if (orderStatus === OrderStatus.PENDING) { stage = 1; message = 'بانتظار موافقة المتجر...'; icon = <Store className="w-14 h-14 text-brand-500 animate-bounce-small" />; }
    else if (orderStatus === OrderStatus.ACCEPTED_BY_STORE) { stage = 2; message = 'المتجر يجهز طلبك! جاري البحث عن سائق...'; icon = <Utensils className="w-14 h-14 text-warning animate-pulse" />; }
    else if (orderStatus === OrderStatus.ACCEPTED_BY_DRIVER) { stage = 3; message = 'السائق في الطريق إليك!'; icon = <Bike className="w-14 h-14 text-blue-500 animate-float" />; }
    else if (orderStatus === OrderStatus.DELIVERED) { stage = 4; message = 'وصل الطلب! بالصحة والعافية.'; icon = <CheckCircle className="w-14 h-14 text-success" />; }

    const progressWidth = stage === 1 ? '25%' : stage === 2 ? '50%' : stage === 3 ? '75%' : '100%';

    return (
      <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-4xl p-10 shadow-2xl animate-scale-up border border-primary-100">
           <div className="bg-primary-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
             {icon}
           </div>
           <h2 className="text-3xl font-black text-primary-800 mb-2">حالة الطلب</h2>
           <p className="text-primary-600 mb-8 font-medium">{message}</p>
           <div className="w-full bg-primary-100 rounded-full h-2 mb-10 overflow-hidden">
             <div className="h-full bg-brand-500 transition-all duration-1000 ease-out" style={{ width: progressWidth }}></div>
           </div>
           
           <div className="flex flex-col gap-3">
             {stage === 4 && (
                <button onClick={closeOrderFlow} className="w-full bg-success text-white py-4 rounded-2xl font-bold shadow-lg">إتمام وتقييم</button>
             )}
             <button 
                onClick={() => setShowTracking(false)} 
                className="w-full bg-primary-100 text-primary-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-200 transition-colors"
             >
                <Home className="w-5 h-5" /> العودة للرئيسية
             </button>
           </div>
           <p className="text-xs text-primary-300 mt-6">رقم الطلب: {currentOrderId.slice(-6)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-50 min-h-screen pb-28">
      {showRating && <RatingModal type="STORE" targetName={activeStore?.name || "المتجر"} onClose={() => setShowRating(false)} />}

      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'glass shadow-lg py-2' : 'bg-transparent py-4'}`}>
        <div className="container max-w-lg mx-auto px-4 flex items-center justify-between">
          {!activeStore ? (
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg"><span className="text-white font-black text-xl">K</span></div>
               <div>
                 <h1 className="font-bold text-primary-800 text-lg leading-none">مرحباً، {userName || 'زائر'}</h1>
                 <p className="text-xs text-primary-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-500" /> بئر العاتر</p>
               </div>
             </div>
          ) : (
             <button onClick={() => setActiveStore(null)} className="flex items-center gap-2 glass px-3 py-2 rounded-3xl backdrop-blur-md font-bold text-primary-700"><ChevronLeft className="w-5 h-5" /> العودة</button>
          )}
          <div className="flex items-center gap-2">
            {!activeStore && <button onClick={onLogout} className="w-11 h-11 glass rounded-full flex items-center justify-center text-primary-400 hover:text-danger"><X className="w-5 h-5" /></button>}
            {activeStore && (
              <button className="relative w-12 h-12 bg-primary-900 rounded-full flex items-center justify-center shadow-lg" onClick={() => setShowCart(true)}>
                <ShoppingCart className="w-6 h-6 text-white" />
                {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-bold">{cart.length}</span>}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container max-w-lg mx-auto pt-24 px-4">
        {!activeStore ? (
          <div className="space-y-6">
            {/* Active Order Banner */}
            {currentOrderId && orderStatus && !showTracking && (
              <button 
                onClick={() => setShowTracking(true)}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-500 p-4 rounded-3xl shadow-xl flex items-center justify-between text-white animate-fade-in-up"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl"><Bike className="w-6 h-6" /></div>
                  <div className="text-right">
                    <p className="text-xs font-bold opacity-80">لديك طلب قيد التتبع</p>
                    <p className="font-black">اضغط لمتابعة حالة طلبك</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            )}

            <div className="relative group">
               <input type="text" placeholder="ابحث عن متجر أو أكلة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-primary-100 rounded-3xl py-4 pl-4 pr-12 shadow-md text-primary-700 font-bold focus:ring-2 focus:ring-brand-500 transition-all" />
               <Search className="absolute right-4 top-4 w-6 h-6 text-primary-400" />
            </div>

            <div className="bg-white p-2 rounded-4xl shadow-md border border-primary-100 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2"><h2 className="font-bold text-primary-800">بالقرب منك</h2></div>
                <div className="rounded-3xl overflow-hidden"><MapVisualizer userType="CUSTOMER" height="h-32" /></div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {['ALL', ...Object.values(Category)].map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat as Category | 'ALL')} className={`shrink-0 px-6 py-3 rounded-3xl text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-primary-900 text-white shadow-lg' : 'bg-white text-primary-600 border border-primary-100'}`}>{cat === 'ALL' ? 'الكل' : cat}</button>
              ))}
            </div>

            <div className="space-y-4">
                <h2 className="font-bold text-xl text-primary-800">المتاجر</h2>
                {loadingStores ? ( <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div> ) : (
                    <div className="grid grid-cols-1 gap-6 pb-4">
                        {filteredStores.map(store => (
                        <div key={store.id} onClick={() => setActiveStore(store)} className="bg-white rounded-4xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer border border-primary-100">
                            <div className="h-40 bg-primary-200 relative">
                                <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/60 to-transparent"></div>
                                <div className="absolute bottom-4 right-4 text-white">
                                    <h3 className="font-bold text-2xl mb-0">{store.name}</h3>
                                    <p className="text-xs opacity-80 flex items-center gap-1"><MapPin className="w-3 h-3" /> {store.location}</p>
                                </div>
                                <div className="absolute bottom-4 left-4 glass bg-white/20 text-white px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1"><Star className="w-3 h-3 text-warning fill-warning" /> {store.rating}</div>
                            </div>
                            <div className="p-4 flex justify-between items-center">
                                <span className="bg-primary-50 px-3 py-1 rounded-2xl text-xs font-bold text-primary-500">{store.category}</span>
                                <span className="text-sm font-bold text-primary-900">{store.distance} كم</span>
                            </div>
                        </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up pb-10">
            <div className="relative h-56 rounded-4xl overflow-hidden shadow-lg mb-6">
                <img src={activeStore.image} alt={activeStore.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/70 to-transparent"></div>
                <div className="absolute bottom-6 right-6 text-white">
                    <h2 className="text-3xl font-black mb-1">{activeStore.name}</h2>
                    <p className="text-sm opacity-90">{activeStore.category} • {activeStore.rating} تقييم</p>
                </div>
            </div>

            <div className="space-y-4">
              {loadingProducts ? ( <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div> ) : (
                activeStoreProducts.map(product => (
                    <div key={product.id} className="bg-white p-4 rounded-3xl shadow-sm border border-primary-50 flex gap-4 transition-all hover:shadow-md">
                    <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-primary-100"><img src={product.image} alt={product.name} className="w-full h-full object-cover" /></div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                        <h3 className="font-bold text-lg text-primary-800 leading-tight">{product.name}</h3>
                        <p className="text-xs text-primary-400 line-clamp-2">{product.description}</p>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                        <span className="font-black text-brand-600">{formatCurrency(product.price)}</span>
                        <button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="bg-primary-900 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"><Plus className="w-5 h-5" /></button>
                        </div>
                    </div>
                    </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showCart && (
        <>
            <div className="fixed inset-0 bg-primary-900/60 z-50 backdrop-blur-sm" onClick={() => setShowCart(false)}></div>
            <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-5xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
                <div className="w-full flex justify-center py-4" onClick={() => setShowCart(false)}><div className="w-12 h-1.5 bg-primary-200 rounded-full"></div></div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <h2 className="text-2xl font-black text-primary-800 mb-6">سلة المشتريات</h2>
                    {cart.length === 0 ? ( <div className="text-center py-10 opacity-50"><ShoppingCart className="w-16 h-16 mx-auto mb-4" /><p>سلتك فارغة</p></div> ) : (
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.product.id} className="flex items-center gap-4 bg-primary-50 p-3 rounded-3xl">
                                    <img src={item.product.image} className="w-16 h-16 rounded-2xl object-cover" />
                                    <div className="flex-1"><h4 className="font-bold text-primary-800">{item.product.name}</h4><p className="text-brand-600 font-bold">{formatCurrency(item.product.price)}</p></div>
                                    <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-2xl shadow-sm">
                                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 text-primary-500"><Minus className="w-4 h-4"/></button>
                                        <span className="font-bold text-sm">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 text-primary-500"><Plus className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {cart.length > 0 && (
                    <div className="p-6 bg-primary-50 border-t border-primary-100 pb-10">
                        <div className="flex justify-between text-lg font-black text-primary-900 mb-6"><span>الإجمالي (مع التوصيل)</span> <span>{formatCurrency(grandTotal)}</span></div>
                        <button onClick={handlePlaceOrder} className="w-full bg-primary-900 text-white py-4 rounded-3xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 group"><span>تأكيد الطلب</span> <ArrowRight className="w-5 h-5 group-hover:translate-x-[-4px] transition-transform" /></button>
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};
