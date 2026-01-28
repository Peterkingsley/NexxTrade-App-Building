import React, { useState } from 'react';
import { MessageSquare, Bell, History } from 'lucide-react';
import SignalCard from '../components/SignalCard';
import { Signal, ViewState } from '../types';

interface SignalsViewProps {
  onNavigate: (view: ViewState) => void;
  mockSignals: Signal[];
  livePrices: Record<string, number>;
}

const SignalsView: React.FC<SignalsViewProps> = ({ onNavigate, mockSignals, livePrices }) => {
  const [filter, setFilter] = useState<'All' | 'Active' | 'Closed' | 'Spot'>('All');
  const [groupsLabel, setGroupsLabel] = useState('Groups');

  const handleGroupsClick = () => {
    setGroupsLabel('Coming Soon');
    setTimeout(() => setGroupsLabel('Groups'), 2000);
  };

  const filteredSignals = mockSignals.filter(s => {
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
      <div className="px-4 space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
        {filteredSignals.map((signal, idx) => {
            const priceKey = signal.pair.replace('/', '').toUpperCase();
            return <SignalCard key={idx} signal={signal} livePrice={livePrices[priceKey]} />;
        })}
        {filteredSignals.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500">
                No signals found for this category.
            </div>
        )}
      </div>
    </div>
  );
};

export default SignalsView;