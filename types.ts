
export type ViewState = 'intro' | 'auth' | 'referral-input' | 'home' | 'signals' | 'signal-history' | 'performance' | 'academy' | 'profile' | 'notifications' | 'subscription' | 'notification-settings' | 'referrals';

export type AuthProvider = 'google' | 'telegram';

export interface Signal {
  id: string;
  pair: string;
  type: 'Futures' | 'Spot';
  status: 'active' | 'closed';
  pnl: number;
  timeAgo: string;
  entry: string;
  stopLoss: string;
  tpTargets: { price: string; hit: boolean }[];
  slUnlock?: boolean;
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