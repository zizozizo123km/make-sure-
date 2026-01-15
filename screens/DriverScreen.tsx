import React, { useState, useEffect } from 'react';
import { MapVisualizer } from '../components/MapVisualizer';
import { RatingModal } from '../components/RatingModal';
import { MapPin, Navigation, CheckCircle, Clock, ExternalLink, Loader2, Package, Bike as BikeIcon } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update } from 'firebase/database';
import { Order, OrderStatus } from '../types';
import { calculateDistance, USER_LOCATION, formatCurrency } from '../utils/helpers'; // Assuming driver is at USER_LOCATION for demo

interface DriverScreenProps {
  onLogout: () => void;
  userName: string;
}

export const DriverScreen: React.FC<DriverScreenProps> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'ACTIVE'>('AVAILABLE');
  const [showRating, setShowRating] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const currentDriverId = auth.currentUser?.uid;

  // Listen to Orders
  useEffect(() => {
    const ordersRef = ref(db, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        const available: Order[] = [];
        let myActive: Order | null = null;

        if (data) {
            Object.keys(data).forEach(key => {
                const order = { ...data[key], id: key } as Order;
                
                // Check if this is MY active order
                if (order.driverId === currentDriverId && order.status === OrderStatus.ACCEPTED_BY_DRIVER) {
                    myActive = order;
                }
                
                // Check if it's an available order (Accepted by store, no driver yet)
                if (order.status === OrderStatus.ACCEPTED_BY_STORE && !order.driverId) {
                    available.push(order);
                }
            });
        }
        
        setAvailableOrders(available);
        setActiveOrder(myActive);
        
        // Auto switch tab if I have an active order
        if (myActive) setActiveTab('ACTIVE');
        
        setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDriverId]);

  const handleAcceptOrder = async (orderId: string) => {
      try {
          if (!currentDriverId) return;
          
          await update(ref(db, `orders/${orderId}`), {
              status: OrderStatus.ACCEPTED_BY_DRIVER,
              driverId: currentDriverId,
              driverName: userName
          });
          // State update will happen via listener
      } catch (error) {
          console.error("Error accepting order:", error);
          alert("فشل قبول الطلب");
      }
  };

  const handleCompleteOrder = async () => {
    if (!activeOrder) return;
    try {
        await update(ref(db, `orders/${activeOrder.id}`), {
            status: OrderStatus.DELIVERED
        });
        setShowRating(true); // Show rating modal after delivery
    } catch (error) {
        console.error("Error completing order:", error);
    }
  };

  const closeRating = () => {
    setShowRating(false);
    setActiveTab('AVAILABLE');
  };

  const openGoogleMaps = (lat: number, lng: number, label: string = '') => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-primary-100 pb-20">
       {showRating && <RatingModal type="CUSTOMER" targetName={activeOrder?.customerName || "الزبون"} onClose={closeRating} />}

       <header className="bg-primary-900 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <span className="bg-brand-600 text-white px-3 py-1 rounded-2xl text-sm font-black">سائق</span>
            {userName || 'لوحة السائق'}
          </h1>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${activeOrder ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
              {activeOrder ? 'مشغول' : 'متاح'}
            </div>
            <button onClick={onLogout} className="text-sm text-danger-400 hover:text-danger-300 transition-colors">خروج</button>
          </div>
        </div>
      </header>

      <div className="p-4">
        {/* Toggle Tabs */}
        <div className="flex bg-white p-1 rounded-3xl shadow-md mb-6 border border-primary-100">
          <button 
            onClick={() => setActiveTab('AVAILABLE')}
            className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-colors ${activeTab === 'AVAILABLE' ? 'bg-primary-100 text-primary-800 shadow-sm' : 'text-primary-500 hover:bg-primary-50'}`}
          >
            الطلبات المتاحة ({availableOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('ACTIVE')}
            disabled={!activeOrder}
            className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-colors ${activeTab === 'ACTIVE' ? 'bg-brand-100 text-brand-700 shadow-sm' : 'text-primary-500 hover:bg-primary-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            الطلب الحالي
          </button>
        </div>

        {loading ? (
             <div className="flex justify-center mt-10"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
        ) : activeTab === 'AVAILABLE' ? (
          <div className="space-y-4">
            {availableOrders.length === 0 ? (
                <div className="bg-white rounded-4xl p-10 text-center text-primary-400 shadow-sm border border-primary-100">
                    <BikeIcon className="w-16 h-16 mx-auto mb-4 text-primary-300" />
                    <p className="font-bold text-lg">لا توجد طلبات متاحة حالياً</p>
                    <p className="text-sm mt-2">عد للتحقق لاحقاً!</p>
                </div>
            ) : (
                availableOrders.map(order => (
                <div key={order.id} className="bg-white p-5 rounded-3xl shadow-md border-r-4 border-success animate-fade-in-up">
                    <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-xl text-primary-800">{order.storeName}</h3>
                    <div className="flex flex-col items-end">
                        <span className="bg-success/10 text-success text-xs px-3 py-1 rounded-full font-bold">توصيل: {formatCurrency(order.deliveryFee)}</span>
                        <span className="text-xs text-primary-400 mt-1">الطلب: {formatCurrency(order.totalPrice - order.deliveryFee)}</span>
                    </div>
                    </div>
                    <div className="flex items-start gap-2 text-primary-600 text-sm mb-4">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-brand-500" />
                        <p className="font-medium">إلى: <span className="font-bold">{order.address}</span></p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                        {order.products.map((item, i) => (
                             <span key={i} className="text-xs bg-primary-50 px-3 py-1.5 rounded-2xl border border-primary-100 text-primary-600">{item.quantity}x {item.product.name}</span>
                        ))}
                    </div>

                    <div className="flex justify-between items-center border-t border-primary-100 pt-3">
                    <span className="text-xs font-bold text-primary-500 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-primary-400" /> مسافة تقريبية: {order.storeCoordinates ? calculateDistance(USER_LOCATION, order.storeCoordinates) : '?'} كم
                    </span>
                    <button 
                        onClick={() => handleAcceptOrder(order.id)}
                        className="bg-primary-900 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-success transition-colors shadow-lg"
                    >
                        قبول الطلب
                    </button>
                    </div>
                </div>
                ))
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up">
            {activeOrder ? (
                <>
                    <div className="bg-white p-4 rounded-3xl shadow-md border border-primary-100">
                    <MapVisualizer userType="DRIVER" height="h-64" />
                    <div className="mt-4 flex flex-col gap-3">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <p className="text-xs text-blue-500 font-bold mb-1">نقطة الاستلام (المتجر)</p>
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-primary-800">{activeOrder.storeName}</p>
                                <button 
                                    onClick={() => activeOrder.storeCoordinates && openGoogleMaps(activeOrder.storeCoordinates.lat, activeOrder.storeCoordinates.lng, activeOrder.storeName)}
                                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md"
                                >
                                    <Navigation className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-success/10 rounded-2xl border border-success/30">
                            <p className="text-xs text-success font-bold mb-1">نقطة التسليم (الزبون)</p>
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-primary-800">{activeOrder.address}</p>
                                <button 
                                     onClick={() => activeOrder.coordinates && openGoogleMaps(activeOrder.coordinates.lat, activeOrder.coordinates.lng, activeOrder.customerName)}
                                     className="p-2 bg-success text-white rounded-full hover:bg-emerald-700 shadow-md"
                                >
                                    <Navigation className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-md border border-primary-100 space-y-4">
                    <h3 className="font-bold text-xl text-primary-800 border-b border-primary-100 pb-3">تفاصيل الطلب #{activeOrder.id.slice(-4)}</h3>
                    
                    <div className="flex items-center gap-3 text-sm text-success bg-success/10 p-3 rounded-2xl font-bold">
                        <CheckCircle className="w-5 h-5" />
                        <span>أنت المسؤول عن توصيل هذا الطلب</span>
                    </div>
                    
                    <div className="space-y-1 py-2">
                         <p className="text-sm font-bold text-primary-700 mb-2">المطلوب:</p>
                         <ul className="list-disc list-inside text-sm text-primary-600 space-y-1">
                             {activeOrder.products.map((p, i) => (
                                 <li key={i}>{p.quantity}x <span className="font-medium">{p.product.name}</span></li>
                             ))}
                         </ul>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-primary-500 bg-primary-50 p-3 rounded-2xl font-bold">
                        <Clock className="w-5 h-5" />
                        <span>يرجى التوصيل في أسرع وقت ممكن</span>
                    </div>
                    
                    <button 
                        onClick={handleCompleteOrder}
                        className="w-full mt-4 bg-success text-white py-3 rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-success/30"
                    >
                        تأكيد التسليم واستلام النقود ({formatCurrency(activeOrder.totalPrice)})
                    </button>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-4xl p-10 text-center text-primary-400 shadow-sm border border-primary-100">
                    <Package className="w-16 h-16 mx-auto mb-4 text-primary-300" />
                    <p className="font-bold text-lg">لا يوجد لديك طلب نشط حالياً</p>
                    <p className="text-sm mt-2">اختر طلباً من قائمة الطلبات المتاحة.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};