import type { CommandEvent, CommandProfile } from './commands.js';

export type PreviewStatus = 'none' | 'starting' | 'running' | 'failed';

export interface WorkspacePreviewState {
  status: PreviewStatus;
  port?: number;
  localUrl?: string;
  networkUrl?: string;
  proxyUrl?: string;
  lastDetectedAt?: string;
  commandId?: string;
  message: string;
}

export interface PreviewResponse extends WorkspacePreviewState {
  ok: true;
  previewUrl?: string;
}

const previewStates = new Map<string, WorkspacePreviewState>();

function now() {
  return new Date().toISOString();
}

function isDevServerProfile(commandProfile: CommandProfile | string | undefined): commandProfile is CommandProfile {
  return commandProfile === 'npm run dev' || commandProfile === 'pnpm run dev';
}

function getOriginHost(requestHost?: string) {
  if (!requestHost) {
    return undefined;
  }

  const host = requestHost.replace(/^https?:\/\//, '').split('/')[0];

  if (host.startsWith('[')) {
    return host.slice(1, host.indexOf(']'));
  }

  return host.split(':')[0];
}

function isPhoneReachableHost(hostname: string) {
  return !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
}

function parseDetectedUrls(output: string) {
  const urls = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[[^\]]+\]|[a-zA-Z0-9.-]+):\d+\/?/g) ?? [];
  let localUrl: string | undefined;
  let networkUrl: string | undefined;
  let zeroHostUrl: string | undefined;
  let port: number | undefined;

  for (const detectedUrl of urls) {
    try {
      const parsed = new URL(detectedUrl);
      const detectedPort = Number.parseInt(parsed.port, 10);

      if (!Number.isNaN(detectedPort)) {
        port = detectedPort;
      }

      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1') {
        localUrl = detectedUrl.endsWith('/') ? detectedUrl : `${detectedUrl}/`;
      } else if (parsed.hostname === '0.0.0.0') {
        zeroHostUrl = detectedUrl.endsWith('/') ? detectedUrl : `${detectedUrl}/`;
      } else {
        networkUrl = detectedUrl.endsWith('/') ? detectedUrl : `${detectedUrl}/`;
      }
    } catch {
      // Ignore partial or malformed URL-like output.
    }
  }

  return { localUrl, networkUrl, zeroHostUrl, port };
}

function buildReachableUrl(port: number | undefined, requestHost?: string) {
  if (!port) {
    return undefined;
  }

  const originHost = getOriginHost(requestHost);

  if (!originHost || !isPhoneReachableHost(originHost)) {
    return undefined;
  }

  return `http://${originHost}:${port}/`;
}

export function observePreviewCommandEvent(workspaceId: string, event: CommandEvent) {
  const { payload } = event;

  if (!isDevServerProfile(payload.commandProfile)) {
    return;
  }

  const current = previewStates.get(workspaceId);

  if (event.type === 'status' && payload.status === 'running') {
    previewStates.set(workspaceId, {
      status: 'starting',
      commandId: payload.commandId,
      message: `Dev server command started: ${payload.commandProfile}. Waiting for preview URL output.`,
    });
    return;
  }

  if ((event.type === 'stdout' || event.type === 'stderr') && payload.output) {
    const detected = parseDetectedUrls(payload.output);

    if (!detected.port && !detected.localUrl && !detected.networkUrl && !detected.zeroHostUrl) {
      return;
    }

    previewStates.set(workspaceId, {
      ...current,
      status: 'running',
      commandId: payload.commandId,
      port: detected.port ?? current?.port,
      localUrl: detected.localUrl ?? current?.localUrl,
      networkUrl: detected.networkUrl ?? detected.zeroHostUrl ?? current?.networkUrl,
      lastDetectedAt: event.timestamp || now(),
      message: 'Dev server preview URL detected from command output.',
    });
    return;
  }

  if (event.type === 'exit' && current?.commandId === payload.commandId) {
    previewStates.set(workspaceId, {
      ...current,
      status: 'failed',
      message: payload.error
        ? `Dev server stopped: ${payload.error}`
        : `Dev server stopped with status ${payload.status ?? 'exited'}.`,
    });
  }
}

export function getWorkspacePreview(workspaceId: string, requestHost?: string): PreviewResponse {
  const state = previewStates.get(workspaceId) ?? {
    status: 'none' as const,
    message: 'No dev server command has reported a preview URL yet.',
  };

  const host = state.networkUrl ? getOriginHost(state.networkUrl) : undefined;
  const networkUrl =
    state.networkUrl && host === '0.0.0.0' ? buildReachableUrl(state.port, requestHost) ?? state.networkUrl : state.networkUrl;
  const networkHost = networkUrl ? getOriginHost(networkUrl) : undefined;
  const previewUrl =
    state.proxyUrl ?? (networkUrl && networkHost && isPhoneReachableHost(networkHost) ? networkUrl : undefined);

  let message = state.message;

  if (state.status === 'running' && !previewUrl) {
    message =
      'A dev server URL was detected, but no phone-reachable network URL is available. Run the dev server with --host 0.0.0.0 and open the Remote Runtime using the laptop LAN IP.';
  }

  return {
    ok: true,
    ...state,
    networkUrl,
    previewUrl,
    message,
  };
}
