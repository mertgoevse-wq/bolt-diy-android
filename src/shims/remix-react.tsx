/**
 * @remix-run/react shim for Android SPA build
 *
 * Provides stub implementations of Remix router hooks and components
 * so the app can build without a Remix server context.
 *
 * These are used by the Android SPA build (vite.android.config.ts) via
 * the Vite `resolve.alias` config — in normal web builds, the real
 * @remix-run/react package is used unchanged.
 *
 * Stubs implemented:
 *  - useSearchParams → returns empty URLSearchParams, no-op setter
 *  - useNavigate     → returns no-op function
 *  - useLoaderData   → returns empty object
 *  - useLocation     → returns window.location-based object
 *  - useParams       → returns empty object
 *  - Link            → renders <a href>
 *  - Outlet          → renders null
 *  - Links / Meta / Scripts / ScrollRestoration → render null (HTML head elements managed by Vite)
 *  - RemixBrowser / RemixServer → render children
 */

import React, { useCallback, useMemo } from 'react';

// ─── Navigation hooks ────────────────────────────────────────────────────────

export function useSearchParams(): [URLSearchParams, (p: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => void] {
  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
  const setParams = useCallback(() => {
    // No-op in Android SPA — no router to update
    console.warn('[remix-shim] useSearchParams setter is a no-op in Android build');
  }, []);

  return [params, setParams];
}

export function useNavigate() {
  return useCallback((to: string | number) => {
    if (typeof to === 'string') {
      console.warn('[remix-shim] useNavigate: navigating to', to);
    }
  }, []);
}

export function useLocation() {
  if (typeof window === 'undefined') {
    return { pathname: '/', search: '', hash: '', state: null, key: 'default' };
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: null,
    key: 'default',
  };
}

export function useParams(): Record<string, string> {
  return {};
}

export function useLoaderData(): unknown {
  return {};
}

// ─── Components ──────────────────────────────────────────────────────────────

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  prefetch?: string;
  reloadDocument?: boolean;
  replace?: boolean;
  preventScrollReset?: boolean;
  relative?: string;
}

export function Link({ to, children, prefetch: _prefetch, reloadDocument: _rd, replace: _replace, ...rest }: LinkProps) {
  return React.createElement('a', { href: to, ...rest }, children);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function NavLink({ to, children, className, ...rest }: LinkProps & { className?: any }) {
  const resolvedClass: string | undefined =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    typeof className === 'function' ? (className as (o: { isActive: boolean }) => string)({ isActive: false }) : className as string | undefined;

  return React.createElement('a', { href: to, className: resolvedClass, ...rest }, children);
}

export function Outlet() {
  return null;
}

// These are HTML head elements that Vite/index.html manages — no-ops in SPA
export function Links() { return null; }
export function Meta() { return null; }
export function Scripts() { return null; }
export function ScrollRestoration() { return null; }

// ─── App-level wrappers ───────────────────────────────────────────────────────

export function RemixBrowser({ children }: { children?: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function RemixServer({ children }: { children?: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

// ─── Form / action hooks (stubs) ─────────────────────────────────────────────

export function useFetcher() {
  return { submit: () => {}, load: () => {}, data: undefined, state: 'idle' as const };
}

export function useActionData(): unknown {
  return undefined;
}

export function useMatches() {
  return [];
}

export function Form({ children, ...rest }: React.FormHTMLAttributes<HTMLFormElement>) {
  return React.createElement('form', rest, children);
}
