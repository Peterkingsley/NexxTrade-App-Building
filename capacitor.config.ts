import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexxtrade.io',
  appName: 'NexxTrade',
  webDir: 'dist', 
  server: {
    // 1. This is the page the app opens first
    url: 'https://www.app.nexxtrade.io', 
    
    // 2. This PREVENTS the app from opening the browser
    allowNavigation: [
      'app.nexxtrade.io',
      '*.app.nexxtrade.io' // This covers sub-pages too
      'accounts.google.com',           // Allow Google Login
      'oauth2.googleapis.com',         // Google API
      't.me',                          // Telegram link
      'oauth.telegram.org'
    ]
  }
};

export default config;
