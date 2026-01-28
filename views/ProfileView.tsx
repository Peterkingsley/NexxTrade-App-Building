import React, { useState } from 'react';
import { MessageSquare, Bell, Camera, Shield, User, BellRing, Lock, HelpCircle, Info, ChevronRight, LogOut, Moon, Sun, Link, Mail, Send, Check, X, Users } from 'lucide-react';
import { ViewState, AuthProvider, UserProfile } from '../types';

interface ProfileViewProps {
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  authProvider: AuthProvider;
  userProfile: UserProfile | null;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate, onLogout, isDarkMode, toggleTheme, authProvider, userProfile }) => {
  const [showConnections, setShowConnections] = useState(false);
  const [groupsLabel, setGroupsLabel] = useState('Groups');

  const handleGroupsClick = () => {
    setGroupsLabel('Coming Soon');
    setTimeout(() => setGroupsLabel('Groups'), 2000);
  };

  // Mocking connection state based on login provider
  // In a real app, this would be fetched from user profile
  const isGoogleConnected = authProvider === 'google';
  const isTelegramConnected = authProvider === 'telegram';

  // Determine display name
  const displayName = userProfile 
    ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.username 
    : 'NexxTrader';
  
  // Determine display username/status
  const displayStatus = userProfile?.username 
    ? `@${userProfile.username}` 
    : 'Elite Member';

  return (
    <div className="pb-24">
       <div className="flex justify-between items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 transition-colors duration-300">
        <button className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition border border-transparent hover:border-dark-700">
          <MessageSquare size={20} />
        </button>
        <div className="flex bg-dark-800 rounded-lg p-1 border border-dark-700 transition-colors duration-300">
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
        <button onClick={() => onNavigate('notifications')} className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition border border-transparent hover:border-dark-700">
          <Bell size={20} />
        </button>
      </div>

      <div className="px-4 flex flex-col items-center mt-6 mb-8">
        <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center overflow-hidden border-4 border-dark-900 shadow-xl transition-colors duration-300 relative group">
                 {userProfile?.photoUrl ? (
                    <img 
                      src={userProfile.photoUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                 ) : (
                    <User size={64} className="text-emerald-900 opacity-50" />
                 )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-emerald-600 rounded-full text-white border-4 border-dark-900 hover:bg-emerald-500 transition shadow-lg">
                <Camera size={16} />
            </button>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">{displayName}</h2>
        <p className="text-gray-400 text-sm">{displayStatus}</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Connected Accounts */}
        <div 
          onClick={() => setShowConnections(true)}
          className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Link size={24} className="text-emerald-500" />
                </div>
                <div>
                    <h3 className="text-white font-bold">Connected Accounts</h3>
                    <p className="text-gray-400 text-xs">Manage linked accounts</p>
                </div>
            </div>
            <ChevronRight className="text-gray-600" />
        </div>

        {/* Referrals - New Item */}
        <div 
          onClick={() => onNavigate('referrals')}
          className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Users size={24} fill="currentColor" className="opacity-20" />
                    <Users size={24} className="absolute -mt-6" />
                </div>
                <div>
                    <h3 className="text-white font-bold">Referrals</h3>
                    <p className="text-gray-400 text-xs">Invite friends and earn</p>
                </div>
            </div>
            <ChevronRight className="text-gray-600" />
        </div>

        {/* Theme Toggle */}
        <div 
          onClick={toggleTheme}
          className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm group"
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-500'}`}>
                    {isDarkMode ? (
                       <Moon size={24} fill="currentColor" className="opacity-80" />
                    ) : (
                       <Sun size={24} fill="currentColor" className="opacity-80" />
                    )}
                </div>
                <div>
                    <h3 className="text-white font-bold">Appearance</h3>
                    <p className="text-gray-400 text-xs">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</p>
                </div>
            </div>
            <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-dark-700' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6 bg-brand-green' : 'translate-x-0 bg-white'}`} />
            </div>
        </div>

        <div 
            onClick={() => onNavigate('subscription')}
            className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Shield size={24} fill="currentColor" className="opacity-20" />
                    <Shield size={24} className="absolute -mt-6" />
                </div>
                <div>
                    <h3 className="text-white font-bold">Subscription</h3>
                    <p className="text-gray-400 text-xs">Active until: Dec 31, 2026</p>
                </div>
            </div>
            <ChevronRight className="text-gray-600" />
        </div>

        <div className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <User size={24} fill="currentColor" className="opacity-20" />
                    <User size={24} className="absolute -mt-6" />
                </div>
                <div>
                    <h3 className="text-white font-bold">Edit Profile</h3>
                    <p className="text-gray-400 text-xs">Update your informaton</p>
                </div>
            </div>
            <ChevronRight className="text-gray-600" />
        </div>

        <div 
            onClick={() => onNavigate('notification-settings')} 
            className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <BellRing size={24} fill="currentColor" className="opacity-20" />
                    <BellRing size={24} className="absolute -mt-6" />
                </div>
                <div>
                    <h3 className="text-white font-bold">Notification</h3>
                    <p className="text-gray-400 text-xs">Manage notification settings</p>
                </div>
            </div>
            <ChevronRight className="text-gray-600" />
        </div>

        <div className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                     <Lock size={24} fill="currentColor" className="opacity-20" />
                     <Lock size={24} className="absolute -mt-6" />
                </div>
                <div>
                    <h3 className="text-white font-bold">Security</h3>
                    <p className="text-gray-400 text-xs">Password and security settings</p>
                </div>
            </div>
            <ChevronRight className="text-gray-600" />
        </div>

        <div className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                     <HelpCircle size={24} fill="currentColor" className="opacity-20" />
                     <HelpCircle size={24} className="absolute -mt-6" />
                </div>
                <div>
                    <h3 className="text-white font-bold">Help & Support</h3>
                    <p className="text-gray-400 text-xs">Get help from our customer support</p>
                </div>
            </div>
            <ChevronRight className="text-gray-600" />
        </div>

         <div className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition shadow-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Info size={24} fill="currentColor" className="opacity-20" />
                    <Info size={24} className="absolute -mt-6" />
                </div>
                <div>
                    <h3 className="text-white font-bold">About</h3>
                    <p className="text-gray-400 text-xs">version 1.0.0</p>
                </div>
            </div>
            <ChevronRight className="text-gray-600" />
        </div>

        <div onClick={onLogout} className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20 flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500/20 transition mt-8 shadow-sm">
            <LogOut size={20} className="text-red-500" />
            <h3 className="text-red-500 font-bold">Log Out</h3>
        </div>
      </div>

      {/* Connected Accounts Modal */}
      {showConnections && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConnections(false)}></div>
            <div className="bg-dark-800 w-full max-w-sm rounded-3xl overflow-hidden border border-dark-700 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-dark-700 flex justify-between items-center bg-dark-800">
                    <h3 className="text-white text-lg font-bold">Connected Accounts</h3>
                    <button 
                        onClick={() => setShowConnections(false)}
                        className="p-1 bg-dark-700 rounded-full text-gray-400 hover:text-white transition"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4 bg-dark-900/50">
                    {/* Google Account */}
                    <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Mail size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Google</h4>
                                <p className="text-gray-500 text-xs">{isGoogleConnected ? 'Connected' : 'Not Connected'}</p>
                            </div>
                        </div>
                        {isGoogleConnected ? (
                             <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                <Check size={14} strokeWidth={3} />
                                <span className="text-xs font-bold">Linked</span>
                             </div>
                        ) : (
                            <button className="text-xs bg-dark-700 hover:bg-dark-600 text-white font-medium px-3 py-1.5 rounded-lg transition-colors border border-dark-600">
                                Connect
                            </button>
                        )}
                    </div>

                    {/* Telegram Account */}
                    <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#2AABEE] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Send size={20} className="text-white" fill="currentColor" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Telegram</h4>
                                <p className="text-gray-500 text-xs">{isTelegramConnected ? 'Connected' : 'Not Connected'}</p>
                            </div>
                        </div>
                        {isTelegramConnected ? (
                             <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                <Check size={14} strokeWidth={3} />
                                <span className="text-xs font-bold">Linked</span>
                             </div>
                        ) : (
                            <button className="text-xs bg-[#2AABEE]/20 hover:bg-[#2AABEE]/30 text-[#2AABEE] font-medium px-3 py-1.5 rounded-lg transition-colors border border-[#2AABEE]/30">
                                Connect
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;