import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexxtrade.app',
  appName: 'NexxTrade',
  webDir: 'dist',
  server: {
    url: 'https://your-website-link.com', // PUT YOUR LIVE SITE HERE
    allowNavigation: ['your-website-link.com']
  }
};

export default config;