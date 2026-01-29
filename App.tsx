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
import AdminView from './views/AdminView';
import OnboardingTour, { TourStep } from './components/OnboardingTour';
import { useBinancePrices } from './hooks/useBinancePrices';
import { ViewState, Signal, AuthProvider, UserProfile } from './types';
import { requestNotificationPermission, sendLocalNotification } from './utils/notificationService';

// Configure Axios Base URL
// In Production, we use relative paths (empty string) so requests go to the same domain.
// In Development, we point to localhost:3001
axios.defaults.baseURL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

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
  // --- State Initialization (Lazy Load from LocalStorage) ---
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('nexx_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [currentView, setCurrentView] = useState<ViewState>(() => {
    // If logged in, go home
    if (localStorage.getItem('nexx_user')) return 'home';
    // If intro seen, go auth
    if (localStorage.getItem('nexx_intro_seen')) return 'auth';
    return 'intro';
  });
  
  const [previousView, setPreviousView] = useState<ViewState>('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showTour, setShowTour] = useState(false);
  
  // Auth State
  const [authProvider, setAuthProvider] = useState<AuthProvider>(() => {
      return (localStorage.getItem('nexx_provider') as AuthProvider) || 'google';
  });
  
  const [connectedProviders, setConnectedProviders] = useState<AuthProvider[]>(() => {
    try {
      const saved = localStorage.getItem('nexx_linked');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // Signal Data State
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState<boolean>(true);

  // --- Referral Link Handling ---
  useEffect(() => {
    // Check if the user landed via a referral link: /ref/CODE
    const path = window.location.pathname;
    if (path.startsWith('/ref/')) {
        const segments = path.split('/');
        // Path is like ["", "ref", "CODE"]
        const code = segments[2];
        if (code) {
            console.log("Captured Referral Code:", code);
            localStorage.setItem('nexx_referral_pending', code);
            // Clean the URL so the user feels like they are on the homepage
            window.history.replaceState(null, '', '/');
        }
    }
  }, []);

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
  }, [currentView]); // Re-fetch when view changes (e.g. creating a signal in admin)

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

  const handleLogin = async (provider: AuthProvider, userData?: UserProfile, linkedAccounts?: AuthProvider[], isNewUser?: boolean) => {
    setAuthProvider(provider);
    const accounts = linkedAccounts || [provider];
    setConnectedProviders(accounts);
    
    if (userData) {
      setUserProfile(userData);
      // Persist Session
      localStorage.setItem('nexx_user', JSON.stringify(userData));
      localStorage.setItem('nexx_provider', provider);
      localStorage.setItem('nexx_linked', JSON.stringify(accounts));
    }
    
    // Only show referral input for new users
    if (isNewUser) {
        setCurrentView('referral-input');
    } else {
        setCurrentView('home');
    }

    // --- WELCOME NOTIFICATION TRIGGER ---
    // Ask for permission and show welcome notification
    try {
        const granted = await requestNotificationPermission();
        if (granted) {
            sendLocalNotification(
                "Welcome to NexxTrade!",
                `Hello ${userData?.firstName || 'Trader'}, you are now connected to real-time signals.`
            );
        }
    } catch (e) {
        console.log("Notification trigger failed", e);
    }
  };

  const handleLinkProvider = (provider: AuthProvider) => {
    if (!connectedProviders.includes(provider)) {
        const newConnected = [...connectedProviders, provider];
        setConnectedProviders(newConnected);
        localStorage.setItem('nexx_linked', JSON.stringify(newConnected));
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
    
    // Clear Session
    localStorage.removeItem('nexx_user');
    localStorage.removeItem('nexx_provider');
    localStorage.removeItem('nexx_linked');
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
      localStorage.setItem('nexx_intro_seen', 'true');
  };

  // Views that take full screen without layout wrapper
  if (currentView === 'intro') {
      return <IntroView onComplete={handleIntroComplete} />;
  }

  if (currentView === 'auth') {
    return <AuthView onLogin={handleLogin} />;
  }

  if (currentView === 'referral-input') {
      return <ReferralInputView onComplete={handleReferralComplete} userProfile={userProfile} />;
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
        return <SubscriptionView onBack={handleBack} userProfile={userProfile} />;
      case 'referrals':
        return <ReferralsView onBack={handleBack} userProfile={userProfile} />;
      case 'admin':
        return <AdminView onNavigate={handleNavigate} />;
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