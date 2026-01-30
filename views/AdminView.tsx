import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, X, Trash2, CheckCircle2, Megaphone, Video, FileText, Loader2, Image as ImageIcon } from 'lucide-react';
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
    pair: '', type: 'Futures', side: 'Long', leverage: '', entry: '', stopLoss: '', analysis: '', targets: ['', '', '']
  });

  const [academyForm, setAcademyForm] = useState({
      title: '', category: 'videos', type: 'Video', duration: '', author: 'NexxTeam', description: '', content: '', videoUrl: ''
  });

  const [notifyForm, setNotifyForm] = useState({
      title: '', message: '', type: 'Announcement'
  });

  const [closeSignalId, setCloseSignalId] = useState<string | null>(null);
  const [closePnl, setClosePnl] = useState('');
  const [closeProofUrl, setCloseProofUrl] = useState('');

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
          setSignalForm({ pair: '', type: 'Futures', side: 'Long', leverage: '', entry: '', stopLoss: '', analysis: '', targets: ['', '', ''] });
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
              pnl: parseFloat(closePnl),
              proofImageUrl: closeProofUrl || null
          }, { 
              headers: { 'x-user-id': userId } 
          });
          
          setCloseSignalId(null);
          setClosePnl('');
          setCloseProofUrl('');
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
                        {signalForm.type === 'Futures' && (
                            <input placeholder="Leverage (e.g. 20x)" value={signalForm.leverage} onChange={e => setSignalForm({...signalForm, leverage: e.target.value})} className="bg-dark-800 p-3 rounded-xl border border-dark-700 outline-none" />
                        )}
                    </div>

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
                    {activeSignals.map(signal => (
                        <div key={signal.id} className="bg-dark-800 p-4 rounded-xl border border-dark-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{signal.pair} <span className={`text-xs px-2 py-0.5 rounded ${signal.side === 'Long' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>{signal.side}</span></h3>
                                <p className="text-xs text-gray-500">Status: {signal.status} | Entry: {signal.entry}</p>
                            </div>
                            <div className="flex gap-2">
                                {signal.status === 'active' && (
                                    <button onClick={() => setCloseSignalId(signal.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold">Close</button>
                                )}
                                <button onClick={() => handleDeleteSignal(signal.id)} className="p-2 bg-dark-700 hover:bg-red-900/50 text-red-500 rounded-lg"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}

                    {closeSignalId && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
                            <div className="bg-dark-800 p-6 rounded-2xl w-full max-w-sm border border-dark-700">
                                <h3 className="text-xl font-bold mb-4">Close Trade</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Final PnL %</label>
                                        <input autoFocus type="number" placeholder="e.g. 15.5 or -4.2" value={closePnl} onChange={e => setClosePnl(e.target.value)} className="w-full bg-dark-900 p-4 rounded-xl border border-dark-600 outline-none text-xl font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Proof Image URL (Optional)</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="https://image-host.com/pnl.jpg" 
                                                value={closeProofUrl} 
                                                onChange={e => setCloseProofUrl(e.target.value)} 
                                                className="w-full bg-dark-900 p-4 pl-10 rounded-xl border border-dark-600 outline-none text-sm" 
                                            />
                                            <ImageIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1">Paste a link to the PnL card image (e.g. from MEXC).</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button onClick={() => setCloseSignalId(null)} className="flex-1 py-3 bg-dark-700 rounded-xl">Cancel</button>
                                    <button onClick={handleCloseSignal} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold">Confirm Close</button>
                                </div>
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