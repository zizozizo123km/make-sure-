import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { ref, onValue, update, set } from 'firebase/database';
import { 
  ShieldCheck, Users, Store, Bike, Lock, Unlock, 
  Send, Loader2, ArrowLeft, LogOut, Bell, Settings,
  Activity, BarChart3, Database
} from 'lucide-react';

interface AdminScreenProps {
  onExit: () => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // إحصائيات
  const [stats, setStats] = useState({
    customers: 0,
    stores: 0,
    drivers: 0,
    orders: 0
  });

  // حالة التطبيق
  const [appConfig, setAppConfig] = useState({
    isLocked: false,
    globalMessage: ''
  });

  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      // جلب الإحصائيات
      onValue(ref(db, 'customers'), (s) => setStats(prev => ({ ...prev, customers: s.exists() ? Object.keys(s.val()).length : 0 })));
      onValue(ref(db, 'stores'), (s) => setStats(prev => ({ ...prev, stores: s.exists() ? Object.keys(s.val()).length : 0 })));
      onValue(ref(db, 'drivers'), (s) => setStats(prev => ({ ...prev, drivers: s.exists() ? Object.keys(s.val()).length : 0 })));
      onValue(ref(db, 'orders'), (s) => setStats(prev => ({ ...prev, orders: s.exists() ? Object.keys(s.val()).length : 0 })));

      // جلب إعدادات التطبيق
      onValue(ref(db, 'app_settings'), (s) => {
        if (s.exists()) {
          setAppConfig(s.val());
          setNewMessage(s.val().globalMessage || '');
        }
      });
    }
  }, [isAuthenticated]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.email === 'downloader@gmail.com' && loginForm.password === 'kimo1212') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
  };

  const toggleAppLock = async () => {
    setLoading(true);
    await update(ref(db, 'app_settings'), { isLocked: !appConfig.isLocked });
    setLoading(false);
  };

  const updateGlobalMessage = async () => {
    setLoading(true);
    await update(ref(db, 'app_settings'), { globalMessage: newMessage });
    alert('تم تحديث الرسالة العامة بنجاح ✓');
    setLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-cairo" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-orange-500 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/20">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">لوحة تحكم كيمو</h1>
            <p className="text-slate-500 text-xs font-bold">يرجى تسجيل الدخول كمسؤول</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs font-bold text-center border border-red-500/20">{error}</div>}
            
            <input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
              value={loginForm.email}
              onChange={e => setLoginForm({...loginForm, email: e.target.value})}
            />
            
            <input 
              type="password" 
              placeholder="كلمة المرور" 
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 transition-all"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />

            <button className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
              دخول الإدارة
            </button>

            <button type="button" onClick={onExit} className="w-full text-slate-500 text-sm font-bold flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> العودة للتطبيق
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-cairo pb-20" dir="rtl">
      <header className="bg-slate-900 text-white p-6 rounded-b-[3rem] shadow-xl">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Settings className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-lg">لوحة التحكم المركزية</h1>
              <p className="text-[10px] text-orange-400 font-black tracking-widest">KIMO ADMIN v1.0</p>
            </div>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="p-3 bg-white/10 rounded-xl hover:bg-red-500 transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="text-blue-500" />} label="الزبائن" value={stats.customers} color="bg-blue-50" />
          <StatCard icon={<Store className="text-orange-500" />} label="المتاجر" value={stats.stores} color="bg-orange-50" />
          <StatCard icon={<Bike className="text-green-500" />} label="الموصلين" value={stats.drivers} color="bg-green-50" />
          <StatCard icon={<Activity className="text-purple-500" />} label="الطلبات" value={stats.orders} color="bg-purple-50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* التحكم في حالة التطبيق */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="text-slate-400 w-6 h-6" />
              <h2 className="text-xl font-black text-slate-900">حالة النظام</h2>
            </div>
            
            <div className={`p-6 rounded-3xl mb-6 flex items-center justify-between ${appConfig.isLocked ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
              <div>
                <p className={`font-black ${appConfig.isLocked ? 'text-red-600' : 'text-green-600'}`}>
                  {appConfig.isLocked ? 'التطبيق مغلق حالياً' : 'التطبيق يعمل بنجاح'}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">سيتم منع المستخدمين من الطلب عند الغلق</p>
              </div>
              <button 
                onClick={toggleAppLock}
                disabled={loading}
                className={`p-4 rounded-2xl shadow-lg transition-all active:scale-90 ${appConfig.isLocked ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
              >
                {loading ? <Loader2 className="animate-spin w-6 h-6" /> : appConfig.isLocked ? <Unlock /> : <Lock />}
              </button>
            </div>
          </div>

          {/* الإشعارات العامة */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="text-slate-400 w-6 h-6" />
              <h2 className="text-xl font-black text-slate-900">إشعار عام (للجميع)</h2>
            </div>
            
            <textarea 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="اكتب هنا رسالة ستظهر لكل مستخدمي التطبيق..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-sm h-32 outline-none focus:border-orange-500 transition-all resize-none"
            />
            
            <button 
              onClick={updateGlobalMessage}
              disabled={loading}
              className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5" /> نشر الرسالة</>}
            </button>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white overflow-hidden relative">
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                 <Database className="text-orange-500" />
                 <h3 className="text-lg font-black">قاعدة البيانات</h3>
              </div>
              <p className="text-slate-400 text-sm font-bold mb-6">إدارة خوادم كيمو والتحقق من سلامة البيانات في بئر العاتر.</p>
              <div className="flex gap-4">
                 <div className="bg-white/5 p-4 rounded-2xl flex-1 text-center">
                    <p className="text-[10px] opacity-50 font-bold">زمن الاستجابة</p>
                    <p className="font-black text-orange-400 text-xl">24ms</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl flex-1 text-center">
                    <p className="text-[10px] opacity-50 font-bold">الحالة</p>
                    <p className="font-black text-green-400 text-xl">مستقر</p>
                 </div>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full"></div>
        </div>
      </main>

      <button onClick={onExit} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-8 py-4 rounded-full font-black shadow-2xl border border-slate-200 flex items-center gap-2 active:scale-95 transition-all z-50">
        <ArrowLeft className="w-5 h-5" /> العودة للتطبيق
      </button>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: any) => (
  <div className={`${color} p-6 rounded-[2rem] border border-white/50 shadow-sm flex flex-col items-center justify-center text-center`}>
    <div className="mb-3 p-3 bg-white rounded-2xl shadow-sm">{icon}</div>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
  </div>
);