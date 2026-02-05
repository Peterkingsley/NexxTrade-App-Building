import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexxtrade.io',
  appName: 'NexxTrade',
  webDir: 'dist',
  server: {
      url: 'https://app.nexxtrade.io', 
    androidScheme: 'https',
    allowNavigation: [
      'app.nexxtrade.io',
      'app.nexxtrade.io',
      'telegram.org',
      'oauth.telegram.org',
      '*.telegram.org'
    ]
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '711534694113-s4qmdjctfmrit0isf8hfdja9lbl433t4.apps.googleusercontent.com',
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
