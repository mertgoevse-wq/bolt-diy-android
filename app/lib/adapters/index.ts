/**
 * Platform Adapter Factory
 *
 * Selects and initializes the correct PlatformAdapter based on
 * the runtime environment:
 *   - Android WebView (Capacitor) → AndroidAdapter (fallback)
 *   - Desktop browser with WebContainer → WebContainerAdapter
 *   - Browser without WebContainer → AndroidAdapter (fallback)
 *
 * This is the single entry point for platform detection.
 */

import type { PlatformAdapter } from './types';
import { getPlatformInfo, isWebContainerSupported } from './platform';
import { WebContainerAdapter } from './webcontainer-adapter';
import { AndroidAdapter } from './android-adapter';

let _adapter: PlatformAdapter | null = null;
let _bootPromise: Promise<PlatformAdapter> | null = null;

/**
 * Get the platform adapter for the current environment.
 * Returns a singleton — the adapter is created once and reused.
 */
export function getAdapter(): PlatformAdapter {
  if (_adapter) {
    return _adapter;
  }

  const info = getPlatformInfo();

  if (info.isWebContainerSupported && !info.isAndroid) {
    _adapter = new WebContainerAdapter();
  } else {
    _adapter = new AndroidAdapter();
  }

  console.log(`[PlatformAdapter] Using ${_adapter.getPlatformInfo().type} adapter`);

  return _adapter;
}

/**
 * Boot the platform adapter. This is async because WebContainer.boot()
 * is async. On Android, this resolves immediately.
 */
export async function bootAdapter(): Promise<PlatformAdapter> {
  if (_bootPromise) {
    return _bootPromise;
  }

  const adapter = getAdapter();

  _bootPromise = adapter.boot().then(() => adapter);

  return _bootPromise;
}

/**
 * Get the platform info for the current environment.
 */
export function platformInfo() {
  return getPlatformInfo();
}

/**
 * Whether WebContainer is available (convenience function).
 */
export function hasWebContainer() {
  return isWebContainerSupported();
}

export type { PlatformAdapter } from './types';
