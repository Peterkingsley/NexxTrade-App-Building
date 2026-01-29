import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Bell, Megaphone, Target, TrendingDown, BookOpen, Loader2 } from 'lucide-react';
import { NotificationPreferences } from '../types';
import { requestNotificationPermission } from '../utils/notificationService';

interface NotificationSettingsViewProps {
  onBack: () => void;
}

const NotificationSettingsView: React.FC<NotificationSettingsViewProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationPreferences>({
    allSignals: true,
    announcement: true,
    tp: true,
    sl: true,
    academy: false
  });

  // Fetch settings on mount
  useEffect(() => {
      const fetchSettings = async () => {
          const user = localStorage.getItem('nexx_user');
          if (!user) return;
          const parsedUser = JSON.parse(user);

          try {
              const res = await axios.get('/api/user/settings/notifications', {
                  headers: { 'x-user-id': parsedUser.id }
              });
              if (res.data) setSettings(res.data);
          } catch (error) {
              console.error("Failed to load settings", error);
          } finally {
              setLoading(false);
          }
      };
      fetchSettings();
  }, []);

  const toggle = async (key: keyof NotificationPreferences) => {
    // Optimistic UI update
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    // Request Browser Permission if turning something ON
    if (newSettings[key] === true) {
        await requestNotificationPermission();
    }

    // Persist to Backend
    const user = localStorage.getItem('nexx_user');
    if (user) {
        const parsedUser = JSON.parse(user);
        try {
            await axios.put('/api/user/settings/notifications', newSettings, {
                 headers: { 'x-user-id': parsedUser.id }
            });
            
            // Update local storage user profile as well to keep sync
            parsedUser.notificationPreferences = newSettings;
            localStorage.setItem('nexx_user', JSON.stringify(parsedUser));

        } catch (error) {
            console.error("Failed to save settings", error);
            // Revert on error
            setSettings(settings);
        }
    }
  };

  const config = [
    { 
      id: 'allSignals', 
      label: 'All Signals', 
      desc: 'Get notified immediately when a new trade is posted.', 
      icon: Bell 
    },
    { 
      id: 'announcement', 
      label: 'Announcements', 
      desc: 'Important updates, maintenance, and platform news.', 
      icon: Megaphone 
    },
    { 
      id: 'tp', 
      label: 'Take Profit (TP)', 
      desc: 'Alerts when a trade hits any Take Profit target.', 
      icon: Target 
    },
    { 
      id: 'sl', 
      label: 'Stop Loss (SL)', 
      desc: 'Alerts when a trade hits the Stop Loss level.', 
      icon: TrendingDown 
    },
    { 
      id: 'academy', 
      label: 'Academy', 
      desc: 'New courses, articles, and educational content.', 
      icon: BookOpen 
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900 pb-10">
      {/* Header */}
      <div className="flex items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800">
        <button onClick={onBack} className="text-white p-2 hover:bg-dark-800 rounded-full transition mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Notification Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-gray-400 text-sm mb-2 px-1">Customize which notifications you want to receive directly to your device.</p>
        
        {loading ? (
             <div className="flex justify-center py-10">
                 <Loader2 className="animate-spin text-brand-green" />
             </div>
        ) : (
            config.map((item) => {
            const Icon = item.icon;
            const isOn = settings[item.id as keyof NotificationPreferences];

            return (
                <div 
                key={item.id} 
                className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between"
                >
                <div className="flex items-center gap-4 flex-1 pr-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOn ? 'bg-emerald-500/20 text-emerald-500' : 'bg-dark-700 text-gray-500'}`}>
                    <Icon size={20} />
                    </div>
                    <div>
                    <h3 className={`font-bold text-sm mb-0.5 ${isOn ? 'text-white' : 'text-gray-400'}`}>{item.label}</h3>
                    <p className="text-gray-500 text-xs leading-tight">{item.desc}</p>
                    </div>
                </div>

                <button
                    onClick={() => toggle(item.id as keyof NotificationPreferences)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${isOn ? 'bg-emerald-500' : 'bg-dark-700'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                </div>
            );
            })
        )}
      </div>
    </div>
  );
};

export default NotificationSettingsView;