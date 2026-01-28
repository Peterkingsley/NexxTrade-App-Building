import React, { useState } from 'react';
import { MessageSquare, Bell, History, Loader2, AlertCircle } from 'lucide-react';
import SignalCard from '../components/SignalCard';
import { Signal, ViewState } from '../types';

interface SignalsViewProps {
  onNavigate: (view: ViewState) => void;
  signals: Signal[];
  livePrices: Record<string, number>;
  isLoading: boolean;
}

const SignalsView: React.FC<SignalsViewProps> = ({ onNavigate, signals, livePrices, isLoading }) => {
  const [filter, setFilter] = useState<'All' | 'Active' | 'Closed' | 'Spot'>('All');

  const filteredSignals = signals.filter(s => {
      if (filter === 'All') return true;
      if (filter === 'Active') return s.status === 'active';
      if (filter === 'Closed') return s.status === 'closed';
      if (filter === 'Spot') return s.type === 'Spot';
      return true;
  });

  return (
    <div className="pb-24 md:pb-6">
      {/* Header */}
      <div className="flex justify-between items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800 md:border-none">
        <div className="md:hidden">
            <button className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition">
                <MessageSquare size={20} />
            </button>
        </div>
        
        <h1 className="hidden md:block text-2xl font-bold text-white ml-2">Market Signals</h1>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => onNavigate('signal-history')}
                className="flex items-center gap-2 px-4 py-1.5 bg-dark-800 text-gray-300 hover:text-white text-xs font-semibold rounded-lg border border-dark-700 transition-colors"
            >
                <History size={14} />
                <span>History</span>
            </button>

            <button 
                onClick={() => onNavigate('notifications')}
                className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition"
            >
                <Bell size={20} />
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap">
            {['All', 'Active', 'Closed', 'Spot'].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-6 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
                        filter === f 
                        ? 'bg-brand-green text-dark-900 border-brand-green' 
                        : 'bg-transparent text-gray-400 border-dark-700 hover:border-gray-500'
                    }`}
                >
                    {f}
                </button>
            ))}
        </div>
      </div>

      {/* Signals List */}
      <div className="px-4">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
                <p className="text-gray-500 text-sm">Updating signals...</p>
            </div>
        ) : filteredSignals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-dark-800/50 rounded-2xl border border-dark-700 border-dashed">
                <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mb-4">
                    <AlertCircle className="text-gray-500" size={24} />
                </div>
                <h3 className="text-white font-bold text-lg">No Signals Found</h3>
                <p className="text-gray-500 text-sm mt-1">There are no {filter.toLowerCase()} signals available at the moment.</p>
            </div>
        ) : (
            <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                {filteredSignals.map((signal, idx) => {
                    const priceKey = signal.pair.replace('/', '').toUpperCase();
                    return <SignalCard key={idx} signal={signal} livePrice={livePrices[priceKey]} />;
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default SignalsView;