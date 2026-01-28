import React, { useState, useEffect } from 'react';
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
import { ViewState, Signal, AuthProvider } from './types';

// Mock Data
const MOCK_SIGNALS: Signal[] = [
  {
    id: '1',
    pair: 'BTC/USDT',
    type: 'Futures',
    status: 'active',
    pnl: 18,
    timeAgo: '2h ago',
    entry: '42,800',
    stopLoss: '41,500',
    tpTargets: [
      { price: '43,500', hit: true },
      { price: '44,200', hit: false },
      { price: '45,000', hit: false },
    ],
    slUnlock: true,
    analysis: 'Bitcoin has reclaimed the 200-day EMA and formed a bullish flag pattern on the 4H chart. We are seeing strong volume inflow at the $42.8k support level.',
    riskManagement: 'High volatility expected due to upcoming FOMC news. Keep leverage below 10x and strictly adhere to the stop loss. Consider taking partial profits early.'
  },
  {
    id: '2',
    pair: 'ETH/USDT',
    type: 'Futures',
    status: 'active',
    pnl: 12,
    timeAgo: '3h ago',
    entry: '2,250',
    stopLoss: '2,180',
    tpTargets: [
      { price: '2,300', hit: true },
      { price: '2,350', hit: false },
      { price: '2,450', hit: false },
    ],
    slUnlock: true,
    analysis: 'Ethereum is bouncing off a key demand zone. The ETH/BTC pair is showing strength, indicating potential outperformance against Bitcoin in the short term.',
    riskManagement: 'Standard risk. Move stop loss to entry now that TP1 has been hit. Trail stop loss behind previous 1H lows.'
  },
  {
    id: '3',
    pair: 'SOL/USDT',
    type: 'Futures',
    status: 'active',
    pnl: 45,
    timeAgo: '4h ago',
    entry: '98.50',
    stopLoss: '95.00',
    tpTargets: [
        { price: '$102.00', hit: true },
        { price: '$105.00', hit: true },
        { price: '$110.00', hit: false },
    ],
    slUnlock: true,
    analysis: 'Solana broke out of a multi-week consolidation wedge. On-chain activity is spiking, supporting the bullish thesis.',
    riskManagement: 'Moderate risk. This is a momentum trade. If price falls back into the wedge, cut losses immediately.'
  },
  {
    id: '4',
    pair: 'ADA/USDT',
    type: 'Spot',
    status: 'active',
    pnl: 0,
    timeAgo: '5h ago',
    entry: 'Locked',
    stopLoss: 'Unlock',
    tpTargets: [
        { price: 'Locked', hit: false },
        { price: 'Locked', hit: false },
    ],
    slUnlock: false,
    analysis: 'Cardano is forming a potential double bottom on the daily timeframe. Accumulation volume is rising.',
    riskManagement: 'Spot position implies lower risk, but patience is required. Invalidated if daily close below support.'
  },
  {
    id: '5',
    pair: 'XRP/USDT',
    type: 'Futures',
    status: 'closed',
    pnl: 85,
    timeAgo: '1d ago',
    entry: '0.5500',
    stopLoss: '0.5300',
    tpTargets: [
        { price: '0.5800', hit: true },
        { price: '0.6000', hit: true },
    ],
    slUnlock: true,
    analysis: 'Ripple legal news catalyst provided a strong impulse leg up. We rode the wave to TP2.',
    riskManagement: 'Trade closed. Do not re-enter at current levels. Wait for a pullback to the 0.58 support flip.'
  },
  {
    id: '6',
    pair: 'DOT/USDT',
    type: 'Spot',
    status: 'active',
    pnl: 5,
    timeAgo: '6h ago',
    entry: '7.20',
    stopLoss: '6.80',
    tpTargets: [
        { price: '7.80', hit: false },
        { price: '8.50', hit: false },
    ],
    slUnlock: true,
    analysis: 'Polkadot 2.0 upgrades are approaching. Fundamental analysis suggests undervaluation relative to developer activity.',
    riskManagement: 'Long term hold. DCA strategy recommended if price dips to 6.50 zone.'
  },
  {
    id: '7',
    pair: 'LINK/USDT',
    type: 'Futures',
    status: 'active',
    pnl: 0,
    timeAgo: '1h ago',
    entry: 'Locked',
    stopLoss: 'Unlock',
    tpTargets: [],
    slUnlock: false,
    analysis: 'Chainlink oracle usage hitting all time highs. Technically coiling for a massive breakout.',
    riskManagement: 'High conviction trade. Exclusive for Pro members due to precise leverage requirements.'
  },
  {
    id: '8',
    pair: 'AVAX/USDT',
    type: 'Spot',
    status: 'closed',
    pnl: 15,
    timeAgo: '2d ago',
    entry: '35.00',
    stopLoss: '32.00',
    tpTargets: [
        { price: '38.00', hit: true },
        { price: '42.00', hit: true },
    ],
    slUnlock: true,
    analysis: 'Gaming subnet narrative drove this rally. Perfect technical retest of the breakout level.',
    riskManagement: 'Partial profits taken at TP2. Remaining position stopped out at breakeven.'
  },
  {
    id: '9',
    pair: 'MATIC/USDT',
    type: 'Futures',
    status: 'active',
    pnl: -2,
    timeAgo: '30m ago',
    entry: '0.8500',
    stopLoss: '0.8200',
    tpTargets: [
        { price: '0.8800', hit: false },
        { price: '0.9200', hit: false },
    ],
    slUnlock: true,
    analysis: 'Polygon zkEVM adoption increasing. Short term bearish divergence on RSI suggests a quick scalp opportunity.',
    riskManagement: 'Tight stop loss. This is a counter-trend trade, so keep size small.'
  },
  {
    id: '10',
    pair: 'BNB/USDT',
    type: 'Spot',
    status: 'active',
    pnl: 3,
    timeAgo: '8h ago',
    entry: 'Locked',
    stopLoss: 'Unlock',
    tpTargets: [
        { price: 'Locked', hit: false }
    ],
    slUnlock: false,
    analysis: 'Launchpool announcements often precede BNB rallies. Monitoring official channels.',
    riskManagement: 'Locked for Elite members. '
  }
];

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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('intro');
  const [previousView, setPreviousView] = useState<ViewState>('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [authProvider, setAuthProvider] = useState<AuthProvider>('google');

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

  const handleLogin = (provider: AuthProvider) => {
    setAuthProvider(provider);
    // Instead of going straight to home, go to referral input
    setCurrentView('referral-input');
  };

  const handleReferralComplete = () => {
      setCurrentView('home');
      // Trigger tour after referral step (Skip or Submit)
      setTimeout(() => setShowTour(true), 800);
  };

  const handleLogout = () => {
    setCurrentView('auth');
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
        return <HomeView onNavigate={handleNavigate} mockSignals={MOCK_SIGNALS} />;
      case 'signals':
        return <SignalsView onNavigate={handleNavigate} mockSignals={MOCK_SIGNALS} />;
      case 'signal-history':
        return <SignalHistoryView onBack={handleBack} signals={MOCK_SIGNALS} />;
      case 'performance':
        return <PerformanceView onNavigate={handleNavigate} />;
      case 'academy':
        return <AcademyView onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfileView onNavigate={handleNavigate} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme} authProvider={authProvider} />;
      case 'notifications':
        return <NotificationsView onBack={handleBack} />;
      case 'notification-settings':
        return <NotificationSettingsView onBack={handleBack} />;
      case 'subscription':
        return <SubscriptionView onBack={handleBack} />;
      case 'referrals':
        return <ReferralsView onBack={handleBack} />;
      default:
        return <HomeView onNavigate={handleNavigate} mockSignals={MOCK_SIGNALS} />;
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