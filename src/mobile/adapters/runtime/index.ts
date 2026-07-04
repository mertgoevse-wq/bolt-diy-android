/**
 * Runtime adapter factory + re-exports.
 *
 * Usage:
 *   import { getRuntimeAdapter, type RuntimeAdapter } from '~/mobile/adapters/runtime';
 *
 *   const adapter = getRuntimeAdapter();
 *   await adapter.boot();
 *
 *   const caps = adapter.getCapabilities();
 *   if (caps.fileSystem) {
 *     await adapter.writeFile('src/index.ts', code);
 *   }
 *
 * The adapter is selected based on platform detection (see
 * app/lib/adapters/platform.ts).  On desktop browsers with
 * SharedArrayBuffer support, WebContainerRuntimeAdapter is used.
 * On Android/Capacitor or unsupported browsers, AndroidFallbackRuntimeAdapter.
 *
 * A future RemoteRuntimeAdapter can be added here by extending the
 * platform detection logic.
 */

export { UnsupportedFeatureError } from './RuntimeAdapter';
export type { RuntimeAdapter } from './RuntimeAdapter';
export type {
  PlatformInfo,
  PlatformType,
  RuntimeCapabilities,
  FileContent,
  Dirent,
  PathWatcherEvent,
  IPreview,
  CommandResult,
  ITerminalProcess,
  IRuntimeTerminal,
} from './RuntimeAdapter';

export { WebContainerRuntimeAdapter } from './WebContainerRuntimeAdapter';
export { AndroidFallbackRuntimeAdapter } from './AndroidFallbackRuntimeAdapter';

import { WebContainerRuntimeAdapter } from './WebContainerRuntimeAdapter';
import { AndroidFallbackRuntimeAdapter } from './AndroidFallbackRuntimeAdapter';
import {
  isWebContainerSupported,
  isCapacitor,
  getPlatformInfo,
} from '~/lib/adapters/platform';

// ---------------------------------------------------------------------------
// Singleton adapter instance
// ---------------------------------------------------------------------------

let _adapter: WebContainerRuntimeAdapter | AndroidFallbackRuntimeAdapter | null = null;

/**
 * Returns the singleton RuntimeAdapter for the current platform.
 *
 * On first call, it detects the platform and instantiates the
 * appropriate adapter.  Subsequent calls return the same instance.
 *
 * This is safe to call during SSR — it will return a fallback adapter
 * that does nothing until boot() is called client-side.
 */
export function getRuntimeAdapter(): WebContainerRuntimeAdapter | AndroidFallbackRuntimeAdapter {
  if (_adapter) return _adapter;

  const isSSR = typeof window === 'undefined';

  if (isSSR) {
    // During SSR, use a fallback adapter that won't try to boot anything
    _adapter = new AndroidFallbackRuntimeAdapter();
    return _adapter;
  }

  const wcSupported = isWebContainerSupported();
  const isAndroid = isCapacitor() || getPlatformInfo().isAndroid;

  if (wcSupported && !isAndroid) {
    console.log('[RuntimeAdapter] Using WebContainerRuntimeAdapter (desktop browser)');
    _adapter = new WebContainerRuntimeAdapter();
  } else {
    console.log(
      `[RuntimeAdapter] Using AndroidFallbackRuntimeAdapter ` +
        `(${isAndroid ? 'Android/Capacitor' : 'no SharedArrayBuffer'})`,
    );
    _adapter = new AndroidFallbackRuntimeAdapter();
  }

  return _adapter;
}

/**
 * Reset the singleton adapter.  Mainly useful for testing.
 */
export function resetRuntimeAdapter(): void {
  _adapter = null;
}

// ---------------------------------------------------------------------------
// Convenience: check capabilities without getting the adapter
// ---------------------------------------------------------------------------

/**
 * Quick check: is WebContainer (full runtime) available?
 */
export function hasFullRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return isWebContainerSupported() && !isCapacitor() && !getPlatformInfo().isAndroid;
}

/**
 * Quick check: are we in fallback / degraded mode?
 */
export function isFallbackMode(): boolean {
  return !hasFullRuntime();
}
