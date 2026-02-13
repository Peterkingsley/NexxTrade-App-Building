import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import HomeView from './views/HomeView';
import SignalsView from './views/SignalsView';
import SignalHistoryView from './views/SignalHistoryView';
import PerformanceView from './views/PerformanceView';
import AcademyView from './views/AcademyView';
import ProfileView from './views/ProfileView';
import AuthView from './views/AuthView';
import IntroView from './views/IntroView';
import NotificationsView from './views/NotificationsView';
import NotificationSettingsView from './views/NotificationSettingsView';
import SubscriptionView from './views/SubscriptionView';
import ReferralsView from './views/ReferralsView';
import AdminView from './views/AdminView';
import ReferralInputView from './views/ReferralInputView';
import OnboardingTour, { TourStep } from './components/OnboardingTour';
import { useBinancePrices } from './hooks/useBinancePrices';
import {
  Signal,
  ViewState,
  UserProfile,
  NotificationItem,
  AuthProvider
} from './types';
import {
  requestNotificationPermission,
  sendLocalNotification,
  subscribeToPushNotifications
} from './utils/notificationService';

// --- Constants ---
const MOCK_SIGNALS: Signal[] = [
  {
    id: '1',
    pair: 'BTC/USDT',
    type: 'Futures',
    side: 'Long',
    entry: '62,450.00',
    tpTargets: [
  { price: "65000", hit: false },
  { price: "66000", hit: false },
  { price: "67000", hit: false }
  ],
    stopLoss: '61,200.00',
    status: 'active',
    pnl: 0,
    timeAgo: 'Just now',
    created_at: new Date().toISOString(),
    leverage: '50X',
    analysis: 'Bullish divergence on 4H RSI with strong support at 62k.'
  }
];

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to NexxTrade!',
    description: 'Let\'s take a quick tour of your new crypto dashboard.',
    position: 'bottom'
  },
  {
    targetId: 'nav-signals',
    title: 'Market Signals',
    description: 'Get real-time trading signals with entry prices, targets, and stop loss levels.',
    position: 'top'
  },
  {
    targetId: 'nav-performance',
    title: 'Performance Tracking',
    description: 'Monitor your trading success with detailed PnL analytics and history.',
    position: 'top'
  }
];

// --- Main App Component ---
const App: React.FC = () => {
  // --- Core State ---
  const [currentView, setCurrentView] = useState<ViewState>("home");
  const [previousView, setPreviousView] = useState<ViewState>('home');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('nexx_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(() => {
      return (localStorage.getItem('nexx_provider') as AuthProvider) || null;
  });

  const [connectedProviders, setConnectedProviders] = useState<AuthProvider[]>(() => {
      try {
          const saved = localStorage.getItem('nexx_linked');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showTour, setShowTour] = useState(true);

  // --- Initial Setup ---
  useEffect(() => {
    const refreshProfileAndSubscribe = async () => {
        const storedUser = localStorage.getItem('nexx_user');
        if (!storedUser) return;
        
        try {
            const parsedUser = JSON.parse(storedUser);
            const res = await axios.get('/api/profile', {
                headers: { 'x-user-id': parsedUser.id }
            });
            
            const updatedProfile = res.data;
            setUserProfile(updatedProfile);
            localStorage.setItem('nexx_user', JSON.stringify(updatedProfile));
            
            // Sync connected providers
            const freshProviders = updatedProfile.connectedProviders || [authProvider];
            setConnectedProviders(freshProviders);
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

    fetchSignals();
    const interval = setInterval(() => fetchSignals(true), 5000);
    return () => clearInterval(interval);
  }, [currentView]);

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
              if (rawData.length > 0) {
                  const latest = rawData[0];
                  const latestId = latest.id;
                  const lastSeenId = localStorage.getItem('nexx_last_notification_id');
                  if (latestId !== lastSeenId) {
                      localStorage.setItem('nexx_last_notification_id', latestId);
                      sendLocalNotification(latest.title, latest.message);
                  }
              }
          } catch (e) { console.error("Notification fetch failed", e); }
      };
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
  }, [userProfile?.id]);

  const signalPairs = useMemo(() => {
    return Array.from(new Set(signals.map(s => s.pair)));
  }, [signals]);
  const livePrices = useBinancePrices(signalPairs);

  useEffect(() => {
    if (isDarkMode) { document.body.classList.remove('light-theme'); }
    else { document.body.classList.add('light-theme'); }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = async (provider: AuthProvider, userData?: UserProfile, linkedAccounts?: AuthProvider[], isNewUser?: boolean) => {
    setAuthProvider(provider);
    const accounts = linkedAccounts || [provider];
    setConnectedProviders(accounts);
    if (userData) {
      setUserProfile(userData);
      localStorage.setItem('nexx_user', JSON.stringify(userData));
      localStorage.setItem('nexx_provider', provider);
      localStorage.setItem('nexx_linked', JSON.stringify(accounts));
      if (userData.id) subscribeToPushNotifications(userData.id);
    }
    if (isNewUser) setCurrentView('referral-input');
    else setCurrentView('home');
    try {
        const granted = await requestNotificationPermission();
        if (granted) {
            sendLocalNotification("Welcome!", `Hello ${userData?.firstName || 'Trader'}`);
        }
    } catch (e) { }
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
        if (currentView !== 'signal-history') setPreviousView(currentView);
    }
    setCurrentView(view);
  };

  const handleBack = () => setCurrentView(previousView);
  const handleTourComplete = () => setShowTour(false);
  const handleIntroComplete = () => {
      setCurrentView('auth');
      localStorage.setItem('nexx_intro_seen', 'true');
  };

  if (currentView === 'intro') return <IntroView onComplete={handleIntroComplete} />;
  if (currentView === 'auth') return <AuthView onLogin={handleLogin} />;
  if (currentView === 'referral-input') return <ReferralInputView onComplete={handleReferralComplete} userProfile={userProfile} />;

  const renderContent = () => {
    switch (currentView) {
      case 'home': return <HomeView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} livePrices={livePrices} notifications={notifications} />;
      case 'signals': return <SignalsView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} livePrices={livePrices} />;
      case 'signal-history': return <SignalHistoryView onBack={handleBack} signals={signals} isLoading={isLoadingSignals} />;
      case 'performance': return <PerformanceView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} />;
      case 'academy': return <AcademyView onNavigate={handleNavigate} />;
      case 'profile': return <ProfileView onNavigate={handleNavigate} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme} userProfile={userProfile} connectedProviders={connectedProviders} onLinkProvider={handleLinkProvider} />;
      case 'notifications': return <NotificationsView onBack={handleBack} notifications={notifications} />;
      case 'notification-settings': return <NotificationSettingsView onBack={handleBack} />;
      case 'subscription': return <SubscriptionView onBack={handleBack} userProfile={userProfile} />;
      case 'referrals': return <ReferralsView onBack={handleBack} userProfile={userProfile} />;
      case 'admin': return <AdminView onNavigate={handleNavigate} />;
      default: return <HomeView onNavigate={handleNavigate} signals={signals} isLoading={isLoadingSignals} livePrices={livePrices} notifications={notifications} />;
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
