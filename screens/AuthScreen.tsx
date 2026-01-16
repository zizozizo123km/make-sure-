import React, { useState, useRef } from 'react';
import { Category, UserRole } from '../types';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { ShoppingBag, Store, Bike, MapPin, ArrowRight, Loader2, Phone, Lock, User, Mail, ChevronLeft, AlertCircle, Upload, Camera, X, Navigation } from 'lucide-react';
import { BIR_EL_ATER_CENTER } from '../utils/helpers';

interface AuthScreenProps {
  onLogin: (role: UserRole, name?: string) => void;
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
  } catch (error) {
    return null;
  }
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    password: '', 
    storeImage: '',
    coords: null as {lat: number, lng: number} | null
  });
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setAuthMode('LOGIN');
    setError('');
  };

  const handleBack = () => {
    setSelectedRole(null);
    setFormData({ name: '', email: '', phone: '', password: '', storeImage: '', coords: null });
    setError('');
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({ 
            ...prev, 
            coords: { 
              lat: position.coords.latitude, 
              lng: position.coords.longitude 
            } 
          }));
          setIsLocating(false);
          alert("تم تحديد موقعك بنجاح!");
        },
        (error) => {
          setIsLocating(false);
          alert("فشل تحديد الموقع، يرجى تفعيل GPS");
        }
      );
    } else {
      setIsLocating(false);
      alert("متصفحك لا يدعم تحديد الموقع");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const url = await uploadImage(file);
      if (url) setFormData(prev => ({ ...prev, storeImage: url }));
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Updated: Location is now mandatory for ALL roles during registration
    if (authMode === 'REGISTER' && !formData.coords) {
      setError('يرجى تحديد موقعك على الخريطة أولاً لتتمكن من التسجيل');
      return;
    }

    if (!formData.email || !formData.password || (authMode === 'REGISTER' && (!formData.name || !formData.phone))) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'REGISTER') {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        const dbPath = selectedRole === UserRole.CUSTOMER ? 'customers' : selectedRole === UserRole.STORE ? 'stores' : 'drivers';
        
        const profileData: any = {
            id: user.uid,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            role: selectedRole,
            createdAt: Date.now(),
            coordinates: formData.coords || BIR_EL_ATER_CENTER
        };

        if (selectedRole === UserRole.STORE) {
            profileData.category = Category.FOOD;
            profileData.image = formData.storeImage || `https://picsum.photos/400/300?random=${user.uid.slice(0,5)}`;
        }

        await set(ref(db, `${dbPath}/${user.uid}`), profileData);
        onLogin(selectedRole!, formData.name);
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        onLogin(selectedRole || UserRole.CUSTOMER);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative overflow-hidden font-cairo">
        <div className="z-10 text-center mb-12">
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
            <span className="text-white text-5xl font-black">K</span>
          </div>
          <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">كيمو</h1>
          <p className="text-slate-400 font-bold">بئر العاتر بين يديك</p>
        </div>
        <div className="grid grid-cols-1 gap-4 w-full max-w-sm z-10">
          <RoleCard icon={<ShoppingBag/>} title="أنا زبون" desc="اطلب ووصلك لعند الباب" onClick={() => handleRoleSelect(UserRole.CUSTOMER)} />
          <RoleCard icon={<Store/>} title="أنا متجر" desc="اعرض منتجاتك وزيد دخلك" onClick={() => handleRoleSelect(UserRole.STORE)} />
          <RoleCard icon={<Bike/>} title="أنا موصل" desc="خدم أحرار في بئر العاتر" onClick={() => handleRoleSelect(UserRole.DRIVER)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-cairo">
      <div className="w-full max-w-md animate-scale-up">
        <button onClick={handleBack} className="flex items-center text-slate-400 font-bold mb-6 text-sm"><ChevronLeft className="w-4 h-4" /> رجوع للخلف</button>
        <h2 className="text-4xl font-black text-slate-800 mb-2">{authMode === 'LOGIN' ? 'تسجيل دخول' : 'إنشاء حساب'}</h2>
        <p className="text-slate-500 mb-8 font-bold">أهلاً بك في كيمو - قسم {selectedRole === UserRole.STORE ? 'المتاجر' : selectedRole === UserRole.DRIVER ? 'الموصلين' : 'الزبائن'}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}

          {authMode === 'REGISTER' && (
            <>
              {selectedRole === UserRole.STORE && (
                <div className="flex flex-col items-center mb-6">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden relative"
                  >
                    {formData.storeImage ? <img src={formData.storeImage} className="w-full h-full object-cover" /> : <Camera className="text-slate-300" />}
                    {isUploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  <p className="text-[10px] text-slate-400 mt-2 font-black">تحميل شعار المتجر</p>
                </div>
              )}

              {/* Updated: Button now visible for Customer, Store, and Driver */}
              <button 
                type="button" 
                onClick={handleGetLocation} 
                className={`w-full p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-2 font-black ${formData.coords ? 'border-green-500 text-green-600 bg-green-50' : 'border-orange-200 text-orange-600 bg-orange-50'}`}
              >
                {isLocating ? <Loader2 className="animate-spin w-5 h-5" /> : <Navigation className="w-5 h-5" />}
                {formData.coords ? 'تم تحديد موقعك بدقة ✓' : 'تحديد موقعي عبر GPS (إلزامي)'}
              </button>

              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold" placeholder="الاسم الكامل" />
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold" placeholder="رقم الهاتف" />
            </>
          )}

          <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold" placeholder="البريد الإلكتروني" />
          <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold" placeholder="كلمة المرور" />

          <button type="submit" disabled={isLoading || isUploading || isLocating} className="w-full bg-[#2B2F3B] text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">
            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (authMode === 'LOGIN' ? 'دخول' : 'بدء الاستخدام')}
          </button>

          <button type="button" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-center text-slate-400 text-sm font-bold pt-2">
            {authMode === 'LOGIN' ? 'جديد في كيمو؟ سجل حسابك هنا' : 'لديك حساب؟ سجل دخولك'}
          </button>
        </form>
      </div>
    </div>
  );
};

const RoleCard = ({ icon, title, desc, onClick }: any) => (
  <button onClick={onClick} className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-[2rem] text-right flex items-center gap-5 hover:bg-slate-800 transition-all active:scale-95">
    <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <div>
      <h3 className="text-xl font-black text-white leading-none mb-1">{title}</h3>
      <p className="text-slate-400 text-[10px] font-bold">{desc}</p>
    </div>
  </button>
);