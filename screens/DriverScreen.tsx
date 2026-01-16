import React, { useState, useEffect, useRef } from 'react';
import { MapVisualizer } from '../components/MapVisualizer';
import { RatingModal } from '../components/RatingModal';
import { MapPin, Navigation, CheckCircle, Clock, ExternalLink, Loader2, Package, Bike as BikeIcon, ArrowRight, User, LogOut, Camera, Settings, Phone } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { Order, OrderStatus } from '../types';
import { calculateDistance, USER_LOCATION, formatCurrency } from '../utils/helpers';

interface DriverScreenProps {
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

export const DriverScreen: React.FC<DriverScreenProps> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'ACTIVE' | 'PROFILE'>('AVAILABLE');
  const [showRating, setShowRating] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isUpdating, setIsUpdating] = useState(false);
  const [newName, setNewName] = useState(userName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDriverId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentDriverId) return;

    onValue(ref(db, `drivers/${currentDriverId}`), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setDriverProfile(data);
        setNewName(data.name || userName);
      }
    });

    onValue(ref(db, 'orders'), (snapshot) => {
        const data = snapshot.val();
        const available: Order[] = [];
        let myActive: Order | null = null;

        if (data) {
            Object.keys(data).forEach(key => {
                const order = { ...data[key], id: key } as Order;
                if (order.driverId === currentDriverId && order.status !== OrderStatus.DELIVERED) {
                    myActive = order;
                }
                if (order.status === OrderStatus.ACCEPTED_BY_STORE && !order.driverId) {
                    available.push(order);
                }
            });
        }
        setAvailableOrders(available);
        setActiveOrder(myActive);
        setLoading(false);
    });
  }, [currentDriverId]);

  const handleAcceptOrder = async (orderId: string) => {
      try {
          if (!currentDriverId) return;
          await update(ref(db, `orders/${orderId}`), {
              status: OrderStatus.ACCEPTED_BY_DRIVER,
              driverId: currentDriverId,
              driverName: userName
          });
          setActiveTab('ACTIVE');
      } catch (error) { alert("خطأ في قبول الطلب"); }
  };

  const handleCompleteOrder = async () => {
    if (!activeOrder) return;
    try {
        await update(ref(db, `orders/${activeOrder.id}`), { status: OrderStatus.DELIVERED });
        setShowRating(true);
    } catch (error) { console.error(error); }
  };

  const startFullNavigation = () => {
    if (!activeOrder || !activeOrder.coordinates || !activeOrder.storeCoordinates) return;
    const storeLat = activeOrder.storeCoordinates.lat;
    const storeLng = activeOrder.storeCoordinates.lng;
    const destLat = activeOrder.coordinates.lat;
    const destLng = activeOrder.coordinates.lng;
    const url = `https://www.google.com/maps/dir/?api=1&origin=current+location&destination=${destLat},${destLng}&waypoints=${storeLat},${storeLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleUpdateName = async () => {
    if (!currentDriverId) return;
    setIsUpdating(true);
    try {
      await update(ref(db, `drivers/${currentDriverId}`), { name: newName });
      alert("تم تحديث البيانات");
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentDriverId) {
      setIsUpdating(true);
      const url = await uploadImage(file);
      if (url) {
        await update(ref(db, `drivers/${currentDriverId}`), { avatar: url });
      }
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 font-cairo">
       {showRating && <RatingModal type="CUSTOMER" targetName={activeOrder?.customerName || "الزبون"} onClose={() => { setShowRating(false); setActiveTab('AVAILABLE'); }} />}

       <header className="bg-[#2B2F3B] text-white p-6 shadow-xl sticky top-0 z-10 rounded-b-[2.5rem]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-orange-500">
                <img src={driverProfile?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userName}`} className="w-full h-full object-cover" />
             </div>
             <div>
                <h1 className="font-black text-lg">{driverProfile?.name || userName}</h1>
                <p className="text-[10px] text-orange-400 font-black tracking-widest uppercase">KIMO DRIVER</p>
             </div>
          </div>
          <button onClick={() => setActiveTab('PROFILE')} className="p-3 bg-white/10 rounded-2xl"><Settings className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="p-6 max-w-lg mx-auto">
        {activeTab !== 'PROFILE' && (
          <div className="flex bg-white p-1 rounded-[1.8rem] shadow-sm mb-8 border border-gray-100">
            <button onClick={() => setActiveTab('AVAILABLE')} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === 'AVAILABLE' ? 'bg-[#2B2F3B] text-white shadow-lg' : 'text-slate-400'}`}>طلبات بئر العاتر ({availableOrders.length})</button>
            <button onClick={() => setActiveTab('ACTIVE')} disabled={!activeOrder} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === 'ACTIVE' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'} disabled:opacity-30`}>الطلب النشط</button>
          </div>
        )}

        {loading ? (
             <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-orange-500" /></div>
        ) : activeTab === 'AVAILABLE' ? (
          <div className="space-y-4">
            {availableOrders.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center text-slate-300 border border-dashed border-slate-200">
                    <BikeIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-black text-sm">لا توجد طلبات جديدة حالياً</p>
                </div>
            ) : (
                availableOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-[2rem] shadow-sm border-r-[10px] border-green-500 animate-fade-in-up">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-black text-xl text-[#2B2F3B]">{order.storeName}</h3>
                        <span className="bg-green-500 text-white text-[10px] px-3 py-1.5 rounded-full font-black shadow-sm">{formatCurrency(order.deliveryFee)} ربح</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 mb-5"><MapPin className="w-3.5 h-3.5 text-orange-500" /> الوجهة: {order.address}</p>
                    <button onClick={() => handleAcceptOrder(order.id)} className="w-full bg-[#2B2F3B] text-white py-3.5 rounded-2xl text-xs font-black shadow-lg">قبول الطلبية ✓</button>
                </div>
                ))
            )}
          </div>
        ) : activeTab === 'ACTIVE' ? (
          <div className="space-y-6 animate-fade-in-up">
            {activeOrder && (
                <>
                    <div className="bg-white p-4 rounded-[2.5rem] shadow-xl border border-white">
                        <div className="h-64 rounded-3xl overflow-hidden mb-6 border border-slate-100">
                           <MapVisualizer 
                              storeLocation={activeOrder.storeCoordinates} 
                              customerLocation={activeOrder.coordinates} 
                              height="h-full" 
                              zoom={15}
                           />
                        </div>
                        
                        <div className="space-y-4">
                           <div className="p-5 bg-slate-50 rounded-[1.8rem] border border-slate-100 flex justify-between items-center">
                              <div>
                                <p className="text-[10px] font-black text-orange-600 mb-1 uppercase">1. نقطة الاستلام</p>
                                <p className="font-black text-[#2B2F3B] text-lg">{activeOrder.storeName}</p>
                              </div>
                              {activeOrder.storePhone && (
                                <a href={`tel:${activeOrder.storePhone}`} className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                                  <Phone className="w-5 h-5" />
                                </a>
                              )}
                           </div>
                           <div className="flex justify-center"><ArrowRight className="rotate-90 text-slate-200" /></div>
                           <div className="p-5 bg-green-50 rounded-[1.8rem] border border-green-100 flex justify-between items-center">
                              <div>
                                <p className="text-[10px] font-black text-green-600 mb-1 uppercase">2. نقطة التسليم</p>
                                <p className="font-black text-[#2B2F3B] text-lg">{activeOrder.customerName}</p>
                                <p className="text-xs text-slate-400 font-bold">{activeOrder.address}</p>
                              </div>
                              {activeOrder.customerPhone && (
                                <a href={`tel:${activeOrder.customerPhone}`} className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                                  <Phone className="w-5 h-5" />
                                </a>
                              )}
                           </div>
                        </div>

                        <button onClick={startFullNavigation} className="w-full mt-8 bg-blue-600 text-white py-4 rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                           <Navigation className="w-6 h-6" /> تشغيل GPS المباشر
                        </button>
                    </div>

                    <button onClick={handleCompleteOrder} className="w-full bg-green-500 text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all">
                        تأكيد تسليم الطلب للزبون
                    </button>
                </>
            )}
          </div>
        ) : (
          <div className="animate-fade-in-up">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
                <div className="relative inline-block mb-8">
                   <div className="w-32 h-32 rounded-[2rem] border-4 border-slate-50 overflow-hidden shadow-lg bg-slate-50">
                      <img src={driverProfile?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userName}`} className="w-full h-full object-cover" />
                   </div>
                   <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-3 rounded-2xl shadow-lg border-2 border-white"><Camera className="w-5 h-5" /></button>
                   <input type="file" ref={fileInputRef} onChange={handleUpdateAvatar} className="hidden" accept="image/*" />
                </div>
                <div className="space-y-6">
                   <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black text-center outline-none border border-slate-100 focus:border-orange-500" />
                   <button onClick={handleUpdateName} disabled={isUpdating} className="w-full bg-[#2B2F3B] text-white py-4 rounded-2xl font-black shadow-lg">حفظ التغييرات</button>
                   <button onClick={onLogout} className="w-full bg-red-50 text-red-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"><LogOut className="w-5 h-5" /> تسجيل الخروج</button>
                </div>
             </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-6 left-6 right-6 bg-[#2B2F3B] rounded-[2.2rem] p-2 flex justify-around items-center shadow-2xl z-50">
         <button onClick={() => setActiveTab('AVAILABLE')} className={`p-4 rounded-full transition-all ${activeTab === 'AVAILABLE' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}><Package className="w-6 h-6" /></button>
         <button onClick={() => setActiveTab('ACTIVE')} disabled={!activeOrder} className={`p-4 rounded-full transition-all ${activeTab === 'ACTIVE' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'} disabled:opacity-20`}><BikeIcon className="w-6 h-6" /></button>
         <button onClick={() => setActiveTab('PROFILE')} className={`p-4 rounded-full transition-all ${activeTab === 'PROFILE' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}><User className="w-6 h-6" /></button>
      </nav>
    </div>
  );
};