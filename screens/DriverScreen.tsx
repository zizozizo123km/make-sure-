
import React, { useState, useEffect } from 'react';
import { MapVisualizer } from '../components/MapVisualizer';
import { RatingModal } from '../components/RatingModal';
import { 
  MapPin, Navigation, CheckCircle, Clock, Loader2, Package, Bike, 
  ArrowRight, User, LogOut, Camera, Phone, RefreshCw, Save,
  ChevronLeft, ShoppingBag, Star, LayoutGrid, Home, X, Bot, Map as MapIcon
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, off } from 'firebase/database';
import { Order, OrderStatus, Coordinates } from '../types';
import { formatCurrency } from '../utils/helpers';

export const DriverScreen: React.FC<{onLogout: () => void, userName: string}> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'ACTIVE' | 'PROFILE'>('AVAILABLE');
  const [showRating, setShowRating] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '' });
  const [isUpdating, setIsUpdating] = useState(false);

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
        setEditData({ name: data.name || '', phone: data.phone || '' });
      }
    });

    onValue(ref(db, 'orders'), (snapshot) => {
        const data = snapshot.val();
        const available: Order[] = [];
        let myActive: Order | null = null;
        if (data) {
            Object.keys(data).forEach(key => {
                const order = { ...data[key], id: key } as Order;
                if (order.driverId === currentDriverId && order.status !== OrderStatus.DELIVERED) myActive = order;
                if (order.status === OrderStatus.ACCEPTED_BY_STORE && !order.driverId) available.push(order);
            });
        }
        setAvailableOrders(available);
        setActiveOrder(myActive);
        setLoading(false);
    });
  }, [currentDriverId]);

  const handleUpdateProfile = async () => {
    if (!currentDriverId || !editData.name || !editData.phone) return;
    setIsUpdating(true);
    await update(ref(db, `drivers/${currentDriverId}`), { name: editData.name, phone: editData.phone });
    setIsEditing(false);
    setIsUpdating(false);
    alert("تم حفظ بياناتك ✓");
  };

  const handleAcceptOrder = async (orderId: string) => {
      if (!currentDriverId) return;
      await update(ref(db, `orders/${orderId}`), {
          status: OrderStatus.ACCEPTED_BY_DRIVER,
          driverId: currentDriverId,
          driverName: driverProfile?.name || userName,
          driverPhone: driverProfile?.phone || ''
      });
      setActiveTab('ACTIVE');
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

       {/* Special Full Screen Tracking for Driver */}
       {activeTab === 'ACTIVE' && activeOrder && (
         <div className="fixed inset-0 z-[1000] bg-white animate-fade-in flex flex-col">
           <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white shadow-sm">
             <button onClick={() => setActiveTab('AVAILABLE')} className="p-2 bg-slate-100 rounded-full active:scale-90"><ChevronLeft size={20} className="rotate-180"/></button>
             <div className="text-center">
                <h3 className="font-black text-slate-800 text-sm">مهمة توصيل نشطة</h3>
                <p className="text-[9px] font-bold text-slate-400">رقم الطلب: #{activeOrder.id?.slice(-5).toUpperCase()}</p>
             </div>
             <div className="w-10"></div>
           </div>
           
           <div className="flex-1 relative">
             <MapVisualizer height="h-full" zoom={15} customerLocation={activeOrder.coordinates} storeLocation={activeOrder.storeCoordinates} driverLocation={driverProfile?.coordinates} />
           </div>

           <div className="bg-white p-6 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] -mt-10 z-[1001] relative border-t border-slate-50">
             <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6"></div>
             
             <div className="flex items-center gap-4 mb-6 bg-slate-50 p-4 rounded-[2rem]">
               <div className="w-14 h-14 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-lg"><User size={28} /></div>
               <div className="flex-1">
                 <h4 className="font-black text-slate-800 text-base">{activeOrder.customerName}</h4>
                 <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><MapPin size={10}/> {activeOrder.address}</p>
               </div>
               <a href={`tel:${activeOrder.customerPhone}`} className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all"><Phone size={20} /></a>
             </div>

             <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl">
                   <p className="text-[10px] text-slate-400 font-black mb-1">المتجر</p>
                   <p className="text-xs font-black text-slate-800 truncate">{activeOrder.storeName}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                   <p className="text-[10px] text-slate-400 font-black mb-1">المبلغ المحصل</p>
                   <p className="text-xs font-black text-orange-600">{formatCurrency(activeOrder.totalPrice)}</p>
                </div>
             </div>

             <button onClick={handleCompleteOrder} className="w-full brand-gradient text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 mb-2">
                <CheckCircle size={24} /> تم تسليم الطلبية بنجاح
             </button>
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
                 <div className="w-28 h-28 rounded-[2.2rem] border-4 border-white shadow-xl mx-auto mb-6 bg-slate-50 relative overflow-hidden group">
                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${driverProfile?.name}`} className="w-full h-full object-cover" />
                 </div>
                 
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
                        <button onClick={() => setIsEditing(true)} className="w-full bg-[#F0F0F0] py-4 rounded-2xl font-black text-slate-700 text-sm active:scale-95 transition-all">تعديل الملف</button>
                        <button onClick={onLogout} className="w-full bg-red-50 py-4 rounded-2xl font-black text-red-500 text-sm mt-6">خروج من كيمو</button>
                     </div>
                   </>
                 ) : (
                    <div className="space-y-5 text-right">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 pr-2">الاسم بالكامل</label>
                          <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 pr-2">رقم الهاتف</label>
                          <input type="tel" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                       </div>
                       <div className="flex gap-3 pt-4">
                          <button onClick={handleUpdateProfile} disabled={isUpdating} className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all">حفظ</button>
                          <button onClick={() => setIsEditing(false)} className="px-6 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black">إلغاء</button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
         )}
       </main>

       {/* Bottom Nav Consistent with Others */}
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
