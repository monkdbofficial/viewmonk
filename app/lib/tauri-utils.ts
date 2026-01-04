/**
 * Tauri Environment Detection Utilities
 * Detects if the app is running in Tauri desktop mode
 */

export function isTauriApp(): boolean {
  if (typeof window === 'undefined') return false;

  // Check multiple Tauri indicators
  const hasTauriAPI = '__TAURI__' in window || '__TAURI_IPC__' in window || '__TAURI_INTERNALS__' in window;

  // Check protocol - Tauri uses tauri:// or http://tauri.localhost
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const origin = window.location.origin;

  const isTauriProtocol = protocol === 'tauri:' || protocol === 'https:' && hostname === 'tauri.localhost';
  const isTauriOrigin = origin.includes('tauri://') || origin.includes('tauri.localhost');

  // For static exports, check if we're NOT on a standard web domain
  const isNotStandardWeb = !hostname.includes('.') && hostname !== 'localhost' && hostname !== '';

  // Check user agent for Tauri/WRY (Tauri's webview)
  const userAgent = navigator.userAgent;
  const isTauriUA = userAgent.includes('Tauri') || userAgent.includes('wry');

  // Aggressive detection: If it's a static export and not clearly a web browser, assume Tauri
  // This is safer for desktop-first apps
  const isLikelyDesktop = hasTauriAPI || isTauriProtocol || isTauriOrigin || isTauriUA;

  // Log for debugging
  console.log('[Tauri Detection]', {
    hasTauriAPI,
    protocol,
    hostname,
    origin,
    userAgent,
    isTauriProtocol,
    isTauriOrigin,
    isTauriUA,
    isNotStandardWeb,
    DETECTED: isLikelyDesktop
  });

  return isLikelyDesktop;
}

export function isDesktopApp(): boolean {
  return isTauriApp();
}

export function isWebApp(): boolean {
  return !isTauriApp();
}
