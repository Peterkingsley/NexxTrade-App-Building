import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Clock, Shield, CheckCircle2, Zap, Loader2, AlertCircle, Infinity } from 'lucide-react';
import { UserProfile } from '../types';

interface SubscriptionViewProps {
  onBack: () => void;
  userProfile?: UserProfile | null;
}

interface SubscriptionData {
    plan: string;
    expiry: string | null;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ onBack, userProfile }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData>({ plan: 'free', expiry: null });
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Fetch subscription status on mount
  useEffect(() => {
      const fetchSubscription = async () => {
          if (!userProfile?.id) {
              setIsLoading(false);
              return;
          }
          
          try {
              const res = await axios.get('/api/user/subscription', {
                  headers: { 'x-user-id': userProfile.id }
              });
              setData(res.data);
          } catch (error) {
              console.error("Failed to fetch subscription:", error);
          } finally {
              setIsLoading(false);
          }
      };

      fetchSubscription();
  }, [userProfile]);

  // Countdown timer logic
  useEffect(() => {
    if (!data.expiry) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const targetDate = new Date(data.expiry!).getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        // Expired
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [data.expiry]);

  const isPro = data.plan === 'pro' || data.plan === 'elite';
  const planName = data.plan === 'elite' ? 'Elite Member' : data.plan === 'pro' ? 'Pro Member' : 'Free Plan';
  const activeColor = isPro ? 'text-emerald-400' : 'text-gray-400';
  const activeBg = isPro ? 'bg-emerald-500/10' : 'bg-gray-700/20';
  const activeBorder = isPro ? 'border-emerald-500/20' : 'border-gray-600/20';

  return (
    <div className="min-h-screen bg-dark-900 pb-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800">
        <button onClick={onBack} className="text-white p-2 hover:bg-dark-800 rounded-full transition mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">My Subscription</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1">
                <Loader2 className="w-10 h-10 text-brand-green animate-spin mb-4" />
                <p className="text-gray-500">Loading subscription details...</p>
            </div>
        ) : (
            <>
                {/* Status Card */}
                <div className="w-full bg-gradient-to-br from-dark-800 to-dark-900 border border-dark-700 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-2xl">
                   {isPro && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>}
                   
                   <div className="flex flex-col items-center text-center relative z-10">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border shadow-[0_0_15px_rgba(0,0,0,0.2)] ${activeBg} ${activeBorder}`}>
                          <Shield size={32} className={isPro ? "text-emerald-500" : "text-gray-500"} />
                      </div>
                      
                      <h2 className="text-2xl font-bold text-white mb-1 capitalize">{planName}</h2>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border mb-6 ${activeBg} ${activeBorder}`}>
                         <div className={`w-2 h-2 rounded-full ${isPro ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
                         <span className={`${activeColor} text-xs font-bold uppercase tracking-wide`}>{isPro ? 'Active Plan' : 'Basic Access'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full">
                          <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50 flex items-center gap-3">
                              <CheckCircle2 size={18} className={isPro ? "text-emerald-500" : "text-gray-600"} />
                              <span className="text-gray-300 text-xs font-medium">All Signals</span>
                          </div>
                           <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50 flex items-center gap-3">
                              <CheckCircle2 size={18} className={isPro ? "text-emerald-500" : "text-gray-600"} />
                              <span className="text-gray-300 text-xs font-medium">Mentorship</span>
                          </div>
                           <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50 flex items-center gap-3">
                              <CheckCircle2 size={18} className={isPro ? "text-emerald-500" : "text-gray-600"} />
                              <span className="text-gray-300 text-xs font-medium">Analysis</span>
                          </div>
                           <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50 flex items-center gap-3">
                              <CheckCircle2 size={18} className={isPro ? "text-emerald-500" : "text-gray-600"} />
                              <span className="text-gray-300 text-xs font-medium">No Ads</span>
                          </div>
                      </div>
                   </div>
                </div>

                {/* Countdown Section - Pro with Expiry */}
                {isPro && data.expiry && (
                    <div className="w-full mb-8">
                        <h3 className="text-gray-400 text-sm font-medium text-center mb-4 flex items-center justify-center gap-2">
                            <Clock size={16} />
                            Time Remaining
                        </h3>
                        
                        <div className="grid grid-cols-4 gap-2">
                            {/* Days */}
                            <div className="bg-dark-800 rounded-2xl p-3 flex flex-col items-center border border-dark-700">
                                <span className="text-2xl sm:text-3xl font-bold text-white font-mono">{timeLeft.days}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Days</span>
                            </div>
                            {/* Hours */}
                            <div className="bg-dark-800 rounded-2xl p-3 flex flex-col items-center border border-dark-700">
                                <span className="text-2xl sm:text-3xl font-bold text-white font-mono">{timeLeft.hours.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Hrs</span>
                            </div>
                            {/* Minutes */}
                            <div className="bg-dark-800 rounded-2xl p-3 flex flex-col items-center border border-dark-700">
                                <span className="text-2xl sm:text-3xl font-bold text-white font-mono">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Mins</span>
                            </div>
                            {/* Seconds */}
                            <div className="bg-dark-800 rounded-2xl p-3 flex flex-col items-center border border-dark-700 relative overflow-hidden">
                                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
                                <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono relative z-10">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-wider mt-1 relative z-10">Secs</span>
                            </div>
                        </div>

                        <p className="text-center text-gray-500 text-xs mt-4">
                            Expiration Date: <span className="text-gray-300">{new Date(data.expiry).toLocaleDateString()}</span>
                        </p>
                    </div>
                )}

                {/* Lifetime Access - Pro without Expiry */}
                {isPro && !data.expiry && (
                     <div className="w-full mb-8 text-center p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <div className="w-12 h-12 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                            <Infinity className="text-emerald-500" size={24} />
                        </div>
                        <p className="text-white font-bold text-lg">Lifetime Access</p>
                        <p className="text-emerald-400/80 text-sm mt-1">Your subscription does not expire.</p>
                    </div>
                )}

                {/* Free Plan Message */}
                {!isPro && (
                    <div className="w-full mb-8 text-center p-6 bg-dark-800/50 rounded-2xl border border-dark-700 border-dashed">
                        <AlertCircle className="mx-auto text-gray-500 mb-2" />
                        <p className="text-gray-400 text-sm">You are currently on the Free plan.</p>
                        <p className="text-gray-500 text-xs mt-1">Upgrade to unlock premium signals and features.</p>
                    </div>
                )}

                {/* Actions */}
                <button className="w-full bg-dark-800 hover:bg-dark-700 text-white font-bold py-4 rounded-xl border border-dark-700 flex items-center justify-center gap-2 transition-all group">
                    <Zap size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" fill="currentColor" />
                    {isPro ? 'Extend Subscription' : 'Upgrade to Pro'}
                </button>
            </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionView;