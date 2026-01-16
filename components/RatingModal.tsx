import React, { useState } from 'react';
import { Star, X, Loader2, Sparkles } from 'lucide-react';
import { db } from '../services/firebase';
import { ref, get, update, runTransaction } from 'firebase/database';

interface RatingModalProps {
  onClose: () => void;
  targetName: string;
  targetId: string;
  type: 'STORE' | 'DRIVER' | 'CUSTOMER';
}

export const RatingModal: React.FC<RatingModalProps> = ({ onClose, targetName, targetId, type }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titles = {
    STORE: 'كيف كانت جودة المتجر؟',
    DRIVER: 'كيف كان أداء الموصل؟',
    CUSTOMER: 'كيف كان تعامل الزبون؟'
  };

  const handleSubmit = async () => {
    if (rating === 0 || !targetId) return;
    setIsSubmitting(true);
    
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

      alert('شكراً لتقييمك! تقييمك يساعدنا على تحسين كيمو.');
      onClose();
    } catch (error) {
      console.error("Rating error:", error);
      alert('حدث خطأ أثناء إرسال التقييم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[1000] flex items-center justify-center p-6 backdrop-blur-xl animate-fade-in">
      <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 relative animate-scale-up shadow-2xl border border-white">
        <button onClick={onClose} className="absolute left-6 top-6 text-slate-300 hover:text-slate-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 brand-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-200 animate-float">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{titles[type]}</h3>
          <p className="text-sm text-slate-400 font-bold">رأيك في <span className="text-brand-500">{targetName}</span> يهمنا جداً</p>
        </div>

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
                  ${(hoverRating >= star || rating >= star) ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-slate-100'}`} 
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="أخبرنا المزيد عن تجربتك (اختياري)..."
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 text-sm font-bold focus:outline-none focus:border-brand-500 transition-all text-slate-700 placeholder:text-slate-300 resize-none"
          rows={3}
        ></textarea>

        <button 
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full brand-gradient text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-brand-200 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'إرسال التقييم'}
        </button>
      </div>
    </div>
  );
};