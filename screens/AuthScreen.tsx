import React, { useState } from 'react';
import { Category, UserRole } from '../types';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { ShoppingBag, Store, Bike, MapPin, ArrowRight, Loader2, Phone, Lock, User, Mail, ChevronLeft, AlertCircle } from 'lucide-react';
import { BIR_EL_ATER_CENTER } from '../utils/helpers';

interface AuthScreenProps {
  onLogin: (role: UserRole, name?: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setAuthMode('LOGIN');
    setError('');
  };

  const handleBack = () => {
    setSelectedRole(null);
    setFormData({ name: '', email: '', phone: '', password: '' });
    setError('');
  };

  const getDatabasePath = (role: UserRole) => {
    switch (role) {
      case UserRole.CUSTOMER: return 'customers';
      case UserRole.STORE: return 'stores';
      case UserRole.DRIVER: return 'drivers';
      default: return 'users';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.email || !formData.password || (authMode === 'REGISTER' && (!formData.name || !formData.phone))) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'REGISTER') {
        // 1. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        if (selectedRole) {
          const dbPath = getDatabasePath(selectedRole);
          
          // CRITICAL: Attempt to save user profile to Firebase Database
          // If this fails, registration should fail to avoid desync with Firebase rules
          try {
            const profileData: any = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: selectedRole,
                createdAt: Date.now()
            };

            // Add store-specific fields if registering as a store
            if (selectedRole === UserRole.STORE) {
                profileData.category = Category.FOOD; // Default
                profileData.location = 'بئر العاتر';
                profileData.isVerified = false;
                profileData.rating = 5;
                profileData.reviewCount = 0;
                profileData.image = `https://picsum.photos/200/200?random=${user.uid.slice(0,5)}`;
                profileData.coordinates = {
                    lat: BIR_EL_ATER_CENTER.lat + (Math.random() - 0.5) * 0.005,
                    lng: BIR_EL_ATER_CENTER.lng + (Math.random() - 0.5) * 0.005
                };
            }

            await set(ref(db, `${dbPath}/${user.uid}`), profileData);
            console.log(`AuthScreen: Successfully saved ${selectedRole} profile to Firebase DB.`);

            // NEW: No need for AuthScreen to write to localStorage for stores.
            // The StoreScreen's useEffect will handle the localStorage self-healing
            // if a store profile is not found in localStores.
            
          } catch (dbError: any) {
            console.error("AuthScreen: Firebase Database write failed for user profile:", dbError);
            // If DB write fails, sign out the user created in Auth and throw error
            await auth.currentUser?.delete(); // Delete Auth user if DB profile creation fails
            throw new Error(`فشل حفظ ملفك الشخصي كـ ${selectedRole === UserRole.STORE ? 'متجر' : selectedRole === UserRole.DRIVER ? 'موصل' : 'زبون'} في قاعدة البيانات. تحقق من صلاحيات Firebase. (${dbError.message})`);
          }
          
          // Only if DB write is successful, proceed with local session and login
          localStorage.setItem('kimo_user_name', formData.name);
          localStorage.setItem('kimo_user_role', selectedRole);
          onLogin(selectedRole, formData.name);
        }

      } else {
        // Login Logic
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        // App.tsx will handle fetching the name and role from DB/Storage via onAuthStateChanged
        // The selectedRole here is just a hint, not definitive.
        if (selectedRole) {
            onLogin(selectedRole); 
        } else {
            // Fallback for when role wasn't selected (e.g., direct login)
            onLogin(UserRole.CUSTOMER); // Default to customer, App.tsx will correct if needed
        }
      }
    } catch (err: any) {
      let message = "حدث خطأ غير متوقع";
      
      // Handle Authentication Errors
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          message = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
          break;
        case 'auth/email-already-in-use':
          message = "البريد الإلكتروني مستخدم بالفعل";
          break;
        case 'auth/invalid-email':
          message = "البريد الإلكتروني غير صالح";
          break;
        case 'auth/weak-password':
          message = "كلمة المرور ضعيفة جداً";
          break;
        case 'auth/network-request-failed':
            message = "تحقق من اتصالك بالإنترنت";
            break;
        default:
          console.error("Auth Error:", err); 
          // Use the custom message from the try-catch block if it was set
          if (err.message.includes('فشل حفظ ملفك الشخصي')) {
              message = err.message;
          } else {
              message = `حدث خطأ: ${err.message}`;
          }
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // ROLE SELECTION VIEW (Premium Design)
  // ----------------------------------------------------
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-primary-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute -top-[10%] -left-[10%] w-96 h-96 bg-brand-500/20 rounded-full blur-[100px] animate-pulse-slow"></div>
           <div className="absolute top-[40%] -right-[10%] w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse-slow delay-200"></div>
        </div>

        <div className="z-10 text-center mb-12 animate-fade-in-up">
          <div className="relative inline-block">
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 w-32 h-32 rounded-4xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-500/30 rotate-6 transform hover:rotate-12 transition-all duration-500 group cursor-default">
              <MapPin className="text-white w-16 h-16 drop-shadow-lg group-hover:scale-110 transition-transform" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white text-primary-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce-small">
              بئر العاتر
            </div>
          </div>
          <h1 className="text-7xl font-black text-white mb-2 font-cairo tracking-tight">كيمو <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-yellow-300">App</span></h1>
          <p className="text-xl text-primary-300 max-w-md mx-auto leading-relaxed font-light">
            تطبيق التوصيل الأول. اطلب، بيع، أو وصل.
            <br/><span className="text-brand-300 font-medium">كل شيء بين يديك.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4 z-10">
          <RoleCard 
            icon={<ShoppingBag className="w-9 h-9" />}
            title="أنا زبون"
            desc="تصفح واطلب من المتاجر"
            theme="blue"
            onClick={() => handleRoleSelect(UserRole.CUSTOMER)}
            delay="0ms"
          />
          <RoleCard 
            icon={<Store className="w-9 h-9" />}
            title="أنا متجر"
            desc="اعرض منتجاتك للبيع"
            theme="emerald"
            onClick={() => handleRoleSelect(UserRole.STORE)}
            delay="100ms"
          />
          <RoleCard 
            icon={<Bike className="w-9 h-9" />}
            title="أنا موصل"
            desc="وصل الطلبات واكسب"
            theme="orange"
            onClick={() => handleRoleSelect(UserRole.DRIVER)}
            delay="200ms"
          />
        </div>
        
        <div className="mt-12 text-primary-500 text-sm z-10 font-medium opacity-60">
          الإصدار 1.1.0 (Firebase Enabled)
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // LOGIN / REGISTER FORM (Glassmorphism)
  // ----------------------------------------------------
  const roleConfig = {
    [UserRole.CUSTOMER]: { label: 'زبون', gradient: 'from-blue-500 to-blue-700', icon: <ShoppingBag/>, glow: 'shadow-blue-500/50' },
    [UserRole.STORE]: { label: 'متجر', gradient: 'from-emerald-500 to-emerald-700', icon: <Store/>, glow: 'shadow-emerald-500/50' },
    [UserRole.DRIVER]: { label: 'موصل', gradient: 'from-orange-500 to-orange-700', icon: <Bike/>, glow: 'shadow-orange-500/50' },
  }[selectedRole!]; // Use ! because selectedRole is guaranteed to be not null here

  return (
    <div className={`min-h-screen bg-primary-50 flex items-center justify-center p-4 relative`}>
      {/* Dynamic Background Header */}
      <div className={`absolute top-0 left-0 w-full h-[55vh] bg-gradient-to-b ${roleConfig?.gradient} rounded-b-5xl shadow-2xl ${roleConfig?.glow}`}>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-textile.png')] opacity-10"></div>
      </div>

      <div className="glass-dark w-full max-w-md rounded-4xl shadow-2xl overflow-hidden flex flex-col animate-scale-up z-10 border border-white/20 relative top-4">
        
        {/* Navigation & Header */}
        <div className="p-8 pb-4">
          <button 
            onClick={handleBack}
            className="flex items-center text-primary-300 hover:text-white transition-colors mb-6 group bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full w-fit text-sm font-bold border border-white/10"
          >
            <ChevronLeft className="w-4 h-4 ml-1 group-hover:-translate-x-1 transition-transform" />
            تغيير الفئة
          </button>
          
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-black text-white mb-1">
                {authMode === 'LOGIN' ? 'مرحباً بعودتك' : 'حساب جديد'}
              </h2>
              <p className="text-primary-300 text-sm">سجل دخولك للمتابعة كـ <span className={`font-bold text-transparent bg-clip-text bg-gradient-to-r ${roleConfig?.gradient}`}>{roleConfig?.label}</span></p>
            </div>
            <div className={`w-14 h-14 rounded-3xl bg-gradient-to-br ${roleConfig?.gradient} flex items-center justify-center text-white shadow-xl ${roleConfig?.glow}`}>
              {React.cloneElement(roleConfig!.icon as React.ReactElement, { size: 28 })}
            </div>
          </div>
        </div>

        {/* Inputs */}
        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-5">
          
          {error && (
            <div className="bg-danger/20 border border-danger/40 text-danger p-3 rounded-2xl flex items-start gap-3 text-sm font-bold animate-fade-in-up">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {authMode === 'REGISTER' && (
            <div className="group">
              <label className="block text-xs font-bold text-primary-300 mr-1 mb-1 uppercase tracking-wider">الاسم الكامل</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-brand-500 focus:bg-white/10 text-white placeholder:text-primary-400 transition-all font-bold"
                  placeholder="الاسم واللقب"
                />
                <User className="absolute right-4 top-3.5 w-5 h-5 text-primary-400 group-focus-within:text-brand-400 transition-colors" />
              </div>
            </div>
          )}

          <div className="group">
            <label className="block text-xs font-bold text-primary-300 mr-1 mb-1 uppercase tracking-wider">البريد الإلكتروني</label>
            <div className="relative">
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-brand-500 focus:bg-white/10 text-white placeholder:text-primary-400 transition-all font-bold dir-ltr text-right"
                placeholder="example@gmail.com"
                dir="ltr"
              />
              <Mail className="absolute right-4 top-3.5 w-5 h-5 text-primary-400 group-focus-within:text-brand-400 transition-colors" />
            </div>
          </div>

          {authMode === 'REGISTER' && (
            <div className="group">
              <label className="block text-xs font-bold text-primary-300 mr-1 mb-1 uppercase tracking-wider">رقم الهاتف</label>
              <div className="relative">
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-brand-500 focus:bg-white/10 text-white placeholder:text-primary-400 transition-all font-bold dir-ltr text-right"
                  placeholder="06 XX XX XX XX"
                  dir="ltr"
                />
                <Phone className="absolute right-4 top-3.5 w-5 h-5 text-primary-400 group-focus-within:text-brand-400 transition-colors" />
              </div>
            </div>
          )}

          <div className="group">
            <label className="block text-xs font-bold text-primary-300 mr-1 mb-1 uppercase tracking-wider">كلمة المرور</label>
            <div className="relative">
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-brand-500 focus:bg-white/10 text-white placeholder:text-primary-400 transition-all font-bold"
                placeholder="••••••••"
              />
              <Lock className="absolute right-4 top-3.5 w-5 h-5 text-primary-400 group-focus-within:text-brand-400 transition-colors" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full bg-gradient-to-r ${roleConfig?.gradient} text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl ${roleConfig?.glow} hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 shadow-md`}
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (authMode === 'LOGIN' ? 'تسجيل الدخول' : 'إنشاء حساب')}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="p-6 bg-white/5 border-t border-white/10 text-center backdrop-blur-sm">
          <p className="text-primary-300 font-medium">
            {authMode === 'LOGIN' ? 'جديد في كيمو؟' : 'لديك حساب؟'}
            <button 
              onClick={() => {
                setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                setError('');
              }}
              className="text-brand-400 font-extrabold hover:underline mr-2 transition-colors"
            >
              {authMode === 'LOGIN' ? 'إنشاء حساب جديد' : 'دخول الآن'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// HELPER COMPONENTS
// ----------------------------------------------------
const RoleCard = ({ icon, title, desc, theme, onClick, delay }: any) => {
  const themes = {
    blue: {
      bg: 'from-blue-500 to-blue-700',
      text: 'text-blue-500',
      iconBg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
      shadow: 'shadow-blue-500/30'
    },
    emerald: {
      bg: 'from-emerald-500 to-emerald-700',
      text: 'text-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      shadow: 'shadow-emerald-500/30'
    },
    orange: {
      bg: 'from-orange-500 to-orange-700',
      text: 'text-orange-500',
      iconBg: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
      shadow: 'shadow-orange-500/30'
    },
  };
  
  const currentTheme = themes[theme as keyof typeof themes];

  return (
    <button 
      onClick={onClick}
      style={{ animationDelay: delay }}
      className={`relative bg-white/10 glass-dark border border-white/20 p-6 rounded-4xl text-right transition-all duration-300 hover:-translate-y-2 group overflow-hidden animate-fade-in-up w-full hover:shadow-2xl ${currentTheme.shadow}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
      
      <div className="relative z-10 flex items-center gap-4">
        <div className={`w-18 h-18 rounded-3xl flex items-center justify-center transition-all duration-300 shadow-lg ${currentTheme.iconBg}`}>
          {React.cloneElement(icon, { className: `w-9 h-9 transition-transform group-hover:scale-110` })}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
          <p className="text-primary-300 text-sm leading-tight">{desc}</p>
        </div>
      </div>
      
      <div className="absolute top-1/2 -left-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:left-4 transition-all duration-300 bg-white/20 p-2 rounded-full">
        <ArrowRight className="w-6 h-6 text-white" />
      </div>
    </button>
  );
};