import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexxtrade.io',
  appName: 'NexxTrade',
  webDir: 'dist',
  server: {
    // url: 'https://app.nexxtrade.io', // Commented out to ensure APK uses the local build with latest fixes
    androidScheme: 'https',
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
      serverClientId: '711534694113-lnfksje89vmna372k3bi4n0p7hbuev72.apps.googleusercontent.com',
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
