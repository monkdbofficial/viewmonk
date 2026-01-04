'use client';

import { useEffect, useState } from 'react';
import { isDesktopApp, isTauriApp } from '../lib/tauri-utils';

export default function DebugInfo() {
  const [info, setInfo] = useState({
    isDesktop: false,
    isTauri: false,
    origin: '',
    protocol: '',
    hasTauriAPI: false,
  });

  useEffect(() => {
    setInfo({
      isDesktop: isDesktopApp(),
      isTauri: isTauriApp(),
      origin: window.location.origin,
      protocol: window.location.protocol,
      hasTauriAPI: '__TAURI__' in window || '__TAURI_IPC__' in window,
    });
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-gray-300 bg-white p-3 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="font-bold text-gray-900 dark:text-white mb-2">🔧 Debug Info</div>
      <div className="space-y-1 font-mono text-gray-700 dark:text-gray-300">
        <div>Desktop App: <span className={info.isDesktop ? 'text-green-600' : 'text-red-600'}>
          {info.isDesktop ? 'YES ✓' : 'NO ✗'}
        </span></div>
        <div>Tauri API: <span className={info.hasTauriAPI ? 'text-green-600' : 'text-red-600'}>
          {info.hasTauriAPI ? 'YES ✓' : 'NO ✗'}
        </span></div>
        <div>Origin: {info.origin}</div>
        <div>Protocol: {info.protocol}</div>
      </div>
    </div>
  );
}
