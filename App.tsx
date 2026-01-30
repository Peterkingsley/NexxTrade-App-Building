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
import { ViewState, Signal, AuthProvider, UserProfile, NotificationItem } from './types';
import { requestNotificationPermission, sendLocalNotification, subscribeToPushNotifications } from './utils/notificationService';

// Configure Axios Base URL
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
        isEntryHit: true,
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
        slUnlock: true,
        isEntryHit: true
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
        isEntryHit: true,
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
        slUnlock: true,
        isEntryHit: true
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

  // Data State
  const [signals, setSignals] = useState<Signal[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState<boolean>(true);

  // --- Profile Refresh & Push Subscription ---
  useEffect(() => {
    const refreshProfileAndSubscribe = async () => {
        const storedUser = localStorage.getItem('nexx_user');
        if (!storedUser) return;
        
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser.id) return;

        try {
            // 1. Refresh Profile
            const res = await axios.get('/api/auth/me', {
                headers: { 'x-user-id': parsedUser.id }
            });
            
            const freshProfile: UserProfile = res.data;
            const freshProviders: AuthProvider[] = res.data.linkedProviders;

            setUserProfile(freshProfile);
            setConnectedProviders(freshProviders);
            
            // Update LocalStorage
            localStorage.setItem('nexx_user', JSON.stringify(freshProfile));
            localStorage.setItem('nexx_linked', JSON.stringify(freshProviders));

            // 2. Subscribe to Push Notifications if user is logged in
            subscribeToPushNotifications(parsedUser.id);
            
        } catch (error) {
            console.error("Failed to refresh profile", error);
        }
    };
    
    refreshProfileAndSubscribe();
  }, []);

  // --- Referral Link Handling ---
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/ref/')) {
        const segments = path.split('/');
        const code = segments[2];
        if (code) {
            console.log("Captured Referral Code:", code);
            localStorage.setItem('nexx_referral_pending', code);
            window.history.replaceState(null, '', '/');
        }
    }
  }, []);

  // --- Fetch Signals (with Polling) ---
  useEffect(() => {
    const fetchSignals = async (isBackground = false) => {
      if (!isBackground) setIsLoadingSignals(true);
      try {
        // Retrieve user ID to send in header for Tier checking
        const storedUser = localStorage.getItem('nexx_user');
        const headers: any = {};
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.id) headers['x-user-id'] = user.id;
        }

        const response = await axios.get<Signal[]>('/api/signals', { headers });
        if (Array.isArray(response.data)) {
          setSignals(response.data);
        } else {
          setSignals(MOCK_SIGNALS);
        }
      } catch (error) {
        console.error("Signal fetch failed", error);
        if (signals.length === 0) setSignals(MOCK_SIGNALS);
      } finally {
        if (!isBackground) setIsLoadingSignals(false);
      }
    };

    fetchSignals(); // Initial Fetch
    
    // Poll every 5 seconds to get updated PnL from backend if WS fails
    const interval = setInterval(() => fetchSignals(true), 5000);

    return () => clearInterval(interval);
  }, [currentView]); // Re-run if view changes (optional, mostly stable)

  // --- Helper: Time Ago ---
  const calculateTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // --- Notification Polling (Keep Polling for In-App Updates) ---
  useEffect(() => {
      if (!userProfile?.id) return;

      const fetchNotifications = async () => {
          try {
              const res = await axios.get('/api/notifications', {
                  headers: { 'x-user-id': userProfile.id }
              });
              
              const rawData = res.data;
              const formatted: NotificationItem[] = rawData.map((n: any) => ({
                  id: n.id,
                  type: n.type,
                  title: n.title,
                  message: n.message,
                  read: n.is_read || false,
                  timeAgo: calculateTimeAgo(n.created_at)
              }));
              
              setNotifications(formatted);

              // Only send LOCAL notification if push isn't supported or active
              // But for simplicity, we keep both as redundancies (Browser usually de-dupes if same tag)
              if (rawData.length > 0) {
                  const latest = rawData[0];
                  const latestId = latest.id;
                  const lastSeenId = localStorage.getItem('nexx_last_notification_id');
                  
                  if (latestId !== lastSeenId) {
                      localStorage.setItem('nexx_last_notification_id', latestId);
                      sendLocalNotification(latest.title, latest.message);
                  }
              }

          } catch (e) {
              console.error("Notification fetch failed", e);
          }
      };

      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
  }, [userProfile?.id]);

  // --- Live Pricing Integration ---
  const signalPairs = useMemo(() => {
    return Array.from(new Set(signals.map(s => s.pair)));
  }, [signals]);
  
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
      localStorage.setItem('nexx_user', JSON.stringify(userData));
      localStorage.setItem('nexx_provider', provider);
      localStorage.setItem('nexx_linked', JSON.stringify(accounts));
      
      // Attempt Push Subscription on Login
      if (userData.id) {
          subscribeToPushNotifications(userData.id);
      }
    }
    
    if (isNewUser) {
        setCurrentView('referral-input');
    } else {
        setCurrentView('home');
    }

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
      setTimeout(() => setShowTour(true), 800);
  };

  const handleLogout = () => {
    setCurrentView('auth');
    setUserProfile(null);
    setConnectedProviders([]);
    setNotifications([]);
    
    localStorage.removeItem('nexx_user');
    localStorage.removeItem('nexx_provider');
    localStorage.removeItem('nexx_linked');
  };

  const handleNavigate = (view: ViewState) => {
    if (view === 'notifications' || view === 'subscription' || view === 'notification-settings' || view === 'referrals' || view === 'signal-history') {
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

  if (currentView === 'intro') {
      return <IntroView onComplete={handleIntroComplete} />;
  }

  if (currentView === 'auth') {
    return <AuthView onLogin={handleLogin} />;
  }

  if (currentView === 'referral-input') {
      return <ReferralInputView onComplete={handleReferralComplete} userProfile={userProfile} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <HomeView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} livePrices={livePrices} notifications={notifications} />;
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
        return <NotificationsView onBack={handleBack} notifications={notifications} />;
      case 'notification-settings':
        return <NotificationSettingsView onBack={handleBack} />;
      case 'subscription':
        return <SubscriptionView onBack={handleBack} userProfile={userProfile} />;
      case 'referrals':
        return <ReferralsView onBack={handleBack} userProfile={userProfile} />;
      case 'admin':
        return <AdminView onNavigate={handleNavigate} />;
      default:
        return <HomeView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} livePrices={livePrices} notifications={notifications} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-900 text-white font-sans transition-colors duration-300">
      <Sidebar currentView={currentView} setView={setCurrentView} onLogout={handleLogout} userProfile={userProfile} />
      <main className="flex-1 md:ml-64 h-screen overflow-y-auto scrollbar-hide relative">
        <div className="w-full max-w-7xl mx-auto min-h-full pb-20 md:pb-6">
          {renderContent()}
        </div>
      </main>
      <BottomNav currentView={currentView} setView={setCurrentView} userProfile={userProfile} />
      <OnboardingTour steps={TOUR_STEPS} isOpen={showTour} onComplete={handleTourComplete} />
    </div>
  );
};

export default App;