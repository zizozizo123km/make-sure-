import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { ShoppingBag, TrendingUp, DollarSign, Package, CheckCircle, Clock } from 'lucide-react';
import { OrderStatus, Order } from '../types';

interface StoreScreenProps {
  user: any;
}

export const StoreScreen: React.FC<StoreScreenProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ totalSales: 0, totalProfit: 0 });

  useEffect(() => {
    if (!user?.id) return;

    const ordersRef = ref(db, 'orders');
    const storeOrdersQuery = query(ordersRef, orderByChild('storeId'), equalTo(user.id));

    const unsubscribe = onValue(storeOrdersQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList: Order[] = Object.values(data);
        setOrders(orderList);

        // Calculate stats for DELIVERED orders
        const deliveredOrders = orderList.filter(o => o.status === OrderStatus.DELIVERED);
        const profit = deliveredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        setStats({
          totalSales: deliveredOrders.length,
          totalProfit: profit
        });
      } else {
        setOrders([]);
        setStats({ totalSales: 0, totalProfit: 0 });
      }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-cairo">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800">لوحة تحكم المتجر</h1>
          <p className="text-slate-500 font-bold">أهلاً بك مجدداً، {user.name}</p>
        </div>
        <div className="bg-orange-500 p-3 rounded-2xl shadow-lg">
          <ShoppingBag className="text-white w-6 h-6" />
        </div>
      </header>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between overflow-hidden relative group transition-all hover:shadow-xl">
          <div className="z-10">
            <p className="text-slate-400 font-black text-sm mb-1">إجمالي المبيعات</p>
            <h3 className="text-4xl font-black text-slate-900">{stats.totalSales}</h3>
            <span className="text-green-500 text-xs font-bold flex items-center gap-1 mt-2">
              <TrendingUp size={12} /> عملية ناجحة
            </span>
          </div>
          <div className="bg-blue-50 p-5 rounded-[2rem] text-blue-500 transition-transform group-hover:scale-110">
            <Package size={32} />
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50/30 rounded-full blur-2xl"></div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between overflow-hidden relative group transition-all hover:shadow-xl">
          <div className="z-10">
            <p className="text-slate-400 font-black text-sm mb-1">إجمالي الأرباح</p>
            <h3 className="text-4xl font-black text-slate-900">{stats.totalProfit.toLocaleString()} <span className="text-lg">د.ج</span></h3>
            <span className="text-orange-500 text-xs font-bold flex items-center gap-1 mt-2">
              <DollarSign size={12} /> رصيدك الحالي
            </span>
          </div>
          <div className="bg-orange-50 p-5 rounded-[2rem] text-orange-500 transition-transform group-hover:scale-110">
            <DollarSign size={32} />
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-50/30 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
          الطلبات الأخيرة <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full">{orders.length}</span>
        </h2>
        
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-bold">لا توجد طلبات بعد</div>
          ) : (
            orders.sort((a,b) => b.createdAt - a.createdAt).map(order => (
              <div key={order.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    {order.status === OrderStatus.DELIVERED ? <CheckCircle size={24} /> : <Clock size={24} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">{order.customerName}</h4>
                    <p className="text-slate-400 text-xs font-bold">{order.items}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900">{order.totalPrice} د.ج</p>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                    order.status === OrderStatus.DELIVERED ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'
                  }`}>
                    {order.status === OrderStatus.DELIVERED ? 'تم التسليم' : 'قيد المعالجة'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
