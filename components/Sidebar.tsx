import React from 'react';
import { Activity, BarChart2, BookOpen, User, LogOut, Shield } from 'lucide-react';
import { ViewState, UserProfile } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
  userProfile: UserProfile | null;
}

// Use logo from public folder for home icon
const NexxLogoImg = ({ size = 24, className = "", strokeWidth, ...rest }: any) => {
  const src = `${import.meta.env.BASE_URL}logo.png`;
  return (
    <img
      src={src}
      alt="NexxTrade"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      {...rest}
    />
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, userProfile }) => {
  const isAdmin = userProfile?.role === 'admin';

  const navItems = [
    { id: 'home', label: 'Home', icon: NexxLogoImg },
    { id: 'signals', label: 'Signals', icon: Activity },
    { id: 'performance', label: 'Performance', icon: BarChart2 },
    { id: 'academy', label: 'Academy', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-dark-800 border-r border-dark-700 h-screen fixed left-0 top-0 z-50 transition-colors duration-300">
       <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center text-dark-900 shadow-lg shadow-emerald-900/20 shrink-0">
            <NexxLogoImg size={24} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">NexxTrade</span>
        </div>

      <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-brand-green/10 text-brand-green' 
                  : 'text-gray-400 hover:bg-dark-700 hover:text-white'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
              {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_10px_#10B981]"></div>
              )}
            </button>
          );
        })}

        {isAdmin && (
            <button
              onClick={() => setView('admin')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 mt-6 border border-red-500/20 ${
                currentView === 'admin' 
                  ? 'bg-red-500/10 text-red-500' 
                  : 'text-gray-400 hover:bg-dark-700 hover:text-white'
              }`}
            >
              <Shield size={20} />
              <span className={`font-medium ${currentView === 'admin' ? 'font-bold' : ''}`}>Admin Panel</span>
            </button>
        )}
      </div>

      <div className="p-4 border-t border-dark-700">
         <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
         >
             <LogOut size={20} />
             <span className="font-medium">Log Out</span>
         </button>
      </div>
    </div>
  );
};

export default Sidebar;