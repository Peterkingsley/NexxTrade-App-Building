import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexxtrade.io',
  appName: 'NexxTrade',
  webDir: 'dist', 
  server: {
    // This is your main entry point
    url: 'https://www.app.nexxtrade.io', 
    
    // These are the "Safe" zones that stay inside the app
    allowNavigation: [
      'app.nexxtrade.io',
      'www.app.nexxtrade.io',
      '*.app.nexxtrade.io',
      'accounts.google.com',
      'oauth2.googleapis.com',
      't.me',
      'oauth.telegram.org'
    ]
  },
  // This tricks Google into letting you log in inside the app
  android: {
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
  }
};

export default config;
