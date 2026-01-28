import React from 'react';
import { Activity, BarChart2, BookOpen, User } from 'lucide-react';
import { ViewState } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

// Custom NexxTrade Logo Icon
const NexxLogoIcon = ({ size = 24, className = "" }: { size?: number | string, strokeWidth?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M4.5 12.5L10 7H15.5L12.5 10H10.5V12L7.5 15H2L4.5 12.5Z" />
    <path d="M19.5 11.5L14 17H8.5L11.5 14H13.5V12L16.5 9H22L19.5 11.5Z" />
  </svg>
);

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: NexxLogoIcon },
    { id: 'signals', label: 'Signals', icon: Activity },
    { id: 'performance', label: 'Performance', icon: BarChart2 },
    { id: 'academy', label: 'Academy', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 px-4 py-2 pb-5 z-50 transition-colors duration-300">
      <div className="flex justify-between items-end max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setView(item.id as ViewState)}
              className={`flex flex-col items-center gap-1 w-1/5 transition-colors duration-200 ${
                isActive ? 'text-brand-green' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-brand-green/10 -translate-y-1' : ''}`}>
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