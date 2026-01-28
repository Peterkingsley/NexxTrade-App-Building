import React, { useState } from 'react';
import { ArrowLeft, Copy, Users, DollarSign, Wallet, Check, Gift, QrCode, X, Clock, CheckCircle2, ChevronRight, ExternalLink, FileText, Camera } from 'lucide-react';

interface ReferralsViewProps {
  onBack: () => void;
}

interface WithdrawalRecord {
  id: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Completed';
  chain: string;
  address: string;
  txHash?: string;
  timeRequested: string;
  timeSent?: string;
}

const CHAINS = ['USDT (TRC20)', 'USDT (ERC20)', 'USDT (BEP20)', 'SOL'];

const ReferralsView: React.FC<ReferralsViewProps> = ({ onBack }) => {
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  
  // View States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRecord | null>(null);
  
  // Withdrawal Form State
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock Data State
  const [pendingBalance, setPendingBalance] = useState(150.00);
  const [totalEarnings, setTotalEarnings] = useState(1250.00);
  
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([
    { 
        id: '1', 
        amount: 450.00, 
        date: 'Dec 12, 2023', 
        status: 'Completed', 
        chain: 'USDT (TRC20)', 
        address: 'T9yD...jK2', 
        txHash: '7f9a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z', 
        timeRequested: '10:30 AM', 
        timeSent: '10:45 AM' 
    },
    { 
        id: '2', 
        amount: 200.00, 
        date: 'Nov 28, 2023', 
        status: 'Completed', 
        chain: 'SOL', 
        address: 'Hz7A...9sP', 
        txHash: '5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1', 
        timeRequested: '02:15 PM', 
        timeSent: '02:20 PM' 
    },
    { 
        id: '3', 
        amount: 1250.00, 
        date: 'Oct 15, 2023', 
        status: 'Completed', 
        chain: 'USDT (ERC20)', 
        address: '0x71...9A2', 
        txHash: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t', 
        timeRequested: '09:00 AM', 
        timeSent: '09:30 AM' 
    },
    { 
        id: '4', 
        amount: 75.00, 
        date: 'Sep 01, 2023', 
        status: 'Completed', 
        chain: 'USDT (BEP20)', 
        address: '0xB2...k9L', 
        txHash: '0x9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g', 
        timeRequested: '04:45 PM', 
        timeSent: '05:00 PM' 
    },
  ]);
  
  const referralLink = 'https://nexxtrade.com/ref/nexx_elite_99';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHash = (hash: string) => {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleScanClick = () => {
      setShowScanner(true);
      // Simulate scanning process
      setTimeout(() => {
          setWalletAddress('T9yD14Nj9j7xAB4dbGeiX9h8zzCo5532'); // Mock result
          setShowScanner(false);
      }, 2000);
  };

  const handleWithdrawSubmit = () => {
      if (!walletAddress || pendingBalance <= 0) return;

      setIsSubmitting(true);
      
      // Simulate API call
      setTimeout(() => {
          const now = new Date();
          const newWithdrawal: WithdrawalRecord = {
              id: Math.random().toString(36).substr(2, 9),
              amount: pendingBalance,
              date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              status: 'Pending',
              chain: selectedChain,
              address: walletAddress.substring(0, 6) + '...' + walletAddress.substring(walletAddress.length - 4),
              timeRequested: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              // No txHash or timeSent for pending
          };

          setWithdrawals([newWithdrawal, ...withdrawals]);
          setPendingBalance(0);
          setIsSubmitting(false);
          setShowWithdrawModal(false);
          setWalletAddress('');
      }, 1500);
  };

  const renderWithdrawalItem = (item: WithdrawalRecord, isLast: boolean) => (
      <div 
        key={item.id} 
        onClick={() => setSelectedWithdrawal(item)}
        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-dark-700/50 transition-colors ${!isLast ? 'border-b border-dark-700' : ''}`}
      >
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'Completed' ? 'bg-emerald-500/10' : 'bg-yellow-500/10'}`}>
            {item.status === 'Completed' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Clock size={18} className="text-yellow-500" />}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h4 className="text-white font-bold text-sm">{item.chain}</h4>
                    <span className="text-xs text-gray-500 font-mono">({item.address})</span>
                </div>
                <p className="text-gray-500 text-xs">{item.date} • {item.timeRequested}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-white font-bold">${item.amount.toFixed(2)}</p>
            <div className="flex items-center justify-end gap-1">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${item.status === 'Completed' ? 'text-emerald-500' : 'text-yellow-500'}`}>
                    {item.status}
                </p>
                <ChevronRight size={12} className="text-gray-600" />
            </div>
        </div>
    </div>
  );

  // --- Sub-View: History List ---
  if (showHistoryView) {
      return (
        <div className="min-h-screen bg-dark-900 pb-10">
            <div className="flex items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800">
                <button onClick={() => setShowHistoryView(false)} className="text-white p-2 hover:bg-dark-800 rounded-full transition mr-4">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-white">Withdrawal History</h1>
            </div>
            <div className="p-4">
                <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
                    {withdrawals.map((item, idx) => renderWithdrawalItem(item, idx === withdrawals.length - 1))}
                    {withdrawals.length === 0 && (
                        <div className="p-8 text-center text-gray-500 text-sm">No transaction history found.</div>
                    )}
                </div>
            </div>
            
            {/* Transaction Details Modal (Rendered here to be available in this view) */}
            {selectedWithdrawal && <TransactionDetailsModal withdrawal={selectedWithdrawal} onClose={() => setSelectedWithdrawal(null)} onCopyHash={handleCopyHash} copiedHash={copiedHash} />}
        </div>
      );
  }

  // --- Main View ---
  return (
    <div className="min-h-screen bg-dark-900 pb-10 relative">
      {/* Header */}
      <div className="flex items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800">
        <button onClick={onBack} className="text-white p-2 hover:bg-dark-800 rounded-full transition mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Referrals</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Main Stats - Total Earnings */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-3xl p-6 relative overflow-hidden shadow-lg">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
           <div className="relative z-10">
              <p className="text-emerald-100 text-sm font-medium mb-1 flex items-center gap-2">
                <DollarSign size={16} /> Total Earnings
              </p>
              <h2 className="text-4xl font-bold text-white mb-4">${totalEarnings.toFixed(2)}</h2>
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit">
                  <span className="text-xs text-white/90">Lifetime commission earned</span>
              </div>
           </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700 flex flex-col justify-between">
                <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center mb-3">
                    <Wallet size={20} className="text-orange-500" />
                </div>
                <div>
                    <p className="text-gray-400 text-xs mb-1">Pending Balance</p>
                    <h3 className="text-xl font-bold text-white">${pendingBalance.toFixed(2)}</h3>
                </div>
            </div>
            <div className="bg-dark-800 p-4 rounded-2xl border border-dark-700 flex flex-col justify-between">
                <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
                    <Users size={20} className="text-blue-500" />
                </div>
                <div>
                    <p className="text-gray-400 text-xs mb-1">Total Referrals</p>
                    <h3 className="text-xl font-bold text-white">24</h3>
                </div>
            </div>
        </div>

        {/* Link Section */}
        <div className="bg-dark-800 rounded-2xl p-5 border border-dark-700">
            <h3 className="text-white font-bold mb-4">Your Referral Link</h3>
            <div className="flex gap-2">
                <div className="bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 flex-1 text-gray-300 text-sm truncate font-mono">
                    {referralLink}
                </div>
                <button 
                    onClick={handleCopy}
                    className={`px-4 rounded-xl font-medium transition-all flex items-center justify-center ${copied ? 'bg-emerald-500 text-white' : 'bg-dark-700 text-white hover:bg-dark-600'}`}
                >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
            </div>
            <p className="text-gray-500 text-xs mt-3 text-center">
                Share this link to earn 20% commission on every subscription.
            </p>
        </div>

        {/* CTA */}
        <button 
            onClick={() => setShowWithdrawModal(true)}
            disabled={pendingBalance <= 0}
            className={`w-full font-bold py-4 rounded-xl transition shadow-lg ${pendingBalance > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-dark-700 text-gray-500 cursor-not-allowed'}`}
        >
            {pendingBalance > 0 ? 'Withdraw Funds' : 'No Funds to Withdraw'}
        </button>

        {/* Past Withdrawals History (Preview) */}
        <div>
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-white font-bold flex items-center gap-2">
                    <Clock size={18} className="text-gray-400" />
                    Past Withdrawals
                 </h3>
                 {withdrawals.length > 2 && (
                     <button 
                        onClick={() => setShowHistoryView(true)}
                        className="text-brand-green text-xs font-medium hover:text-emerald-400 transition"
                     >
                         See All
                     </button>
                 )}
             </div>
             <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
                 {withdrawals.length > 0 ? (
                    <>
                        {withdrawals.slice(0, 2).map((item, idx) => renderWithdrawalItem(item, idx === 1 && withdrawals.length <= 2))}
                        
                        {/* "See More" Button inside list if needed, currently using "See All" header button logic above, 
                            but can also add a bottom button style: */}
                        {withdrawals.length > 2 && (
                            <button 
                                onClick={() => setShowHistoryView(true)}
                                className="w-full py-3 text-center text-xs font-medium text-gray-400 hover:text-white hover:bg-dark-700/50 transition border-t border-dark-700"
                            >
                                View all {withdrawals.length} transactions
                            </button>
                        )}
                    </>
                 ) : (
                     <div className="p-8 text-center text-gray-500 text-sm">
                         No withdrawal history yet.
                     </div>
                 )}
             </div>
        </div>

        {/* Instructions */}
        <div>
            <h3 className="text-white font-bold mb-4">How it works</h3>
            <div className="space-y-4">
                {[
                    { title: 'Share your link', desc: 'Copy your unique referral link and share it with friends or on social media.', icon: Gift },
                    { title: 'They subscribe', desc: 'When someone signs up using your link and purchases a Pro plan.', icon: Users },
                    { title: 'You earn money', desc: 'You receive 20% of their subscription fee directly to your pending balance.', icon: DollarSign }
                ].map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-emerald-500 font-bold text-sm shrink-0">
                                {idx + 1}
                            </div>
                            {idx < 2 && <div className="w-px h-full bg-dark-700 my-1"></div>}
                        </div>
                        <div className="pb-4">
                            <h4 className="text-white font-medium text-sm mb-1">{step.title}</h4>
                            <p className="text-gray-400 text-xs leading-relaxed">{step.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)}></div>
            <div className="bg-dark-800 w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl border-t sm:border border-dark-700 shadow-2xl relative animate-slide overflow-hidden">
                <div className="p-5 border-b border-dark-700 flex justify-between items-center bg-dark-800">
                    <h3 className="text-white text-lg font-bold">Withdraw Funds</h3>
                    <button 
                        onClick={() => setShowWithdrawModal(false)}
                        className="p-1 bg-dark-700 rounded-full text-gray-400 hover:text-white transition"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                        <p className="text-gray-400 text-xs mb-1">Available to Withdraw</p>
                        <h2 className="text-3xl font-bold text-white">${pendingBalance.toFixed(2)}</h2>
                    </div>

                    {/* Chain Selection */}
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Select Network</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CHAINS.map(chain => (
                                <button
                                    key={chain}
                                    onClick={() => setSelectedChain(chain)}
                                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                                        selectedChain === chain 
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                        : 'bg-dark-900 border-dark-700 text-gray-400 hover:border-gray-500'
                                    }`}
                                >
                                    {chain}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Address Input */}
                    <div>
                         <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Wallet Address</label>
                         <div className="relative">
                             <input 
                                type="text"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                placeholder="Enter address..."
                                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 pr-12 font-mono"
                             />
                             <button 
                                onClick={handleScanClick}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-lg transition"
                                title="Scan QR Code"
                             >
                                 <QrCode size={18} />
                             </button>
                         </div>
                    </div>

                    <button 
                        onClick={handleWithdrawSubmit}
                        disabled={!walletAddress || isSubmitting}
                        className={`w-full py-3.5 rounded-xl font-bold transition-all ${
                            !walletAddress || isSubmitting 
                            ? 'bg-dark-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                        }`}
                    >
                        {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Mock Scanner Overlay */}
      {showScanner && (
          <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center">
              <div className="absolute top-6 right-6 z-10">
                  <button onClick={() => setShowScanner(false)} className="p-2 bg-white/20 rounded-full text-white">
                      <X size={24} />
                  </button>
              </div>
              
              <h3 className="text-white text-lg font-medium mb-8">Scan QR Code</h3>
              
              <div className="relative w-64 h-64 border-2 border-emerald-500 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 shadow-[0_0_10px_#34D399] animate-[slideDown_2s_infinite]"></div>
                  <div className="w-full h-full bg-dark-800 opacity-50 flex items-center justify-center">
                       <Camera size={48} className="text-white/20" />
                  </div>
              </div>
              <p className="text-gray-400 text-sm mt-8 max-w-xs text-center">
                  Align the wallet QR code within the frame to scan automatically.
              </p>
              <style>{`
                @keyframes slideDown {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
              `}</style>
          </div>
      )}

      {/* Transaction Details Modal */}
      {selectedWithdrawal && <TransactionDetailsModal withdrawal={selectedWithdrawal} onClose={() => setSelectedWithdrawal(null)} onCopyHash={handleCopyHash} copiedHash={copiedHash} />}
    </div>
  );
};

// Helper Component for the Detail Modal
const TransactionDetailsModal: React.FC<{ withdrawal: WithdrawalRecord; onClose: () => void; onCopyHash: (hash: string) => void; copiedHash: boolean }> = ({ withdrawal, onClose, onCopyHash, copiedHash }) => {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-dark-800 w-full max-w-sm rounded-3xl overflow-hidden border border-dark-700 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="bg-dark-900 border-b border-dark-700 p-5 flex justify-between items-start">
                    <div>
                        <h3 className="text-white text-lg font-bold">Transaction Details</h3>
                        <p className="text-gray-400 text-xs mt-1">ID: #{withdrawal.id}</p>
                    </div>
                    <button onClick={onClose} className="p-1 bg-dark-800 rounded-full text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Amount & Status */}
                    <div className="flex flex-col items-center justify-center py-2">
                         <h2 className="text-3xl font-bold text-white mb-2">${withdrawal.amount.toFixed(2)}</h2>
                         <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                             withdrawal.status === 'Completed' 
                             ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                             : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                         }`}>
                             {withdrawal.status === 'Completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                             {withdrawal.status}
                         </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-dark-700/50">
                            <span className="text-gray-400 text-sm">Network</span>
                            <span className="text-white font-medium text-sm">{withdrawal.chain}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-dark-700/50">
                            <span className="text-gray-400 text-sm">Date</span>
                            <span className="text-white font-medium text-sm">{withdrawal.date}</span>
                        </div>
                        
                        {/* Timestamps */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Requested</span>
                                <p className="text-white text-sm font-medium mt-1">{withdrawal.timeRequested}</p>
                            </div>
                            <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/50">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Sent</span>
                                <p className="text-white text-sm font-medium mt-1">{withdrawal.timeSent || '--:--'}</p>
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                             <span className="text-gray-400 text-sm block mb-2">Wallet Address</span>
                             <div className="bg-dark-900 border border-dark-700 rounded-xl p-3 flex items-center gap-3">
                                 <Wallet size={16} className="text-gray-500 shrink-0" />
                                 <span className="text-gray-300 text-xs font-mono break-all">{withdrawal.address}</span>
                             </div>
                        </div>

                        {/* TX Hash */}
                        {withdrawal.txHash && (
                            <div>
                                <span className="text-gray-400 text-sm block mb-2">Transaction Hash</span>
                                <div className="bg-dark-900 border border-dark-700 rounded-xl p-3 flex items-start gap-3 relative group">
                                    <FileText size={16} className="text-gray-500 shrink-0 mt-0.5" />
                                    <span className="text-emerald-400 text-xs font-mono break-all pr-8 leading-relaxed">
                                        {withdrawal.txHash}
                                    </span>
                                    <button 
                                        onClick={() => onCopyHash(withdrawal.txHash!)}
                                        className="absolute right-2 top-2 p-1.5 text-gray-500 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-lg transition"
                                    >
                                        {copiedHash ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </button>
                                </div>
                                <a 
                                    href="#" 
                                    onClick={(e) => e.preventDefault()} 
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-green mt-2 ml-1 transition-colors w-fit"
                                >
                                    View on Explorer <ExternalLink size={10} />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReferralsView;