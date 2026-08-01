import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker safely
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New PWA version detected');
  },
  onOfflineReady() {
    console.log('PD Holiday Villas is ready for offline use');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
