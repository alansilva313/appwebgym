import { registerRootComponent } from 'expo';
import './src/i18n';
import App from './App';
import { Platform } from 'react-native';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Register PWA Service Worker (web only)
if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker registrado:', reg.scope))
      .catch((err) => console.warn('[PWA] Service Worker falhou:', err));
  });
}

