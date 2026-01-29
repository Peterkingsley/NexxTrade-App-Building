import React from 'react';
import { ArrowLeft, Settings, Megaphone, Bell, BookOpen, User } from 'lucide-react';
import { ViewState, NotificationItem } from '../types';

interface NotificationsViewProps {
  onBack: () => void;
  notifications?: NotificationItem[];
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ onBack, notifications = [] }) => {
  
  const getIcon = (type: string) => {
      switch (type) {
          case 'Announcement': return Megaphone;
          case 'Signal': return Bell;
          case 'Academy': return BookOpen;
          case 'Account': return User;
          default: return Bell;
      }
  };

  const getColor = (type: string) => {
      switch (type) {
          case 'Announcement': return 'bg-blue-500';
          case 'Signal': return 'bg-yellow-500';
          case 'Academy': return 'bg-purple-500';
          default: return 'bg-emerald-500';
      }
  };

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
        {notifications.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
                <Bell size={48} className="mx-auto mb-4 opacity-20" />
                <p>No notifications yet</p>
            </div>
        ) : (
            notifications.map((item) => {
                const Icon = getIcon(item.type);
                const bgClass = getColor(item.type);
                
                return (
                    <div key={item.id} className="flex items-start gap-4 py-2 border-b border-dark-800 last:border-0 pb-4 last:pb-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center shrink-0 mt-1`}>
                            <Icon className="text-white" size={24} fill="currentColor" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                                <h3 className="text-white font-bold text-base truncate pr-2">{item.title}</h3>
                                <span className="text-gray-500 text-xs whitespace-nowrap">{item.timeAgo}</span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed">{item.message}</p>
                        </div>
                    </div>
                )
            })
        )}
      </div>
    </div>
  );
};

export default NotificationsView;