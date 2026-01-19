
import React, { useState } from 'react';
import { Star, X, Loader2, Sparkles, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { ref, push, set, runTransaction, update } from 'firebase/database';

interface RatingModalProps {
  onClose: () => void;
  targetName: string;
  targetId: string;
  type: 'STORE' | 'DRIVER' | 'CUSTOMER';
  orderId?: string;
}

export const RatingModal: React.FC<RatingModalProps> = ({ onClose, targetName, targetId, type, orderId }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const titles = {
    STORE: 'كيف كانت جودة المتجر؟',
    DRIVER: 'كيف كان أداء الموصل؟',
    CUSTOMER: 'كيف كان تعامل الزبون؟'
  };

  const handleSubmit = async () => {
    if (rating === 0 || !targetId) return;
    setIsSubmitting(true);
    setError(null);
    
    const user = auth.currentUser;
    if (!user) {
      setError("يجب تسجيل الدخول أولاً");
      setIsSubmitting(false);
      return;
    }

    try {
      // العملية 1: حفظ المراجعة (المسار الأكثر أماناًreviews/)
      const reviewsRef = ref(db, `reviews/${targetId}`);
      const newReviewRef = push(reviewsRef);
      await set(newReviewRef, {
        rating,
        comment: comment.trim(),
        customerId: user.uid,
        customerName: user.displayName || 'زبون كيمو',
        orderId: orderId || '',
        timestamp: Date.now()
      });

      // العملية 2: تحديث الطلب (محاولة أفضل)
      if (orderId) {
        try {
          await update(ref(db, `orders/${orderId}`), { 
            isRatedByCustomer: true,
            customerRatingValue: rating 
          });
        } catch (e) {
          console.warn("Order update denied, continuing anyway.");
        }
      }

      // العملية 3: تحديث إحصائيات المتجر (غالباً ما تسبب PERMISSION_DENIED)
      // نستخدم try-catch مستقل تماماً هنا لضمان عدم توقف الكود
      try {
        const dbPath = type === 'STORE' ? `stores/${targetId}` : type === 'DRIVER' ? `drivers/${targetId}` : `customers/${targetId}`;
        const targetRef = ref(db, dbPath);

        await runTransaction(targetRef, (currentData) => {
          if (currentData) {
            const oldRating = currentData.rating || 0;
            const oldCount = currentData.reviewCount || 0;
            const newCount = oldCount + 1;
            const newRating = ((oldRating * oldCount) + rating) / newCount;
            
            return {
              ...currentData,
              rating: newRating,
              reviewCount: newCount
            };
          }
          return currentData;
        });
      } catch (transError) {
        // نكتفي بتسجيل التحذير في الكونسول، لا نعطل الزبون
        console.warn("Stats update failed (expected), review was still saved.");
      }

      // إذا وصلنا هنا، يعني أن التقييم حُفظ بنجاح في عقدة reviews على الأقل
      setIsSuccess(true);
      setTimeout(() => onClose(), 1800);

    } catch (err: any) {
      console.error("Critical Rating Error:", err);
      // إذا فشلت حتى عملية حفظ المراجعة، هنا فقط نظهر خطأ
      if (err.message?.includes('PERMISSION_DENIED')) {
        setError("Firebase ترفض الكتابة. يرجى التأكد من ضبط 'Rules' في لوحة التحكم.");
      } else {
        setError("عذراً، حدث خطأ أثناء إرسال تقييمك.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 z-[1000] flex items-center justify-center p-6 backdrop-blur-md">
        <div className="bg-white rounded-[3rem] w-full max-w-sm p-12 text-center animate-scale-up shadow-2xl">
           <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={56} className="animate-bounce" />
           </div>
           <h3 className="text-2xl font-black text-slate-900 mb-2">تم الإرسال!</h3>
           <p className="text-sm text-slate-400 font-bold">شكراً لمساعدتنا في تحسين كيمو</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[1000] flex items-center justify-center p-6 backdrop-blur-xl animate-fade-in">
      <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 relative animate-scale-up shadow-2xl border border-white">
        <button onClick={onClose} className="absolute left-6 top-6 text-slate-300 hover:text-slate-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 brand-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-200">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{titles[type]}</h3>
          <p className="text-sm text-slate-400 font-bold">رأيك في <span className="text-orange-500">{targetName}</span> يهمنا</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black mb-6 flex items-start gap-2 border border-red-100">
            <AlertCircle size={16} className="shrink-0" /> 
            <div>
               <p>{error}</p>
               <p className="mt-1 opacity-60">تأكد من إعداد القواعد (Rules) في Firebase Console.</p>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-2 mb-8" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button 
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              className="transition-all hover:scale-125 focus:outline-none"
            >
              <Star 
                className={`w-10 h-10 transition-all duration-300 
                  ${(hoverRating >= star || rating >= star) ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-slate-100'}`} 
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="اكتب ملاحظاتك هنا..."
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 text-sm font-bold focus:outline-none focus:border-orange-500 transition-all text-slate-700 placeholder:text-slate-300 resize-none h-24"
        ></textarea>

        <button 
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full brand-gradient text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-brand-200 disabled:opacity-30 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={20}/> إرسال الآن</>}
        </button>
      </div>
    </div>
  );
};
