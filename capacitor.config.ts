import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dgsarthi.app',
  appName: 'DG Sarthi',
  webDir: 'public', // still required, but not used with live server
  server: {
    url: 'https://app.digitalgyanisaarthi.com',
    cleartext: true
  },
   plugins: {
    StatusBar: {
      overlays: false,          // webview starts below status bar
      style: 'DARK',            // or 'LIGHT' depending on your header color
      backgroundColor: '#0B1220'// match your app header color
    }
  }
  // bundledWebRuntime: false
};

export default config;
