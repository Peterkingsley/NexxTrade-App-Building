import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, ChevronRight, Megaphone, Zap, AlertCircle, Loader2 } from 'lucide-react';
import SignalCard from '../components/SignalCard';
import { Signal, ViewState } from '../types';

interface HomeViewProps {
  onNavigate: (view: ViewState) => void;
  signals: Signal[];
  livePrices: Record<string, number>;
  isLoading: boolean;
}

const ANNOUNCEMENTS = [
    {
        id: 1,
        title: "BTC Breaking Major Resistance",
        message: "Watch $99k level closely. High volume confirmation needed.",
        icon: Megaphone,
        colorClass: "bg-brand-green",
        textClass: "text-dark-900",
        subTextClass: "text-dark-900/80",
        iconBgClass: "bg-white/20 text-dark-900"
    },
    {
        id: 2,
        title: "New AI Analysis Tool",
        message: "We've updated our algorithm for higher accuracy on scalps.",
        icon: Zap,
        colorClass: "bg-purple-600",
        textClass: "text-white",
        subTextClass: "text-white/80",
        iconBgClass: "bg-white/20 text-white"
    },
    {
        id: 3,
        title: "System Maintenance",
        message: "Scheduled upgrades this Sunday at 02:00 UTC (30 mins).",
        icon: AlertCircle,
        colorClass: "bg-blue-600",
        textClass: "text-white",
        subTextClass: "text-white/80",
        iconBgClass: "bg-white/20 text-white"
    }
];

const HomeView: React.FC<HomeViewProps> = ({ onNavigate, signals, livePrices, isLoading }) => {
  const [groupsLabel, setGroupsLabel] = useState('Groups');
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
        setActiveAnnouncement((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGroupsClick = () => {
    setGroupsLabel('Coming Soon');
    setTimeout(() => setGroupsLabel('Groups'), 2000);
  };

  return (
    <div className="pb-24 md:pb-6">
      {/* Header */}
      <div className="flex justify-between items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800 md:border-none">
        <div className="md:hidden">
             {/* Mobile only icon */}
            <button className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition">
                <MessageSquare size={20} />
            </button>
        </div>

        {/* Desktop Header Content */}
        <h1 className="hidden md:block text-2xl font-bold text-white ml-2">Dashboard</h1>
        
        <div className="flex items-center gap-3">
             <div className="flex bg-dark-800 rounded-lg p-1 border border-dark-700">
                <button className="px-4 py-1.5 bg-dark-700 text-white text-xs font-semibold rounded shadow-sm">
                    NexxTrade
                </button>
                <button 
                    onClick={handleGroupsClick}
                    className={`px-4 py-1.5 text-xs font-medium transition-all duration-300 ${groupsLabel === 'Coming Soon' ? 'text-brand-green' : 'text-gray-400 hover:text-white'}`}
                >
                    {groupsLabel}
                </button>
            </div>

            <button 
                onClick={() => onNavigate('notifications')}
                className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition relative"
            >
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-dark-800"></span>
            </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Banner Carousel */}
        <div className="relative rounded-3xl shadow-xl overflow-hidden touch-pan-x h-40 md:h-48">
             <div 
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${activeAnnouncement * 100}%)` }}
             >
                {ANNOUNCEMENTS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.id} className={`w-full flex-shrink-0 ${item.colorClass} p-4 md:p-8 relative min-w-full flex items-center`}>
                            <div className="absolute right-0 top-0 w-32 h-32 md:w-64 md:h-64 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            
                            <div className="flex items-center gap-4 md:gap-6 relative z-10 w-full max-w-2xl mx-auto">
                                <div className={`${item.iconBgClass} p-2.5 md:p-4 rounded-full backdrop-blur-sm shrink-0`}>
                                    <Icon size={20} fill="currentColor" className="opacity-90 md:w-8 md:h-8" />
                                </div>
                                <div className="pr-4">
                                    <h2 className={`${item.textClass} font-bold text-lg md:text-2xl leading-tight mb-1`}>{item.title}</h2>
                                    <p className={`${item.subTextClass} text-xs md:text-base font-medium leading-relaxed`}>{item.message}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
             </div>

             {/* Carousel Dots */}
             <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {ANNOUNCEMENTS.map((_, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setActiveAnnouncement(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === activeAnnouncement 
                            ? 'w-5 bg-white' 
                            : 'w-1.5 bg-white/40 hover:bg-white/60'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-800 rounded-2xl p-4 border border-dark-700 h-full">
                <p className="text-gray-400 text-sm font-medium mb-1">Active Signals</p>
                <h3 className="text-3xl font-bold text-white mb-1">
                    {isLoading ? '-' : signals.filter(s => s.status === 'active').length}
                </h3>
                <p className="text-emerald-400 text-xs font-medium">+3 today</p>
            </div>
            <div className="bg-dark-800 rounded-2xl p-4 border border-dark-700 h-full">
                <p className="text-gray-400 text-sm font-medium mb-1">Win Rate</p>
                <h3 className="text-3xl font-bold text-white mb-1">78%</h3>
                <p className="text-emerald-400 text-xs font-medium">This month</p>
            </div>
             <div className="hidden md:block bg-dark-800 rounded-2xl p-4 border border-dark-700 h-full">
                <p className="text-gray-400 text-sm font-medium mb-1">Total Profit</p>
                <h3 className="text-3xl font-bold text-white mb-1">458%</h3>
                <p className="text-emerald-400 text-xs font-medium">All time</p>
            </div>
            <div className="hidden md:block bg-dark-800 rounded-2xl p-4 border border-dark-700 h-full">
                <p className="text-gray-400 text-sm font-medium mb-1">Total Trades</p>
                <h3 className="text-3xl font-bold text-white mb-1">2,405</h3>
                <p className="text-gray-500 text-xs font-medium">Since inception</p>
            </div>
        </div>

        {/* Latest Signals */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Latest Signals</h2>
                <button 
                    onClick={() => onNavigate('signals')}
                    className="text-brand-green text-sm font-medium flex items-center hover:opacity-80"
                >
                    View All <ChevronRight size={16} />
                </button>
            </div>
            
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
                    <p className="text-gray-500 text-sm">Loading signals...</p>
                </div>
            ) : signals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-dark-800 rounded-2xl border border-dark-700 border-dashed">
                    <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center mb-3">
                        <AlertCircle className="text-gray-500" />
                    </div>
                    <h3 className="text-white font-bold text-sm">No Active Signals</h3>
                    <p className="text-gray-500 text-xs mt-1">Check back later for new trades.</p>
                </div>
            ) : (
                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                    {signals.slice(0, 3).map((signal, idx) => {
                         const priceKey = signal.pair.replace('/', '').toUpperCase();
                         return <SignalCard key={idx} signal={signal} livePrice={livePrices[priceKey]} />;
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default HomeView;