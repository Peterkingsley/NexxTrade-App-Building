import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Unlock, Lightbulb, X, ShieldCheck, BrainCircuit, Crown, Check, Zap, Copy, Share2, Download, QrCode, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Signal } from '../types';

interface SignalCardProps {
  signal: Signal;
  livePrice?: number;
}

const SignalCard: React.FC<SignalCardProps> = ({ signal, livePrice }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // State for price flash animation
  const [prevPrice, setPrevPrice] = useState<number | undefined>(undefined);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

  const isLocked = signal.entry === 'Locked' || !signal.slUnlock;

  // --- Automatic Calculation Logic ---
  
  const parsePrice = (priceStr: string) => {
      if (!priceStr || priceStr === 'Locked') return NaN;
      // Remove commas, take first numeric sequence if range "2000-2050" -> 2000
      const clean = priceStr.replace(/,/g, '').split('-')[0].trim();
      return parseFloat(clean);
  };

  // Helper to extract numeric leverage (e.g., "Cross 20x" -> 20)
  const getLeverage = (leverageStr?: string, type?: string) => {
      if (type === 'Spot' || !leverageStr) return 1;
      const match = leverageStr.match(/(\d+)/);
      return match ? parseInt(match[0], 10) : 1;
  };

  const calculatePnl = (entry: number, exit: number, side: 'Long' | 'Short', leverage: number) => {
      let rawPercent;
      if (side === 'Long') {
          rawPercent = ((exit - entry) / entry) * 100;
      } else {
          rawPercent = ((entry - exit) / entry) * 100;
      }
      return rawPercent * leverage;
  };

  const { displayPnl, displayTpTargets, displayStatus, isSlHit, isTpSecured } = useMemo(() => {
      // Default to database values
      let currentPnl = signal.pnl;
      let currentTpTargets = signal.tpTargets;
      let currentStatus = signal.status;
      let slHit = false;
      let tpSecured = false;

      // Only override if we have a live price, trade is active/open, and data isn't locked
      if (livePrice && !isLocked && signal.status === 'active') {
          const entryPrice = parsePrice(signal.entry);
          const stopLossPrice = parsePrice(signal.stopLoss);
          const leverage = getLeverage(signal.leverage, signal.type);

          if (!isNaN(entryPrice)) {
              // 1. Calculate Derived TP Hits (DB + Live)
              // We need to know which TPs are hit. We trust DB for past hits, and Live for current hits.
              currentTpTargets = signal.tpTargets.map(tp => {
                  const tpPrice = parsePrice(tp.price);
                  let isHit = tp.hit; // Start with DB state
                  
                  if (!isNaN(tpPrice)) {
                       if (signal.side === 'Long' && livePrice >= tpPrice) isHit = true;
                       if (signal.side === 'Short' && livePrice <= tpPrice) isHit = true;
                  }
                  return { ...tp, hit: isHit, priceValue: tpPrice };
              });

              // Check if All TPs are hit
              const areAllTpHit = currentTpTargets.length > 0 && currentTpTargets.every(tp => tp.hit);
              
              // Find highest TP hit index
              let maxTpHitIndex = -1;
              currentTpTargets.forEach((tp, idx) => {
                  if (tp.hit) maxTpHitIndex = idx;
              });
              const isAnyTpHit = maxTpHitIndex !== -1;

              // 2. Check Stop Loss
              let liveSlHit = false;
              if (!isNaN(stopLossPrice)) {
                  if (signal.side === 'Long' && livePrice <= stopLossPrice) liveSlHit = true;
                  if (signal.side === 'Short' && livePrice >= stopLossPrice) liveSlHit = true;
              }

              // 3. Determine Final Status and PnL
              if (areAllTpHit) {
                  currentStatus = 'closed';
                  const finalTp = currentTpTargets[currentTpTargets.length - 1];
                  // If all TPs hit, ROI is the last TP
                  const priceToUse = !isNaN(parsePrice(finalTp.price)) ? parsePrice(finalTp.price) : livePrice;
                  currentPnl = calculatePnl(entryPrice, priceToUse, signal.side, leverage);
              } else if (liveSlHit) {
                  // SL is physically hit
                  if (isAnyTpHit) {
                      // Logic: Hit TP1/2/3 then went to SL -> Close as Profitable at highest TP hit
                      currentStatus = 'closed';
                      tpSecured = true;
                      
                      // Calculate PnL based on highest TP Hit (Secured Profit)
                      const maxTp = currentTpTargets[maxTpHitIndex];
                      const priceToUse = !isNaN(parsePrice(maxTp.price)) ? parsePrice(maxTp.price) : entryPrice;
                      currentPnl = calculatePnl(entryPrice, priceToUse, signal.side, leverage);
                  } else {
                      // Pure Loss (No TP hit)
                      slHit = true;
                      currentStatus = 'SL Hit';
                      currentPnl = calculatePnl(entryPrice, stopLossPrice, signal.side, leverage);
                  }
              } else {
                  // Trade Active - Floating PnL
                  currentStatus = 'active';
                  currentPnl = calculatePnl(entryPrice, livePrice, signal.side, leverage);
              }
          }
      }

      return { 
          displayPnl: currentPnl, 
          displayTpTargets: currentTpTargets, 
          displayStatus: currentStatus,
          isSlHit: slHit,
          isTpSecured: tpSecured
      };
  }, [signal, livePrice, isLocked]);

  const isClosed = displayStatus === 'closed' || displayStatus === 'SL Hit';

  // Handle price flash effect
  useEffect(() => {
      if (!livePrice) return;
      
      if (prevPrice !== undefined) {
          if (livePrice > prevPrice) {
              setPriceDirection('up');
          } else if (livePrice < prevPrice) {
              setPriceDirection('down');
          }
      }
      
      const timer = setTimeout(() => setPriceDirection('neutral'), 1000);
      setPrevPrice(livePrice);
      
      return () => clearTimeout(timer);
  }, [livePrice]);

  // Price formatting helper
  const formatPrice = (price: number) => {
      if (price < 1) return price.toFixed(4);
      if (price < 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleAnalysisClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
        setShowUpgradeModal(true);
    } else {
        setShowAnalysis(true);
    }
  };

  const handleUnlockClick = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setShowUpgradeModal(true);
  };

  const handleCardClick = () => {
      if (isClosed) {
          setShowShareModal(true);
      }
  };

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = () => {
      // Simulation of downloading the card
      const link = document.createElement('a');
      link.download = `NexxTrade_${signal.pair}_PnL.png`;
      link.href = '#'; 
      link.click();
      alert("Trade card saved to photos!");
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `My Trade on ${signal.pair}`,
                  text: `Check out my trade on NexxTrade! ${displayPnl.toFixed(2)}% ROI on ${signal.pair}.`,
                  url: 'https://nexxtrade.com',
              });
          } catch (error) {
              console.log('Error sharing:', error);
          }
      } else {
          // Fallback
          alert("Share dialog opened");
      }
  };

  const renderCopyButton = (text: string, id: string, light = false) => (
    <button
        onClick={(e) => handleCopy(e, text, id)}
        className={`p-1 rounded-md transition-colors ml-1 ${light ? 'hover:bg-emerald-500/30' : 'hover:bg-dark-700'}`}
        aria-label="Copy value"
    >
        {copiedId === id ? (
            <Check size={12} className={light ? "text-emerald-100" : "text-emerald-400"} />
        ) : (
            <Copy size={12} className={light ? "text-emerald-200/70 hover:text-white" : "text-gray-500 hover:text-white"} />
        )}
    </button>
  );

  const pnlColorClass = displayPnl >= 0 ? 'text-emerald-400' : 'text-red-400';
  const statusColorClass = 
    displayStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' :
    displayStatus === 'SL Hit' ? 'bg-red-500/10 text-red-400 border-red-500/10' :
    'bg-gray-700/50 text-gray-400 border-gray-600/30';

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`bg-dark-800 rounded-2xl p-4 border border-dark-700/50 shadow-lg transition-all duration-300 relative overflow-hidden group flex flex-col ${isClosed ? 'cursor-pointer hover:bg-dark-700 hover:border-dark-600 hover:shadow-emerald-900/10 hover:shadow-xl' : ''}`}
      >
        {/* Background glow for active signals */}
        {displayStatus === 'active' && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        )}
        {isSlHit && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        )}
        {isTpSecured && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        )}
        
        {/* Closed Signal Watermark/Indicator */}
        {isClosed && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-white font-medium border border-white/10 shadow-xl">
                    <Share2 size={16} />
                    <span>Click to Share PnL</span>
                </div>
            </div>
        )}

        {/* Header - REFACTORED FOR BETTER LAYOUT */}
        <div className="flex justify-between items-start mb-3 relative z-10 gap-2">
          {/* Left Side: Pair & Badges */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
            <h3 className="text-xl font-bold text-white leading-tight tracking-tight">{signal.pair}</h3>
            
            <div className="flex gap-1.5 flex-wrap items-center">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${signal.side === 'Long' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {signal.side}
                </span>
                
                {signal.type === 'Futures' && signal.leverage && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-yellow-500/10 text-yellow-500 border-yellow-500/20 uppercase tracking-wide">
                        {signal.leverage}
                    </span>
                )}
                
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${statusColorClass}`}>
                    {displayStatus}
                </span>
            </div>
          </div>
          
          {/* Right Side: PnL & Price */}
          <div className="flex flex-col items-end shrink-0">
             <span className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${pnlColorClass}`}>
                {displayPnl > 0 ? '+' : ''}{displayPnl.toFixed(2)}%
             </span>
             {livePrice && (
                 <div className={`flex items-center gap-1.5 text-xs font-mono font-medium transition-colors duration-300 mt-0.5 ${priceDirection === 'up' ? 'text-emerald-400' : priceDirection === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                     {/* Blinking Dot for Live Status */}
                     <span className="relative flex h-1.5 w-1.5">
                       <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${priceDirection === 'up' ? 'bg-emerald-400' : priceDirection === 'down' ? 'bg-red-400' : 'bg-gray-400'}`}></span>
                       <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${priceDirection === 'up' ? 'bg-emerald-500' : priceDirection === 'down' ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                     </span>
                     
                     {formatPrice(livePrice)}
                     {priceDirection === 'up' && <TrendingUp size={10} />}
                     {priceDirection === 'down' && <TrendingDown size={10} />}
                 </div>
             )}
          </div>
        </div>

        {/* Time & Analysis Row */}
        <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center gap-1.5 text-gray-400">
                <div className={`w-1.5 h-1.5 rounded-full ${displayStatus === 'active' ? 'bg-emerald-500 animate-pulse' : displayStatus === 'SL Hit' ? 'bg-red-500' : 'bg-gray-600'}`}></div>
                <p className="text-xs font-medium">{signal.timeAgo}</p>
            </div>
            
             <button 
                onClick={handleAnalysisClick}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-300 ${
                    isLocked 
                    ? 'bg-dark-700 text-gray-400 border-dark-600/50 hover:bg-dark-600 cursor-pointer' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                }`}
             >
                {isLocked ? <Lock size={12} /> : <Lightbulb size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-wider">Analysis</span>
             </button>
        </div>

        {/* Stats Grid - Entry & SL */}
        <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
          {/* Entry Box */}
          <div 
            onClick={signal.entry === 'Locked' ? handleUnlockClick : undefined}
            className={`bg-dark-900/60 rounded-xl p-2.5 flex flex-col items-center justify-center border border-dark-700/30 transition-colors duration-300 ${signal.entry === 'Locked' ? 'cursor-pointer hover:bg-dark-700 group' : ''}`}
          >
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Entry Zone</span>
            {signal.entry === 'Locked' ? (
               <div className="flex items-center gap-1.5">
                   <Lock className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                   <span className="text-xs text-gray-500 font-medium group-hover:text-emerald-400 transition-colors">Locked</span>
               </div>
            ) : (
              <div className="flex items-center gap-1">
                  <span className="text-white font-mono font-medium text-sm">{signal.entry}</span>
                  {renderCopyButton(signal.entry, `entry-${signal.id}`)}
              </div>
            )}
          </div>

          {/* Stop Loss Box */}
          <div 
            onClick={!signal.slUnlock ? handleUnlockClick : undefined}
            className={`bg-dark-900/60 rounded-xl p-2.5 flex flex-col items-center justify-center border transition-colors duration-300 ${
                isSlHit ? 'border-red-500/50 bg-red-500/5' : 'border-dark-700/30'
            } ${!signal.slUnlock ? 'cursor-pointer hover:bg-dark-700 group' : ''}`}
          >
             <span className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${isSlHit ? 'text-red-400' : 'text-gray-500'}`}>Stop Loss</span>
              {signal.slUnlock ? (
                  <div className="flex items-center gap-1">
                       <span className={`${isSlHit ? 'text-red-500' : 'text-red-400'} font-mono font-medium text-sm`}>{signal.stopLoss}</span>
                       {renderCopyButton(signal.stopLoss, `sl-${signal.id}`)}
                   </div>
              ) : (
                  <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                        <span className="text-gray-500 text-xs font-medium group-hover:text-emerald-400 transition-colors">Locked</span>
                   </div>
              )}
          </div>
        </div>

        {/* Take Profit Targets */}
        {displayTpTargets.length > 0 && (
          <div className="space-y-2 relative z-10 flex-1">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">
              <Zap size={10} className="text-yellow-500" fill="currentColor" />
              <span>Take Profit Targets</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {displayTpTargets.map((tp, idx) => (
                <div 
                  key={idx} 
                  onClick={isLocked ? handleUnlockClick : undefined}
                  className={`py-2 px-1 rounded-lg text-xs font-medium text-center flex flex-col items-center justify-center gap-0.5 transition-all border ${
                      tp.hit 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                      : 'bg-dark-900/40 text-gray-400 border-dark-700/50'
                  } ${isLocked ? 'cursor-pointer hover:bg-dark-600 hover:border-emerald-500/30 group' : ''}`}
                >
                  <span className={`text-[9px] uppercase font-bold ${tp.hit ? 'text-emerald-500' : 'text-gray-600'}`}>TP {idx + 1}</span>
                  {isLocked ? (
                      <Lock size={12} className="text-gray-500 group-hover:text-emerald-400 mt-0.5" />
                  ) : (
                      <span className="font-mono">{tp.price}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Alerts / Status Messages */}
        {isSlHit && (
             <div className="mt-3 bg-red-500/10 p-2 rounded-lg flex items-center justify-center gap-2 border border-red-500/20 relative z-10 animate-pulse">
                <AlertTriangle size={12} className="text-red-500" />
                <span className="text-[10px] font-medium text-red-400">Stop Loss Hit</span>
            </div>
        )}

        {isTpSecured && (
             <div className="mt-3 bg-emerald-500/10 p-2 rounded-lg flex items-center justify-center gap-2 border border-emerald-500/20 relative z-10">
                <Check size={12} className="text-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-400">Trade Closed • Profit Secured</span>
            </div>
        )}

        {!isSlHit && !isTpSecured && displayTpTargets.length > 0 && displayTpTargets[0].hit && !isClosed && (
            <div className="mt-3 bg-emerald-500/5 p-2 rounded-lg flex items-center justify-center gap-2 border border-emerald-500/10 relative z-10">
                <Check size={12} className="text-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-400/80">TP Hit • Secure Profits</span>
            </div>
        )}
      </div>

      {/* Analysis Modal */}
      {showAnalysis && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAnalysis(false)}></div>
            <div className="bg-dark-800 w-full max-w-sm rounded-3xl overflow-hidden border border-dark-700 shadow-2xl relative animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-900/40 to-dark-800 p-5 border-b border-dark-700 flex justify-between items-start">
                    <div>
                        <h3 className="text-white text-lg font-bold flex items-center gap-2">
                            <BrainCircuit className="text-emerald-400" size={20} />
                            Trade Logic
                        </h3>
                        <p className="text-gray-400 text-xs mt-1">Why we took this {signal.pair} trade</p>
                    </div>
                    <button 
                        onClick={() => setShowAnalysis(false)}
                        className="p-1 bg-dark-700 rounded-full text-gray-400 hover:text-white transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Analysis Section */}
                    <div>
                        <h4 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Technical Analysis</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {signal.analysis || "Market structure break on the 4H timeframe combined with a retest of the order block. RSI divergence indicates bullish momentum build-up."}
                        </p>
                    </div>

                    {/* Risk Management Section */}
                    <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700">
                        <h4 className="text-white text-sm font-bold flex items-center gap-2 mb-2">
                            <ShieldCheck className="text-emerald-400" size={16} />
                            Safety & Risk Plan
                        </h4>
                         <p className="text-gray-400 text-xs leading-relaxed">
                            {signal.riskManagement || "Use 1-2% risk per trade. Move Stop Loss to breakeven after TP1 is hit to secure profits. Do not overleverage."}
                        </p>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-dark-700 bg-dark-900/50">
                    <button 
                        onClick={() => setShowAnalysis(false)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Understood
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Share PnL Card Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
             <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowShareModal(false)}></div>
             <div className="w-full max-w-sm relative animate-in zoom-in-95 duration-200">
                <button 
                    onClick={() => setShowShareModal(false)}
                    className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 rounded-full backdrop-blur-sm"
                >
                    <X size={24} />
                </button>

                {/* The Trade Card Node */}
                <div id="trade-card" className={`relative overflow-hidden rounded-3xl p-6 ${displayPnl >= 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-red-600 to-red-800'} shadow-2xl border border-white/10`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/40 to-transparent"></div>
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-black/20 rounded-full blur-3xl"></div>
                    
                    {/* Grid Pattern Overlay */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full min-h-[420px] justify-between text-white">
                        
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-emerald-700 shadow-lg">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M4.5 12.5L10 7H15.5L12.5 10H10.5V12L7.5 15H2L4.5 12.5Z" />
                                        <path d="M19.5 11.5L14 17H8.5L11.5 14H13.5V12L16.5 9H22L19.5 11.5Z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="font-bold text-lg leading-none block">NexxTrade</span>
                                    <span className="text-[10px] opacity-80 uppercase tracking-widest font-medium">Premium Signals</span>
                                </div>
                            </div>
                            <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold uppercase border border-white/10">
                                {signal.type} {signal.leverage ? `• ${signal.leverage}` : ''}
                            </div>
                        </div>

                        {/* Main PnL */}
                        <div className="my-6">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">{signal.pair}</h1>
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${signal.side === 'Long' ? 'bg-emerald-900/40 text-emerald-100' : 'bg-red-900/40 text-red-100'} border border-white/10`}>
                                    {signal.side}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-6xl font-black tracking-tighter drop-shadow-lg">
                                    {displayPnl >= 0 ? '+' : ''}{displayPnl.toFixed(2)}%
                                </span>
                            </div>
                            <p className="opacity-90 font-medium text-lg mt-1">Return on Investment</p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6 bg-black/10 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                            <div>
                                <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider mb-0.5">Entry Price</p>
                                <p className="font-mono font-bold text-lg">{signal.entry}</p>
                            </div>
                            <div>
                                <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider mb-0.5">Last Price</p>
                                <p className="font-mono font-bold text-lg">
                                    {livePrice ? formatPrice(livePrice) : "---"}
                                </p>
                            </div>
                             <div className="col-span-2 border-t border-white/10 pt-3 flex justify-between items-center">
                                <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider">Date</p>
                                <p className="font-medium text-sm text-white/90">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-auto flex justify-between items-end gap-4">
                            <div className="flex-1">
                                <p className="text-[10px] opacity-70 mb-1.5 uppercase tracking-wider font-bold">Referral Code</p>
                                <p className="font-bold text-xl tracking-wide">NEXX-ELITE</p>
                                <p className="text-[10px] mt-1 opacity-60">Join the winning team at nexxtrade.com</p>
                            </div>
                            <div className="bg-white p-2 rounded-xl shadow-lg shrink-0">
                                <QrCode className="text-black" size={48} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button 
                        onClick={handleDownload}
                        className="flex-1 bg-white hover:bg-gray-100 text-dark-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg"
                    >
                        <Download size={20} />
                        Save Image
                    </button>
                     <button 
                        onClick={handleShare}
                        className="flex-1 bg-dark-800 hover:bg-dark-700 text-white font-bold py-3.5 rounded-xl border border-dark-700 flex items-center justify-center gap-2 transition shadow-lg"
                    >
                        <Share2 size={20} />
                        Share
                    </button>
                </div>
             </div>
        </div>
      )}
    </>
  );
};

export default SignalCard;