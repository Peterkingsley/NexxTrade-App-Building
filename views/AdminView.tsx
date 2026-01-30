import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Shield, Plus, X, Trash2, CheckCircle2, Megaphone, Video, FileText, Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import { ViewState, Signal } from '../types';

interface AdminViewProps {
  onNavigate: (view: ViewState) => void;
}

type Tab = 'create-signal' | 'manage-signals' | 'academy' | 'notify';

const AdminView: React.FC<AdminViewProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('create-signal');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Data for Management
  const [activeSignals, setActiveSignals] = useState<Signal[]>([]);

  // Forms
  const [signalForm, setSignalForm] = useState({
    pair: '', 
    type: 'Futures', 
    side: 'Long', 
    leverage: '', 
    entry: '', 
    stopLoss: '', 
    analysis: '', 
    targets: ['', '', ''],
    requiresSubscription: 'free' // New Field
  });

  const [academyForm, setAcademyForm] = useState({
      title: '', category: 'videos', type: 'Video', duration: '', author: 'NexxTeam', description: '', content: '', videoUrl: ''
  });

  const [notifyForm, setNotifyForm] = useState({
      title: '', message: '', type: 'Announcement'
  });

  const [closeSignalId, setCloseSignalId] = useState<string | null>(null);
  const [closePnl, setClosePnl] = useState('');
  
  // Proof Upload State
  const [proofSignalId, setProofSignalId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = JSON.parse(localStorage.getItem('nexx_user') || '{}').id;

  useEffect(() => {
      if (activeTab === 'manage-signals') {
          fetchSignals();
      }
  }, [activeTab]);

  const fetchSignals = async () => {
      try {
          const res = await axios.get('/api/signals');
          setActiveSignals(res.data);
      } catch (error) {
          console.error("Error fetching signals");
      }
  };

  const handleSignalSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          // Filter empty targets
          const targets = signalForm.targets.filter(t => t.trim() !== '');
          await axios.post('/api/admin/signals', { ...signalForm, targets }, { headers: { 'x-user-id': userId } });
          setSuccessMsg('Signal Posted Successfully!');
          setSignalForm({ pair: '', type: 'Futures', side: 'Long', leverage: '', entry: '', stopLoss: '', analysis: '', targets: ['', '', ''], requiresSubscription: 'free' });
      } catch (error) {
          alert('Failed to post signal');
      } finally {
          setIsLoading(false);
          setTimeout(() => setSuccessMsg(''), 3000);
      }
  };

  const handleCloseSignal = async () => {
      if (!closeSignalId || !closePnl) return;
      setIsLoading(true);
      try {
          await axios.put(`/api/admin/signals/${closeSignalId}/close`, { 
              pnl: parseFloat(closePnl)
          }, { 
              headers: { 'x-user-id': userId } 
          });
          
          setCloseSignalId(null);
          setClosePnl('');
          fetchSignals();
      } catch (error) {
          alert('Failed to close signal');
      } finally {
          setIsLoading(false);
      }
  };

  const handleDeleteSignal = async (id: string) => {
      if (!confirm('Are you sure you want to delete this signal?')) return;
      try {
          await axios.delete(`/api/admin/signals/${id}`, { headers: { 'x-user-id': userId } });
          fetchSignals();
      } catch (error) {
          alert('Failed to delete');
      }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !proofSignalId) return;
      
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          alert("File too large. Max 5MB.");
          return;
      }

      setIsUploading(true);

      try {
          // 1. Convert to Base64
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              const base64Image = reader.result as string;
              
              // 2. Upload to Server
              const uploadRes = await axios.post('/api/admin/upload', { image: base64Image, filename: file.name }, { headers: { 'x-user-id': userId } });
              const fileUrl = uploadRes.data.url;

              // 3. Update Signal
              await axios.put(`/api/admin/signals/${proofSignalId}/proof`, { proofImageUrl: fileUrl }, { headers: { 'x-user-id': userId } });
              
              setProofSignalId(null);
              fetchSignals(); // Refresh UI
              alert("Proof uploaded successfully!");
          };
      } catch (error) {
          console.error(error);
          alert("Failed to upload proof.");
      } finally {
          setIsUploading(false);
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleAcademySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          await axios.post('/api/admin/academy', academyForm, { headers: { 'x-user-id': userId } });
          setSuccessMsg('Content Posted!');
          setAcademyForm({ ...academyForm, title: '', description: '', content: '', videoUrl: '' });
      } catch (error) {
          alert('Failed to post content');
      } finally {
          setIsLoading(false);
          setTimeout(() => setSuccessMsg(''), 3000);
      }
  };

  const handleNotifySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          await axios.post('/api/admin/notifications', notifyForm, { headers: { 'x-user-id': userId } });
          setSuccessMsg('Notification Sent!');
          setNotifyForm({ title: '', message: '', type: 'Announcement' });
      } catch (error) {
          alert('Failed to send');
      } finally {
          setIsLoading(false);
          setTimeout(() => setSuccessMsg(''), 3000);
      }
  };

  return (
    <div className="pb-24 min-h-screen bg-dark-900 text-white">
        <div className="p-6 border-b border-dark-800 bg-dark-900 sticky top-0 z-40">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-red-500">
                <Shield size={28} /> Admin Console
            </h1>
        </div>

        <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
                {[
                    { id: 'create-signal', label: 'Post Signal' },
                    { id: 'manage-signals', label: 'Manage Signals' },
                    { id: 'academy', label: 'Add Academy' },
                    { id: 'notify', label: 'Send Alert' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                            activeTab === tab.id ? 'bg-red-500 text-white' : 'bg-dark-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {successMsg && (
                <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-xl mb-6 flex items-center gap-2">
                    <CheckCircle2 /> {successMsg}
                </div>
            )}

            {/* CREATE SIGNAL FORM */}
            {activeTab === 'create-signal' && (
                <form onSubmit={handleSignalSubmit} className="max-w-2xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input required placeholder="Pair (e.g. BTC/USDT)" value={signalForm.pair} onChange={e => setSignalForm({...signalForm, pair: e.target.value.toUpperCase()})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none focus:border-red-500" />
                        <select value={signalForm.type} onChange={e => setSignalForm({...signalForm, type: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none">
                            <option value="Futures">Futures</option>
                            <option value="Spot">Spot</option>
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <select value={signalForm.side} onChange={e => setSignalForm({...signalForm, side: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none">
                            <option value="Long">Long</option>
                            <option value="Short">Short</option>
                        </select>
                        <select value={signalForm.requiresSubscription} onChange={e => setSignalForm({...signalForm, requiresSubscription: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none">
                            <option value="free">Free Tier (Everyone)</option>
                            <option value="basic">Basic Tier</option>
                            <option value="pro">Pro Tier</option>
                            <option value="elite">Elite Tier</option>
                        </select>
                    </div>
                    
                    {signalForm.type === 'Futures' && (
                        <input placeholder="Leverage (e.g. 20x)" value={signalForm.leverage} onChange={e => setSignalForm({...signalForm, leverage: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none" />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <input required placeholder="Entry Price" value={signalForm.entry} onChange={e => setSignalForm({...signalForm, entry: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none" />
                        <input required placeholder="Stop Loss" value={signalForm.stopLoss} onChange={e => setSignalForm({...signalForm, stopLoss: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none text-red-400" />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold uppercase">Take Profit Targets</label>
                        {signalForm.targets.map((tp, idx) => (
                            <input 
                                key={idx}
                                placeholder={`TP ${idx + 1}`} 
                                value={tp} 
                                onChange={e => {
                                    const newTargets = [...signalForm.targets];
                                    newTargets[idx] = e.target.value;
                                    setSignalForm({...signalForm, targets: newTargets});
                                }} 
                                className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none text-emerald-400 mb-2" 
                            />
                        ))}
                    </div>

                    <textarea placeholder="Technical Analysis / Notes" value={signalForm.analysis} onChange={e => setSignalForm({...signalForm, analysis: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none h-32" />

                    <button disabled={isLoading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition flex justify-center">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Publish Signal'}
                    </button>
                </form>
            )}

            {/* MANAGE SIGNALS */}
            {activeTab === 'manage-signals' && (
                <div className="space-y-4">
                    {/* Active & Closed Signals List */}
                    {activeSignals.map(signal => (
                        <div key={signal.id} className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg">{signal.pair}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${signal.side === 'Long' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                                        {signal.side}
                                    </span>
                                    {signal.requiresSubscription && signal.requiresSubscription !== 'free' && (
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded uppercase font-bold">
                                            {signal.requiresSubscription}
                                        </span>
                                    )}
                                    {signal.status === 'closed' && (
                                        <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded">Closed</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                    <span>Entry: {signal.entry}</span>
                                    {signal.status === 'closed' && (
                                        <span className={signal.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                            PnL: {signal.pnl}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-2 flex-wrap">
                                {signal.status === 'active' ? (
                                    <button 
                                        onClick={() => setCloseSignalId(signal.id)} 
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold flex items-center gap-1"
                                    >
                                        <CheckCircle2 size={14} /> Close Trade
                                    </button>
                                ) : (
                                    // Button to attach proof for closed signals
                                    <button 
                                        onClick={() => setProofSignalId(signal.id)} 
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 border transition-colors ${signal.proofImageUrl ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-dark-700 text-gray-300 border-dark-600 hover:bg-dark-600'}`}
                                    >
                                        <ImageIcon size={14} /> {signal.proofImageUrl ? 'Update Proof' : 'Attach Proof'}
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDeleteSignal(signal.id)} 
                                    className="p-2 bg-dark-700 hover:bg-red-900/50 text-red-500 rounded-lg border border-dark-600"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Close Trade Modal */}
                    {closeSignalId && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
                            <div className="bg-dark-800 p-6 rounded-2xl w-full max-w-sm border border-dark-700 animate-in zoom-in-95 duration-200">
                                <h3 className="text-xl font-bold mb-4">Close Trade</h3>
                                <div>
                                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Final PnL %</label>
                                    <input autoFocus type="number" placeholder="e.g. 15.5 or -4.2" value={closePnl} onChange={e => setClosePnl(e.target.value)} className="w-full bg-dark-900 p-4 rounded-xl border border-dark-600 outline-none text-xl font-mono" />
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button onClick={() => setCloseSignalId(null)} className="flex-1 py-3 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors">Cancel</button>
                                    <button onClick={handleCloseSignal} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors">Confirm Close</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Proof Upload Modal */}
                    {proofSignalId && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
                            <div className="bg-dark-800 p-6 rounded-2xl w-full max-w-sm border border-dark-700 animate-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold">Upload PnL Proof</h3>
                                    <button onClick={() => setProofSignalId(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                                </div>
                                
                                <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-dark-700/30 transition-colors cursor-pointer relative">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="animate-spin text-brand-green mb-2" size={32} />
                                            <span className="text-sm text-gray-400">Uploading...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="text-gray-500 mb-2" size={32} />
                                            <span className="text-sm font-bold text-white mb-1">Tap to Upload</span>
                                            <span className="text-xs text-gray-500">Max 5MB (PNG, JPG)</span>
                                            <input 
                                                ref={fileInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleProofUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-4 text-center">
                                    Upload the screenshot from your exchange app.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ACADEMY FORM */}
            {activeTab === 'academy' && (
                <form onSubmit={handleAcademySubmit} className="max-w-2xl space-y-4">
                    <input required placeholder="Title" value={academyForm.title} onChange={e => setAcademyForm({...academyForm, title: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <select value={academyForm.category} onChange={e => setAcademyForm({...academyForm, category: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none">
                            <option value="videos">Video Course</option>
                            <option value="guides">Guide / Article</option>
                            <option value="resources">Resource</option>
                        </select>
                        <select value={academyForm.type} onChange={e => setAcademyForm({...academyForm, type: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none">
                            <option value="Video">Video</option>
                            <option value="Article">Article</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Duration (e.g. 10:00 or 5 min read)" value={academyForm.duration} onChange={e => setAcademyForm({...academyForm, duration: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none" />
                        <input placeholder="Author" value={academyForm.author} onChange={e => setAcademyForm({...academyForm, author: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none" />
                    </div>

                    <textarea placeholder="Short Description" value={academyForm.description} onChange={e => setAcademyForm({...academyForm, description: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none h-24" />

                    {academyForm.type === 'Article' ? (
                        <textarea placeholder="HTML Content (<div>...</div>)" value={academyForm.content} onChange={e => setAcademyForm({...academyForm, content: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none h-48 font-mono text-xs" />
                    ) : (
                        <input placeholder="Video URL (YouTube/Vimeo)" value={academyForm.videoUrl} onChange={e => setAcademyForm({...academyForm, videoUrl: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none" />
                    )}

                    <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition flex justify-center">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Post Content'}
                    </button>
                </form>
            )}

            {/* NOTIFY FORM */}
            {activeTab === 'notify' && (
                <form onSubmit={handleNotifySubmit} className="max-w-2xl space-y-4">
                    <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl text-orange-400 text-sm mb-4">
                        Warning: This will send a notification to ALL users on the platform.
                    </div>
                    
                    <select value={notifyForm.type} onChange={e => setNotifyForm({...notifyForm, type: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none">
                        <option value="Announcement">Announcement</option>
                        <option value="Signal">Signal Alert</option>
                        <option value="Academy">Academy Update</option>
                    </select>

                    <input required placeholder="Notification Title" value={notifyForm.title} onChange={e => setNotifyForm({...notifyForm, title: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none" />
                    
                    <textarea required placeholder="Message Body" value={notifyForm.message} onChange={e => setNotifyForm({...notifyForm, message: e.target.value})} className="w-full bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none h-32" />

                    <button disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl transition flex justify-center">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Send Broadcast'}
                    </button>
                </form>
            )}
        </div>
    </div>
  );
};

export default AdminView;