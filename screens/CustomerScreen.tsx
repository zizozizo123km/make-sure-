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
    console.log("CustomerScreen: Starting to fetch stores...");
    const storesRef = ref(db, 'stores');
    const unsubscribe = onValue(storesRef, (snapshot) => {
        const data = snapshot.val();
        let loadedStores: StoreProfile[] = [];
        
        if (data) {
            loadedStores = Object.keys(data).map(key => {
                const storeData = data[key];
                return {
                    id: key, 
                    name: storeData.name || 'متجر بدون اسم',
                    rating: storeData.rating || 4.5, // Use actual rating if available
                    reviewCount: storeData.reviewCount || 0, // Use actual count if available
                    isVerified: storeData.isVerified || false, // Use actual verification if available
                    category: storeData.category || Category.FOOD, // Use actual category if available
                    location: storeData.location || 'بئر العاتر',
                    coordinates: storeData.coordinates || { 
                        lat: BIR_EL_ATER_CENTER.lat + (Math.random() - 0.5) * 0.01, 
                        lng: BIR_EL_ATER_CENTER.lng + (Math.random() - 0.5) * 0.01 
                    },
                    image: storeData.image || `https://picsum.photos/200/200?random=${key}`
                };
            });
            console.log("CustomerScreen: Fetched stores from DB:", loadedStores);
        } else {
            console.log("CustomerScreen: No stores found in DB.");
        }

        const localStores = JSON.parse(localStorage.getItem('kimo_local_stores') || '[]');
        localStores.forEach((localStore: any) => {
            if (!loadedStores.find(s => s.id === localStore.id)) {
                loadedStores.push({
                    ...localStore,
                    coordinates: localStore.coordinates || { 
                        lat: BIR_EL_ATER_CENTER.lat + (Math.random() - 0.5) * 0.01, 
                        lng: BIR_EL_ATER_CENTER.lng + (Math.random() - 0.5) * 0.01 
                    }
                });
            }
        });

        console.log("CustomerScreen: All stores (DB + Local) before setting state:", loadedStores);
        setStores(loadedStores);
        setLoadingStores(false);
    }, (error) => {
      console.error("CustomerScreen: Error fetching stores:", error);
      setLoadingStores(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch products
  useEffect(() => {
    if (activeStore) {
      console.log(`CustomerScreen: Starting to fetch products for store: ${activeStore.id}`);
      setLoadingProducts(true);
      const productsRef = ref(db, 'products');
      
      const unsubscribe = onValue(productsRef, (snapshot) => {
        let allProducts: Product[] = [];
        const data = snapshot.val();
        if (data) {
          Object.keys(data).forEach(key => {
            allProducts.push({ ...data[key], id: key });
          });
          console.log("CustomerScreen: All products fetched from DB:", allProducts);
        } else {
            console.log("CustomerScreen: No products found in DB.");
        }
        
        const localProducts = JSON.parse(localStorage.getItem('kimo_local_products') || '[]');
        allProducts = [...allProducts, ...localProducts];
        console.log("CustomerScreen: All products (DB + Local) before filtering:", allProducts);

        console.log("CustomerScreen: Filtering products for storeId:", activeStore.id);
        const storeProducts = allProducts.filter((p: any) => p.storeId === activeStore.id);
        
        console.log("CustomerScreen: Filtered products for active store:", storeProducts);
        setActiveStoreProducts(storeProducts);
        setLoadingProducts(false);
      }, (error) => {
        console.error(`CustomerScreen: Error fetching products for store ${activeStore.id}:`, error);
        setLoadingProducts(false);
      });

      return () => unsubscribe();
    } else {
      setActiveStoreProducts([]);
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
                // If it becomes delivered, show tracking if it was closed
                if (data.status === OrderStatus.DELIVERED) {
                  setShowTracking(true);
                }
            }
        }, (error) => {
          console.error(`CustomerScreen: Error fetching order ${currentOrderId}:`, error);
        });
        return () => unsubscribe();
    }
  }, [currentOrderId]);

  const storesWithDistance = useMemo(() => {
    const calculated = stores.map(store => ({
      ...store,
      distance: calculateDistance(USER_LOCATION, store.coordinates)
    })).sort((a, b) => a.distance - b.distance);
    console.log("CustomerScreen: Stores with distance:", calculated);
    return calculated;
  }, [stores]);

  const filteredStores = useMemo(() => {
    let result = storesWithDistance;
    if (selectedCategory !== 'ALL') {
      result = result.filter(s => s.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    console.log("CustomerScreen: Final filtered stores for display:", result);
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
  
  const getDeliveryDistance = () => {
      if (activeStore) return calculateDistance(USER_LOCATION, activeStore.coordinates);
      if (cart.length > 0) {
          const storeId = cart[0].product.storeId;
          const store = stores.find(s => s.id === storeId);
          return store ? calculateDistance(USER_LOCATION, store.coordinates) : 0;
      }
      return 0;
  }
  
  const deliveryDistance = getDeliveryDistance();
  const deliveryFee = calculateDeliveryFee(deliveryDistance, cartTotal);
  const grandTotal = cartTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    
    // Determine store (assuming all items from same store for now)
    const storeId = cart[0].product.storeId;
    const store = stores.find(s => s.id === storeId);
    
    if (!auth.currentUser) {
        alert("يجب تسجيل الدخول لإتمام الطلب");
        return;
    }

    const orderData = {
        customerId: auth.currentUser.uid,
        customerName: userName,
        storeId: storeId,
        storeName: store?.name || 'Unknown Store',
        products: cart,
        totalPrice: grandTotal,
        deliveryFee: deliveryFee,
        status: OrderStatus.PENDING,
        timestamp: Date.now(),
        address: 'حي السلام، بئر العاتر', // Hardcoded for demo
        coordinates: USER_LOCATION,
        storeCoordinates: store?.coordinates
    };

    try {
        const newOrderRef = push(ref(db, 'orders'));
        await set(newOrderRef, orderData);
        
        setCurrentOrderId(newOrderRef.key);
        setOrderStatus(OrderStatus.PENDING);
        setShowTracking(true);
        setShowCart(false);
        alert("تم إرسال طلبك بنجاح!");
    } catch (error) {
        console.error("CustomerScreen: Error placing order:", error);
        alert("حدث خطأ أثناء إرسال الطلب: " + error.message);
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

  // ORDER TRACKING SCREEN (Dynamic based on Firebase Status)
  if (showTracking && currentOrderId && orderStatus) {
    let stage = 1;
    let message = 'يتم إرسال طلبك للمتجر...';
    let icon = <Loader2 className="w-14 h-14 text-brand-500 animate-spin" />;
    let progressBarColor = 'from-brand-500 to-brand-400';
    let iconBgColor = 'bg-brand-100';

    if (orderStatus === OrderStatus.PENDING) {
        stage = 1;
        message = 'بانتظار موافقة المتجر...';
        icon = <Store className="w-14 h-14 text-brand-500 animate-bounce-small" />;
        progressBarColor = 'from-brand-500 to-brand-400';
        iconBgColor = 'bg-brand-100';
    } else if (orderStatus === OrderStatus.ACCEPTED_BY_STORE) {
        stage = 2;
        message = 'المتجر يجهز طلبك الآن! جاري البحث عن سائق...';
        icon = <Utensils className="w-14 h-14 text-warning animate-pulse" />;
        progressBarColor = 'from-warning to-orange-400';
        iconBgColor = 'bg-warning/20';
    } else if (orderStatus === OrderStatus.ACCEPTED_BY_DRIVER) {
        stage = 3;
        message = 'السائق في الطريق إليك!';
        icon = <Bike className="w-14 h-14 text-blue-500 animate-float" />;
        progressBarColor = 'from-blue-500 to-blue-400';
        iconBgColor = 'bg-blue-100';
    } else if (orderStatus === OrderStatus.DELIVERED) {
        stage = 4;
        message = 'وصل الطلب! بالصحة والعافية.';
        icon = <CheckCircle className="w-14 h-14 text-success" />;
        progressBarColor = 'from-success to-emerald-400';
        iconBgColor = 'bg-success/20';
    }

    // Determine progress bar width
    const progressWidth = stage === 1 ? '25%' : stage === 2 ? '50%' : stage === 3 ? '75%' : '100%';

    return (
      <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50 to-white opacity-50 z-0"></div>
        
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-4xl p-10 shadow-2xl border border-white/50 z-10 text-center animate-scale-up">
           <div className="relative mb-8 mx-auto w-36 h-36">
             <div className={`absolute inset-0 ${iconBgColor} rounded-full animate-pulse-slow opacity-50`}></div>
             <div className="relative bg-white w-36 h-36 rounded-full flex items-center justify-center shadow-lg border-4 border-primary-50">
               {icon}
             </div>
           </div>

           <h2 className="text-4xl font-black text-primary-800 mb-3 font-cairo">
            {stage === 4 ? 'تم التوصيل' : 'حالة الطلب'}
          </h2>
          
          <p className="text-primary-600 mb-8 font-medium leading-relaxed text-lg">
            {message}
          </p>

          <div className="w-full bg-primary-100 rounded-full h-3 mb-8 overflow-hidden">
             <div 
                className={`h-full bg-gradient-to-r ${progressBarColor} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]`} 
                style={{ width: progressWidth }}
             ></div>
          </div>

          <div className="space-y-4">
            {stage === 4 && (
              <button onClick={closeOrderFlow} className="w-full bg-primary-900 text-white py-4 rounded-3xl font-bold shadow-xl hover:scale-105 transition-transform hover:bg-brand-600">
                إتمام وتقييم
              </button>
            )}
            
            <button 
              onClick={() => setShowTracking(false)} 
              className="w-full bg-primary-100 text-primary-700 py-3 rounded-3xl font-bold hover:bg-primary-200 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              <span>العودة للرئيسية</span>
            </button>
          </div>
          
          {stage < 4 && (
              <p className="text-xs text-primary-400 mt-4">رقم الطلب: {currentOrderId.slice(-6)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-50 min-h-screen pb-28">
      {showRating && <RatingModal type="STORE" targetName={activeStore?.name || "المتجر"} onClose={() => setShowRating(false)} />}

      {/* Floating Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'glass shadow-lg py-2' : 'bg-transparent py-4'}`}>
        <div className="container max-w-lg mx-auto px-4 flex items-center justify-between">
          {!activeStore ? (
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                 <span className="text-white font-black text-xl">K</span>
               </div>
               <div className={`transition-all duration-300 ${scrolled ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                 <h1 className="font-bold text-primary-800 text-lg leading-none">مرحباً، {userName || 'زائر'}</h1>
                 <p className="text-xs text-primary-500 flex items-center mt-1">
                   <MapPin className="w-3 h-3 ml-1 text-brand-500" /> حي السلام، بئر العاتر
                 </p>
               </div>
             </div>
          ) : (
             <button onClick={() => setActiveStore(null)} className="flex items-center gap-2 glass px-3 py-2 rounded-3xl backdrop-blur-md border border-white/50 hover:bg-white/70">
                <ChevronLeft className="w-5 h-5 text-primary-700" />
                <span className="font-bold text-primary-700">العودة</span>
             </button>
          )}
          
          <div className="flex items-center gap-2">
            {!activeStore && (
                <button onClick={onLogout} className="w-11 h-11 glass rounded-full flex items-center justify-center text-primary-400 hover:text-danger shadow-sm border border-white/50">
                    <X className="w-5 h-5" />
                </button>
            )}
            {activeStore && (
              <button 
                  className="relative w-12 h-12 bg-primary-900 rounded-full flex items-center justify-center shadow-lg hover:bg-brand-600 transition-colors"
                  onClick={() => setShowCart(true)}
              >
                  <ShoppingCart className="w-6 h-6 text-white" />
                  {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-bold animate-scale-up">
                      {cart.length}
                  </span>
                  )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="container max-w-lg mx-auto pt-24 px-4">
        
        {!activeStore ? (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Search Bar */}
            <div className="relative group">
               <input 
                  type="text" 
                  placeholder="ابحث عن مطعم، أكلة، أو متجر..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-primary-100 rounded-3xl py-4 pl-4 pr-12 shadow-md text-primary-700 font-bold focus:ring-2 focus:ring-brand-500 focus:shadow-lg focus:border-brand-300 transition-all placeholder:font-normal placeholder:text-primary-400"
               />
               <Search className="absolute right-4 top-4 w-6 h-6 text-primary-400 group-focus-within:text-brand-500 transition-colors" />
            </div>

            {/* Active Order Banner */}
            {currentOrderId && orderStatus && !showTracking && (
              <button 
                onClick={() => setShowTracking(true)}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-500 p-4 rounded-3xl shadow-xl flex items-center justify-between text-white animate-bounce-small"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-2xl">
                    <Bike className="w-6 h-6 animate-float" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">طلب قيد التوصيل</p>
                    <p className="font-black">تتبع حالة طلبك الآن</p>
                  </div>
                </div>
                <ChevronLeft className="w-6 h-6 rotate-180" />
              </button>
            )}

            {/* Map Snippet */}
            <div className="bg-white p-2 rounded-4xl shadow-md border border-primary-100 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2">
                   <h2 className="font-bold text-primary-800">بالقرب منك</h2>
                   <span className="text-xs text-brand-600 font-bold bg-brand-50 px-2 py-1 rounded-xl cursor-pointer hover:bg-brand-100">عرض الخريطة الكاملة</span>
                </div>
                <div className="rounded-3xl overflow-hidden">
                   <MapVisualizer userType="CUSTOMER" height="h-32" />
                </div>
            </div>

            {/* Categories - Horizontal Scroll */}
            <div>
              <div className="flex items-center justify-between mb-4">
                 <h2 className="font-bold text-xl text-primary-800">الأقسام</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {['ALL', ...Object.values(Category)].map((cat, idx) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as Category | 'ALL')}
                    className={`snap-start shrink-0 px-6 py-3 rounded-3xl whitespace-nowrap text-sm font-bold transition-all duration-300 ${
                      selectedCategory === cat 
                      ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/20 scale-105' 
                      : 'bg-white text-primary-600 border border-primary-100 hover:border-brand-200 hover:text-brand-600'
                    }`}
                  >
                    {cat === 'ALL' ? 'الكل' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Stores Grid */}
            <div className="space-y-4">
                <h2 className="font-bold text-xl text-primary-800">المتاجر المتاحة</h2>
                
                {loadingStores ? (
                    <div className="flex justify-center items-center h-40">
                         <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : filteredStores.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-4xl border border-dashed border-primary-200">
                        <Store className="w-12 h-12 text-primary-300 mx-auto mb-2" />
                        <p className="text-primary-500 font-bold">لا توجد متاجر مسجلة حالياً</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 pb-4">
                        {filteredStores.map((store, idx) => (
                        <div 
                            key={store.id} 
                            onClick={() => setActiveStore(store)}
                            className="bg-white rounded-4xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group border border-primary-100"
                        >
                            <div className="h-44 bg-primary-200 relative overflow-hidden">
                                <img src={store.image} alt={store.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-transparent to-transparent opacity-60"></div>
                                
                                {/* Floating Badges */}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    {store.isVerified && (
                                        <div className="bg-blue-500/90 backdrop-blur-sm text-white p-2 rounded-full shadow-md">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-4 right-4 text-white">
                                    <h3 className="font-bold text-2xl leading-none mb-1">{store.name}</h3>
                                    <p className="text-xs opacity-80 font-light flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {store.location}
                                    </p>
                                </div>
                                <div className="absolute bottom-4 left-4 glass bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1">
                                    <Star className="w-3 h-3 text-warning fill-warning" /> {store.rating}
                                </div>
                            </div>
                            
                            <div className="p-5 flex justify-between items-center">
                                <div className="flex gap-3">
                                    <div className="bg-primary-50 px-3 py-1.5 rounded-2xl text-xs font-bold text-primary-500 border border-primary-100">
                                        {store.category}
                                    </div>
                                    <div className="bg-brand-50 px-3 py-1.5 rounded-2xl text-xs font-bold text-brand-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> 25 دقيقة
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-primary-900">{store.distance} كم</span>
                            </div>
                        </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        ) : (
          // STORE DETAIL VIEW
          <div className="animate-fade-in-up pb-10">
            {/* Store Hero */}
            <div className="relative h-64 rounded-4xl overflow-hidden shadow-lg mb-8 group">
                <img src={activeStore.image} alt={activeStore.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-primary-900/20 to-transparent"></div>
                <div className="absolute bottom-6 right-6 text-white z-10">
                    <h2 className="text-4xl font-black mb-2">{activeStore.name}</h2>
                    <div className="flex items-center gap-4 text-sm font-medium opacity-90">
                         <span className="flex items-center gap-1"><Star className="w-4 h-4 text-warning fill-current" /> {activeStore.rating} ({activeStore.reviewCount} تقييم)</span>
                         <span className="w-1 h-1 bg-white rounded-full"></span>
                         <span>{activeStore.category}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                 <h3 className="font-bold text-xl text-primary-800">المنتجات</h3>
            </div>

            {/* Products List */}
            <div className="space-y-4">
              {loadingProducts ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
              ) : activeStoreProducts.length > 0 ? (
                activeStoreProducts.map((product, idx) => (
                    <div key={product.id} 
                        className="bg-white p-4 rounded-3xl shadow-md border border-primary-50 flex gap-4 transition-all hover:shadow-lg hover:-translate-y-1 group"
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                    <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-primary-100">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                        <h3 className="font-bold text-lg text-primary-800 leading-tight mb-1">{product.name}</h3>
                        <p className="text-xs text-primary-500 line-clamp-2 leading-relaxed">{product.description}</p>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                        <span className="font-black text-xl text-brand-600">{formatCurrency(product.price)}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            className="bg-primary-900 text-white w-10 h-10 rounded-full hover:bg-brand-600 transition-colors shadow-lg shadow-primary-900/20 flex items-center justify-center active:scale-90"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                        </div>
                    </div>
                    </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-primary-300">
                    <ShoppingBag className="w-12 h-12 text-primary-300 mx-auto mb-3" />
                    <p className="text-primary-400 font-medium">لا توجد منتجات حالياً لهذا المتجر</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modern Cart Bottom Sheet */}
      {showCart && (
        <>
            <div className="fixed inset-0 bg-primary-900/60 z-50 backdrop-blur-sm transition-opacity" onClick={() => setShowCart(false)}></div>
            <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-5xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[85vh] flex flex-col animate-slide-up">
                
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-4 pb-2" onClick={() => setShowCart(false)}>
                    <div className="w-12 h-1.5 bg-primary-200 rounded-full"></div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                         <h2 className="text-2xl font-black text-primary-800">سلة المشتريات</h2>
                         <span className="bg-brand-100 text-brand-700 font-bold px-3 py-1 rounded-2xl text-sm">{cart.length} منتجات</span>
                    </div>

                    {cart.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-primary-400" />
                            <p className="text-primary-500">سلتك فارغة</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.product.id} className="flex items-center gap-4 bg-primary-50 p-3 rounded-3xl">
                                    <img src={item.product.image} className="w-16 h-16 rounded-2xl object-cover" />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-primary-800">{item.product.name}</h4>
                                        <div className="flex items-center gap-1 text-brand-600 font-bold text-sm">
                                            {formatCurrency(item.product.price)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-2xl shadow-sm border border-primary-100">
                                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 text-primary-500 hover:text-danger"><Minus className="w-4 h-4"/></button>
                                        <span className="font-bold text-sm w-4 text-center text-primary-700">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 text-primary-500 hover:text-success"><Plus className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="p-6 bg-primary-50 border-t border-primary-100 pb-8">
                        <div className="space-y-2 mb-6 text-sm font-medium text-primary-600">
                             <div className="flex justify-between"><span>المجموع</span> <span className="text-primary-800">{formatCurrency(cartTotal)}</span></div>
                             <div className="flex justify-between"><span>التوصيل</span> <span className="text-brand-600">{formatCurrency(deliveryFee)}</span></div>
                             <div className="flex justify-between text-lg font-black text-primary-900 pt-2 border-t border-primary-200 mt-2">
                                <span>الإجمالي</span> <span>{formatCurrency(grandTotal)}</span>
                             </div>
                        </div>
                        <button 
                            onClick={handlePlaceOrder}
                            className="w-full bg-primary-900 text-white py-4 rounded-3xl font-bold text-lg hover:bg-brand-600 transition-colors shadow-xl shadow-primary-900/20 flex items-center justify-center gap-2 group"
                        >
                            <span>تأكيد الطلب</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-[-4px] transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};