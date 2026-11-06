import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import CaptureOverlay from './CaptureOverlay';
import TargetSwitcher from './TargetSwitcher';
import './style.css';

window.addEventListener('unhandledrejection', (e) => {
  console.error('[overlay unhandled rejection]', e.reason);
});
window.addEventListener('error', (e) => {
  console.error('[overlay window error]', e.error ?? e.message);
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('overlay.html missing #root');
}

// The overlay window hosts the capture toast / failure notice / undo confirmation. P15-4: the same
// bundle is loaded by the process's second window, the capture-target switcher (双击 ⇧) — told
// apart by its label (overlay.rs / switcher.rs).
const isSwitcher = getCurrentWindow().label === 'switcher';
ReactDOM.createRoot(root).render(
  <React.StrictMode>{isSwitcher ? <TargetSwitcher /> : <CaptureOverlay />}</React.StrictMode>,
);
