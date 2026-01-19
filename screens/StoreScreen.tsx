
import React, { useState, useRef, useEffect } from 'react';
import { Category, Product, Order, OrderStatus, StoreProfile } from '../types';
import { db, auth } from '../services/firebase';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { 
  Package, Plus, Upload, Loader2, Trash2, ArrowLeft, 
  ClipboardList, CheckCircle, Camera, LogOut, User, 
  RefreshCw, Phone, Tag, Sparkles, Wand2, Save, MapPin, Navigation 
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { generateProductDescription } from '../services/geminiService';

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
  } catch (error) { return null; }
};

export const StoreScreen: React.FC<StoreScreenProps> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'ORDERS' | 'PROFILE'>('PRODUCTS');
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ name: '', phone: '', image: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, category: Category.FOOD, image: ''
  });

  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const currentStoreId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentStoreId) return;

    onValue(ref(db, `stores/${currentStoreId}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStoreProfile(data);
        setEditProfileData({ 
          name: data.name || '', 
          phone: data.phone || '', 
          image: data.image || '' 
        });
      }
    });

    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const list: Product[] = [];
      if (data) Object.keys(data).forEach(key => { if (data[key].storeId === currentStoreId) list.push({ ...data[key], id: key }); });
      setMyProducts(list.reverse());
    });

    onValue(ref(db, 'orders'), (snapshot) => {
      const data = snapshot.val();
      const list: Order[] = [];
      if (data) Object.keys(data).forEach(key => { if (data[key].storeId === currentStoreId) list.push({ ...data[key], id: key }); });
      setOrders(list.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });
  }, [currentStoreId]);

  const handleAiDescription = async () => {
    if (!newProduct.name) return alert("أدخل اسم المنتج أولاً!");
    setIsAiGenerating(true);
    const description = await generateProductDescription(newProduct.name, newProduct.category || Category.FOOD);
    setNewProduct(prev => ({ ...prev, description }));
    setIsAiGenerating(false);
  };

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image || !currentStoreId) return alert("أكمل البيانات");
    setIsSaving(true);
    try {
      const newRef = push(ref(db, 'products'));
      await set(newRef, { ...newProduct, storeId: currentStoreId, id: newRef.key });
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', price: 0, category: Category.FOOD, image: '' });
    } finally { setIsSaving(false); }
  };

  const handleUpdateProfile = async () => {
    if (!currentStoreId || !editProfileData.name || !editProfileData.phone) return;
    setIsUpdatingProfile(true);
    try {
      await update(ref(db, `stores/${currentStoreId}`), {
        name: editProfileData.name,
        phone: editProfileData.phone,
        image: editProfileData.image
      });
      setIsEditingProfile(false);
      alert("تم تحديث بيانات المتجر بنجاح ✓");
    } catch (e) {
      alert("حدث خطأ أثناء التحديث");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingProfileImage(true);
      const url = await uploadImage(file);
      if (url) {
        setEditProfileData(prev => ({ ...prev, image: url }));
      }
      setIsUploadingProfileImage(false);
    }
  };

  const handleUpdateLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (currentStoreId) {
            await update(ref(db, `stores/${currentStoreId}`), {
              coordinates: { 
                lat: position.coords.latitude, 
                lng: position.coords.longitude 
              }
            });
            alert("تم تحديث موقع المتجر الجغرافي بنجاح ✓");
          }
          setIsLocating(false);
        },
        (error) => {
          alert("يرجى تفعيل الـ GPS لتحديد موقع المتجر");
          setIsLocating(false);
        }
      );
    } else {
      alert("المتصفح لا يدعم تحديد الموقع");
      setIsLocating(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-orange-500 w-12 h-12" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32 font-cairo text-right" dir="rtl">
      <header className="p-6 flex justify-between items-center bg-white border-b border-gray-100 sticky top-0 z-50">
        <div>
           <h1 className="text-2xl font-black text-slate-800">كيمو متاجر</h1>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{storeProfile?.name || userName}</p>
        </div>
        {activeTab === 'PRODUCTS' && !isAddingProduct && (
          <button onClick={() => setIsAddingProduct(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"><Plus className="w-5 h-5" /> منتج جديد</button>
        )}
      </header>

      <main className="p-6 max-w-lg mx-auto">
        {activeTab === 'PRODUCTS' && (
          <div className="animate-fade-in-up">
            {!isAddingProduct ? (
              <div className="space-y-4">
                {myProducts.length === 0 ? (
                  <div className="bg-white rounded-[2.5rem] p-12 text-center text-slate-300 border border-dashed border-slate-200">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-black text-sm">لا توجد منتجات معروضة حالياً</p>
                  </div>
                ) : (
                  myProducts.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-50 flex gap-4 items-center group">
                      <img src={p.image} className="w-24 h-24 rounded-2xl object-cover shadow-inner" />
                      <div className="flex-1 text-right">
                        <h4 className="font-black text-slate-800 text-lg">{p.name}</h4>
                        <p className="text-xs text-slate-400 font-bold mb-3">{p.description?.slice(0, 40)}...</p>
                        <div className="flex items-center justify-between">
                           <span className="text-xl font-black text-orange-500">{formatCurrency(p.price)}</span>
                           <button onClick={() => remove(ref(db, `products/${p.id}`))} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[3rem] shadow-xl animate-scale-up border border-slate-50">
                <button onClick={() => setIsAddingProduct(false)} className="mb-6 flex items-center gap-2 text-slate-400 font-bold text-sm"><ArrowLeft className="w-4 h-4"/> إلغاء</button>
                <div className="space-y-6">
                   <div onClick={() => !isUploading && document.getElementById('p-img')?.click()} className="w-full h-48 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative bg-slate-50 hover:bg-slate-100 transition-all">
                     {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" /> : <div className="text-center"><Upload className="text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 font-bold">ارفع صورة المنتج</p></div>}
                     {isUploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>}
                     <input type="file" id="p-img" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setIsUploading(true); uploadImage(file).then(url => { if (url) setNewProduct({...newProduct, image: url}); setIsUploading(false); }); }
                     }} className="hidden" accept="image/*" />
                   </div>
                   
                   <input type="text" placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all" />

                   <div className="relative">
                      <textarea 
                        placeholder="وصف المنتج..." 
                        value={newProduct.description} 
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all h-32 resize-none" 
                      />
                      <button 
                        onClick={handleAiDescription}
                        disabled={isAiGenerating}
                        className="absolute bottom-4 left-4 flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-200 transition-all"
                      >
                         {isAiGenerating ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                         توليد بالذكاء الاصطناعي
                      </button>
                   </div>

                   <input type="number" placeholder="السعر بالدينار" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all" />

                   <button onClick={saveProduct} disabled={isSaving || isUploading} className="w-full brand-gradient text-white py-5 rounded-[2rem] font-black shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3">
                     {isSaving ? <Loader2 className="animate-spin" /> : <><CheckCircle className="w-6 h-6" /> نشر المنتج الآن</>}
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ORDERS' && (
           <div className="space-y-4 animate-fade-in-up">
              <h2 className="text-3xl font-black text-slate-900 mb-6">طلبات المتجر</h2>
              {orders.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center text-slate-300 border border-dashed border-slate-200">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-black text-sm">لا توجد طلبيات حالياً</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-slate-800 text-lg">{o.customerName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">{new Date(o.timestamp).toLocaleString('ar-DZ')}</p>
                        </div>
                        <span className="text-orange-500 font-black text-xl">{formatCurrency(o.totalPrice)}</span>
                     </div>
                     <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><MapPin className="w-4 h-4" /> {o.address}</p>
                     </div>
                     {o.status === OrderStatus.PENDING ? (
                        <button onClick={() => update(ref(db, `orders/${o.id}`), { status: OrderStatus.ACCEPTED_BY_STORE })} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">قبول وتحضير الطلب</button>
                     ) : (
                        <div className="bg-green-50 text-green-600 text-center py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-green-100 flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" /> {o.status}
                        </div>
                     )}
                  </div>
                ))
              )}
           </div>
        )}

        {activeTab === 'PROFILE' && (
          <div className="animate-fade-in-up">
             <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-2 brand-gradient"></div>
                
                <div 
                  className={`w-32 h-32 rounded-[2.5rem] border-4 border-slate-50 overflow-hidden shadow-xl mx-auto mb-8 bg-slate-50 p-1 relative group ${isEditingProfile ? 'cursor-pointer' : ''}`}
                  onClick={() => isEditingProfile && !isUploadingProfileImage && profileImageInputRef.current?.click()}
                >
                   <img src={isEditingProfile ? editProfileData.image : (storeProfile?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${storeProfile?.name || userName}`)} className="w-full h-full object-cover rounded-[2rem]" />
                   {isEditingProfile && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white w-8 h-8" />
                     </div>
                   )}
                   {isUploadingProfileImage && (
                     <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <Loader2 className="animate-spin text-orange-500" />
                     </div>
                   )}
                </div>
                <input 
                  type="file" 
                  ref={profileImageInputRef} 
                  onChange={handleProfileImageUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
                
                {!isEditingProfile ? (
                  <>
                    <h3 className="text-2xl font-black mb-1 text-slate-800">{storeProfile?.name || userName}</h3>
                    <p className="text-orange-500 font-black text-xs mb-2 uppercase tracking-widest">{storeProfile?.category || 'متجر كيمو'}</p>
                    <p className="text-slate-400 font-bold mb-10 flex items-center justify-center gap-2"><Phone className="w-4 h-4" /> {storeProfile?.phone || 'لا يوجد رقم مسجل'}</p>
                    
                    <div className="space-y-4">
                       <button onClick={() => setIsEditingProfile(true)} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all hover:bg-slate-200">
                         تعديل البروفيل
                       </button>
                       <button onClick={onLogout} className="w-full bg-red-50 text-red-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                         <LogOut className="w-5 h-5" /> تسجيل الخروج
                       </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-5 text-right">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 pr-3 uppercase">اسم المتجر</label>
                       <input 
                         type="text" 
                         value={editProfileData.name} 
                         onChange={e => setEditProfileData({...editProfileData, name: e.target.value})}
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-orange-500 transition-all"
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 pr-3 uppercase">رقم هاتف المتجر</label>
                       <input 
                         type="tel" 
                         value={editProfileData.phone} 
                         onChange={e => setEditProfileData({...editProfileData, phone: e.target.value})}
                         className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-orange-500 transition-all"
                       />
                    </div>

                    <button 
                      onClick={handleUpdateLocation}
                      disabled={isLocating}
                      className="w-full py-4 border-2 border-dashed border-orange-200 text-orange-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 bg-orange-50/50 hover:bg-orange-50 transition-all"
                    >
                      {isLocating ? <Loader2 className="animate-spin w-4 h-4" /> : <Navigation className="w-4 h-4" />}
                      تحديث موقع المتجر (GPS)
                    </button>

                    <div className="flex gap-4 pt-6">
                       <button 
                         onClick={handleUpdateProfile}
                         disabled={isUpdatingProfile || isUploadingProfileImage}
                         className="flex-1 brand-gradient text-white py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                       >
                         {isUpdatingProfile ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                         حفظ البيانات
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

      <nav className="fixed bottom-8 left-8 right-8 bg-[#2B2F3B]/95 backdrop-blur-xl rounded-[2.5rem] p-3 flex justify-around items-center shadow-2xl z-[200]">
         <button onClick={() => { setIsAddingProduct(false); setActiveTab('PRODUCTS'); }} className={`p-5 rounded-full transition-all ${activeTab === 'PRODUCTS' ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'text-slate-500'}`}><Package className="w-7 h-7" /></button>
         <button onClick={() => { setIsAddingProduct(false); setActiveTab('ORDERS'); }} className={`p-5 rounded-full transition-all ${activeTab === 'ORDERS' ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'text-slate-500'}`}><ClipboardList className="w-7 h-7" /></button>
         <button onClick={() => { setIsAddingProduct(false); setActiveTab('PROFILE'); }} className={`p-5 rounded-full transition-all ${activeTab === 'PROFILE' ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'text-slate-500'}`}><User className="w-7 h-7" /></button>
      </nav>
    </div>
  );
};
