import React, { useState } from 'react';
import { ArrowLeft, Search, Filter, ChevronRight, Calendar, TrendingUp, TrendingDown, Target, ShieldCheck, BrainCircuit, X, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Signal, ViewState } from '../types';

interface SignalHistoryViewProps {
  onBack: () => void;
  signals: Signal[];
  isLoading: boolean;
}

const SignalHistoryView: React.FC<SignalHistoryViewProps> = ({ onBack, signals, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  // Filter only closed signals
  const historySignals = signals
    .filter(s => s.status === 'closed')
    .filter(s => s.pair.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-dark-900 pb-10">
      {/* Header */}
      <div className="flex items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800">
        <button onClick={onBack} className="text-white p-2 hover:bg-dark-800 rounded-full transition mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Trade History</h1>
      </div>

      {/* Search & Stats */}
      <div className="p-4 space-y-4">
        <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
             <input 
                type="text" 
                placeholder="Search pair..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-green/50"
             />
        </div>

        <div className="grid grid-cols-2 gap-3">
             <div className="bg-dark-800 p-3 rounded-xl border border-dark-700">
                 <p className="text-gray-400 text-xs mb-1">Total Closed</p>
                 <p className="text-white font-bold text-lg">
                    {isLoading ? '-' : signals.filter(s => s.status === 'closed').length}
                 </p>
             </div>
             <div className="bg-dark-800 p-3 rounded-xl border border-dark-700">
                 <p className="text-gray-400 text-xs mb-1">Win Rate</p>
                 <p className="text-emerald-400 font-bold text-lg">92%</p>
             </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-20">
         <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-3 px-1">Past Signals</h3>
         
         <div className="space-y-3">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <Loader2 className="w-6 h-6 text-brand-green animate-spin" />
                    <p className="text-gray-500 text-sm">Loading history...</p>
                </div>
            ) : historySignals.length > 0 ? (
                historySignals.map((signal) => (
                    <div 
                        key={signal.id}
                        onClick={() => setSelectedSignal(signal)}
                        className="bg-dark-800 hover:bg-dark-700/80 transition-colors border border-dark-700 rounded-2xl p-4 flex items-center justify-between cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            {/* Icon Placeholder */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${signal.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {signal.pair.substring(0, 1)}
                            </div>
                            
                            <div>
                                <h4 className="text-white font-bold text-base flex items-center gap-2">
                                    {signal.pair}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${signal.type === 'Futures' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                                        {signal.type}
                                    </span>
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {signal.timeAgo}</span>
                                    <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Closed</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                             <p className={`text-lg font-bold ${signal.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {signal.pnl > 0 ? '+' : ''}{signal.pnl}%
                             </p>
                             <div className="flex items-center justify-end gap-1 text-gray-500 text-xs mt-1 group-hover:text-white transition-colors">
                                 Details <ChevronRight size={14} />
                             </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-dark-800/50 rounded-2xl border border-dark-700 border-dashed text-center">
                    <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center mb-3">
                        <AlertCircle className="text-gray-500" />
                    </div>
                    <p className="text-gray-400 font-bold">No History Found</p>
                    <p className="text-gray-500 text-xs mt-1">There are no closed signals in the database.</p>
                </div>
            )}
         </div>
      </div>

      {/* Detail Modal */}
      {selectedSignal && (
          <SignalDetailModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
      )}
    </div>
  );
};

interface SignalDetailModalProps {
    signal: Signal;
    onClose: () => void;
}

const SignalDetailModal: React.FC<SignalDetailModalProps> = ({ signal, onClose }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
             <div className="bg-dark-900 w-full max-w-lg rounded-3xl overflow-hidden border border-dark-700 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="p-5 border-b border-dark-800 flex justify-between items-center bg-dark-800">
                    <div>
                        <h3 className="text-white text-xl font-bold flex items-center gap-2">
                            {signal.pair}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${signal.pnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {signal.status.toUpperCase()}
                            </span>
                        </h3>
                        <p className="text-gray-400 text-xs mt-1">{signal.timeAgo}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-dark-700 rounded-full text-gray-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-6">
                    {/* Big PnL Display */}
                    <div className={`p-6 rounded-2xl flex flex-col items-center justify-center ${signal.pnl >= 0 ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-900/20 border border-emerald-500/20' : 'bg-gradient-to-br from-red-500/10 to-red-900/20 border border-red-500/20'}`}>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Realized Profit</span>
                        <h2 className={`text-5xl font-black ${signal.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                             {signal.pnl > 0 ? '+' : ''}{signal.pnl}%
                        </h2>
                    </div>

                    {/* Trade Parameters Grid */}
                    <div className="grid grid-cols-2 gap-4">
                         <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                             <div className="flex items-center gap-2 text-gray-400 mb-2">
                                 <Clock size={16} />
                                 <span className="text-xs font-bold uppercase">Entry Price</span>
                             </div>
                             <p className="text-white font-mono text-lg font-bold">{signal.entry}</p>
                         </div>
                         <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                             <div className="flex items-center gap-2 text-gray-400 mb-2">
                                 <ShieldCheck size={16} />
                                 <span className="text-xs font-bold uppercase">Stop Loss</span>
                             </div>
                             <p className="text-white font-mono text-lg font-bold text-red-400">{signal.stopLoss}</p>
                         </div>
                    </div>

                    {/* Targets List */}
                    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                        <div className="bg-dark-700/50 p-3 border-b border-dark-700 flex items-center gap-2">
                             <Target size={16} className="text-emerald-400" />
                             <span className="text-white font-bold text-sm">Take Profit Targets</span>
                        </div>
                        <div className="divide-y divide-dark-700">
                            {signal.tpTargets.map((tp, idx) => (
                                <div key={idx} className="p-3 flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">Target {idx + 1}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-mono font-medium ${tp.hit ? 'text-white' : 'text-gray-500'}`}>{tp.price}</span>
                                        {tp.hit ? (
                                            <CheckCircle2 size={18} className="text-emerald-500" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-dark-600"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Analysis Section */}
                    {signal.analysis && (
                        <div>
                             <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                                 <BrainCircuit size={18} className="text-purple-400" />
                                 Post-Trade Analysis
                             </h4>
                             <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 text-gray-300 text-sm leading-relaxed">
                                 {signal.analysis}
                             </div>
                        </div>
                    )}
                </div>
                
                {/* Footer Action */}
                <div className="p-4 border-t border-dark-800 bg-dark-800/50">
                     <button onClick={onClose} className="w-full py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-bold transition-colors">
                         Close Details
                     </button>
                </div>
             </div>
        </div>
    );
};

export default SignalHistoryView;