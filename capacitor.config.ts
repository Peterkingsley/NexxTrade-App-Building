import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexxtrade.io',
  appName: 'NexxTrade',
  webDir: 'dist',
  server: {
    url: 'https://app.nexxtrade.io', // PUT YOUR LIVE SITE HERE
    allowNavigation: ['your-website-link.com']
  }
};

export default config;