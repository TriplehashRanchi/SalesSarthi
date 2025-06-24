import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'vristo-next',
  webDir: 'public', // still required, but not used with live server
  server: {
    url: 'http://192.168.1.23:3000',
    cleartext: true
  },
  // bundledWebRuntime: false
};

export default config;
