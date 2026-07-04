import { isCapacitor } from '~/lib/adapters/platform';

/**
 * Check if the viewport is mobile-sized (< 640px, matching Tailwind's `sm` breakpoint).
 * This is a CSS breakpoint check — it returns true on any narrow viewport,
 * including a desktop browser window resized small.
 */
export function isMobile() {
  return globalThis.innerWidth < 640;
}

/**
 * Check if we're running in a mobile environment — either:
 *   - Inside a Capacitor Android WebView, OR
 *   - On a touch-only device with a narrow viewport
 *
 * Use this for feature-gating UI components (bottom nav, mobile drawers,
 * hiding desktop-only controls) that should only appear on actual mobile
 * devices, not on a desktop browser resized small.
 */
export function isMobileDevice(): boolean {
  if (isCapacitor()) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const hasTouch =
    'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0 || window.matchMedia('(pointer: coarse)').matches;

  return hasTouch && window.innerWidth < 768;
}
