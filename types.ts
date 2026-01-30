

export type ViewState = 'intro' | 'auth' | 'referral-input' | 'home' | 'signals' | 'signal-history' | 'performance' | 'academy' | 'profile' | 'notifications' | 'subscription' | 'notification-settings' | 'referrals' | 'admin';

export type AuthProvider = 'google' | 'telegram';

export interface NotificationPreferences {
  allSignals: boolean;
  announcement: boolean;
  tp: boolean;
  sl: boolean;
  academy: boolean;
}

export interface UserProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  role?: 'user' | 'admin' | 'analyst';
  notificationPreferences?: NotificationPreferences;
}

export interface Signal {
  id: string;
  pair: string;
  type: 'Futures' | 'Spot';
  side: 'Long' | 'Short';
  leverage?: string; // e.g. "10x", "20x", "Cross 50x"
  status: 'active' | 'closed';
  pnl: number;
  timeAgo: string;
  created_at?: string; // ISO timestamp from DB
  closedAt?: string; // ISO timestamp for performance charting
  entry: string;
  stopLoss: string;
  tpTargets: { price: string; hit: boolean }[];
  slUnlock?: boolean;
  isEntryHit?: boolean; // New field to track if price reached entry
  analysis?: string;
  riskManagement?: string;
}

export interface NotificationItem {
  id: string;
  type: 'Announcement' | 'Signal' | 'Academy' | 'Account';
  title: string;
  message: string;
  timeAgo: string;
  read: boolean;
}

export type AcademyCategoryType = 'videos' | 'guides' | 'resources';

export interface AcademyItem {
  id: string;
  title: string;
  category: AcademyCategoryType;
  type: 'Article' | 'Video';
  duration: string; // e.g. "5 min read" or "18:20"
  thumbnail?: string;
  author?: string;
  date?: string;
  content?: string; // For articles
  videoUrl?: string; // For videos
  description?: string;
}

export interface Course {
  id: string;
  title: string;
  type: 'Article' | 'Video';
  duration: string;
}