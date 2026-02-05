import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexxtrade.app',
  appName: 'NexxTrade',
  webDir: 'dist',
  server: {
    url: 'https://app.nexxtrade.io',
    allowNavigation: [
      'app.nexxtrade.io',
      'www.app.nexxtrade.io',
      'telegram.org',
      'oauth.telegram.org',
      '*.telegram.org'
    ]
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '711534694113-s4qmdjctfmrit0isf8hfdja9lbl433t4.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;