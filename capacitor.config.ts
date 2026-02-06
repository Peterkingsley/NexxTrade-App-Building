import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexxtrade.io',
  appName: 'NexxTrade',
  webDir: 'dist',
  server: {
    // The hostname used for internal routing
    hostname: 'app.nexxtrade.io', 
    androidScheme: 'https',
    allowNavigation: [
      'app.nexxtrade.io',
      '*.telegram.org',
      'oauth.telegram.org'
    ]
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      /* IMPORTANT: This MUST be the "Web Client ID". 
         The Android Client ID from your screenshot is handled automatically 
         by Google Play Services via the SHA-1 and Package Name.
      */
      serverClientId: '711534694113-s4qmdjctfmrit0isf8hfdja9lbl433t4.apps.googleusercontent.com',
      forceCodeForRefreshToken: true 
    }
  }
};

export default config;