import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import AuthView from './views/AuthView';
import HomeView from './views/HomeView';
import SignalsView from './views/SignalsView';
import SignalHistoryView from './views/SignalHistoryView';
import PerformanceView from './views/PerformanceView';
import AcademyView from './views/AcademyView';
import ProfileView from './views/ProfileView';
import NotificationsView from './views/NotificationsView';
import NotificationSettingsView from './views/NotificationSettingsView';
import SubscriptionView from './views/SubscriptionView';
import ReferralsView from './views/ReferralsView';
import IntroView from './views/IntroView';
import ReferralInputView from './views/ReferralInputView';
import OnboardingTour, { TourStep } from './components/OnboardingTour';
import { useBinancePrices } from './hooks/useBinancePrices';
import { ViewState, Signal, AuthProvider, UserProfile } from './types';

// Configure Axios Base URL
// In production, this might be the same origin. In dev, we point to the Express server port.
axios.defaults.baseURL = 'http://localhost:3001';

const TOUR_STEPS: TourStep[] = [
    {
        title: 'Welcome to NexxTrade',
        description: 'Your premium dashboard for institutional-grade crypto signals, analytics, and education.',
        targetId: undefined, // Center
    },
    {
        title: 'Real-time Signals',
        description: 'Tap here to access high-probability trading setups with entry, stop-loss, and take-profit targets.',
        targetId: 'nav-signals',
        position: 'top'
    },
    {
        title: 'Track Performance',
        description: 'Analyze your equity curve, win rates, and monthly performance to stay on top of your game.',
        targetId: 'nav-performance',
        position: 'top'
    },
    {
        title: 'NexxTrade Academy',
        description: 'Level up your trading skills with exclusive video courses, articles, and trading resources.',
        targetId: 'nav-academy',
        position: 'top'
    }
];

// Mock Signals for Fallback/Demo Mode
const MOCK_SIGNALS: Signal[] = [
    {
        id: '1',
        pair: 'BTC/USDT',
        type: 'Futures',
        side: 'Long',
        status: 'active',
        pnl: 0,
        timeAgo: '1h ago',
        entry: '96500',
        stopLoss: '95500',
        tpTargets: [
            { price: '97500', hit: false },
            { price: '98500', hit: false },
            { price: '100000', hit: false }
        ],
        slUnlock: true,
        analysis: 'Bullish consolidation above key support. Looking for a breakout.',
        riskManagement: '1-2% risk. Tight SL.'
    },
    {
        id: '2',
        pair: 'ETH/USDT',
        type: 'Spot',
        side: 'Long',
        status: 'active',
        pnl: 2.5,
        timeAgo: '3h ago',
        entry: '3450',
        stopLoss: '3300',
        tpTargets: [
            { price: '3550', hit: true },
            { price: '3700', hit: false }
        ],
        slUnlock: true
    },
    {
        id: '3',
        pair: 'SOL/USDT',
        type: 'Futures',
        side: 'Short',
        status: 'active',
        pnl: -1.2,
        timeAgo: '5h ago',
        entry: '190.50',
        stopLoss: '195.00',
        tpTargets: [
            { price: '185.00', hit: false },
            { price: '180.00', hit: false }
        ],
        slUnlock: true,
        analysis: 'Bearish divergence on 4H RSI. Rejection from supply zone.',
        riskManagement: 'High volatility, use reduced position size.'
    },
    {
        id: '4',
        pair: 'XRP/USDT',
        type: 'Futures',
        side: 'Long',
        status: 'closed',
        pnl: 15.0,
        timeAgo: '1d ago',
        closedAt: new Date(Date.now() - 86400000).toISOString(),
        entry: '2.10',
        stopLoss: '2.00',
        tpTargets: [
            { price: '2.20', hit: true },
            { price: '2.30', hit: true }
        ],
        slUnlock: true
    }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('intro');
  const [previousView, setPreviousView] = useState<ViewState>('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showTour, setShowTour] = useState(false);
  
  // Auth State
  const [authProvider, setAuthProvider] = useState<AuthProvider>('google');
  const [connectedProviders, setConnectedProviders] = useState<AuthProvider[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Signal Data State
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState<boolean>(true);

  // Fetch Signals from Database (via API)
  useEffect(() => {
    const fetchSignals = async () => {
      setIsLoadingSignals(true);
      try {
        // Attempt to fetch signals from the backend
        const response = await axios.get<Signal[]>('/api/signals');
        if (Array.isArray(response.data)) {
          setSignals(response.data);
        } else {
          console.warn('Received invalid signal data format, using mock data');
          setSignals(MOCK_SIGNALS);
        }
      } catch (error) {
        console.warn('Backend unavailable (Network Error). Using Mock Data for demonstration.', error);
        // Fallback to MOCK_SIGNALS to ensure UI is functional even without backend
        setSignals(MOCK_SIGNALS);
      } finally {
        setIsLoadingSignals(false);
      }
    };

    fetchSignals();
  }, []);

  // --- Live Pricing Integration ---
  // Extract unique pairs from fetched signals to subscribe to
  const signalPairs = useMemo(() => {
    return Array.from(new Set(signals.map(s => s.pair)));
  }, [signals]);
  
  // Get live prices map: { "BTCUSDT": 42000.00, ... }
  const livePrices = useBinancePrices(signalPairs);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = (provider: AuthProvider, userData?: UserProfile) => {
    setAuthProvider(provider);
    setConnectedProviders([provider]); // Initialize with the login provider
    if (userData) {
      setUserProfile(userData);
    }
    // Instead of going straight to home, go to referral input
    setCurrentView('referral-input');
  };

  const handleLinkProvider = (provider: AuthProvider) => {
    if (!connectedProviders.includes(provider)) {
        setConnectedProviders([...connectedProviders, provider]);
        // In a real app, you would merge user data here
    }
  };

  const handleReferralComplete = () => {
      setCurrentView('home');
      // Trigger tour after referral step (Skip or Submit)
      setTimeout(() => setShowTour(true), 800);
  };

  const handleLogout = () => {
    setCurrentView('auth');
    setUserProfile(null);
    setConnectedProviders([]);
  };

  const handleNavigate = (view: ViewState) => {
    // If navigating to detail views, save current view as previous
    if (view === 'notifications' || view === 'subscription' || view === 'notification-settings' || view === 'referrals' || view === 'signal-history') {
        // Special case: if we are in signal-history, back goes to signals, not signal-history
        if (currentView !== 'signal-history') {
            setPreviousView(currentView);
        }
    }
    setCurrentView(view);
  };

  const handleBack = () => {
      setCurrentView(previousView);
  };

  const handleTourComplete = () => {
      setShowTour(false);
  };
  
  const handleIntroComplete = () => {
      setCurrentView('auth');
  };

  // Views that take full screen without layout wrapper
  if (currentView === 'intro') {
      return <IntroView onComplete={handleIntroComplete} />;
  }

  if (currentView === 'auth') {
    return <AuthView onLogin={handleLogin} />;
  }

  if (currentView === 'referral-input') {
      return <ReferralInputView onComplete={handleReferralComplete} />;
  }

  // Views that share the dashboard layout
  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <HomeView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} livePrices={livePrices} />;
      case 'signals':
        return <SignalsView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} livePrices={livePrices} />;
      case 'signal-history':
        return <SignalHistoryView onBack={handleBack} signals={signals} isLoading={isLoadingSignals} />;
      case 'performance':
        return <PerformanceView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} />;
      case 'academy':
        return <AcademyView onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfileView 
            onNavigate={handleNavigate} 
            onLogout={handleLogout} 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            userProfile={userProfile}
            connectedProviders={connectedProviders}
            onLinkProvider={handleLinkProvider}
        />;
      case 'notifications':
        return <NotificationsView onBack={handleBack} />;
      case 'notification-settings':
        return <NotificationSettingsView onBack={handleBack} />;
      case 'subscription':
        return <SubscriptionView onBack={handleBack} />;
      case 'referrals':
        return <ReferralsView onBack={handleBack} />;
      default:
        return <HomeView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} livePrices={livePrices} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-900 text-white font-sans transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <Sidebar currentView={currentView} setView={setCurrentView} onLogout={handleLogout} />

      <main className="flex-1 md:ml-64 h-screen overflow-y-auto scrollbar-hide relative">
        <div className="w-full max-w-7xl mx-auto min-h-full pb-20 md:pb-6">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav currentView={currentView} setView={setCurrentView} />
      
      <OnboardingTour 
        steps={TOUR_STEPS} 
        isOpen={showTour} 
        onComplete={handleTourComplete} 
      />
    </div>
  );
};

export default App;