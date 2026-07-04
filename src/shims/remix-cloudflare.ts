/**
 * @remix-run/cloudflare shim for Android SPA build
 *
 * Stubs Cloudflare-specific Remix exports that are referenced in the app
 * but not needed in the client-side Android SPA.
 */

// Re-export nothing from json/redirect — they're server-only helpers
export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    status: init?.status ?? 200,
  });
}

export function redirect(url: string, init?: number | ResponseInit): Response {
  const status = typeof init === 'number' ? init : init?.status ?? 302;
  return new Response(null, { status, headers: { Location: url } });
}

// Type stubs (TypeScript-only, erased at runtime)
export type MetaFunction = () => Array<Record<string, string>>;
export type LoaderFunction = (args: unknown) => Response | Promise<Response>;
export type ActionFunction = (args: unknown) => Response | Promise<Response>;
export type LoaderArgs = Record<string, unknown>;
export type ActionArgs = Record<string, unknown>;
export type AppLoadContext = Record<string, unknown>;

// Request/Response are global in browsers — no need to re-export
