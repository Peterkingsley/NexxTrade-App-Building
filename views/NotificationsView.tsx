import React from 'react';
import { ArrowLeft, Settings, Megaphone, Bell, BookOpen, User } from 'lucide-react';
import { ViewState } from '../types';

interface NotificationsViewProps {
  onBack: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ onBack }) => {
  const notifications = [
    { type: 'Announcement', title: 'Announcement', desc: 'NexxTrade is partnering with binance to....', time: '2h ago', icon: Megaphone, color: 'emerald' },
    { type: 'Signal', title: 'Signal Alert', desc: 'BTC?....', time: '10h ago', icon: Bell, color: 'emerald' },
    { type: 'Academy', title: 'Academy', desc: 'New Article: how to use risk mangagem.....', time: '18/05/25', icon: BookOpen, color: 'emerald' },
    { type: 'Account', title: 'Account', desc: 'Login attempt from new IP', time: '12/12/25', icon: User, color: 'emerald' },
  ];

  return (
    <div className="min-h-screen bg-dark-900 pb-10">
      <div className="flex justify-between items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800">
        <button onClick={onBack} className="text-white p-2 hover:bg-dark-800 rounded-full transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Notification</h1>
        <button className="text-white p-2 hover:bg-dark-800 rounded-full transition">
          <Settings size={24} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {notifications.map((item, idx) => {
            const Icon = item.icon;
            return (
                <div key={idx} className="flex items-center gap-4 py-2 border-b border-dark-800 last:border-0 pb-4 last:pb-0">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <Icon className="text-white" size={24} fill="currentColor" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <h3 className="text-white font-bold text-base truncate pr-2">{item.title}</h3>
                            <span className="text-gray-500 text-xs whitespace-nowrap">{item.time}</span>
                        </div>
                        <p className="text-gray-400 text-sm truncate">{item.desc}</p>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default NotificationsView;