import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { useThemeStore } from './store/themeStore';

// Apply persisted theme before first paint
useThemeStore.getState().setTheme(useThemeStore.getState().theme);

// Yangi deploy'dan keyin eski (keshlangan) chunk yo'qolsa — sahifani bir marta avtomatik yangilaymiz.
// (Vite dinamik import xato bersa 'vite:preloadError' chiqaradi.) 10s ichida bir martadan ko'p emas — cheksiz reload bo'lmasin.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  const KEY = 'chunkReloadAt';
  const last = Number(sessionStorage.getItem(KEY) || '0');
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
