import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Gift, ArrowRight, CheckCircle2, Ticket } from 'lucide-react';
import { UserProfile } from '../types';

interface ReferralInputViewProps {
  onComplete: () => void;
  userProfile?: UserProfile | null;
}

const ReferralInputView: React.FC<ReferralInputViewProps> = ({ onComplete, userProfile }) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-fill from local storage if captured from URL
  useEffect(() => {
      const pendingCode = localStorage.getItem('nexx_referral_pending');
      if (pendingCode) {
          setCode(pendingCode.toUpperCase());
      }
  }, []);

  const clearPending = () => {
      localStorage.removeItem('nexx_referral_pending');
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    
    setIsSubmitting(true);
    
    try {
        if (userProfile?.id) {
            await axios.post('/api/referrals/claim', { code: code.trim() }, {
                 headers: { 'x-user-id': userProfile.id }
            });
            setSuccess(true);
            clearPending();
             // Auto advance after success animation
            setTimeout(() => {
                onComplete();
            }, 1500);
        } else {
            // Fallback (UI only, though likely won't happen if auth is required to reach this)
             setSuccess(true);
             clearPending();
             setTimeout(onComplete, 1500);
        }
    } catch (error: any) {
        alert(error.response?.data?.error || "Invalid or already used referral code");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
      clearPending();
      onComplete();
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide">
        {/* Icon */}
        <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-dark-800 rounded-3xl border border-dark-700 flex items-center justify-center shadow-2xl relative group">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                {success ? (
                   <CheckCircle2 size={48} className="text-emerald-500 animate-in zoom-in spin-in-90 duration-300" />
                ) : (
                   <Gift size={48} className="text-emerald-500" />
                )}
                
                {/* Floating Ticket Decoration */}
                <div className="absolute -right-4 -bottom-2 bg-dark-700 p-2 rounded-xl border border-dark-600 shadow-lg transform rotate-12">
                    <Ticket size={20} className="text-purple-400" />
                </div>
            </div>
        </div>

        {/* Text */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {success ? 'Code Redeemed!' : 'Have a Referral Code?'}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            {success 
              ? 'Welcome to the inner circle. Your perks have been activated.' 
              : 'Enter a referral code to unlock exclusive perks and a 7-day extended trial.'}
          </p>
        </div>

        {/* Input Form */}
        {!success ? (
            <div className="space-y-4">
            <div className="relative">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter Code (e.g. NEXX-ELITE)"
                    className="w-full bg-dark-800 border border-dark-700 focus:border-emerald-500 text-white font-mono text-center text-lg tracking-widest placeholder:text-gray-600 placeholder:font-sans placeholder:tracking-normal placeholder:text-sm rounded-2xl py-4 px-4 outline-none transition-all shadow-inner"
                    autoFocus
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={!code.trim() || isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                !code.trim() || isSubmitting
                    ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 hover:scale-[1.02]'
                }`}
            >
                {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                    Claim Reward <ArrowRight size={18} />
                    </>
                )}
            </button>

            <button
                onClick={handleSkip}
                className="w-full py-3 text-sm text-gray-500 font-medium hover:text-white transition-colors"
            >
                I don't have a code, skip for now
            </button>
            </div>
        ) : (
             <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} className="text-white" />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm">Success!</h4>
                    <p className="text-emerald-400 text-xs">Redirecting you to dashboard...</p>
                </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default ReferralInputView;