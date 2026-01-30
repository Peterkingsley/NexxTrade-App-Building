import React from 'react';
import { Signal } from '../types';
import { ExternalLink } from 'lucide-react';

interface PnLProofCardProps {
  signal: Signal;
}

const PnLProofCard: React.FC<PnLProofCardProps> = ({ signal }) => {
  if (!signal.proofImageUrl) return null;

  return (
    <div className="flex-shrink-0 w-64 md:w-72 bg-dark-800 rounded-2xl overflow-hidden border border-dark-700 shadow-lg group relative cursor-pointer hover:border-emerald-500/30 transition-colors duration-300">
        {/* Main Image */}
        <div className="aspect-[4/5] bg-dark-900 relative">
            <img 
                src={signal.proofImageUrl} 
                alt={`${signal.pair} PnL Proof`}
                className="w-full h-full object-cover"
                loading="lazy"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                    <ExternalLink size={24} className="text-white" />
                </div>
            </div>
        </div>
        
        {/* Footer Info (Optional, if we want text below image) */}
        <div className="p-3 border-t border-dark-700 bg-dark-800 flex justify-between items-center">
            <div>
                <p className="text-white font-bold text-sm">{signal.pair}</p>
                <p className="text-gray-500 text-[10px]">{new Date(signal.closedAt || Date.now()).toLocaleDateString()}</p>
            </div>
            <span className={`font-mono font-bold text-sm ${signal.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {signal.pnl > 0 ? '+' : ''}{signal.pnl}%
            </span>
        </div>
    </div>
  );
};

export default PnLProofCard;