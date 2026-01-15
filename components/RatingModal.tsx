import React, { useState } from 'react';
import { Star, X } from 'lucide-react';

interface RatingModalProps {
  onClose: () => void;
  targetName: string;
  type: 'STORE' | 'DRIVER' | 'CUSTOMER';
}

export const RatingModal: React.FC<RatingModalProps> = ({ onClose, targetName, type }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0); // For hover effect
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titles = {
    STORE: 'قيّم المتجر',
    DRIVER: 'قيّم الموصل',
    CUSTOMER: 'قيّم الزبون'
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    alert('شكراً لتقييمك! يساعد هذا في تحسين خدمة كيمو.');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-primary-900/70 z-[60] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-4xl w-full max-w-sm p-8 relative animate-scale-up shadow-2xl border border-primary-100">
        <button onClick={onClose} className="absolute left-5 top-5 text-primary-400 hover:text-primary-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-7">
          <h3 className="text-2xl font-black text-primary-800 mb-2">{titles[type]}</h3>
          <p className="text-sm text-primary-500">كيف كانت تجربتك مع <span className="font-bold text-brand-600">{targetName}</span>؟</p>
        </div>

        <div className="flex justify-center gap-2 mb-7"
             onMouseLeave={() => setHoverRating(0)} // Reset hover when mouse leaves
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button 
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star 
                className={`w-9 h-9 transition-colors duration-200 
                            ${(hoverRating >= star || rating >= star) ? 'fill-warning text-warning' : 'text-primary-300'}`} 
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="اكتب تعليقاً (اختياري)..."
          className="w-full bg-primary-50 border border-primary-200 rounded-2xl p-4 mb-6 text-sm focus:outline-none focus:border-brand-500 transition-colors text-primary-700 placeholder:text-primary-400"
          rows={3}
        ></textarea>

        <button 
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full bg-primary-900 text-white py-3.5 rounded-2xl font-bold text-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-900/20"
        >
          {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
        </button>
      </div>
    </div>
  );
};