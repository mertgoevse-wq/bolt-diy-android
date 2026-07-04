/**
 * Platform Detection Utility
 *
 * Detects whether we're running in:
 *   - A desktop browser with WebContainer support
 *   - An Android WebView (Capacitor)
 *   - A fallback environment (no WebContainer)
 */

import type { PlatformInfo, PlatformType } from './types';

/**
 * Detect if we're running inside a Capacitor Android WebView.
 * Capacitor injects a global `capacitor` object.
 */
export function isCapacitor(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Capacitor injects this on Android
  const w = window as unknown as { capacitor?: unknown; AndroidCapacitor?: unknown };

  return !!(w.capacitor || w.AndroidCapacitor);
}

/**
 * Detect if we're running in Electron.
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const w = window as unknown as { electronAPI?: unknown };

  return !!w.electronAPI;
}

/**
 * Check if SharedArrayBuffer is available (required for WebContainer).
 * Android WebView does not support cross-origin isolation, so
 * SharedArrayBuffer is typically not available.
 */
export function hasSharedArrayBuffer(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') {
    return false;
  }

  // Even if SharedArrayBuffer exists, WebContainer needs cross-origin isolation
  if (typeof self !== 'undefined' && typeof (self as any).crossOriginIsolated !== 'undefined') {
    return (self as any).crossOriginIsolated;
  }

  return true;
}

/**
 * Check if the current environment supports WebContainer.
 */
export function isWebContainerSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isCapacitor()) {
    return false;
  }

  if (isElectron()) {
    return true;
  } // Electron supports WebContainer

  return hasSharedArrayBuffer();
}

/**
 * Check if we're on a mobile device (touch-first, small screen).
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const isCap = isCapacitor();
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;
  const userAgent = navigator.userAgent.toLowerCase();

  const isMobileUA = /android|iphone|ipad|ipod|mobile|blackberry|opera mini/i.test(userAgent);

  return isCap || (isMobileUA && isTouch) || (isTouch && isSmallScreen);
}

/**
 * Check if we're specifically on Android.
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isCapacitor()) {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('android');
  }

  return /android/i.test(navigator.userAgent);
}

/**
 * Get full platform information.
 */
export function getPlatformInfo(): PlatformInfo {
  const isAndroid = isAndroidDevice();
  const isMobile = isMobileDevice();
  const wcSupported = isWebContainerSupported();

  let type: PlatformType = 'webcontainer';

  if (isAndroid || isCapacitor()) {
    type = 'android';
  } else if (!wcSupported) {
    type = 'fallback';
  }

  return {
    type,
    isMobile,
    isAndroid,
    isWebContainerSupported: wcSupported,
    isElectron: isElectron(),
  };
}
