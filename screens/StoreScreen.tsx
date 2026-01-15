import React, { useState, useRef, useEffect } from 'react';
import { Category, Product, Order, OrderStatus, StoreProfile } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { db, auth } from '../services/firebase';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { Sparkles, Package, Plus, Settings, MapPin, Store as StoreIcon, ChevronRight, Upload, X, Loader2, Trash2, Edit, ArrowLeft, ClipboardList, ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import { BIR_EL_ATER_CENTER, formatCurrency } from '../utils/helpers';

interface StoreScreenProps {
  onLogout: () => void;
  userName: string;
}

// Cloudinary upload helper function (using user's provided structure for upload_preset)
const uploadImage = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "makemm"); // User's provided upload preset

  const cloudName = 'dkqxgwjnr'; // Extracted from previous implementation

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      console.error("Cloudinary upload error:", data.error?.message || "Unknown error");
      return null;
    }
  } catch (error) {
    console.error("Error connecting to Cloudinary:", error);
    return null;
  }
};


export const StoreScreen: React.FC<StoreScreenProps> = ({ onLogout, userName }) => {
  const [view, setView] = useState<'PRODUCTS' | 'ORDERS' | 'SETTINGS'>('PRODUCTS');
  
  // State for managing products list
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Toggle between List and Add Form within Products view
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: Category.FOOD,
    image: ''
  });

  // Get current user ID
  const currentStoreId = auth.currentUser?.uid;

  // Self-Healing for Store Profile (Moved logic here to be consistent with Firebase)
  useEffect(() => {
    if (currentStoreId && userName) {
        const storeProfileRef = ref(db, `stores/${currentStoreId}`);
        onValue(storeProfileRef, (snapshot) => {
            if (!snapshot.exists()) {
                console.warn("StoreScreen: Store profile not found in Firebase, creating fallback in localStorage.");
                const localStores = JSON.parse(localStorage.getItem('kimo_local_stores') || '[]');
                const exists = localStores.find((s: any) => s.id === currentStoreId);
                
                if (!exists) {
                    const newLocalStore: StoreProfile = { // Explicitly type as StoreProfile
                        id: currentStoreId,
                        name: userName,
                        category: Category.FOOD, // Default for new store
                        location: 'بئر العاتر', // Default
                        isVerified: true, // Default
                        rating: 5, // Default
                        reviewCount: 0, // Default
                        image: `https://picsum.photos/200/200?random=${currentStoreId.slice(0,4)}`, // Default
                        coordinates: {
                            lat: BIR_EL_ATER_CENTER.lat + (Math.random() - 0.5) * 0.005,
                            lng: BIR_EL_ATER_CENTER.lng + (Math.random() - 0.5) * 0.005
                        }
                    };
                    localStores.push(newLocalStore);
                    localStorage.setItem('kimo_local_stores', JSON.stringify(localStores));
                    console.log("StoreScreen: Store profile created in localStorage as fallback.");
                }
            } else {
                console.log("StoreScreen: Store profile found in Firebase.");
            }
        }, (error) => {
          console.error("StoreScreen: Error checking store profile in Firebase:", error);
        }, { onlyOnce: true }); // Only fetch once to avoid continuous listening for self-healing
    }
  }, [currentStoreId, userName]);

  // Listen to Products
  useEffect(() => {
    if (!currentStoreId) {
      console.warn("StoreScreen: No currentStoreId, skipping product fetch.");
      setLoadingProducts(false);
      return;
    }

    console.log(`StoreScreen: Starting to fetch products for store: ${currentStoreId}`);
    const productsRef = ref(db, 'products');
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const dbProducts: Product[] = [];
      const data = snapshot.val();
      if (data) {
        Object.keys(data).forEach(key => {
            dbProducts.push({ ...data[key], id: key });
        });
        console.log("StoreScreen: All products fetched from DB:", dbProducts);
      } else {
          console.log("StoreScreen: No products found in DB.");
      }
      
      const localProducts = JSON.parse(localStorage.getItem('kimo_local_products') || '[]');
      let allProducts = [...dbProducts, ...localProducts];
      console.log("StoreScreen: All products (DB + Local) before filtering:", allProducts);

      console.log("StoreScreen: Filtering products for storeId:", currentStoreId);
      const storeProducts = allProducts.filter((p: Product) => p.storeId === currentStoreId);
      
      console.log("StoreScreen: Filtered products for this store:", storeProducts);
      setMyProducts(storeProducts.reverse());
      setLoadingProducts(false);
    }, (error) => {
      console.error(`StoreScreen: Error fetching products for store ${currentStoreId}:`, error);
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [currentStoreId]);

  // Listen to Orders (Realtime)
  useEffect(() => {
      if(!currentStoreId) {
        console.warn("StoreScreen: No currentStoreId, skipping order fetch.");
        return;
      }
      
      console.log(`StoreScreen: Starting to fetch orders for store: ${currentStoreId}`);
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
              console.log("StoreScreen: All orders fetched from DB (raw):", data);
          } else {
              console.log("StoreScreen: No orders found in DB.");
          }
          
          storeOrders.sort((a, b) => b.timestamp - a.timestamp);
          console.log("StoreScreen: Filtered and sorted orders for this store:", storeOrders);
          setOrders(storeOrders);
          setLoadingOrders(false);
      }, (error) => {
        console.error(`StoreScreen: Error fetching orders for store ${currentStoreId}:`, error);
        setLoadingOrders(false);
      });
      
      return () => unsubscribe();
  }, [currentStoreId]);

  // Accept Order Logic
  const handleAcceptOrder = async (orderId: string) => {
      try {
          await update(ref(db, `orders/${orderId}`), {
              status: OrderStatus.ACCEPTED_BY_STORE
          });
          alert("تم قبول الطلب! جاري انتظار السائق.");
          console.log(`StoreScreen: Order ${orderId} accepted.`);
      } catch (error) {
          console.error("StoreScreen: Error accepting order:", error);
          alert("فشل قبول الطلب: " + error.message);
      }
  };

  const handleAIHelp = async () => {
    if (!newProduct.name || !newProduct.category) {
      alert("الرجاء إدخال اسم المنتج وتصنيفه أولاً.");
      return;
    }
    setIsGenerating(true);
    const desc = await generateProductDescription(newProduct.name, newProduct.category);
    setNewProduct(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
    console.log("StoreScreen: AI generated description.");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewProduct(prev => ({ ...prev, image: reader.result as string }));
          console.log("StoreScreen: Local image preview set.");
        };
        reader.readAsDataURL(file);

        setIsUploading(true);
        const imageUrl = await uploadImage(file);
        if (imageUrl) {
            setNewProduct(prev => ({ ...prev, image: imageUrl }));
            console.log("StoreScreen: Image uploaded to Cloudinary, URL:", imageUrl);
        } else {
            alert('فشل رفع الصورة إلى Cloudinary. سيتم استخدام الصورة المحلية مؤقتاً.');
            console.error("StoreScreen: Cloudinary upload failed.");
        }
        setIsUploading(false);
    }
  };

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) {
      alert("يرجى إكمال بيانات المنتج والصورة");
      return;
    }

    if (!currentStoreId) {
        alert("خطأ في المصادقة: يجب تسجيل الدخول كمتجر.");
        return;
    }

    setIsSaving(true);
    
    const tempId = `prod_${Date.now()}`; 
    
    const productData: Product = {
      id: tempId,
      name: newProduct.name!,
      description: newProduct.description || '',
      price: newProduct.price!,
      category: newProduct.category || Category.FOOD,
      image: newProduct.image!,
      storeId: currentStoreId
    };

    console.log("StoreScreen: Attempting to save productData:", productData);

    try {
      const newProductRef = push(ref(db, 'products'));
      const dbId = newProductRef.key;
      
      if (dbId) {
          productData.id = dbId;
          await set(newProductRef, productData);
          alert("تم حفظ المنتج في قاعدة البيانات بنجاح!");
          console.log(`StoreScreen: Product saved to Firebase DB with ID: ${dbId}`);
      } else {
          throw new Error("Could not generate DB ID");
      }

    } catch (error: any) {
      console.warn("StoreScreen: Firebase write failed (Permission denied?), saving locally.", error);
      
      const localProducts = JSON.parse(localStorage.getItem('kimo_local_products') || '[]');
      localProducts.push(productData);
      localStorage.setItem('kimo_local_products', JSON.stringify(localProducts));
      
      setMyProducts(prev => [productData, ...prev]);
      
      alert("تم حفظ المنتج محلياً (تنبيه: لم يتم الحفظ في السيرفر بسبب الصلاحيات): " + error.message);
    } finally {
      setIsSaving(false);
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', price: 0, category: Category.FOOD, image: '' });
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      try {
        await remove(ref(db, `products/${id}`));
        console.log(`StoreScreen: Product ${id} deleted from Firebase DB.`);
      } catch (error) {
        console.warn("StoreScreen: Firebase delete failed, trying local delete.", error);
      }

      const localProducts = JSON.parse(localStorage.getItem('kimo_local_products') || '[]');
      const updatedLocal = localProducts.filter((p: any) => p.id !== id);
      localStorage.setItem('kimo_local_products', JSON.stringify(updatedLocal));
      console.log(`StoreScreen: Product ${id} deleted from LocalStorage.`);

      setMyProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setNewProduct(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    console.log("StoreScreen: Image removed from new product form.");
  };

  const NavItem = ({ icon, label, id, badge }: any) => (
    <button 
      onClick={() => { setView(id); setIsAddingProduct(false); }}
      className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all duration-300 group ${
        view === id 
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
        : 'hover:bg-primary-800 text-primary-300 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-bold">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && <span className="bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>}
        {view === id && <ChevronRight className="w-4 h-4" />}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-primary-50 overflow-hidden">
      {/* Sidebar - Premium Dark */}
      <aside className="w-72 bg-primary-900 text-white hidden md:flex flex-col p-6 m-4 rounded-5xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="text-2xl font-black mb-12 flex items-center gap-3 text-white font-cairo z-10 px-2">
           <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center">
             <StoreIcon className="w-6 h-6 text-white" />
           </div>
           <span>كيمو <span className="text-brand-500">بيزنس</span></span>
        </div>
        
        <nav className="space-y-3 flex-1 z-10">
          <NavItem id="PRODUCTS" label="المنتجات" icon={<Package className="w-5 h-5" />} />
          <NavItem id="ORDERS" label="الطلبات" icon={<ClipboardList className="w-5 h-5" />} badge={orders.filter(o => o.status === 'PENDING').length || undefined} />
          <NavItem id="SETTINGS" label="الإعدادات" icon={<Settings className="w-5 h-5" />} />
        </nav>
        
        <div className="mt-auto border-t border-primary-800 pt-6">
           <div className="flex items-center gap-3 mb-4 px-2">
             <img src="https://picsum.photos/100" className="w-10 h-10 rounded-full border-2 border-primary-700" />
             <div>
               <p className="text-sm font-bold text-white">{userName || 'اسم المتجر'}</p>
               <p className="text-xs text-primary-500">متجر موثوق</p>
             </div>
           </div>
           <button onClick={onLogout} className="w-full py-3 bg-danger/10 text-danger rounded-2xl font-bold hover:bg-danger hover:text-white transition-colors">
              تسجيل خروج
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <header className="flex justify-between items-center mb-8 md:hidden">
           <h1 className="text-2xl font-black text-primary-800">إدارة المتجر</h1>
           <button onClick={onLogout} className="text-sm font-bold text-danger bg-danger/10 px-3 py-1 rounded-lg">خروج</button>
        </header>

        {view === 'PRODUCTS' && (
          <div className="max-w-4xl mx-auto animate-fade-in-up pb-10">
            {!isAddingProduct ? (
                // LIST VIEW
                <>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-primary-800">منتجاتي</h2>
                            <p className="text-primary-500 text-sm">
                              {loadingProducts ? 'جاري التحميل...' : `لديك ${myProducts.length} منتجات معروضة للبيع`}
                            </p>
                        </div>
                        <button 
                            onClick={() => setIsAddingProduct(true)}
                            className="bg-primary-900 text-white px-6 py-3 rounded-3xl font-bold flex items-center gap-2 hover:bg-brand-600 transition-colors shadow-lg"
                        >
                            <Plus className="w-5 h-5" /> إضافة منتج
                        </button>
                    </div>

                    {loadingProducts ? (
                      <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                      </div>
                    ) : myProducts.length === 0 ? (
                        <div className="bg-white rounded-4xl p-12 text-center border border-dashed border-primary-300">
                            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package className="w-10 h-10 text-primary-300" />
                            </div>
                            <h3 className="text-xl font-bold text-primary-700 mb-2">لا توجد منتجات</h3>
                            <p className="text-primary-400 mb-6">ابدأ بإضافة منتجاتك لكي يراها الزبائن</p>
                            <button 
                                onClick={() => setIsAddingProduct(true)}
                                className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-colors"
                            >
                                إضافة أول منتج
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {myProducts.map(product => (
                                <div key={product.id} className="bg-white p-4 rounded-4xl shadow-sm border border-primary-100 flex gap-4 group hover:shadow-lg transition-all">
                                    <div className="w-32 h-32 rounded-3xl overflow-hidden relative shrink-0">
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute top-2 right-2 bg-primary-900/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg font-bold">
                                            {product.category}
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <h3 className="font-bold text-lg text-primary-800">{product.name}</h3>
                                            <p className="text-xs text-primary-400 font-medium line-clamp-1">{product.description}</p>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <span className="text-xl font-black text-brand-600">{formatCurrency(product.price)}</span>
                                            <div className="flex gap-2">
                                                <button className="p-2 bg-primary-50 text-primary-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteProduct(product.id)}
                                                    className="p-2 bg-primary-50 text-primary-400 rounded-xl hover:bg-danger/10 hover:text-danger transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                // ADD FORM VIEW
                <div className="bg-white p-8 rounded-4xl shadow-lg border border-primary-100 relative overflow-hidden animate-scale-up">
                    <div className="flex items-center gap-4 mb-8">
                        <button 
                            onClick={() => setIsAddingProduct(false)}
                            className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center hover:bg-primary-100 text-primary-600"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-2xl font-black text-primary-800">إضافة منتج جديد</h2>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {/* Image Upload Section */}
                        <div>
                        <label className="block text-sm font-bold text-primary-500 mb-2">صورة المنتج</label>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        {!newProduct.image ? (
                            <div 
                                onClick={triggerFileInput}
                                className="w-full h-48 border-2 border-dashed border-primary-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/50 transition-all group"
                            >
                                {isUploading ? (
                                    <div className="flex flex-col items-center animate-pulse">
                                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-2" />
                                        <p className="text-brand-600 font-bold text-sm">جاري رفع الصورة...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-primary-400 group-hover:text-brand-500" />
                                        </div>
                                        <p className="text-primary-500 font-bold group-hover:text-brand-600">اضغط لرفع صورة</p>
                                        <p className="text-xs text-primary-400 mt-1">PNG, JPG حتى 5MB</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="relative w-full h-48 rounded-3xl overflow-hidden shadow-md group border border-primary-200">
                                <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                                {isUploading && (
                                <div className="absolute inset-0 bg-primary-900/50 flex items-center justify-center z-20">
                                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                                </div>
                                )}
                                <div className="absolute inset-0 bg-primary-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm z-10">
                                <button onClick={triggerFileInput} className="p-2 bg-white rounded-full hover:bg-brand-500 hover:text-white transition-colors"><Upload className="w-5 h-5" /></button>
                                <button onClick={removeImage} className="p-2 bg-white rounded-full hover:bg-danger hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                        )}
                        </div>

                        <div className="group">
                        <label className="block text-sm font-bold text-primary-500 mb-2">اسم المنتج</label>
                        <input 
                            type="text" 
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                            className="w-full p-4 border-2 border-primary-100 rounded-3xl focus:border-brand-500 focus:ring-0 outline-none transition-colors font-bold text-primary-700 bg-primary-50 focus:bg-white"
                            placeholder="مثال: بيتزا 4 فصول"
                        />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-primary-500 mb-2">السعر (د.ج)</label>
                            <input 
                            type="number" 
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                            className="w-full p-4 border-2 border-primary-100 rounded-3xl focus:border-brand-500 focus:ring-0 outline-none transition-colors font-bold text-primary-700 bg-primary-50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-primary-500 mb-2">التصنيف</label>
                            <div className="relative">
                                <select 
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({...newProduct, category: e.target.value as Category})}
                                className="w-full p-4 border-2 border-primary-100 rounded-3xl focus:border-brand-500 focus:ring-0 outline-none transition-colors font-bold text-primary-700 bg-primary-50 focus:bg-white appearance-none"
                                >
                                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronRight className="absolute left-4 top-1/2 -translate-y-1/2 rotate-90 w-5 h-5 text-primary-400 pointer-events-none" />
                            </div>
                        </div>
                        </div>

                        <div className="bg-primary-50 p-4 rounded-3xl border border-primary-100">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-bold text-primary-500">الوصف</label>
                            <button 
                            onClick={handleAIHelp}
                            disabled={isGenerating}
                            className="text-xs flex items-center gap-2 text-white font-bold bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 rounded-full hover:shadow-lg transition-all disabled:opacity-50"
                            >
                            <Sparkles className="w-3 h-3" /> 
                            {isGenerating ? 'جاري التفكير...' : 'اكتب لي يا ذكاء!'}
                            </button>
                        </div>
                        <textarea 
                            rows={4}
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                            className="w-full p-3 bg-white border border-primary-200 rounded-2xl focus:border-purple-500 outline-none transition-colors text-sm"
                            placeholder="اكتب وصفاً أو اطلب من مساعد كيمو..."
                        ></textarea>
                        </div>
                        
                        <div className="pt-4 flex gap-4">
                            <button 
                                onClick={() => setIsAddingProduct(false)}
                                className="flex-1 bg-primary-100 text-primary-600 py-4 rounded-3xl font-bold text-lg hover:bg-primary-200 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button 
                                onClick={saveProduct}
                                disabled={isSaving || isUploading}
                                className="flex-[2] bg-primary-900 text-white py-4 rounded-3xl font-bold text-lg hover:bg-brand-600 transition-colors shadow-lg hover:shadow-xl active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : 'حفظ ونشر'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {view === 'ORDERS' && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <h2 className="text-2xl font-black text-primary-800 mb-8 flex items-center gap-2">
                <ClipboardList className="w-8 h-8 text-brand-600" /> الطلبات الواردة
            </h2>
            
            {loadingOrders ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
            ) : orders.length === 0 ? (
                <div className="bg-white rounded-4xl p-16 text-center shadow-sm border border-primary-100">
                    <div className="w-24 h-24 bg-blue-50/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag className="w-12 h-12 text-blue-300" />
                    </div>
                    <h3 className="text-xl font-bold text-primary-800 mb-2">لا توجد طلبات جديدة</h3>
                    <p className="text-primary-400">ستظهر الطلبات هنا عندما يقوم الزبائن بالشراء.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-4xl shadow-sm border border-primary-100 relative overflow-hidden">
                             {order.status === OrderStatus.PENDING && (
                                 <div className="absolute top-0 right-0 bg-warning text-warning-900 px-4 py-1 text-xs font-bold rounded-bl-3xl">
                                     طلب جديد
                                 </div>
                             )}
                             {order.status === OrderStatus.ACCEPTED_BY_STORE && (
                                 <div className="absolute top-0 right-0 bg-success text-white px-4 py-1 text-xs font-bold rounded-bl-3xl">
                                     بانتظار السائق
                                 </div>
                             )}
                             {order.status === OrderStatus.ACCEPTED_BY_DRIVER && (
                                 <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-xs font-bold rounded-bl-3xl">
                                     في طريق التوصيل
                                 </div>
                             )}
                             {order.status === OrderStatus.DELIVERED && (
                                 <div className="absolute top-0 right-0 bg-primary-700 text-white px-4 py-1 text-xs font-bold rounded-bl-3xl">
                                     تم التوصيل
                                 </div>
                             )}


                             <div className="mb-4">
                                 <h3 className="font-bold text-lg text-primary-800">الزبون: {order.customerName}</h3>
                                 <p className="text-sm text-primary-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {order.address}</p>
                                 <p className="text-xs text-primary-400 mt-1">{new Date(order.timestamp).toLocaleString('ar-DZ')}</p>
                             </div>

                             <div className="bg-primary-50 p-4 rounded-2xl mb-4 space-y-2">
                                 {order.products.map((item, idx) => (
                                     <div key={idx} className="flex justify-between text-sm">
                                         <span className="font-bold text-primary-700">{item.quantity}x {item.product.name}</span>
                                         <span>{formatCurrency(item.product.price * item.quantity)}</span>
                                     </div>
                                 ))}
                                 <div className="border-t border-primary-200 pt-2 flex justify-between font-black text-lg">
                                     <span>الإجمالي</span>
                                     <span className="text-brand-600">{formatCurrency(order.totalPrice)}</span>
                                 </div>
                             </div>

                             {order.status === OrderStatus.PENDING ? (
                                 <button 
                                    onClick={() => handleAcceptOrder(order.id)}
                                    className="w-full bg-primary-900 text-white py-3 rounded-2xl font-bold hover:bg-success transition-colors shadow-lg flex items-center justify-center gap-2"
                                 >
                                     <CheckCircle className="w-5 h-5" /> قبول الطلب وتجهيزه
                                 </button>
                             ) : (
                                 <div className="bg-success/10 text-success p-3 rounded-2xl text-center font-bold text-sm flex items-center justify-center gap-2">
                                     <Clock className="w-4 h-4" /> {order.status === OrderStatus.ACCEPTED_BY_STORE ? 'بانتظار السائق لاستلام الطلب...' : 'الطلب قيد التوصيل/تم التوصيل'}
                                 </div>
                             )}
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {view === 'SETTINGS' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-4xl shadow-md border border-primary-100 animate-fade-in-up">
             <h2 className="text-2xl font-black text-primary-800 mb-8 flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary-400" /> إعدادات المتجر
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-5 bg-blue-50/50 rounded-4xl text-blue-700 border border-blue-100">
                  <div className="bg-white p-3 rounded-2xl shadow-sm"><MapPin className="w-6 h-6 text-blue-600" /></div>
                  <div>
                    <h3 className="font-bold text-lg">موقع المتجر (GPS)</h3>
                    <p className="text-xs opacity-80 font-medium mt-1">يستخدم لتحديد المسافة بينك وبين الزبائن</p>
                  </div>
                  <button className="mr-auto bg-blue-600 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700">تحديث</button>
                </div>
                <div>
                   <label className="block text-sm font-bold text-primary-500 mb-2">اسم المتجر</label>
                   <input type="text" className="w-full p-4 border-2 border-primary-100 rounded-3xl font-bold text-primary-700 focus:border-brand-500 focus:bg-white" defaultValue={userName} />
                </div>
                 <div>
                   <label className="block text-sm font-bold text-primary-500 mb-2">ساعات العمل</label>
                   <div className="flex gap-4">
                      <div className="flex-1 relative">
                          <span className="absolute -top-2 right-3 bg-white px-1 text-[10px] font-bold text-primary-400">من</span>
                          <input type="time" className="w-full p-4 border-2 border-primary-100 rounded-3xl font-bold text-primary-700 focus:border-brand-500 focus:bg-white" />
                      </div>
                      <div className="flex-1 relative">
                          <span className="absolute -top-2 right-3 bg-white px-1 text-[10px] font-bold text-primary-400">إلى</span>
                          <input type="time" className="w-full p-4 border-2 border-primary-100 rounded-3xl font-bold text-primary-700 focus:border-brand-500 focus:bg-white" />
                      </div>
                   </div>
                </div>
                <button className="w-full bg-primary-900 text-white py-4 rounded-3xl font-bold mt-4 hover:bg-primary-800 transition-colors">حفظ التغييرات</button>
              </div>
          </div>
        )}
      </main>
    </div>
  );
};