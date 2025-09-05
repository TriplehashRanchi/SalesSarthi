import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

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
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },

  },
   android: {
    resolveServiceWorkerRequests: true,
    adjustMarginsForEdgeToEdge: 'force'
  }

  // bundledWebRuntime: false
};

export default config;
