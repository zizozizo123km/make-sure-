import React, { useState, useRef, useEffect } from 'react';
import { Category, Product, Order, OrderStatus, StoreProfile } from '../types';
import { db, auth } from '../services/firebase';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { Package, Plus, Upload, Loader2, Trash2, ArrowLeft, ClipboardList, CheckCircle, Camera, LogOut, User } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

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
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [newStoreName, setNewStoreName] = useState(userName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, category: Category.FOOD, image: ''
  });

  const currentStoreId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentStoreId) return;

    onValue(ref(db, `stores/${currentStoreId}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStoreProfile(data);
        setNewStoreName(data.name || userName);
      }
    });

    onValue(ref(db, 'products'), (snapshot) => {
      const data = snapshot.val();
      const list: Product[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          if (data[key].storeId === currentStoreId) {
            list.push({ ...data[key], id: key });
          }
        });
      }
      setMyProducts(list.reverse());
    });

    onValue(ref(db, 'orders'), (snapshot) => {
      const data = snapshot.val();
      const list: Order[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          if (data[key].storeId === currentStoreId) {
            list.push({ ...data[key], id: key });
          }
        });
      }
      setOrders(list.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });
  }, [currentStoreId]);

  const handleUpdateStoreProfile = async () => {
    if (!currentStoreId) return;
    setIsUpdatingProfile(true);
    await update(ref(db, `stores/${currentStoreId}`), { name: newStoreName });
    setIsUpdatingProfile(false);
    alert("تم تحديث المتجر");
  };

  const handleUpdateStoreImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentStoreId) {
      setIsUpdatingProfile(true);
      const url = await uploadImage(file);
      if (url) await update(ref(db, `stores/${currentStoreId}`), { image: url });
      setIsUpdatingProfile(false);
    }
  };

  const saveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image || !currentStoreId) return alert("أكمل البيانات");
    setIsSaving(true);
    try {
      const newRef = push(ref(db, 'products'));
      await set(newRef, { ...newProduct, storeId: currentStoreId, id: newRef.key });
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', price: 0, category: Category.FOOD, image: '' });
    } catch (e) { alert("خطأ في الحفظ"); }
    finally { setIsSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-cairo">
      <header className="p-6 flex justify-between items-center bg-white border-b border-gray-100">
        <h1 className="text-xl font-black text-[#8E949A]">
          {activeTab === 'PRODUCTS' ? 'منتجاتي' : activeTab === 'ORDERS' ? 'الطلبات' : 'حساب المتجر'}
        </h1>
        {activeTab === 'PRODUCTS' && !isAddingProduct && (
          <button onClick={() => setIsAddingProduct(true)} className="bg-[#8E949A] text-white px-5 py-2 rounded-full font-bold text-sm flex items-center gap-1 shadow-sm"><Plus className="w-4 h-4" /> إضافة</button>
        )}
      </header>

      <main className="p-6 max-w-lg mx-auto">
        {activeTab === 'PRODUCTS' && (
          <div className="animate-fade-in-up">
            {!isAddingProduct ? (
              <div className="space-y-4">
                {myProducts.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex gap-4 items-center">
                    <div className="flex-1 text-right py-1">
                      <h4 className="font-bold text-[#8E949A] text-sm mb-2">{p.name}</h4>
                      <span className="text-lg font-black text-[#F9923B]">{formatCurrency(p.price)}</span>
                      <button onClick={() => remove(ref(db, `products/${p.id}`))} className="block mt-2 text-gray-300 hover:text-danger transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                    <img src={p.image} className="w-24 h-24 rounded-[1.5rem] object-cover shadow-sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm animate-scale-up">
                <button onClick={() => setIsAddingProduct(false)} className="mb-6 flex items-center gap-2 text-gray-400 font-bold"><ArrowLeft className="w-5 h-5"/> عودة</button>
                <div className="space-y-5">
                   <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-100 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden relative bg-gray-50">
                     {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" /> : <Upload className="text-gray-300" />}
                     {isUploading && <Loader2 className="animate-spin text-brand-500 absolute" />}
                     <input type="file" ref={fileInputRef} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { setIsUploading(true); uploadImage(file).then(url => { if (url) setNewProduct({...newProduct, image: url}); setIsUploading(false); }); }
                     }} className="hidden" accept="image/*" />
                   </div>
                   <input type="text" placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
                   <input type="number" placeholder="السعر" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" />
                   <button onClick={saveProduct} disabled={isSaving || isUploading} className="w-full bg-primary-900 text-white py-4 rounded-2xl font-black shadow-lg">حفظ المنتج</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <div className="animate-fade-in-up space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-[#8E949A]">{order.customerName}</h3>
                  <span className="font-black text-brand-600">{formatCurrency(order.totalPrice)}</span>
                </div>
                {order.status === OrderStatus.PENDING ? (
                  <button onClick={() => update(ref(db, `orders/${order.id}`), { status: OrderStatus.ACCEPTED_BY_STORE })} className="w-full bg-primary-900 text-white py-3 rounded-2xl font-bold">قبول الطلب</button>
                ) : <div className="text-center text-success font-bold py-2 bg-success/10 rounded-xl">{order.status}</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'PROFILE' && (
          <div className="animate-fade-in-up">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
              <div className="relative inline-block mb-8">
                <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-gray-50 shadow-md relative bg-gray-50">
                  <img src={storeProfile?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`} className="w-full h-full object-cover" />
                  {isUpdatingProfile && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
                </div>
                <button onClick={() => profileImageInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-brand-600 text-white p-3 rounded-2xl shadow-lg border-2 border-white"><Camera className="w-5 h-5" /></button>
                <input type="file" ref={profileImageInputRef} onChange={handleUpdateStoreImage} className="hidden" accept="image/*" />
              </div>
              <div className="space-y-6">
                <input type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-center outline-none" />
                <button onClick={handleUpdateStoreProfile} disabled={isUpdatingProfile} className="w-full bg-primary-900 text-white py-4 rounded-2xl font-black shadow-lg">تحديث البيانات</button>
                <button onClick={onLogout} className="w-full bg-danger/10 text-danger py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-danger hover:text-white transition-all"><LogOut className="w-5 h-5" /> تسجيل الخروج</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 bg-[#2B2F3B] rounded-[2.2rem] p-2 flex justify-around items-center shadow-2xl z-50">
         <button onClick={() => setActiveTab('PRODUCTS')} className={`p-4 rounded-full transition-all ${activeTab === 'PRODUCTS' ? 'bg-brand-500 text-white' : 'text-gray-500'}`}><Package className="w-6 h-6" /></button>
         <button onClick={() => setActiveTab('ORDERS')} className={`p-4 rounded-full transition-all ${activeTab === 'ORDERS' ? 'bg-brand-500 text-white' : 'text-gray-500'}`}><ClipboardList className="w-6 h-6" /></button>
         <button onClick={() => setActiveTab('PROFILE')} className={`p-4 rounded-full transition-all ${activeTab === 'PROFILE' ? 'bg-brand-500 text-white' : 'text-gray-500'}`}><User className="w-6 h-6" /></button>
      </nav>
    </div>
  );
};