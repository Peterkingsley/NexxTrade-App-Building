import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexxtrade.app',
  appName: 'NexxTrade',
  webDir: 'dist',
  server: {
    url: 'https://your-website-link.com', // PUT YOUR LIVE SITE HERE
    allowNavigation: ['your-website-link.com']
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_GOOGLE_SERVER_CLIENT_ID.apps.googleusercontent.com', // REPACE WITH ACTUAL CLIENT ID
      forceCodeForRefreshToken: true
    }
  }
};

export default config;