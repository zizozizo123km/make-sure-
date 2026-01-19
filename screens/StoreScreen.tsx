
import React, { useState, useRef, useEffect } from 'react';
import { Category, Product, Order, OrderStatus, StoreProfile } from '../types';
import { db, auth } from '../services/firebase';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { 
  Package, Plus, Upload, Loader2, Trash2, ArrowLeft, 
  ClipboardList, CheckCircle, Camera, LogOut, User, 
  RefreshCw, Phone, Tag, Sparkles, Wand2, Save, MapPin, Navigation,
  ChevronLeft, ShoppingBag, Star, LayoutGrid, Home
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
      if (url) setEditProfileData(prev => ({ ...prev, image: url }));
      setIsUploadingProfileImage(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-orange-500 w-12 h-12" /></div>;

  return (
    <div className="bg-[#F4F4F4] min-h-screen pb-32 font-cairo text-right" dir="rtl">
      
      {/* Header Consistent with Customer */}
      <header className="bg-white sticky top-0 z-[100] px-6 pt-8 pb-4 shadow-sm flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-black text-slate-800">كيمو متاجر</h1>
           <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">{storeProfile?.name || userName}</p>
        </div>
        {activeTab === 'PRODUCTS' && !isAddingProduct && (
          <button onClick={() => setIsAddingProduct(true)} className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all">
            <Plus size={20} />
          </button>
        )}
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {activeTab === 'PRODUCTS' && (
          <div className="animate-fade-in-up">
            {!isAddingProduct ? (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-800 px-2 mb-4">منتجاتي الحالية</h2>
                {myProducts.length === 0 ? (
                  <div className="bg-white rounded-[2.5rem] p-16 text-center text-slate-300 border border-dashed border-slate-200 shadow-sm">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-black text-sm text-slate-400">ابدأ بإضافة منتجك الأول لبيعه في كيمو</p>
                  </div>
                ) : (
                  myProducts.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-50 flex gap-4 items-center group relative overflow-hidden">
                      <div className="w-24 h-24 rounded-[1.8rem] overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                        <img src={p.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 text-right">
                        <h4 className="font-black text-slate-800 text-base mb-1">{p.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mb-3 line-clamp-1">{p.description}</p>
                        <div className="flex items-center justify-between">
                           <span className="text-lg font-black text-orange-600">{formatCurrency(p.price)}</span>
                           <button onClick={() => remove(ref(db, `products/${p.id}`))} className="w-9 h-9 bg-red-50 text-red-400 rounded-xl flex items-center justify-center active:scale-90 transition-all"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[3rem] shadow-xl animate-scale-up border border-slate-50">
                <button onClick={() => setIsAddingProduct(false)} className="mb-6 flex items-center gap-2 text-slate-400 font-black text-xs uppercase"><ChevronLeft className="w-4 h-4 rotate-180" /> العودة للمنتجات</button>
                <div className="space-y-6">
                   <div onClick={() => !isUploading && document.getElementById('p-img')?.click()} className="w-full h-48 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative bg-slate-50 hover:bg-slate-100 transition-all">
                     {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" /> : <div className="text-center"><Upload className="text-slate-300 mx-auto mb-2" /><p className="text-[10px] text-slate-400 font-black uppercase">تحميل صورة المنتج</p></div>}
                     {isUploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>}
                     <input type="file" id="p-img" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setIsUploading(true); uploadImage(file).then(url => { if (url) setNewProduct({...newProduct, image: url}); setIsUploading(false); }); }
                     }} className="hidden" accept="image/*" />
                   </div>
                   <input type="text" placeholder="ما هو اسم المنتج؟" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all" />
                   <div className="relative">
                      <textarea placeholder="صف المنتج بكلمات بسيطة..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold outline-none h-32 resize-none" />
                      <button onClick={handleAiDescription} disabled={isAiGenerating} className="absolute bottom-4 left-4 flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-[10px] font-black">{isAiGenerating ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3" />} ذكاء اصطناعي</button>
                   </div>
                   <input type="number" placeholder="السعر (دينار جزائري)" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all" />
                   <button onClick={saveProduct} disabled={isSaving || isUploading} className="w-full brand-gradient text-white py-5 rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3">
                     {isSaving ? <Loader2 className="animate-spin" /> : <>حفظ ونشر المنتج</>}
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ORDERS' && (
           <div className="space-y-4 animate-fade-in-up px-2">
              <h2 className="text-2xl font-black text-slate-900 mb-6">طلبات المتجر</h2>
              {orders.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center text-slate-300 border border-dashed border-slate-200 shadow-sm">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-black text-sm text-slate-400">لا توجد طلبيات لعرضها حالياً</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden relative">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-slate-800 text-lg leading-tight">{o.customerName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">{new Date(o.timestamp).toLocaleString('ar-DZ')}</p>
                        </div>
                        <span className="text-orange-500 font-black text-xl">{formatCurrency(o.totalPrice)}</span>
                     </div>
                     <div className="flex items-center gap-2 mb-6 bg-slate-50 p-3 rounded-2xl">
                        <MapPin size={14} className="text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-600 truncate">{o.address}</p>
                     </div>
                     {o.status === OrderStatus.PENDING ? (
                        <button onClick={() => update(ref(db, `orders/${o.id}`), { status: OrderStatus.ACCEPTED_BY_STORE })} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">تحضير الطلبية الآن</button>
                     ) : (
                        <div className="bg-green-50 text-green-600 text-center py-3 rounded-2xl font-black text-[10px] border border-green-100 uppercase tracking-widest">{o.status}</div>
                     )}
                  </div>
                ))
              )}
           </div>
        )}

        {activeTab === 'PROFILE' && (
          <div className="animate-fade-in-up">
             <div className="bg-white p-10 rounded-[3rem] shadow-sm text-center border border-slate-50 relative overflow-hidden">
                <div 
                  className="w-28 h-28 rounded-[2.2rem] border-4 border-white shadow-xl mx-auto mb-6 bg-slate-50 relative overflow-hidden group cursor-pointer"
                  onClick={() => isEditingProfile && !isUploadingProfileImage && profileImageInputRef.current?.click()}
                >
                   <img src={isEditingProfile ? editProfileData.image : (storeProfile?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${storeProfile?.name}`)} className="w-full h-full object-cover" />
                   {isEditingProfile && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white w-6 h-6" /></div>
                   )}
                   {isUploadingProfileImage && (
                     <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
                   )}
                </div>
                <input type="file" ref={profileImageInputRef} onChange={handleProfileImageUpload} className="hidden" accept="image/*" />
                
                {!isEditingProfile ? (
                  <>
                    <h3 className="text-2xl font-black mb-1 text-slate-800">{storeProfile?.name || userName}</h3>
                    <p className="text-xs text-slate-400 font-bold mb-8">{storeProfile?.phone || 'لا يوجد هاتف'}</p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                           <p className="text-[10px] text-slate-400 font-black mb-1">المنتجات</p>
                           <p className="text-lg font-black text-slate-800">{myProducts.length}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                           <p className="text-[10px] text-slate-400 font-black mb-1">التقييم</p>
                           <div className="flex items-center justify-center gap-1"><Star size={12} className="text-yellow-400 fill-current" /><p className="text-lg font-black text-slate-800">{storeProfile?.rating?.toFixed(1) || '0.0'}</p></div>
                        </div>
                    </div>
                    <div className="space-y-3">
                       <button onClick={() => setIsEditingProfile(true)} className="w-full bg-[#F0F0F0] py-4 rounded-2xl font-black text-slate-700 text-sm active:scale-95 transition-all">تعديل الملف</button>
                       <button onClick={onLogout} className="w-full bg-red-50 py-4 rounded-2xl font-black text-red-500 text-sm mt-6">خروج من كيمو</button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-5 text-right">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 pr-2">اسم المتجر</label>
                       <input type="text" value={editProfileData.name} onChange={e => setEditProfileData({...editProfileData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 pr-2">رقم الهاتف</label>
                       <input type="tel" value={editProfileData.phone} onChange={e => setEditProfileData({...editProfileData, phone: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    </div>
                    <div className="flex gap-3 pt-4">
                       <button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">حفظ</button>
                       <button onClick={() => setIsEditingProfile(false)} className="px-6 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black">إلغاء</button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      {/* Bottom Nav Consistent with Customer */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-20 flex justify-around items-center px-4 z-[500] shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        <NavBtn act={activeTab === 'PRODUCTS'} onClick={() => setActiveTab('PRODUCTS')} icon={<LayoutGrid />} label="منتجاتي" />
        <NavBtn act={activeTab === 'ORDERS'} onClick={() => setActiveTab('ORDERS')} icon={<ClipboardList />} label="الطلبيات" />
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
