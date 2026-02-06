import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexxtrade.io',
  appName: 'NexxTrade',
  webDir: 'dist',
  server: {
    // Crucial: The hostname must match exactly what you set in @BotFather
    // Changed from 'app.nexxtrade.io' to 'nexxtrade.io' to match production bot domain
    hostname: 'nexxtrade.io',
    androidScheme: 'https',
    allowNavigation: [
      'nexxtrade.io',
      '*.telegram.org',
      'oauth.telegram.org'
    ]
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Ensure this is the "Web Client ID" from Google Console
      serverClientId: '711534694113-s4qmdjctfmrit0isf8hfdja9lbl433t4.apps.googleusercontent.com',
      // Switch this to true if you are getting "developer error" on Android
      forceCodeForRefreshToken: true 
    }
  }
};

export default config;
