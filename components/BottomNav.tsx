import React from 'react';
import { Activity, BarChart2, BookOpen, User, Shield } from 'lucide-react';
import { ViewState, UserProfile } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  userProfile: UserProfile | null;
}

// Use logo from public folder for home icon
const NexxLogoImg = ({ size = 24, className = "", strokeWidth, ...rest }: any) => (
  <img
    src="/logo.png"
    alt="NexxTrade"
    width={size}
    height={size}
    className={`object-contain ${className}`}
    {...rest}
  />
);

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, userProfile }) => {
  const isAdmin = userProfile?.role === 'admin';

  const navItems = [
    { id: 'home', label: 'Home', icon: NexxLogoIcon },
    { id: 'signals', label: 'Signals', icon: Activity },
    { id: 'performance', label: 'Performance', icon: BarChart2 },
    { id: 'academy', label: 'Academy', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (isAdmin) {
      navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 px-4 py-2 pb-5 z-50 transition-colors duration-300">
      <div className="flex justify-between items-end max-w-md mx-auto w-full">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setView(item.id as ViewState)}
              className={`flex flex-col items-center gap-1 flex-1 transition-colors duration-200 ${
                isActive ? 'text-brand-green' : 'text-gray-400 hover:text-gray-200'
              } ${item.id === 'admin' && isActive ? 'text-red-500' : ''}`}
            >
              <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-brand-green/10 -translate-y-1' : ''} ${item.id === 'admin' && isActive ? 'bg-red-500/10' : ''}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;