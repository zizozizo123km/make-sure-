
import React, { useState, useEffect, useRef } from 'react';
import { MapVisualizer } from '../components/MapVisualizer';
import { RatingModal } from '../components/RatingModal';
import { MapPin, Navigation, CheckCircle, Clock, ExternalLink, Loader2, Package, Bike as BikeIcon, ArrowRight, User, LogOut, Camera, Settings, Phone, RefreshCw, Save } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { Order, OrderStatus } from '../types';
import { calculateDistance, USER_LOCATION, formatCurrency } from '../utils/helpers';

export const DriverScreen: React.FC<{onLogout: () => void, userName: string}> = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'ACTIVE' | 'PROFILE'>('AVAILABLE');
  const [showRating, setShowRating] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const currentDriverId = auth.currentUser?.uid;

  // تأثير جانبي لتحديث الموقع تلقائياً في الخلفية عند وجود طلب نشط
  useEffect(() => {
    let interval: any;
    if (activeOrder && currentDriverId) {
      interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          update(ref(db, `drivers/${currentDriverId}`), {
            coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude }
          });
        }, null, { enableHighAccuracy: true });
      }, 10000); // تحديث كل 10 ثواني
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
    try {
      await update(ref(db, `drivers/${currentDriverId}`), {
        name: editData.name,
        phone: editData.phone
      });
      setIsEditing(false);
      alert("تم تحديث بياناتك بنجاح ✓");
    } catch (e) {
      alert("خطأ أثناء التحديث");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (currentDriverId) {
            await update(ref(db, `drivers/${currentDriverId}`), {
              coordinates: { 
                lat: position.coords.latitude, 
                lng: position.coords.longitude 
              }
            });
            alert("تم تحديث موقعك الجغرافي بنجاح ✓");
          }
          setIsLocating(false);
        },
        () => {
          alert("يرجى تفعيل الـ GPS لتحديث الموقع");
          setIsLocating(false);
        }
      );
    }
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 font-cairo text-right" dir="rtl">
       {showRating && activeOrder && (
         <RatingModal 
           type="CUSTOMER" 
           targetId={activeOrder.customerId} 
           targetName={activeOrder.customerName} 
           onClose={() => { setShowRating(false); setActiveTab('AVAILABLE'); }} 
         />
       )}

       <header className="bg-[#2