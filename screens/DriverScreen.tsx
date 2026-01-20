
import React, { useState, useEffect, useRef } from 'react';
import { MapVisualizer } from '../components/MapVisualizer';
import { RatingModal } from '../components/RatingModal';
import { 
  MapPin, Navigation, CheckCircle, Clock, Loader2, Package, Bike, 
  ArrowRight, User, LogOut, Camera, Phone, RefreshCw, Save,
  ChevronLeft, ShoppingBag, Star, LayoutGrid, Home, X, Bot, Map as MapIcon,
  Store as StoreIcon, PhoneCall, Edit3, FileText
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, off } from 'firebase/database';
import { Order, OrderStatus, Coordinates } from '../types';
import { formatCurrency } from '../utils/helpers';

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

export const DriverScreen: React.FC<{onLogout: () => void, userName: string}> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'ACTIVE' | 'PROFILE'>('AVAILABLE');
  const [showRating, setShowRating] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', avatar: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentDriverId = auth.currentUser?.uid;

  useEffect(() => {
    let interval: any;
    if (activeOrder && currentDriverId) {
      interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          update(ref(db, `drivers/${currentDriverId}`), {
            coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude }
          });
        }, null, { enableHighAccuracy: true });
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [activeOrder, currentDriverId]);

  useEffect(() => {
    if (!currentDriverId) return;

    onValue(ref(db, `drivers/${currentDriverId}`), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setDriverProfile(data);
        if (!isEditing && !isUploadingAvatar) {
          setEditData({ 
            name: data.name || '', 
            phone: data.phone || '',
            avatar: data.avatar || ''
          });
        }
      }
    });

    onValue(ref(db, 'orders'), (snapshot) => {
        const data = snapshot.val();
        const available: Order[] = [];
        let myActive: Order | null = null;
        if (data) {
            Object.keys(data).forEach(key => {
                const order = { ...data[key], id: key } as Order;
                if (order.driverId === currentDriverId && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED) myActive = order;
                if (order.status === OrderStatus.ACCEPTED_BY_STORE && !order.driverId) available.push(order);
            });
        }
        setAvailableOrders(available);
        setActiveOrder(myActive);
        setLoading(false);
    });
  }, [currentDriverId, isEditing, isUploadingAvatar]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingAvatar(true);
      const url = await uploadImage(file);
      if (url) {
        setEditData(prev => ({ ...prev, avatar: url }));
        if (currentDriverId) {
          await update(ref(db, `drivers/${currentDriverId}`), { avatar: url });
        }
      }
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentDriverId || !editData.name || !editData.phone) return;
    setIsUpdating(true);
    try {
      await update(ref(db, `drivers/${currentDriverId}`), { 
        name: editData.name, 
        phone: editData.phone,
        avatar: editData.avatar 
      });
      setIsEditing(false);
      alert("تم حفظ بياناتك بنجاح ✓");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
      if (!currentDriverId) return;
      try {
        await update(ref(db, `orders/${orderId}`), {
            status: OrderStatus.ACCEPTED_BY_DRIVER,
            driverId: currentDriverId,
            driverName: driverProfile?.name || userName,
            driverPhone: driverProfile?.phone || ''
        });
        setActiveTab('ACTIVE');
      } catch (error) {
        console.error("Failed to accept order:", error);
        alert("فشل قبول الطلب. قد يكون الطلب تم قبوله من قبل موصل آخر. حاول تحديث الصفحة.");
      }
  };

  const handlePickUpOrder = async () => {
    if (!activeOrder) return;
    await update(ref(db, `orders/${activeOrder.id}`), { status: OrderStatus.PICKED_UP });
  };

  const handleCompleteOrder = async () => {
    if (!activeOrder) return;
    await update(ref(db, `orders/${activeOrder.id}`), { status: OrderStatus.DELIVERED });
    setShowRating(true);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-orange-500 w-12 h-12" /></div>;

  return (
    <div className="bg-[#F4F4F4] min-h-screen pb-32 font-cairo text-right" dir="rtl">
       
       {showRating && activeOrder && (
         <RatingModal type="CUSTOMER" targetId={activeOrder.customerId} targetName={activeOrder.customerName} onClose={() => { setShowRating(false); setActiveTab('AVAILABLE'); }} />
       )}

       {activeTab === 'ACTIVE' && activeOrder && (
         <div className="fixed inset-0 z-[1000] bg-white animate-fade-in flex flex-col">
           <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white shadow-sm">
             <button onClick={() => setActiveTab('AVAILABLE')} className="p-2 bg-slate-100 rounded-full active:scale-90"><ChevronLeft size={20} className="rotate-180"/></button>
             <div className="text-center">
                <h3 className="font-black text-slate-800 text-sm">
                  {activeOrder.status === OrderStatus.ACCEPTED_BY_DRIVER ? 'التوجه للمتجر' : 'التوجه للزبون'}
                </h3>
                <p className="text-[9px] font-bold text-slate-400">طلب #{activeOrder.id?.slice(-5).toUpperCase()}</p>
             </div>
             <div className="w-10"></div>
           </div>
           
           <div className="flex-1 relative">
             <MapVisualizer 
                height="h-full" 
                zoom={15} 
                customerLocation={activeOrder.coordinates} 
                storeLocation={activeOrder.storeCoordinates} 
                driverLocation={driverProfile?.coordinates} 
             />
           </div>

           <div className="bg-white p-6 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] -mt-10 z-[1001] relative border-t border-slate-50">
             <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6"></div>
             
             {/* عرض ملاحظات الزبون للموصل */}
             {activeOrder.notes && (
               <div className="bg-orange-50 p-4 rounded-2xl mb-4 border border-orange-100 flex gap-3 animate-fade-in">
                  <FileText size={16} className="text-orange-500 shrink-0" />
                  <div>
                     <p className="text-[9px] font-black text-orange-500 uppercase leading-none mb-1">وصف إضافي من الزبون:</p>
                     <p className="text-xs font-bold text-slate-800 leading-tight">{activeOrder.notes}</p>
                  </div>
               </div>
             )}

             {activeOrder.status === OrderStatus.ACCEPTED_BY_DRIVER ? (
               <div className="animate-fade-in">
                  <div className="flex items-center gap-4 mb-6 bg-orange-50 p-4 rounded-[2rem] border border-orange-100">
                    <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><StoreIcon size={28} /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-orange-500 uppercase">المتجر المستهدف</p>
                      <h4 className="font-black text-slate-800 text-base">{activeOrder.storeName}</h4>
                      {/* عرض أسماء المنتجات للموصل */}
                      <p className="text-[10px] text-slate-500 font-bold">المنتجات: {activeOrder.products.map(p => p.product.name).join('، ')}</p>
                    </div>
                    {activeOrder.storePhone && (
                      <a href={`tel:${activeOrder.storePhone}`} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-md active:scale-90 transition-all border border-orange-100"><PhoneCall size={20} /></a>
                    )}
                  </div>
                  <button onClick={handlePickUpOrder} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    <Package size={24} /> تم استلام الطلب من المتجر
                  </button>
               </div>
             ) : (
               <div className="animate-fade-in">
                  <div className="flex items-center gap-4 mb-6 bg-blue-50 p-4 rounded-[2rem] border border-blue-100">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><User size={28} /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-blue-500 uppercase">الزبون المستهدف</p>
                      <h4 className="font-black text-slate-800 text-base">{activeOrder.customerName}</h4>
                      <p className="text-[9px] text-slate-400 font-bold truncate max-w-[150px]">{activeOrder.address}</p>
                    </div>
                    {activeOrder.customerPhone && (
                      <a href={`tel:${activeOrder.customerPhone}`} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-md active:scale-90 transition-all border border-blue-100"><PhoneCall size={20} /></a>
                    )}
                  </div>
                  <button onClick={handleCompleteOrder} className="w-full brand-gradient text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    <CheckCircle size={24} /> تم تسليم الطلبية للزبون
                  </button>
               </div>
             )}
             
             <div className="mt-4 flex justify-between items-center px-4">
                <span className="text-[10px] font-black text-slate-400">إجمالي الفاتورة: {formatCurrency(activeOrder.totalPrice)}</span>
                <span className="text-[10px] font-black text-green-600">توصيل: {formatCurrency(activeOrder.deliveryFee || 200)}</span>
             </div>
           </div>
         </div>
       )}

       <header className="bg-white sticky top-0 z-[100] px-6 pt-8 pb-4 shadow-sm">
          <h1 className="text-2xl font-black text-slate-800">كيمو موصلين</h1>
          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">{driverProfile?.name || userName}</p>
       </header>

       <main className="p-4 max-w-lg mx-auto">
         {activeTab === 'AVAILABLE' && (
           <div className="animate-fade-in-up space-y-4 px-2">
              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-xl font-black text-slate-800">طلبات متاحة للتوصيل</h2>
                 <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-[8px] font-black text-green-700">متاح الآن</span></div>
              </div>
              
              {availableOrders.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center text-slate-300 border border-dashed border-slate-200 shadow-sm">
                  <Bike className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-black text-sm text-slate-400">لا توجد طلبات في منطقتك حالياً</p>
                </div>
              ) : (
                availableOrders.map(o => (
                  <div key={o.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden relative group">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-orange-500"><ShoppingBag size={20} /></div>
                           <div>
                              <h4 className="font-black text-slate-800 text-base">{o.storeName}</h4>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">بئر العاتر • الجزائر</p>
                           </div>
                        </div>
                        <span className="text-lg font-black text-orange-600">{formatCurrency(o.totalPrice)}</span>
                     </div>
                     
                     {/* عرض ملخص المنتجات للموصل قبل القبول */}
                     <div className="mb-4 text-[11px] font-bold text-slate-600">
                        المنتجات: {o.products.map(p => p.product.name).join('، ')}
                     </div>

                     <div className="bg-slate-50 p-3 rounded-2xl flex items-center gap-2 mb-6">
                        <MapPin size={14} className="text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-500 truncate">{o.address}</p>
                     </div>
                     <button onClick={() => handleAcceptOrder(o.id)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">قبول هذه المهمة</button>
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
                  onClick={() => isEditing && !isUploadingAvatar && fileInputRef.current?.click()}
                 >
                    {(editData.avatar || driverProfile?.avatar) ? (
                      <img src={editData.avatar || driverProfile.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                        <User size={40} />
                      </div>
                    )}
                    
                    {isEditing && (
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
                 
                 <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                 
                 {!isEditing ? (
                   <>
                     <h3 className="text-2xl font-black mb-1 text-slate-800">{driverProfile?.name || userName}</h3>
                     <p className="text-xs text-slate-400 font-bold mb-8">{driverProfile?.phone || 'لا يوجد هاتف'}</p>
                     <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                           <p className="text-[10px] text-slate-400 font-black mb-1">التقييم</p>
                           <div className="flex items-center justify-center gap-1"><Star size={12} className="text-yellow-400 fill-current" /><p className="text-lg font-black text-slate-800">{driverProfile?.rating?.toFixed(1) || '0.0'}</p></div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                           <p className="text-[10px] text-slate-400 font-black mb-1">المكسب</p>
                           <p className="text-lg font-black text-green-600">0.00 د.ج</p>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <button onClick={() => setIsEditing(true)} className="w-full bg-[#F0F0F0] py-4 rounded-2xl font-black text-slate-700 text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                          <Edit3 size={18} /> تعديل الملف
                        </button>
                        <button onClick={onLogout} className="w-full bg-pink-50 py-4 rounded-2xl font-black text-pink-500 text-sm mt-6 active:scale-95 transition-all">خروج من كيمو</button>
                     </div>
                   </>
                 ) : (
                    <div className="space-y-5 text-right">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 pr-2">الاسم بالكامل</label>
                          <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 pr-2">رقم الهاتف</label>
                          <input type="tel" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all" />
                       </div>
                       <div className="flex gap-3 pt-4">
                          <button onClick={handleUpdateProfile} disabled={isUpdating || isUploadingAvatar} className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center">
                            {isUpdating ? <Loader2 className="animate-spin" /> : 'حفظ'}
                          </button>
                          <button onClick={() => setIsEditing(false)} className="px-6 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black">إلغاء</button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
         )}
       </main>

       <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-20 flex justify-around items-center px-4 z-[500] shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
         <NavBtn act={activeTab === 'AVAILABLE'} onClick={() => setActiveTab('AVAILABLE')} icon={<LayoutGrid />} label="طلبات عامة" />
         <NavBtn act={activeTab === 'ACTIVE'} onClick={() => setActiveTab('ACTIVE')} icon={<MapIcon />} label="المهمة الحالية" />
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
