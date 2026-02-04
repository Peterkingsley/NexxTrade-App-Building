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
    ]
  }
};

export default config;
